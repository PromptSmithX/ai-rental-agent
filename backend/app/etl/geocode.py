"""Address geocoding for listings that lack source coordinates.

Uses Nominatim (OpenStreetMap) per its usage policy: a descriptive User-Agent,
>=1s between requests, and an on-disk cache so re-runs never re-hit the service.
Geocoded coordinates are always treated as APPROXIMATE — never "verified" — to
respect the project rule against asserting precise map locations.
"""
import json
import os
import time
import hashlib
from typing import Optional, Tuple

import httpx

_NOMINATIM_URL = "https://nominatim.openstreetmap.org/search"
# Rough bounding box around Hà Nội to bias results (left,top,right,bottom).
_HANOI_VIEWBOX = "105.3,21.4,106.0,20.8"


class Geocoder:
    def __init__(
        self,
        cache_path: str = "storage/geocode_cache.json",
        min_interval_seconds: float = 1.1,
        user_agent: str = "AI-Rental-Copilot-Research/1.0 (+project contact)",
        enabled: bool = True,
    ):
        self.cache_path = cache_path
        self.min_interval = min_interval_seconds
        self.enabled = enabled
        self._last_call = 0.0
        self._client = httpx.Client(timeout=15.0, headers={"User-Agent": user_agent})
        self._cache = self._load_cache()

    def _load_cache(self) -> dict:
        try:
            with open(self.cache_path, "r", encoding="utf-8") as f:
                return json.load(f)
        except (FileNotFoundError, json.JSONDecodeError, OSError):
            return {}

    def _save_cache(self) -> None:
        os.makedirs(os.path.dirname(self.cache_path) or ".", exist_ok=True)
        tmp = self.cache_path + ".tmp"
        with open(tmp, "w", encoding="utf-8") as f:
            json.dump(self._cache, f, ensure_ascii=False)
        os.replace(tmp, self.cache_path)

    @staticmethod
    def _key(address: str) -> str:
        return hashlib.sha256(address.strip().lower().encode("utf-8")).hexdigest()[:16]

    def geocode(self, address: str) -> Optional[Tuple[float, float]]:
        """Return (lat, lng) or None. Cached hits (incl. cached misses) never hit the network."""
        if not address or not address.strip():
            return None
        key = self._key(address)
        if key in self._cache:
            v = self._cache[key]
            return (v["lat"], v["lng"]) if v else None
        if not self.enabled:
            return None

        # Rate limit per OSM policy.
        elapsed = time.time() - self._last_call
        if elapsed < self.min_interval:
            time.sleep(self.min_interval - elapsed)
        self._last_call = time.time()

        result: Optional[dict] = None
        try:
            resp = self._client.get(
                _NOMINATIM_URL,
                params={
                    "q": address,
                    "format": "json",
                    "limit": 1,
                    "countrycodes": "vn",
                    "viewbox": _HANOI_VIEWBOX,
                },
            )
            if resp.status_code == 200:
                data = resp.json()
                if data:
                    result = {"lat": float(data[0]["lat"]), "lng": float(data[0]["lon"])}
        except (httpx.HTTPError, ValueError, KeyError, IndexError):
            result = None

        # Cache both hits and misses so a re-run is deterministic and polite.
        self._cache[key] = result
        self._save_cache()
        return (result["lat"], result["lng"]) if result else None

    def close(self) -> None:
        self._client.close()
