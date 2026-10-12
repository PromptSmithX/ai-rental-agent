# 04 — Trọ Mới detail-page field mapping

**Evidence:** screenshots supplied by project owner, not automated DOM inspection. **CSS selectors must be determined from permitted HTML fixtures**; do not invent selectors or assume a JSON API exists.

| Screenshot surface | Raw target | Example / notes |
|---|---|---|
| Heading | `listing.title_raw` | PHÒNG FULL NỘI THẤT TẠI ĐƯỜNG Ý LA... |
| Badges | `listing.badges_raw` | Hot / Phòng trọ / Hà Nội |
| Posted date | `listing.posted_date_raw` | `25-09-2026` |
| Availability | `listing.availability_raw` | `Liên hệ chủ trọ` ≠ confirmed available |
| Summary price | `pricing.header_price_raw` | `2,7 triệu/tháng` |
| Description | `content.description_text_raw` | Exact complete text including line breaks and fee mentions |
| Description price | **keep inside description**; optional `pricing.description_price_mentions_raw` | `Giá thuê: 3 triệu/tháng` |
| Address new | `location.address_new_raw` | `Số 27, Ngách 6, Ngõ 138, Phường Dương Nội, Thành phố Hà Nội` |
| Address old | `location.address_old_raw` | older administrative string shown |
| Description address | `location.address_description_raw` | `đường Ý La ... Hà Đông, Hà Nội` |
| Amenities | `attributes.amenity_tags_raw` | Wifi, Điều hòa, Camera an ninh... |
| Intended tenant | `attributes.target_tenants_raw` | Đi học, Đi làm |
| Surroundings | `attributes.surroundings_tags_raw` | Chợ, Siêu thị, Trường học, Công viên |
| Image gallery | `media.images[]` + `raw_listing_images` | All **authorized** image links in order; separate cover/thumb/full variants |
| Video | `media.video_present`, optional link | Metadata only; NEVER fetch video assets |
| Map / directions | `location.map_href_raw` | if explicitly present on detail page; not proof of exact pin |
| Area | description | `20–25 m²`; do not coerce to scalar in raw |
| Utilities | description | electricity/water/cleaning textual fees |
| Landlord phone/person | excluded | Avoid capturing personal contact info by default |

## Parser rules
1. Extract DOM fields and description **independently**. Preserve text/order/units/case where feasible.
2. Clean only non-semantic whitespace for derived displays; raw capture keeps source spelling.
3. Where fields disagree, retain both and add warning; never silently pick a winner.
4. Missing fields remain null; absent visible tag is NOT a false amenity.
5. Follow pagination only within authorized Hanoi scope; detail pages must be checked for region.
6. Cover image and gallery order should be deterministic; distinguish thumbnails from original images.
7. Extract embedded JSON-LD/structured data only if permitted, with corresponding field provenance.
8. Do not treat review text, ads, suggested related posts, badges from other listings, or video overlay metadata as facts of target listing.
9. Normalize Unicode for comparison hashes without overwriting saved display text.
