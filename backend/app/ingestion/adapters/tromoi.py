import re
import json
import hashlib
import unicodedata
from typing import List, Optional, Tuple, Dict, Any
from urllib.parse import urljoin, urlparse, urlunparse, parse_qs, urlencode
from bs4 import BeautifulSoup

from app.schemas.raw_listing import (
    RawListingPayload,
    SourceInfo,
    FetchInfo,
    ListingInfo,
    PricingInfo,
    LocationInfo,
    AttributesInfo,
    ContentInfo,
    MediaInfo,
    CaptureInfo,
    ImageReference,
    SourceCoordinates,
)


HANOI_DISTRICTS = [
    "ba đình", "ba dinh", "hoàn kiếm", "hoan kiem", "tây hồ", "tay ho",
    "long biên", "long bien", "cầu giấy", "cau giay", "đống đa", "dong da",
    "hai bà trưng", "hai ba trung", "hoàng mai", "hoang mai", "thanh xuân", "thanh xuan",
    "hà đông", "ha dong", "nam từ liêm", "nam tu liem", "bắc từ liêm", "bac tu liem",
    "thanh trì", "thanh tri", "gia lâm", "gia lam", "đông anh", "dong anh",
    "sóc sơn", "soc son", "hoài đức", "hoai duc", "đan phượng", "dan phuong",
    "thạch thất", "thach that", "quốc oai", "quoc oai", "chương mỹ", "chuong my",
    "thường tín", "thuong tin", "phú xuyên", "phu xuyen", "ứng hòa", "ung hoa",
    "mỹ đức", "my duc", "sơn tây", "son tay", "ba vì", "ba vi", "phúc thọ", "phuc tho",
    "mê linh", "me linh", "hà nội", "ha noi"
]


def normalize_url(url: str) -> str:
    """Normalize source URL: strip fragment, standard tracking parameters, and trailing slash."""
    parsed = urlparse(url)
    clean_scheme = parsed.scheme.lower() or "https"
    clean_netloc = parsed.netloc.lower()

    # Filter out tracking query params
    query_params = parse_qs(parsed.query, keep_blank_values=True)
    filtered_params = {
        k: v for k, v in query_params.items()
        if not k.lower().startswith("utm_") and k.lower() not in ["ref", "source", "fbclid"]
    }
    clean_query = urlencode(filtered_params, doseq=True)
    clean_path = parsed.path.rstrip("/") if parsed.path != "/" else "/"

    return urlunparse((clean_scheme, clean_netloc, clean_path, "", clean_query, ""))


def extract_source_listing_id(url: str) -> Optional[str]:
    """Extract listing ID from URL if present (e.g. -40428 at end of slug)."""
    match = re.search(r"-(\d{4,10})$", url.rstrip("/"))
    if match:
        return match.group(1)
    return None


def is_hanoi_location(text: str) -> bool:
    """Check if textual location indicators reference Hanoi."""
    normalized = unicodedata.normalize("NFD", text.lower())
    normalized = "".join(c for c in normalized if unicodedata.category(c) != "Mn")
    
    # Check directly for hanoi or district names
    for dist in HANOI_DISTRICTS:
        dist_norm = "".join(c for c in unicodedata.normalize("NFD", dist) if unicodedata.category(c) != "Mn")
        if dist_norm in normalized:
            return True
    return False


def clean_text(text: Optional[str]) -> Optional[str]:
    if not text:
        return None
    # Normalize unicode to NFC
    text = unicodedata.normalize("NFC", text)
    # Strip leading/trailing whitespace
    return text.strip()


