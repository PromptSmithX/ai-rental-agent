import time
import random
import ipaddress
import socket
from typing import Optional, List, Dict, Any, Tuple
from urllib.parse import urlparse
import httpx

from app.ingestion.config import IngestionConfig
from app.ingestion.adapters.tromoi import normalize_url, TromoiSourceAdapter


class CollectorError(Exception):
    def __init__(self, message: str, error_code: str, retryable: bool = False, status_code: Optional[int] = None):
        super().__init__(message)
        self.message = message
        self.error_code = error_code
        self.retryable = retryable
        self.status_code = status_code


class Collector:
    """Polite HTTP collector with SSRF protection, rate limiting, and backoff."""

    def __init__(self, config: IngestionConfig, client: Optional[httpx.Client] = None):
        self.config = config
        self._last_request_time: float = 0.0
        self._client = client or httpx.Client(
            timeout=config.request_timeout_seconds,
            headers={"User-Agent": config.user_agent},
            follow_redirects=True,
        )

    def validate_url(self, url: str) -> str:
        """Validate against SSRF and host allowlist."""
        norm_url = normalize_url(url)
        parsed = urlparse(norm_url)

        if parsed.scheme not in ("http", "https"):
            raise CollectorError(f"Disallowed scheme: {parsed.scheme}", error_code="INVALID_SCHEME", retryable=False)

        host = parsed.netloc.split(":")[0].lower()
        if host not in self.config.allowed_hosts:
            raise CollectorError(f"Host '{host}' not in allowed hosts allowlist", error_code="SSRF_HOST_DISALLOWED", retryable=False)

        # Check for private or loopback IP
        try:
            # Check if host is direct IP
            ip = ipaddress.ip_address(host)
            if ip.is_private or ip.is_loopback or ip.is_link_local:
                raise CollectorError(f"Private IP destination blocked: {host}", error_code="SSRF_PRIVATE_IP", retryable=False)
        except ValueError:
            # Host is hostname, not direct IP literal
            pass

        return norm_url

    def _apply_rate_limit(self):
        """Enforce min delay and politeness jitter."""
        elapsed = time.time() - self._last_request_time
        jitter = random.uniform(0.1, 0.5)
        delay_needed = (self.config.min_delay_seconds + jitter) - elapsed
        if delay_needed > 0:
            time.sleep(delay_needed)
        self._last_request_time = time.time()

    def fetch(self, url: str) -> httpx.Response:
        """Fetch URL with SSRF validation, rate limiting, and exponential retry backoff."""
        valid_url = self.validate_url(url)
        retries = 0

        while True:
            self._apply_rate_limit()
            try:
                response = self._client.get(valid_url)
                
                # Check final URL after redirects for SSRF
                final_host = urlparse(str(response.url)).netloc.split(":")[0].lower()
                if final_host not in self.config.allowed_hosts:
                    raise CollectorError(
                        f"Redirected to disallowed host: {final_host}",
                        error_code="SSRF_REDIRECT_DISALLOWED",
                        retryable=False,
                    )

                if response.status_code == 200:
                    return response
                elif response.status_code == 403:
                    # Access denied or bot challenge -> stop immediately, do NOT bypass
                    raise CollectorError(
                        f"HTTP 403 Forbidden on {valid_url}. Crawler stopped safely without bypassing.",
                        error_code="HTTP_403_STOP",
                        retryable=False,
                        status_code=403,
                    )
                elif response.status_code == 429:
                    retry_after_hdr = response.headers.get("Retry-After")
                    wait_seconds = float(retry_after_hdr) if retry_after_hdr and retry_after_hdr.isdigit() else (
                        self.config.retry_backoff_seconds * (2 ** retries)
                    )
                    retries += 1
                    if retries > self.config.max_retries:
                        raise CollectorError(f"HTTP 429 Rate limited on {valid_url} after {retries} retries", error_code="HTTP_429", retryable=True, status_code=429)
                    time.sleep(wait_seconds)
                    continue
                elif response.status_code in (500, 502, 503, 504):
                    retries += 1
                    if retries > self.config.max_retries:
                        raise CollectorError(f"HTTP {response.status_code} server error on {valid_url}", error_code=f"HTTP_{response.status_code}", retryable=True, status_code=response.status_code)
                    wait_seconds = self.config.retry_backoff_seconds * (2 ** retries)
                    time.sleep(wait_seconds)
                    continue
                else:
                    raise CollectorError(
                        f"HTTP {response.status_code} on {valid_url}",
                        error_code=f"HTTP_{response.status_code}",
                        retryable=False,
                        status_code=response.status_code,
                    )

            except (httpx.TimeoutException, httpx.NetworkError) as exc:
                retries += 1
                if retries > self.config.max_retries:
                    raise CollectorError(
                        f"Network/Timeout error on {valid_url}: {exc}",
                        error_code="NETWORK_TIMEOUT",
                        retryable=True,
                    ) from exc
                wait_seconds = self.config.retry_backoff_seconds * (2 ** retries)
                time.sleep(wait_seconds)

    def close(self):
        self._client.close()
