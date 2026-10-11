# 🏠 AI Rental Copilot (TroMate AI)

> **Trợ lý AI tìm kiếm phòng trọ thông minh cho sinh viên Việt Nam**  
> Tìm trọ qua hội thoại tự nhiên, đồng bộ trực quan trên bản đồ tương tác và đề xuất phòng có căn cứ rõ ràng.

---

## 📖 Giới thiệu dự án

**AI Rental Copilot** là nền tảng tìm kiếm phòng trọ thế hệ mới (AI-native) được thiết kế chuyên biệt cho sinh viên đại học tại Việt Nam. Thay vì phải lướt qua hàng trăm bài đăng rời rạc trên mạng xã hội, lo lắng về thông tin sai lệch hay vị trí địa lý mập mờ, sinh viên có thể trò chuyện trực tiếp với AI bằng tiếng Việt để tìm được phòng trọ ưng ý nhất quanh cơ sở trường học.

Hệ thống kết hợp giữa **giao diện hội thoại (Chat-driven)**, **bản đồ tương tác (Interactive Map)** và **danh sách kết quả theo thời gian thực (Synchronized List)**, giúp việc tìm trọ trở nên minh bạch, nhanh chóng và trực quan.

---

## ✨ Dự án này làm gì? (Tính năng cốt lõi)

### 1. 💬 Tìm kiếm bằng ngôn ngữ tự nhiên (AI Conversational Discovery)
* Người dùng chỉ cần nhập nhu cầu tìm trọ bằng tiếng Việt đời thường, ví dụ:
  > *"Tìm phòng dưới 3 triệu quanh ĐH Bách Khoa Lý Thường Kiệt trong bán kính 2 km, có máy lạnh và cho nuôi mèo."*
* AI tự động phân tích và trích xuất thành các tiêu chí có cấu trúc:
  * Cơ sở trường học mục tiêu (Campus)
  * Ngân sách tối đa (Max Price)
  * Bán kính tối đa (Max Distance)
  * Tiện ích bắt buộc (Máy lạnh, wifi, vệ sinh riêng, ban công, bếp, chỗ để xe)
  * Chính sách thú cưng (Cho phép / Không cho phép)
* Các tiêu chí được hiển thị dưới dạng **Editable Filter Chips**, cho phép người dùng bấm chỉnh sửa hoặc xóa nhanh bất kỳ lúc nào.

### 2. 🗺️ Đồng bộ 2 chiều: Hội thoại — Bản đồ — Danh sách phòng
* **Bản đồ trực quan (Interactive Map)**:
  * Ghim vị trí cơ sở trường học và vẽ vòng tròn bán kính tìm kiếm (km).
  * Hiển thị marker vị trí phòng trọ gắn kèm nhãn giá thuê (VND).
  * Đồng bộ hai chiều: bấm vào một phòng trên danh sách sẽ tự động zoom và highlight marker tương ứng trên bản đồ, và ngược lại.
* **Khoảng cách minh bạch**:
  * Tính toán khoảng cách theo **đường chim bay thực tế** giữa phòng và cơ sở trường học.
  * Phân loại độ tin cậy vị trí rõ ràng (`verified`, `approximate`, `unknown`) — không bao giờ tự bịa đặt tọa độ nếu tin đăng chưa rõ địa chỉ.

### 3. 🔍 Room Insight & Lý do đề xuất (Grounded Explanations)
* Mỗi phòng trọ được đề xuất đều đi kèm:
  * **Lý do phù hợp (`matchReasons`)**: Giải thích vì sao phòng này đáp ứng đúng yêu cầu của bạn (ví dụ: *Phù hợp ngân sách ≤ 3tr*, *Cách trường ~1.1 km*, *Đủ 5 tiện ích yêu cầu*).
  * **Những điểm cần lưu ý (`caveats`)**: Cảnh báo minh bạch những thông tin chưa rõ (ví dụ: *Vị trí ước lượng*, *Chưa rõ chi phí điện nước phát sinh*, *Chưa rõ diện tích thực tế*).