def compute_content_sha256(payload: RawListingPayload) -> str:
    """Compute stable SHA256 content hash ignoring timestamps and retrieve metadata."""
    stable_dict = {
        "title": payload.listing.title_raw,
        "category": payload.listing.category_raw,
        "badges": sorted(payload.listing.badges_raw),
        "header_price": payload.pricing.header_price_raw,
        "description_price_mentions": sorted(payload.pricing.description_price_mentions_raw),
        "fee_mentions": sorted(payload.pricing.fee_mentions_raw),
        "address_new": payload.location.address_new_raw,
        "address_old": payload.location.address_old_raw,
        "address_description": payload.location.address_description_raw,
        "amenity_tags": sorted(payload.attributes.amenity_tags_raw),
        "target_tenants": sorted(payload.attributes.target_tenants_raw),
        "surroundings_tags": sorted(payload.attributes.surroundings_tags_raw),
        "description_text": payload.content.description_text_raw,
        "images": [img.source_url for img in payload.media.images],
        "video_present": payload.media.video_present,
    }
    # Stable canonical JSON serialization
    serialized = json.dumps(stable_dict, sort_keys=True, ensure_ascii=False)
    # Normalize unicode before hashing
    serialized = unicodedata.normalize("NFC", serialized)
    return hashlib.sha256(serialized.encode("utf-8")).hexdigest()


