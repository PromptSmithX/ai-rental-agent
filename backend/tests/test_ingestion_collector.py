import pytest
import httpx
from app.ingestion.config import IngestionConfig
from app.ingestion.collector import Collector, CollectorError
from app.ingestion.adapters.tromoi import normalize_url, TromoiSourceAdapter


def test_url_normalization():
    raw_url = "https://tromoi.com/phong-tro/abc-123/?utm_source=facebook&utm_medium=cpc&ref=xyz#section"
    expected = "https://tromoi.com/phong-tro/abc-123"
    assert normalize_url(raw_url) == expected


def test_ssrf_host_disallowed():
    config = IngestionConfig()
    collector = Collector(config)
    with pytest.raises(CollectorError) as exc_info:
        collector.validate_url("https://malicious-site.com/listing")
    assert exc_info.value.error_code == "SSRF_HOST_DISALLOWED"


def test_ssrf_private_ip_disallowed():
    config = IngestionConfig(allowed_hosts=["127.0.0.1", "tromoi.com"])
    collector = Collector(config)
    with pytest.raises(CollectorError) as exc_info:
        collector.validate_url("http://127.0.0.1/admin")
    assert exc_info.value.error_code == "SSRF_PRIVATE_IP"


def test_case_12_pagination_loop_prevention():
    """Case 12: repeating links and self-links do not cause loops."""
    html_with_loops = """
    <html>
      <body>
        <div class="pagination-wrap">
          <a href="https://tromoi.com/tim-tro-tai-ha-noi">Current</a>
          <a href="https://tromoi.com/tim-tro-tai-ha-noi?page=2">2</a>
          <a href="https://tromoi.com/tim-tro-tai-ha-noi?page=2">2</a>
          <a href="https://tromoi.com/tim-tro-tai-ha-noi?page=3">3</a>
        </div>
      </body>
    </html>
    """
    discovered = TromoiSourceAdapter.discover_pagination_urls(html_with_loops)
    assert len(discovered) == 2
    assert "https://tromoi.com/tim-tro-tai-ha-noi?page=2" in discovered
    assert "https://tromoi.com/tim-tro-tai-ha-noi?page=3" in discovered


def test_case_13_stop_on_403_no_bypass():
    """Case 13: HTTP 403 stops execution immediately without attempting bypass."""
    def handler(request: httpx.Request) -> httpx.Response:
        return httpx.Response(403, request=request)

    transport = httpx.MockTransport(handler)
    mock_client = httpx.Client(transport=transport)
    config = IngestionConfig()
    collector = Collector(config, client=mock_client)

    with pytest.raises(CollectorError) as exc_info:
        collector.fetch("https://tromoi.com/phong-tro/protected")

    assert exc_info.value.error_code == "HTTP_403_STOP"
    assert exc_info.value.status_code == 403
    assert exc_info.value.retryable is False