* **So sánh phòng (Side-by-side Comparison)**: Hỗ trợ đặt 2–3 phòng cạnh nhau để so sánh trực quan về giá cả, diện tích, tiện ích và vị trí.

### 4. ⚙️ Quy trình xử lý AI minh bạch (Observable Agent Workflow)
* Tích hợp bảng theo dõi **Developer Trace Panel** hiển thị từng bước xử lý của AI:
  $$\text{Khởi động} \longrightarrow \text{Trích xuất tiêu chí} \longrightarrow \text{Xác định cơ sở} \longrightarrow \text{Lọc phòng} \longrightarrow \text{Tính khoảng cách} \longrightarrow \text{Xếp hạng} \longrightarrow \text{Phản hồi}$$
* Minh bạch 100%, nói rõ dữ liệu mô phỏng, cam kết không "ảo giác" (hallucination).

---

## 🏛️ Kiến trúc kỹ thuật

Dự án được xây dựng với kiến trúc hiện đại, tách bạch rõ ràng giữa Frontend giao diện người dùng và Backend nghiệp vụ theo nguyên lý **Clean Architecture / Modular Monolith**:

```
AI_RENTAL_ROOM/
├── src/                        # Frontend: React 18, TypeScript, Leaflet, Tailwind CSS, Zustand
│   ├── app/                    # Routing, Store Zustand quản lý trạng thái tập trung
│   ├── features/               # Các module tính năng: chat, map, search, rooms, trace
│   ├── domain/                 # Domain contracts & kiểu dữ liệu dùng chung
│   └── services/               # Service adapter kết nối REST API / Mock
├── backend/                    # Backend: FastAPI, SQLAlchemy 2.0, PostgreSQL + PostGIS
│   ├── app/
│   │   ├── domain/             # Domain ORM models: Campus, Room, RoomImage
│   │   ├── schemas/            # Pydantic v2 schemas với CamelModel adapter
│   │   ├── repositories/       # Tầng truy vấn dữ liệu & lọc không gian PostGIS
│   │   ├── services/           # Tầng nghiệp vụ (LangGraph / AI Agent ready)
│   │   └── api/v1/             # Versioned REST APIs (/campuses, /rooms, /search, /health)
│   ├── alembic/                # Quản lý migration database
│   └── tests/                  # Bộ kiểm thử pytest (lọc phòng, khoảng cách, REST API)
└── docker-compose.yml          # Điều phối toàn bộ hệ thống bằng Docker
```

---

## 🛠️ Công nghệ sử dụng

| Tầng | Công nghệ | Mục đích sử dụng |
| :--- | :--- | :--- |
| **Frontend** | **React 18 + TypeScript + Vite** | Giao diện Single Page Application hiện đại, type-safe |
| **Styling** | **Tailwind CSS + Lucide Icons** | Giao diện responsive chuẩn mobile-first |
| **Bản đồ** | **Leaflet + React-Leaflet** | Bản đồ tương tác, hiển thị marker, circle radius |
| **State** | **Zustand** | Quản lý state tập trung (bộ lọc, tin nhắn, phòng đang chọn) |
| **Backend** | **Python 3.12+ / FastAPI** | REST API hiệu năng cao, tự động sinh tài liệu Swagger |
| **Database** | **PostgreSQL 16 + PostGIS 3.4** | Cơ sở dữ liệu quan hệ kết hợp xử lý dữ liệu địa lý |
| **ORM & Schema** | **SQLAlchemy 2.0 + Pydantic v2** | Quản lý mô hình dữ liệu và kiểm thực DTO hai chiều |
| **Migrations** | **Alembic** | Quản lý phiên bản cấu trúc database tự động |
| **Testing** | **Vitest** (FE) & **Pytest** (BE) | Kiểm thử tự động đảm bảo độ tin cậy logic nghiệp vụ |
| **DevOps** | **Docker & Docker Compose** | Đóng gói và triển khai toàn bộ ứng dụng bằng một câu lệnh |