class TromoiSourceAdapter:
    """Source adapter for Trọ Mới (tromoi.com)."""

    BASE_URL = "https://tromoi.com"

    @classmethod
    def discover_detail_urls(cls, index_html: str, base_url: str = BASE_URL) -> List[str]:
        """Extract detail page URLs from a Trọ Mới index / search listing page."""
        soup = BeautifulSoup(index_html, "html.parser")
        discovered: List[str] = []
        seen = set()

        # Find listing items or cards
        valid_prefixes = ("/phong-tro/", "/nha-nguyen-can/", "/can-ho/", "/ky-tuc-xa/")

        for a in soup.find_all("a", href=True):
            href = a["href"].strip()
            # Resolve relative link
            full_url = urljoin(base_url, href)
            parsed = urlparse(full_url)
            
            # Ensure host is tromoi.com
            if parsed.netloc not in ("tromoi.com", "www.tromoi.com"):
                continue

            # Check if path starts with one of valid detail categories
            if any(parsed.path.startswith(prefix) for prefix in valid_prefixes):
                # Ensure it's a detail slug rather than category root
                path_parts = [p for p in parsed.path.split("/") if p]
                if len(path_parts) >= 2:
                    norm = normalize_url(full_url)
                    if norm not in seen:
                        seen.add(norm)
                        discovered.append(norm)

        return discovered

    @classmethod
    def discover_pagination_urls(cls, index_html: str, current_url: str = "https://tromoi.com/tim-tro-tai-ha-noi") -> List[str]:
        """Extract next page links from pagination section."""
        soup = BeautifulSoup(index_html, "html.parser")
        pages: List[str] = []
        seen = set()

        for a in soup.find_all("a", href=True):
            href = a["href"].strip()
            if "page=" in href:
                full_url = urljoin(current_url, href)
                norm = normalize_url(full_url)
                if norm not in seen:
                    seen.add(norm)
                    pages.append(norm)

        return pages

    @classmethod
    def parse_detail_page(
        cls,
        html_content: str,
        source_url: str,
        category_url: Optional[str] = "https://tromoi.com/tim-tro-tai-ha-noi",
        fetched_at: Optional[str] = None,
        http_status: int = 200,
    ) -> RawListingPayload:
        """Parse raw listing from detail page HTML."""
        soup = BeautifulSoup(html_content, "html.parser")
        warnings: List[str] = []
        field_sources: Dict[str, str] = {}

        norm_url = normalize_url(source_url)
        listing_id = extract_source_listing_id(norm_url)

        # 1. Title
        title_raw = None
        h1 = soup.find("h1")
        if h1:
            title_raw = clean_text(h1.get_text())
            field_sources["title_raw"] = "h1"

        # 2. Badges
        badges_raw: List[str] = []
        tags_container = soup.find(class_=lambda c: c and "tags" in c.lower().split())
        if tags_container:
            for tag in tags_container.find_all(class_=lambda c: c and "tag" in c.lower()):
                t_text = clean_text(tag.get_text())
                if t_text and t_text not in badges_raw:
                    badges_raw.append(t_text)
            field_sources["badges_raw"] = ".tags .tag"

        # 3. Category
        category_raw = None
        for b in badges_raw:
            if b in ["Phòng trọ", "Nhà nguyên căn", "Căn hộ", "Ký túc xá"]:
                category_raw = b
                break

        # 4. Info items (desktop / mobile info sections)
        posted_date_raw = None
        availability_raw = None
        units_count_raw = None
        header_price_raw = None

        desktop_info = soup.find(class_=lambda c: c and "hostel__detail--info" in c and "display-desktop" in c)
        info_container = desktop_info or soup.find(class_=lambda c: c and "hostel__detail--info" in c)

        if info_container:
            items = info_container.find_all(class_=lambda c: c and "item__content" in c)
            for item in items:
                text = item.get_text(" ", strip=True)
                if "Ngày đăng:" in text:
                    posted_date_raw = clean_text(text.replace("Ngày đăng:", ""))
                    field_sources["posted_date_raw"] = ".item__content:has-text('Ngày đăng:')"
                elif "Phòng trống:" in text:
                    availability_raw = clean_text(text.replace("Phòng trống:", ""))
                    field_sources["availability_raw"] = ".item__content:has-text('Phòng trống:')"
                elif "Giá từ" in text or "Mức giá:" in text:
                    val = text.replace("Giá từ", "").replace("Mức giá:", "").strip()
                    if val and not header_price_raw:
                        header_price_raw = clean_text(val)
                        field_sources["header_price_raw"] = ".item__content:price"
                elif "-" in text and any(cat in text for cat in ["Phòng trọ", "Nhà nguyên căn", "Căn hộ", "Ký túc xá"]):
                    # e.g. "Phòng trọ - 1"
                    parts = text.split("-")
                    if len(parts) == 2:
                        units_count_raw = clean_text(parts[1])
                        if not category_raw:
                            category_raw = clean_text(parts[0])

        # Also check .price-tag if header_price_raw not found yet
        if not header_price_raw:
            price_tag = soup.find(class_=lambda c: c and "price-tag" in c)
            if price_tag:
                header_price_raw = clean_text(price_tag.get_text())
                field_sources["header_price_raw"] = ".price-tag"

        # 5. Addresses
        address_new_raw = None
        address_old_raw = None

        new_addr_elem = soup.find(class_=lambda c: c and "box-address--new" in c)
        if new_addr_elem:
            # Clone and remove badge if present
            badge = new_addr_elem.find(class_=lambda c: c and "badge-address-tag" in c)
            if badge:
                badge_text = badge.get_text(strip=True)
                full = new_addr_elem.get_text(" ", strip=True)
                address_new_raw = clean_text(full.replace(badge_text, ""))
            else:
                address_new_raw = clean_text(new_addr_elem.get_text(" ", strip=True))
            field_sources["address_new_raw"] = ".box-address--new"

        old_addr_elem = soup.find(class_=lambda c: c and "box-address--old" in c)
        if old_addr_elem:
            badge = old_addr_elem.find(class_=lambda c: c and "badge-address-tag" in c)
            if badge:
                badge_text = badge.get_text(strip=True)
                full = old_addr_elem.get_text(" ", strip=True)
                address_old_raw = clean_text(full.replace(badge_text, ""))
            else:
                address_old_raw = clean_text(old_addr_elem.get_text(" ", strip=True))
            field_sources["address_old_raw"] = ".box-address--old"

        # 6. Description and Content
        description_text_raw = None
        description_html_raw = None
        content_elem = soup.find(class_=lambda c: c and "content-detail" in c)
        if content_elem:
            description_text_raw = content_elem.get_text("\n", strip=True)
            description_html_raw = str(content_elem)
            field_sources["description_text_raw"] = ".content-detail"

        # 7. Extract price & fee mentions from description
        description_price_mentions_raw: List[str] = []
        fee_mentions_raw: List[str] = []
        address_description_raw = None

        if description_text_raw:
            lines = [l.strip() for l in description_text_raw.split("\n") if l.strip()]
            for i, line in enumerate(lines):
                # Address mentions
                if re.search(r"^(?:Địa chỉ|Đ/c|Đc)\s*:", line, re.IGNORECASE):
                    after_colon = line.split(":", 1)[1].strip()
                    if after_colon:
                        address_description_raw = after_colon
                    elif i + 1 < len(lines):
                        address_description_raw = lines[i + 1]
                # Price mentions
                if re.search(r"(?:Giá thuê|Giá phòng|Mức giá|Giá)\s*:", line, re.IGNORECASE) or (
                    re.search(r"\b\d+(?:[.,]\d+)?\s*(?:triệu|tr|nghìn|k|đ|vnd)\b", line, re.IGNORECASE)
                    and not any(f in line.lower() for f in ["điện", "nước", "rác", "xe", "vệ sinh"])
                ):
                    if line not in description_price_mentions_raw:
                        description_price_mentions_raw.append(line)
                # Fee mentions
                if any(k in line.lower() for k in ["điện", "nước", "dịch vụ", "chi phí", "rác", "gửi xe"]):
                    if line not in fee_mentions_raw:
                        fee_mentions_raw.append(line)

        # Detect price conflicts
        if header_price_raw and description_price_mentions_raw:
            # Check if any price mention numbers differ from header price
            header_nums = re.findall(r"\d+(?:[.,]\d+)?", header_price_raw)
            desc_text_all = " ".join(description_price_mentions_raw)
            desc_nums = re.findall(r"\d+(?:[.,]\d+)?", desc_text_all)
            if header_nums and desc_nums and header_nums[0] != desc_nums[0]:
                warnings.append("price_mentions_conflict")

        # 8. Blocks: Amenities, Target tenants, Surroundings
        amenity_tags_raw: List[str] = []
        target_tenants_raw: List[str] = []
        surroundings_tags_raw: List[str] = []

        blocks = soup.find_all(class_=lambda c: c and "hostel__detail--block" in c)
        for block in blocks:
            header_el = block.find(["h2", "h3", "h4", "div", "span"], class_=lambda c: c and ("title" in c or "header" in c)) or block.find(["h2", "h3", "h4"])
            block_title = header_el.get_text(strip=True).lower() if header_el else ""
            labels = [clean_text(item.get_text(strip=True)) for item in block.find_all(class_="item__label") if clean_text(item.get_text(strip=True))]

            if "tiện nghi" in block_title:
                amenity_tags_raw.extend(labels)
                field_sources["amenity_tags_raw"] = ".hostel__detail--block:Tiện nghi"
            elif "đối tượng" in block_title:
                target_tenants_raw.extend(labels)
                field_sources["target_tenants_raw"] = ".hostel__detail--block:Đối tượng"
            elif "xung quanh" in block_title:
                surroundings_tags_raw.extend(labels)
                field_sources["surroundings_tags_raw"] = ".hostel__detail--block:Môi trường xung quanh"

        # 9. Map and Coordinates
        map_href_raw = None
        source_coordinates: Optional[SourceCoordinates] = None

        map_iframe = soup.find("iframe", src=lambda s: s and ("google.com/maps" in s or "maps" in s))
        if map_iframe:
            map_href_raw = map_iframe["src"]
            field_sources["map_href_raw"] = "iframe[src*='maps']"
            # Extract lat/lng query param q=lat,lng
            coord_match = re.search(r"[?&]q=([-+]?\d+\.\d+),([-+]?\d+\.\d+)", map_href_raw)
            if coord_match:
                source_coordinates = SourceCoordinates(
                    lat=float(coord_match.group(1)),
                    lng=float(coord_match.group(2)),
                    evidence="google_maps_iframe_embed",
                    precision_claim="source_embed_query_coordinates",
                )

        # 10. Media: Images & Video
        images: List[ImageReference] = []
        seen_image_urls = set()

        gallery_elem = soup.find(class_=lambda c: c and "gallery" in c)
        if gallery_elem:
            # Find all image tags and anchor tags in order
            for el in gallery_elem.find_all(["img", "a"]):
                img_url = el.get("src") or el.get("data-src") or el.get("href")
                if not img_url:
                    continue
                # Filter out non-images
                lower_url = img_url.lower()
                if not any(lower_url.endswith(ext) or ext in lower_url for ext in [".jpg", ".jpeg", ".png", ".webp", ".gif"]):
                    continue

                abs_url = urljoin(cls.BASE_URL, img_url)
                if abs_url not in seen_image_urls:
                    seen_image_urls.add(abs_url)
                    alt_text = el.get("alt") or title_raw
                    is_cover = (len(images) == 0)
                    images.append(
                        ImageReference(
                            source_url=abs_url,
                            position=len(images),
                            alt_raw=clean_text(alt_text),
                            is_cover=is_cover,
                        )
                    )

        # Video metadata only
        video_present = False
        video_page_url = None

        if soup.find(class_=lambda c: c and ("video-placeholder" in c or "popup__video-review" in c)):
            video_present = True
        video_elem = soup.find(["video", "iframe"], src=lambda s: s and ("youtube" in s or "tiktok" in s or "video" in s))
        if video_elem:
            video_present = True
            video_page_url = video_elem.get("src")

        # 11. Scope verification (Hanoi only)
        all_location_text = " ".join(filter(None, [
            title_raw,
            address_new_raw,
            address_old_raw,
            address_description_raw,
            " ".join(badges_raw),
        ]))
        if not is_hanoi_location(all_location_text):
            warnings.append("listing_outside_hanoi_scope")

        # Personal contact check
        warnings.append("contact_details_intentionally_excluded")

        payload = RawListingPayload(
            schema_version="1.0.0",
            source=SourceInfo(
                site="tromoi",
                url=norm_url,
                canonical_url=norm_url,
                source_listing_id=listing_id,
                category_url=category_url,
                scope_city="ha_noi",
            ),
            fetch=FetchInfo(
                fetched_at=fetched_at,
                http_status=http_status,
                final_url=norm_url,
                content_type="text/html; charset=utf-8",
                html_sha256=hashlib.sha256(html_content.encode("utf-8")).hexdigest(),
                parser_version="1.0.0",
            ),
            listing=ListingInfo(
                title_raw=title_raw,
                category_raw=category_raw,
                badges_raw=badges_raw,
                posted_date_raw=posted_date_raw,
                availability_raw=availability_raw,
                units_count_raw=units_count_raw,
            ),
            pricing=PricingInfo(
                header_price_raw=header_price_raw,
                description_price_mentions_raw=description_price_mentions_raw,
                fee_mentions_raw=fee_mentions_raw,
            ),
            location=LocationInfo(
                address_new_raw=address_new_raw,
                address_old_raw=address_old_raw,
                address_description_raw=address_description_raw,
                map_href_raw=map_href_raw,
                source_coordinates=source_coordinates,
            ),
            attributes=AttributesInfo(
                amenity_tags_raw=amenity_tags_raw,
                target_tenants_raw=target_tenants_raw,
                surroundings_tags_raw=surroundings_tags_raw,
                other_tags_raw=[],
            ),
            content=ContentInfo(
                description_text_raw=description_text_raw,
                description_html_raw=description_html_raw,
                sections_raw={},
            ),
            media=MediaInfo(
                images=images,
                video_present=video_present,
                video_page_url=video_page_url,
            ),
            capture=CaptureInfo(
                field_sources=field_sources,
                warnings=warnings,
                extra_raw={},
            ),
        )

        return payload