---

## 🚀 Hướng dẫn khởi chạy

### Cách 1: Sử dụng Docker Compose (Khuyên dùng)

Yêu cầu máy tính đã cài đặt [Docker](https://www.docker.com/) và [Docker Compose](https://docs.docker.com/compose/).

1. **Khởi động Backend và Database PostGIS:**
   ```bash
   docker compose up --build -d
   ```
   * Backend API: [http://localhost:8000](http://localhost:8000)
   * Swagger UI (Tài liệu API tương tác): [http://localhost:8000/docs](http://localhost:8000/docs)
   * Kiểm tra sức khỏe hệ thống: [http://localhost:8000/api/v1/health](http://localhost:8000/api/v1/health)

2. **Khởi động Frontend React:**
   ```bash
   npm install
   npm run dev
   ```
   * Ứng dụng web: [http://localhost:5173](http://localhost:5173)

---

### Cách 2: Chạy trực tiếp trên máy cục bộ (Local Development)

#### 1. Khởi chạy Backend (Python / FastAPI)
```bash
# Tạo và kích hoạt môi trường ảo Python
python -m venv .venv
# Trên Windows:
.venv\Scripts\activate
# Trên macOS / Linux:
source .venv/bin/activate

# Cài đặt thư viện backend
pip install -r backend/requirements.txt

# Chạy migration database và seed dữ liệu mẫu
cd backend
alembic upgrade head
python -m app.seeds.seed_data

# Khởi động máy chủ backend
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

#### 2. Khởi chạy Frontend (React / Vite)
```bash
# Ở thư mục gốc dự án
npm install
npm run dev
```

---

## 🧪 Kiểm thử tự động (Automated Tests)

Cả hai phần Frontend và Backend đều có bộ kiểm thử tự động toàn diện:

* **Chạy kiểm thử Frontend (Vitest — 30 tests):**
  ```bash
  npm test
  ```
  *Kiểm tra: tính toán khoảng cách Haversine, logic bộ lọc cứng, 12 kịch bản hội thoại mẫu (S01–S12), đồng bộ Zustand store.*

* **Chạy kiểm thử Backend (Pytest — 26 tests):**
  ```bash
  cd backend
  pytest -v
  ```
  *Kiểm tra: bộ lọc ngân sách, tiện ích, thú cưng, khoảng cách không gian, các endpoint REST API `/campuses`, `/rooms`, `/search` và tài liệu OpenAPI.*

---

## 🛡️ Nguyên tắc Tin cậy & Minh bạch (Trust & Safety)

1. **Minh bạch dữ liệu**: Trong giai đoạn thử nghiệm, toàn bộ phòng trọ và vị trí đều được hiển thị nhãn `Dữ liệu minh họa (Demo)` và `AI mô phỏng`.
2. **Không ảo giác**: AI chỉ đề xuất và xếp hạng dựa trên các phòng thực sự tồn tại trong cơ sở dữ liệu. Nếu không tìm thấy kết quả phù hợp (ví dụ ngân sách quá thấp), AI sẽ thông báo rõ ràng và đề xuất nới lỏng tiêu chí chứ không bịa ra tin ảo.
3. **Bảo vệ quyền riêng tư**: Không lưu trữ hay thu thập thông tin nhạy cảm của người dùng khi chưa có sự cho phép.

---

## 📄 Bản quyền & Đóng góp

Dự án được phát triển với mục đích học tập và nghiên cứu công nghệ AI-Native Discovery. Mọi ý kiến đóng góp, báo lỗi hoặc yêu cầu tính năng mới đều được hoan nghênh thông qua GitHub Issues và Pull Requests!
