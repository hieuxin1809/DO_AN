# iVaccine — Hồ sơ dự án

> Tài liệu mô tả toàn cảnh hệ thống quản lý tiêm chủng iVaccine, được rút ra trực tiếp từ mã nguồn `server/` (Spring Boot) và `client-fe/` (React).

---

## 1. Mô tả hệ thống

### 1.1 Tổng quan

**iVaccine** (Vaccine Management System) là một **hệ thống đặt lịch và quản lý tiêm chủng trực tuyến** dành cho thị trường Việt Nam. Hệ thống hoạt động hoàn toàn online: khách hàng truy cập website, đặt lịch theo từng đợt vaccine, thanh toán điện tử và nhận giấy chứng nhận tiêm chủng có chữ ký số (SHA-256 + QR code) sau khi tiêm xong.

### 1.2 Mục tiêu

- **Đối với khách hàng**: Tra cứu thông tin vaccine, đặt lịch tiêm theo trung tâm/khung giờ, thanh toán PayPal/VNPay, theo dõi lịch sử và giấy chứng nhận của mình hoặc người thân.
- **Đối với trung tâm tiêm chủng**: Số hóa quy trình đăng ký, sàng lọc và theo dõi sau tiêm; giảm tỉ lệ no-show (vắng lịch), tăng tỉ lệ hoàn thành phác đồ vaccine nhiều mũi.
- **Đối với bác sĩ**: Có hàng đợi bệnh nhân trong ngày rõ ràng, sàng lọc bằng checklist y khoa, ghi nhận tiêm và theo dõi phản ứng sau tiêm số hóa.
- **Đối với quản trị viên**: Quản lý vaccine, đợt tiêm chủng, tài khoản, doanh thu, giấy chứng nhận, hệ thống nhắc lịch tự động.

### 1.3 Đối tượng sử dụng

Hệ thống hiện tại chỉ có **3 role hoạt động**:

| Đối tượng                 | Quyền hạn                                                                                                                                             | Cách truy cập          |
| ------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------- |
| **Customer (Khách hàng)** | Xem vaccine, tra cứu lịch tiêm công khai, đăng ký tài khoản, verify giấy chứng nhận + Toàn bộ thao tác booking + thanh toán + theo dõi cá nhân + chat | Đăng nhập email/Google |
| **Doctor (Bác sĩ)**       | Sàng lọc, tiêm/hoãn, theo dõi sau tiêm, xem dashboard cá nhân, chat với khách                                                                         | Tài khoản do Admin tạo |
| **Admin**                 | Quản lý toàn hệ thống: user, vaccine, đợt tiêm, trung tâm, giấy chứng nhận, nhắc lịch, thống kê, gán bác sĩ                                           | Đăng nhập trực tiếp    |

## 2. Tech Stack

### 2.1 Backend

| Thành phần         | Công nghệ                                                                  | Phiên bản                 |
| ------------------ | -------------------------------------------------------------------------- | ------------------------- |
| **Ngôn ngữ**       | Java                                                                       | 17                        |
| **Framework**      | Spring Boot                                                                | 2.7.12                    |
| **Build**          | Maven                                                                      | —                         |
| **Database**       | MySQL                                                                      | 8.0.30 (connector)        |
| **ORM**            | Spring Data JPA + Hibernate (dialect `MySQL5InnoDBDialect`)                | —                         |
| **Bảo mật**        | Spring Security 5.7.1 + JWT (jjwt 0.9.1)                                   | —                         |
| **Real-time**      | spring-boot-starter-websocket (STOMP)                                      | —                         |
| **Email**          | spring-boot-starter-mail + javax.mail 1.6.2                                | —                         |
| **Template email** | Thymeleaf                                                                  | —                         |
| **OAuth2**         | spring-boot-starter-oauth2-client + Google API client (đăng nhập Google)   | —                         |
| **AI Chat**        | Groq API (`llama-3.3-70b-versatile`) qua HTTP                              | —                         |
| **Storage**        | Cloudinary (upload ảnh)                                                    | 1.17.0                    |
| **PDF/Excel**      | Apache POI 5.2.4 (Excel) — PDF được sinh ở FE                              | —                         |
| **API docs**       | Springdoc OpenAPI 1.7.0                                                    | `/swagger-ui-custom.html` |
| **Thanh toán**     | VNPay (custom integration), PayPal SDK REST, MoMo (cấu hình dev)           | —                         |
| **Khác**           | Lombok, modelmapper 2.3.5, OkHttp 3.11.0, Gson 2.8.2, Firebase admin 8.1.0 | —                         |

### 2.2 Frontend

| Thành phần         | Công nghệ                                              | Phiên bản   |
| ------------------ | ------------------------------------------------------ | ----------- |
| **Ngôn ngữ**       | JavaScript (React)                                     | —           |
| **Framework**      | React + react-scripts (CRA)                            | React ^18.2 |
| **Routing**        | react-router-dom                                       | ^6.22       |
| **UI**             | Bootstrap 5.3, MUI 6, Ant Design 5.20, FontAwesome 6.6 | —           |
| **Realtime chat**  | @stomp/stompjs + sockjs-client                         | —           |
| **HTTP**           | Axios + native fetch                                   | —           |
| **Notification**   | react-toastify, sweetalert2                            | —           |
| **Charts**         | chart.js + react-chartjs-2                             | ^4.4        |
| **PDF generation** | jsPDF + html2canvas-pro + qrcode                       | —           |
| **OAuth Google**   | @react-oauth/google                                    | ^0.12       |
| **Thanh toán**     | @paypal/react-paypal-js                                | ^9.2        |
| **Slider / Misc**  | swiper, react-slick, react-paginate, react-select      | —           |

### 2.3 Database

- **DBMS**: MySQL

---

## 3. Kiến trúc hệ thống & Cấu trúc thư mục

### 3.1 Kiến trúc tổng thể

```
┌──────────────────────┐         HTTPS/JWT          ┌──────────────────────┐
│  React FE (port 3000)│ ───────────────────────────▶│ Spring Boot (8080)  │
│  - Customer / Doctor │ ◀───────────────────────────│ - REST API           │
│  - Admin      │     STOMP/WebSocket        │ - JWT Auth           │
│                      │ ◀──────────────────────────▶│ - Scheduled crons    │
└──────────────────────┘                             └────────┬─────────────┘
                                                              │
        ┌─────────────────────────────────────────────────────┼─────────────────┐
        ▼                       ▼                ▼            ▼                 ▼
   ┌─────────┐         ┌─────────────┐    ┌───────────┐  ┌──────────┐    ┌──────────┐
   │  MySQL  │         │ Groq AI     │    │  PayPal   │  │  VNPay   │    │   SMTP   │
   │  (vaxms)│         │ (llama 3.3) │    │  Sandbox  │  │          │    │  Email   │
   └─────────┘         └─────────────┘    └───────────┘  └──────────┘    └──────────┘
```

### 3.2 Cấu trúc thư mục backend (`server/src/main/java/com/web/`)

```
com.web/
├── VaxmsApplication.java          # Entry point
├── api/                           # REST controllers (28 controllers)
│   ├── UserApi, AuthorityApi      # Tài khoản, role
│   ├── CustomerProfileApi         # Hồ sơ KH
│   ├── DoctorApi, NurseApi        # Bác sĩ (NurseApi: legacy)
│   ├── VaccineApi, VaccineTypeApi # Vaccine + loại
│   ├── ManufacturerApi, AgeGroupApi
│   ├── CenterApi                  # Trung tâm tiêm
│   ├── VaccineScheduleApi         # Đợt tiêm
│   ├── VaccineScheduleTimeApi     # Khung giờ slot
│   ├── VaccineScheduleDoctor/Nurse Api  (Nurse: legacy)
│   ├── VaccineInventoryApi        # Tồn kho
│   ├── CustomerScheduleApi        # Lịch tiêm của KH (core)
│   ├── VaccinationCertificateApi  # Giấy chứng nhận
│   ├── ReminderApi                # Nhắc lịch
│   ├── ChatApi                    # Chat realtime
│   ├── ChatAIApi                  # iVax AI assistant
│   ├── FeedBackApi                # Phản hồi
│   ├── NewsApi                    # Tin tức
│   ├── StatiticsApi               # Thống kê admin
│   ├── VnpayApi, MomoApi          # Thanh toán
│   └── UploadApi                  # Upload Cloudinary
├── service/                       # Business logic (~24 services)
├── repository/                    # Spring Data JPA repos (~22 repos)
├── entity/                        # JPA entities (~27 entities)
├── enums/                         # 9 enums
├── dto/                           # Data Transfer Objects
├── models/                        # Request/Response models
├── config/                        # WebSecurityConfig, CorsFilter, Environment
├── jwt/                           # JwtTokenProvider + JwtAuthenticationFilter + JWTConfigurer
├── utils/                         # MailService, EmailTemplateUtils, UserUtils, Contains
├── exception/                     # MessageException + global handler
├── vnpay/                         # VNPay integration
├── processor/                     # MoMo transaction processor
└── constants/                     # Constants
```

### 3.3 Cấu trúc thư mục frontend (`client-fe/src/`)

```
src/
├── App.js + index.js              # Bootstrap React
├── router/index.js                # Định nghĩa routes (public/customer/admin/staff/doctor)
├── components/                    # Component dùng chung: RoleGuard, AppNotification, ...
├── services/                      # API helpers (axios wrappers + Cloudinary + cert PDF)
│   ├── request.js                 # fetch wrappers (getMethod/postMethod)
│   ├── certificatePdf.js          # Sinh PDF giấy chứng nhận (jsPDF + html2canvas-pro)
│   └── staff/, customer/, ...     # API class theo module
├── layout/                        # Header + Sidebar cho mỗi role
│   ├── admin/Layout.js
│   ├── staff/Layout.js
│   ├── doctor/Layout.js
│   └── customer/                  # Header + Footer + AIChatbot widget
├── pages/
│   ├── public/                    # index, login, register, signin, verify cert, ...
│   ├── customer/                  # dangkytiemchung, xacnhandangky, lichdadangky,
│   │                                taikhoan, thongbao, thanhcong, doilich, ...
│   ├── doctor/                    # dashboard, today-queue, my-patients, profile,
│   │                                reports, chat + components/ScreeningModal, FollowupModal
│   ├── admin/                     # index (homepage), user, danhmuc, vaccines,
│   │                                lichtiemchung, addlichtiemchung, certificates,
│   │                                reminders, khachhang, employee, phanHoi, ...
│   └── staff/  (legacy — không link từ menu, một số trang được admin reuse qua alias route)
└── assest/                        # Images, icons (vnpay, logo, ...)
```

### 3.4 Cơ chế bảo mật & route

**`WebSecurityConfig.java`** dùng URL-pattern phân quyền:

| Pattern              | Quyền                        |
| -------------------- | ---------------------------- |
| `/api/*/public/**`   | Mọi người (kể cả chưa login) |
| `/api/*/admin/**`    | `ROLE_ADMIN`                 |
| `/api/*/doctor/**`   | `ROLE_DOCTOR`                |
| `/api/*/customer/**` | `ROLE_CUSTOMER`              |
| `/api/*/all/**`      | Bất kỳ role nào đã login     |

**`JwtAuthenticationFilter`** chạy trước mọi request: đọc header `Authorization: Bearer <token>` → validate → set `SecurityContextHolder.Authentication`. Bean `UserUtils.getUserWithAuthority()` đọc context → trả về `User` entity.

**FE `RoleGuard`** wrap mỗi nhóm route, redirect nếu role không khớp.

---

## 4. Các module và chức năng chính

### 4.1 Module Tài khoản & Xác thực

- Đăng ký bằng email với kích hoạt qua mail (gửi `activationKey`)
- Đăng nhập email/password hoặc Google OAuth2 (`UserApi.loginWithGoogle`)
- Quên mật khẩu → email link reset
- Đổi mật khẩu, cập nhật profile
- Khoá/mở khoá tài khoản (admin)
- Tạo tài khoản theo role: **Customer / Doctor** (do Admin tạo)

### 4.2 Module Catalog (Danh mục)

- **Vaccine**: tên, giá, mô tả, ảnh, NSX, loại vaccine, độ tuổi, `maxDose`, `minIntervalMonths`, tồn kho, hạn dùng
- **VaccineType**: cây phân loại (live, inactivated, mRNA, …) — có quan hệ self-reference
- **AgeGroup**: chuỗi `ageRange` ("0–1 tháng", "1–6 tuổi", "Người lớn", …)
- **Manufacturer**: hãng SX
- **Center**: trung tâm tiêm (city/district/ward/street)

### 4.3 Module Đợt tiêm chủng (Campaign)

- `VaccineSchedule`: 1 đợt tiêm = 1 vaccine + 1 trung tâm + khoảng ngày + giá + giới hạn người
- `VaccineScheduleTime`: 1 slot trong đợt = ngày tiêm cụ thể + giờ start/end + `limitPeople`
- Admin tạo nhiều slot cùng lúc qua `ScheduleTimeDto`
- Tra cứu: theo ngày, theo trung tâm, advanced search (vaccineName + centerName + date range + status)

### 4.4 Module Đăng ký tiêm (CustomerSchedule) — core

- **Hold slot 15 phút**: User chọn slot → `/customer/reserve` tạo `pending_payment` → cron `releaseExpiredHolds()` chạy mỗi 1 phút huỷ nếu quá hạn
- **Thanh toán**: PayPal hoặc VNPay (bắt buộc trả ngay, không còn "pay-later")
- **Cho người khác**: cờ `bookingForOther` để bypass kiểm tra phác đồ (vaccine cá nhân hoá)
- **Cá nhân hoá** (`VaccinePersonalizationService`): nếu `bookingForOther=false`, kiểm tra mũi đã tiêm + `maxDose` + `minIntervalMonths`
- **Đổi lịch**: tối đa 3 lần, phải còn ≥ 24h trước ngày tiêm, lưu vào `ScheduleChangeHistory` (snapshot from/to)
- **Huỷ lịch**: cho phép trước ngày tiêm
- **Trạng thái**: `pending_payment → pending → confirmed → injected → finished` (rẽ nhánh `cancelled`, `not_injected`)

### 4.5 Module Bác sĩ (Doctor)

- Dashboard KPI: số ca hôm nay, số đã tiêm hôm nay/tuần/tháng/tổng
- Today queue: hôm nay + tương lai, lọc theo ngày
- Sàng lọc trước tiêm: 7 câu hỏi (sốt, dị ứng, mang thai, ức chế miễn dịch, bệnh nền nặng, phản ứng mũi trước, nhiễm trùng 14 ngày qua) + nhiệt độ + ghi chú → quyết định **inject** hoặc **defer**
- Theo dõi sau tiêm: 8 triệu chứng + nhiệt độ + thời gian theo dõi + ghi chú → status → `finished`
- Tự động sinh giấy chứng nhận khi `inject` thành công

### 4.6 Module Giấy chứng nhận (Certificate)

- Sinh tự động sau khi bác sĩ click "Đã tiêm"
- Snapshot toàn bộ thông tin (immutable): họ tên, ngày sinh, CCCD, vaccine, mũi số, trung tâm, ngày tiêm
- Hash SHA-256 các trường quan trọng + secret → lưu `hash`
- Mỗi giấy có `serialNo` định dạng `IV-YYYY-NNNNNNNN`
- QR code dẫn đến `/verify/{serial}` công khai
- Frozen flag, có thể bị admin thu hồi với lý do
- FE tạo PDF bằng jsPDF + html2canvas-pro (cô lập trong iframe để tránh bug `oklch()`)

### 4.7 Module Nhắc lịch (Reminder)

- Cron 1 — 8:00 sáng mỗi ngày: gửi mail nhắc lịch tiêm ngày mai (status=confirmed, không trùng)
- Cron 2 — 8:15 sáng mỗi ngày: nhắc mũi tiếp theo cho vaccine multi-dose dựa trên `maxDose` và `minIntervalMonths`
- Cron 3 — `releaseExpiredHolds()` mỗi 1 phút: huỷ reservation `pending_payment` quá 15 phút
- Audit log trong `reminder_log` (chống gửi trùng + dashboard admin)
- Endpoint manual trigger cho test/backfill

### 4.8 Module Chat realtime

- WebSocket STOMP qua `/ws`
- Customer chat với doctor (broadcast tới tất cả doctor đang online)
- Lưu `chatting` table, đánh dấu `isRead`
- FE: danh sách user chat + badge unread

### 4.9 Module AI Chat (iVax)

- `GroqService` gọi Groq Cloud (llama-3.3-70b-versatile) với function calling
- 11 tool: `listUpcomingSchedules`, `searchVaccines`, `getVaccineDetails`, `findCenters`, `checkSlotsRemaining`, `getVaccinesForAge`, `listVaccineTypes`, `getMyUpcomingAppointments`, `getMyVaccinationHistory`, `getMyRecommendedNext`, `getMyCertificates`
- Lịch sử hội thoại per `sessionId` (in-memory, giới hạn 10 cặp gần nhất)
- FE: widget chatbot nổi ở góc phải mọi trang customer
- Fallback nếu Groq trả tool_use_failed

### 4.10 Module Thanh toán

- **PayPal**: REST SDK sandbox; FE mở `PayPalButtons`, sau khi capture → backend verify orderId qua `PayPalService.verifyOrder`
- **VNPay**: build URL → mở tab mới → callback về `/thong-bao` → backend `vnPayService.orderReturnByUrl`
- Lưu mỗi giao dịch vào `payment` table (chống thanh toán trùng qua `orderId`)

### 4.11 Module Quản trị (Admin)

- Dashboard với chart doanh thu năm + thống kê role + vaccine sắp hết / hết hạn + tỉ lệ hoàn thành
- Quản lý vaccine, đợt tiêm, trung tâm, danh mục, kho
- Quản lý tài khoản (xem theo role, tạo/khoá)
- Quản lý đăng ký tiêm: duyệt/từ chối, gán bác sĩ
- Quản lý giấy chứng nhận: lọc, thu hồi
- Quản lý nhắc lịch: xem log, trigger thủ công

---

## 5. Danh sách Actor và Use Case

Hệ thống có **3 actor**: Customer, Doctor, Admin.

### 5.1 Actor: **Customer (Khách hàng)**

Customer thao tác cả khi chưa đăng nhập (tra cứu thông tin công khai, đăng ký tài khoản, verify giấy) lẫn sau khi đăng nhập (booking + thanh toán + theo dõi cá nhân).

| Use Case | Mô tả | Endpoint chính |
|---|---|---|
| UC-C1 — Xem trang chủ | Banner + danh sách vaccine HOT + tin tức | `/` |
| UC-C2 — Tìm kiếm vaccine | Lọc theo từ khoá, loại, độ tuổi | `/api/vaccine/public/search-by-param` |
| UC-C3 — Xem chi tiết vaccine | Mô tả, NSX, độ tuổi, giá | `/api/vaccine/public/find-by-id` |
| UC-C4 — Tra cứu đợt tiêm sắp tới | Theo trung tâm/ngày | `/api/vaccine-schedule/public/next-schedule` |
| UC-C5 — Tra cứu đợt tiêm đã qua | | `/api/vaccine-schedule/public/pre-schedule` |
| UC-C6 — Đăng ký tài khoản | Gửi mail kích hoạt | `/api/user/public/register` |
| UC-C7 — Kích hoạt tài khoản | Click link trong mail | `/api/user/public/active-account` |
| UC-C8 — Quên mật khẩu | Gửi mail reset | `/api/user/public/send-request-forgot-password` |
| UC-C9 — Đặt lại mật khẩu | | `/api/user/public/complete-forgot-password` |
| UC-C10 — Đăng nhập | Email/password hoặc Google | `/api/user/login/email`, `/api/user/login/google` |
| UC-C11 — Verify giấy chứng nhận | Quét QR / nhập serial — không cần login | `/api/certificate/public/verify/{serialNo}` |
| UC-C12 — Trò chuyện AI iVax | Câu hỏi chung & cá nhân hoá | `/api/chat-ai/ask` |
| UC-C13 — Đăng ký lịch tiêm | Bước 1: chọn vaccine/center/slot → Bước 2: điền info bệnh nhân (bản thân hoặc người khác) → Bước 3: chọn PayPal/VNPay → reserve slot 15 phút → thanh toán | `/api/customer-schedule/customer/reserve` |
| UC-C14 — Hold slot 15 phút | Sau khi click "Đặt lịch" hệ thống tạo `pending_payment` row, slot bị giữ | (bao gồm trong UC-C13) |
| UC-C15 — Thanh toán PayPal | Mở modal PayPal → capture → cập nhật `THANH_TOAN_PAYPAL` | `/api/customer-schedule/customer/finish-payment-schedule` |
| UC-C16 — Thanh toán VNPay | Redirect → callback `/thong-bao` | `/api/vnpay/urlpayment` |
| UC-C17 — Huỷ reservation | Tự huỷ trước khi hết 15 phút | `/api/customer-schedule/customer/cancel-reservation` |
| UC-C18 — Xem lịch tiêm của tôi | Filter theo tên vaccine + khoảng ngày | `/api/customer-schedule/customer/my-schedule` |
| UC-C19 — Đổi lịch tiêm | Max 3 lần, còn ≥ 24h trước ngày tiêm, lưu history | `/api/customer-schedule/customer/change-schedule` |
| UC-C20 — Xem lịch sử đổi lịch | Icon 📋 ở mỗi row | `/api/customer-schedule/customer/change-history/{id}` |
| UC-C21 — Huỷ lịch tiêm | Trước ngày tiêm | `/api/customer-schedule/customer/cancel` |
| UC-C22 — Tải giấy chứng nhận | PDF + QR code, sau khi tiêm xong | `/api/certificate/customer/by-schedule/{id}` |
| UC-C23 — Gửi phản hồi | Sao + nội dung + chọn bác sĩ | `/api/feedback/customer/create` |
| UC-C24 — Cập nhật profile | Họ tên, SĐT, CCCD, địa chỉ chi tiết, liên hệ khẩn | `/api/customer-profile/customer/update-profile` |
| UC-C25 — Chat với bác sĩ | Realtime qua STOMP | WebSocket `/ws` |

### 5.2 Actor: **Doctor**

| Use Case                      | Mô tả                                                                      | Endpoint                                                         |
| ----------------------------- | -------------------------------------------------------------------------- | ---------------------------------------------------------------- |
| UC-D1 — Đăng nhập             | Tài khoản do Admin tạo                                                     | `/api/user/login/email`                                          |
| UC-D2 — Xem dashboard cá nhân | KPI: ca hôm nay, đã tiêm tuần/tháng/tổng + chart 7 ngày + pie loại vaccine | `/api/doctor/doctor/stats`, `/stats-by-day`, `/stats-by-vaccine` |
| UC-D3 — Xem hàng đợi hôm nay  | Mặc định: hôm nay + tương lai; có thể lọc ngày                             | `/api/doctor/doctor/today-queue`                                 |
| UC-D4 — Sàng lọc trước tiêm   | Form 7 câu hỏi + nhiệt độ + ghi chú → decision: inject hoặc defer          | `POST /api/doctor/doctor/screening/{id}`                         |
| UC-D5 — Tiêm cho bệnh nhân    | Nếu decision=inject: set status `injected`, tự sinh certificate, gửi email | (bao gồm trong UC-D4)                                            |
| UC-D6 — Hoãn tiêm             | Nếu decision=defer: status `not_injected`                                  | (bao gồm trong UC-D4)                                            |
| UC-D7 — Theo dõi sau tiêm     | 8 triệu chứng + nhiệt độ + ghi chú → status `finished`                     | `POST /api/doctor/doctor/followup/{id}`                          |
| UC-D8 — Xem bệnh nhân của tôi | Toàn bộ lịch đã phụ trách                                                  | `/api/doctor/doctor/my-patients`                                 |
| UC-D9 — Xem & sửa hồ sơ       | Chuyên khoa, kinh nghiệm, bio, avatar                                      | `/api/doctor/doctor/profile`                                     |
| UC-D10 — Chat với khách hàng  |                                                                            | Qua WebSocket                                                    |
| UC-D11 — Xem báo cáo          | Reports page                                                               | `/doctor/reports` (UI)                                           |

**Ràng buộc**: Bác sĩ chỉ được thao tác lịch có `doctor.id === currentDoctor.id` và `injectDate == today` (BE validate, không thao tác được ngày khác).

### 5.3 Actor: **Admin**

| Use Case                         | Mô tả                                                                         | Endpoint                                                               |
| -------------------------------- | ----------------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| UC-A1 — Dashboard tổng quan      | Doanh thu, role, tỉ lệ hoàn thành, vaccine sắp hết                            | `/api/statistic/admin/thong-ke`                                        |
| UC-A2 — CRUD vaccine             | Tên, giá, NSX, type, age group, maxDose, minIntervalMonths                    | `/api/vaccine/...`                                                     |
| UC-A3 — CRUD đợt tiêm chủng      | Vaccine + center + range ngày + slot                                          | `/api/vaccine-schedule/admin/...`                                      |
| UC-A4 — CRUD slot tiêm           | Ngày, giờ, sức chứa, tạo nhiều ngày 1 lần                                     | `/api/vaccine-schedule-time/admin/...`                                 |
| UC-A5 — CRUD trung tâm tiêm      | Tên, địa chỉ chi tiết                                                         | `/api/center/admin/...`                                                |
| UC-A6 — Quản lý danh mục         | VaccineType, AgeGroup, Manufacturer                                           | `/api/vaccine-type/...`, `/api/age-group/...`, `/api/manufacturer/...` |
| UC-A7 — Quản lý kho vaccine      | Nhập kho, danh sách, xoá                                                      | `/api/vaccine-inventory/...`                                           |
| UC-A8 — Quản lý đăng ký tiêm     | Lọc, duyệt/từ chối, gán bác sĩ                                                | `/api/customer-schedule/customer/approve`, `/admin/assign-doctor`      |
| UC-A9 — Quản lý tài khoản        | Liệt kê theo role, khoá/mở, đổi role, xoá                                     | `/api/user/admin/...`                                                  |
| UC-A10 — Tạo tài khoản           | Customer / Doctor (endpoint `create-nurse` còn tồn tại nhưng không có UI gọi) | `/api/user/admin/create-doctor`, `/create-customer`                    |
| UC-A11 — Quản lý giấy chứng nhận | Tìm, lọc, thu hồi với lý do, rehash legacy                                    | `/api/certificate/admin/...`                                           |
| UC-A12 — Quản lý nhắc lịch       | Xem log, manual trigger gửi nhắc                                              | `/api/reminder/admin/log`, `/admin/trigger`                            |
| UC-A13 — Quản lý phản hồi        | Xem feedback từ khách                                                         | `/api/feedback/admin/all`                                              |
| UC-A14 — Thống kê chi tiết       | Doanh thu theo tháng, top vaccine bán chạy                                    | `/api/statistic/admin/revenue-year`, `/vaccine-bc`                     |
| UC-A15 — Quản lý tin tức         | (Có entity News/Topic)                                                        | `/api/news/...`                                                        |

---

## 6. Luồng xử lý các chức năng chính

### 6.1 Luồng đăng ký + thanh toán (Hold slot 15 phút)

```
Customer                  Frontend                  Backend                   PayPal/VNPay
   │                         │                         │                            │
   │ 1. Chọn vaccine/slot    │                         │                            │
   ├────────────────────────▶│ 2. POST /reserve        │                            │
   │                         ├────────────────────────▶│                            │
   │                         │                         │ 3. Capacity check          │
   │                         │                         │ 4. Personalization check   │
   │                         │                         │    (nếu bookingForOther=false)
   │                         │                         │ 5. INSERT cs row           │
   │                         │                         │    status=pending_payment  │
   │                         │  6. {csId, expiresAt}   │                            │
   │                         │◀────────────────────────┤                            │
   │ 7. Modal + countdown ⏱  │                         │                            │
   │ 14:59 đếm ngược         │                         │                            │
   │                         │ 8. Mở PayPal/VNPay      │                            │
   │                         ├──────────────────────────────────────────────────────▶
   │ 9. Hoàn tất pay         │                         │                            │
   │                         │◀──────────────────────────────────────────────────────
   │                         │ 10. POST                │                            │
   │                         │  /finish-payment-       │                            │
   │                         │  schedule?id=csId       │                            │
   │                         ├────────────────────────▶│                            │
   │                         │                         │ 11. Verify status =        │
   │                         │                         │     pending_payment        │
   │                         │                         │ 12. Verify chưa quá 15phút │
   │                         │                         │ 13. Verify gateway orderId │
   │                         │                         │ 14. UPDATE status=pending  │
   │                         │                         │     pay=THANH_TOAN_X       │
   │                         │                         │     payStatus=DA_THANH_TOAN│
   │                         │                         │ 15. INSERT payment row     │
   │                         │ 16. 200 OK              │                            │
   │ 17. Swal success        │◀────────────────────────┤                            │
```

**Rẽ nhánh:**

- **(a) User đóng tab / hết 15 phút**: cron `releaseExpiredHolds()` chạy mỗi 1 phút quét `pending_payment` quá hạn → set `cancelled` → slot tự mở.
- **(b) Capacity hết khi reserve**: throw 417 "Ca tiêm đã đủ chỗ" — user phải chọn slot khác.
- **(c) Personalization fail**: throw 417 với lý do (chưa đủ khoảng cách mũi trước, sai độ tuổi, …).

### 6.2 Luồng admin duyệt + bác sĩ tiêm

```
Customer pay → CS.status=pending
       │
       ▼
Admin login /admin/registrations
       │
       │ 1. Duyệt (approve)
       ▼
CS.status=confirmed
       │
       │ 2. Gán bác sĩ
       │  POST /api/customer-schedule/admin/assign-doctor
       ▼
CS.doctor=Doctor X
       │
       ▼ (đến ngày tiêm)
Doctor login /doctor/today-queue
       │
       │ 3. Click "Sàng lọc" → ScreeningModal
       │  POST /api/doctor/doctor/screening/{id}
       │  body: { decision: inject | defer, screening: {...} }
       │
       ├── decision=inject ────────▶
       │   CS.status=injected
       │   CS.completedDate=now
       │   CS.healthStatusBefore=JSON
       │   → certService.generateAfterInjection
       │   → certService.sendCertificateEmail
       │
       └── decision=defer  ────────▶
           CS.status=not_injected
           CS.healthStatusBefore=JSON

(Nếu injected)
       │
       │ 4. Click "Theo dõi sau tiêm" → FollowupModal
       │  POST /api/doctor/doctor/followup/{id}
       │  body: { symptoms, observedTemperature, ... }
       ▼
CS.status=finished
CS.healthStatusAfter=JSON
```

**Validate ở `DoctorApi.screening`:**

1. `injectDate == today` (không cho tiêm sai ngày)
2. `status == confirmed`
3. `doctor.id == currentDoctor.id`

### 6.3 Luồng đổi lịch

```
Customer /lich-da-dang-ky → "🔄 Đổi lịch"
       │
       ▼
Modal hiện slot mới (DoiLich.js) + counter "Còn N/3 lần"
       │
       │ POST /api/customer-schedule/customer/change-schedule?id=X&timeId=Y
       ▼
CustomerScheduleService.change():
       │
       │ 1. status ∈ {pending, confirmed}        — sai → throw
       │ 2. còn ≥ 24h trước ngày tiêm           — sai → throw
       │ 3. newSlot != oldSlot                  — sai → throw
       │ 4. newSlot còn capacity                — sai → throw
       │ 5. counterChange < 3                   — sai → throw
       │ 6. INSERT ScheduleChangeHistory (from→to)
       │ 7. UPDATE cs.vaccineScheduleTime=newSlot
       │ 8. UPDATE cs.counterChange += 1
       │ 9. Gửi email scheduleChange (best-effort)
       ▼
200 OK → FE reload + đóng modal
```

Slot cũ **tự "mở"** vì query đếm slot là dynamic count `WHERE status != 'cancelled'`.

### 6.4 Luồng cấp + verify giấy chứng nhận

```
Doctor click "Đã tiêm"
       │
       ▼
VaccinationCertificateService.generateAfterInjection(csId)
       │
       │ - Tạo serialNo "IV-YYYY-NNNNNNNN" (retry 5 lần unique)
       │ - Snapshot: tên, ngày sinh, CCCD, vaccine, mũi số, trung tâm
       │ - injectionDate, issuedDate
       │ - hash = SHA-256(serial|csId|name|dob|idCard|vaccine|dose|injDate|SECRET)
       │ - frozen=true, revoked=false
       │ INSERT vaccination_certificate
       ▼
sendCertificateEmail → mail với link /verify/{serial}
       │
       │ Customer tải PDF tại /lich-da-dang-ky:
       │   GET /api/certificate/customer/by-schedule/{csId}
       │   → FE certificatePdf.js:
       │     1. Sinh QR data URL (qrcode lib)
       │     2. Render HTML template trong <iframe srcdoc=...>
       │     3. html2canvas-pro chụp → canvas
       │     4. jsPDF addImage → save "GiayXacNhan_{serial}.pdf"
       ▼
Bất kỳ ai quét QR → /verify/{serial}
       │
       │ GET /api/certificate/public/verify/{serial}
       │   → certService.verify(cert):
       │     - revoked? → false
       │     - recompute hash, compare → khớp → valid=true
       ▼
FE hiển thị "✓ HỢP LỆ" + thông tin đã mask CCCD
```

### 6.5 Luồng nhắc lịch tự động

```
@Scheduled cron 8:00 sáng — ReminderService.sendUpcomingInjectionReminders
       │
       │ 1. Tìm CS có injectDate = today+1
       │ 2. Filter status=confirmed
       │ 3. Check reminder_log đã gửi UPCOMING_INJECTION? → skip
       │ 4. Gửi email upcomingInjectionReminder (Thymeleaf)
       │ 5. INSERT reminder_log (success=true)
       ▼

@Scheduled cron 8:15 sáng — ReminderService.sendNextDoseReminders
       │
       │ 1. Vaccine có maxDose > 1 & minIntervalMonths > 0
       │ 2. Với mỗi User đã tiêm vaccine đó:
       │    - completed = count(injected|finished)
       │    - 0 < completed < maxDose
       │    - lastDate + minIntervalMonths = expectedNext
       │    - daysUntilNext ∈ [-30, 14]
       │    - chưa gửi NEXT_DOSE cho cặp user+vaccine
       │ 3. Gửi email nextDoseReminder
       │ 4. INSERT reminder_log
       ▼

@Scheduled fixedRate 60s — CustomerScheduleService.releaseExpiredHolds
       │
       │ 1. Tìm CS status=pending_payment AND createdDate < now-15min
       │ 2. UPDATE status=cancelled
       ▼
```

### 6.6 Luồng AI Chat (iVax)

```
User gõ tin nhắn vào widget AIChatbot
       │
       │ POST /api/chat-ai/ask
       │   headers: Authorization: Bearer <token> (nếu login)
       │   body: { message, sessionId }
       ▼
GroqService.chatWithAI(sessionId, message)
       │
       │ messages = [SYSTEM_PROMPT] + history(sessionId) + user_msg
       │
       │ Loop (max 3 rounds):
       │   1. POST groq.api-url
       │      body: { model, messages, tools[11], tool_choice: auto }
       │   2. Nhận assistant_msg
       │   3a. Không có tool_calls → đây là câu trả lời → break
       │   3b. Có tool_calls → execute mỗi tool → append "tool" message → loop
       │
       │ Save history (user_msg + final_answer)
       ▼
Trả về plain text → FE render
```

Các tool gọi DB live (qua VaccineRepository, CustomerScheduleRepository, …). Tool user-specific (`getMy*`) dùng `userUtils.getUserWithAuthority()` từ JWT.

---

## 7. Cấu trúc Database

### 7.1 Sơ đồ tổng quan (text-based ER)

```
            ┌──────────────┐         ┌────────────────────┐
            │  authority   │◀────────│       account      │
            │  (role)      │  N..1   │       (user)       │
            └──────────────┘         └──┬─────────────────┘
                                        │ 1
                                        │
                  ┌─────────────────────┼─────────────────────┐
                  │ 1                   │ 1                   │ 1
                  ▼ N                   ▼ N                   ▼ N
        ┌──────────────────┐   ┌──────────────────┐   ┌──────────────────┐
        │ customer_profile │   │    doctors       │   │     nurses       │
        └──────────────────┘   └────────┬─────────┘   └─────────┬────────┘
                                        │                       │
                                   ┌────┴───────┐         ┌─────┴───────┐
                                   ▼            ▼         ▼             ▼
                            (assigned to)  (chat with)   (assigned to) (chat)

   ┌──────────────────────┐     ┌─────────────────────┐    ┌──────────────────────┐
   │  manufacturers       │     │   vaccine_types     │    │     age_groups       │
   └────────┬─────────────┘     └──────────┬──────────┘    └─────────┬────────────┘
            │                              │                          │
            └────────────┐  ┌──────────────┘                          │
                         ▼  ▼                                          │
                  ┌───────────────┐                                    │
                  │    vaccine    │◀───────────────────────────────────┘
                  └───────┬───────┘
                          │ 1
              ┌───────────┴───────────┐
              │ N                     │ N
              ▼                       ▼
      ┌────────────────┐      ┌───────────────────┐
      │vaccine_schedule│      │ vaccine_inventory │
      │  (đợt tiêm)    │      │ (lô nhập kho)     │
      └────┬──────┬────┘      └────────┬──────────┘
           │      │                    │
           │ N    │ 1                  │ N
           ▼      ▼                    ▼
      ┌─────────┐ ┌────────────────┐  ┌──────────────────────┐
      │ centers │ │vaccine_schedule│  │ vaccine_distribution │
      └─────────┘ │     _time      │  └──────────────────────┘
                  │ (slot cụ thể)  │
                  └────────┬───────┘
                           │ 1
                           ▼ N
                  ┌──────────────────────────────────┐
                  │      customer_schedule           │
                  │  (đơn đăng ký tiêm — CORE)       │
                  ├──────────────────────────────────┤
                  │ - status: pending_payment/pending│
                  │   /confirmed/injected/finished   │
                  │   /not_injected/cancelled        │
                  │ - pay: VNPAY/PAYPAL/MOMO/CHUA    │
                  │ - healthStatusBefore (JSON TEXT) │
                  │ - healthStatusAfter  (JSON TEXT) │
                  │ - counterChange (đếm đổi lịch)   │
                  │ - bookingForOther                │
                  │ - account_id, doctor_id, nurse_id│
                  └──┬────────┬─────────┬─────────┬──┘
                     │        │         │         │
                ┌────┘    ┌───┘     ┌───┘      ┌──┘
                ▼ 1      ▼ 1       ▼ 1        ▼ 1
        ┌──────────┐ ┌────────┐ ┌──────────┐ ┌────────────────────────┐
        │ payment  │ │feedback│ │reminder_ │ │vaccination_certificate │
        │ (đối soát)│ │       │ │   log    │ │ (giấy chứng nhận)      │
        └──────────┘ └────────┘ └──────────┘ └────────────────────────┘

           ┌──────────────────────────┐
           │schedule_change_history   │
           │(audit log mỗi lần đổi)   │
           └──────────────────────────┘
                     │ N
                     └───▶ customer_schedule_id (FK soft)

       ┌──────────────┐      ┌─────────────────┐     ┌───────────────┐
       │   chatting   │      │     news        │     │    topics     │
       │ (msg userA-B)│      │ (bài viết)      │◀────│               │
       └──────────────┘      └────────┬────────┘     └───────────────┘
                                      │
                                      ▼
                              ┌────────────────┐
                              │ news_sources   │
                              └────────────────┘

                              ┌────────────────┐
                              │   comments     │  ─▶ vaccine / news / user
                              └────────────────┘
```

### 7.2 Bảng chi tiết

#### Nhóm A — Tài khoản & vai trò

**`authority`** — danh sách role  
`authority_id (PK)`, `name`

- Role đang dùng: `ROLE_ADMIN`, `ROLE_DOCTOR`, `ROLE_CUSTOMER`

**`account`** (entity `User`) — tài khoản đăng nhập  
`account_id (PK)`, `email`, `password`, `google_id`, `phone_number`, `actived` (bool), `created_date`, `login_type` (enum `UserType: standard|google|phone`), `activation_key`, `remember_key`, `authority_id (FK)`

**`customer_profile`** — hồ sơ chi tiết khách hàng  
`profile_id (PK)`, `full_name`, `gender`, `birthdate`, `phone`, `id_card (CMND/CCCD)`, `avatar`, `city`, `district`, `ward`, `street`, `insurance_status`, `contact_name`, `contact_relationship`, `contact_phone`, `created_date`, `customer_id (FK → account)`

**`doctors`** — hồ sơ bác sĩ  
`doctor_id (PK)`, `specialization`, `experience_years`, `bio`, `full_name`, `avatar`, `created_date`, `account_id (FK → account)`

**`nurses`** _(legacy — không dùng)_ — bảng y tá còn trong schema cho tương thích, không có UI tạo/sửa. Cùng cấu trúc với `doctors` (thay `specialization` → `qualification`).

#### Nhóm B — Vaccine & catalog

**`manufacturers`**: `manufacturer_id (PK)`, `name`, `country`, `created_date`

**`vaccine_types`** — cây phân loại (self-reference)  
`type_id (PK)`, `type_name`, `description`, `is_primary`, `vaccine_type_id (FK self)`, `created_date`

**`age_groups`**: `age_group_id (PK)`, `age_range`, `created_date`

**`vaccine`** — thông tin vaccine  
`id (PK)`, `name`, `description`, `image`, `price`, `quantity`, `inventory`, `status`, `expiration_date`, `max_dose`, `min_interval_months`, `type_id (FK)`, `manufacturer_id (FK)`, `age_group_id (FK)`, `created_date`

**`centers`** — trung tâm tiêm  
`center_id (PK)`, `center_name`, `city`, `district`, `ward`, `street`, `created_date`

**`vaccine_inventory`** — lô vaccine nhập kho  
`inventory_id (PK)`, `quantity`, `exported_quantity`, `import_date`, `export_date`, `expiration_date`, `status`, `vaccine_id (FK)`, `center_id (FK)`, `created_date`

**`vaccine_distribution`** — xuất/nhập kho  
`distribution_id (PK)`, `quantity`, `distribution_date`, `distribution_type` (enum `export|imports`), `inventory_id (FK)`

#### Nhóm C — Đợt tiêm & slot

**`vaccine_schedule`** — đợt tiêm chủng (campaign)  
`id (PK)`, `start_date`, `end_date`, `limit_people`, `price`, `description`, `vaccine_id (FK)`, `center_id (FK)`, `created_by (FK → account)`, `created_date`

**`vaccine_schedule_time`** — slot tiêm cụ thể  
`id (PK)`, `inject_date`, `start (Time)`, `end (Time)`, `limit_people`, `vaccine_schedule_id (FK)`

**`vaccine_schedule_doctor`** — gán bác sĩ vào đợt (theo ngày)  
`id (PK)`, `inject_date`, `doctor_id (FK)`, `vaccine_schedule_id (FK)`

**`vaccine_schedule_nurse`** _(legacy — không dùng)_. Cấu trúc tương tự `vaccine_schedule_doctor`.

#### Nhóm D — Đăng ký tiêm (core)

**`customer_schedule`** — đơn đăng ký tiêm  
| Cột | Kiểu | Ý nghĩa |
|---|---|---|
| `id` (PK) | bigint | |
| `created_date` | timestamp | |
| `full_name` | varchar | Tên bệnh nhân (có thể khác user) |
| `dob` | date | Ngày sinh |
| `phone` | varchar | |
| `id_card` | varchar(20) | CMND/CCCD |
| `address` | varchar | |
| `note` | varchar | |
| `health_status_before` | TEXT | JSON sàng lọc trước tiêm |
| `health_status_after` | TEXT | JSON theo dõi sau tiêm |
| `counter_change` | int | Số lần đã đổi lịch (max 3) |
| `pay_status` | varchar | enum `PayStatus: CHUA_THANH_TOAN | DA_THANH_TOAN` |
| `customer_schedule_pay` | varchar | enum `CustomerSchedulePay: THANH_TOAN_MOMO | THANH_TOAN_VNPAY | THANH_TOAN_PAYPAL | CHUA_THANH_TOAN` |
| `status` | varchar | enum `StatusCustomerSchedule: pending_payment, pending, confirmed, cancelled, finished, injected, not_injected` |
| `completed_date` | timestamp | Lúc tiêm xong |
| `booking_for_other` | bool | TRUE nếu đặt cho người khác |
| `account_id` | FK → account | User đặt |
| `vaccine_schedule_time_id` | FK | Slot |
| `doctor_id` | FK | Bác sĩ phụ trách |
| `nurse_id` | FK | Y tá phụ trách |

**`schedule_change_history`** — audit log đổi lịch  
`id (PK)`, `customer_schedule_id (soft FK)`, `from_time_id`, `from_inject_date`, `from_start`, `from_end`, `to_time_id`, `to_inject_date`, `to_start`, `to_end`, `changed_at`, `changed_by_user_id`

#### Nhóm E — Thanh toán

**`payment`** — đối soát giao dịch  
`id (PK)`, `amount`, `created_date`, `order_id`, `request_id`, `pay_type` (enum `PayType: TIEN_MAT|MOMO|VNPAY|PAYPAL`), `customer_schedule_id (FK)`, `created_by (FK → account)`

#### Nhóm F — Giấy chứng nhận

**`vaccination_certificate`** — snapshot immutable  
| Cột | Kiểu | |
|---|---|---|
| `id` (PK) | | |
| `serial_no` | varchar(40) UNIQUE | `IV-YYYY-NNNNNNNN` |
| `customer_schedule_id` | UNIQUE | 1-1 với CS |
| `full_name_snapshot`, `birthdate_snapshot`, `phone_snapshot`, `email_snapshot`, `address_snapshot`, `id_card_snapshot` | snapshot KH | |
| `vaccine_name`, `vaccine_manufacturer`, `vaccine_type` | snapshot vaccine | |
| `dose_number`, `total_doses` | int | Mũi thứ N / tổng M |
| `center_name`, `center_address` | snapshot center | |
| `doctor_name`, `nurse_name` | | |
| `injection_date`, `issued_date` | timestamp | |
| `hash` | varchar(128) | SHA-256 dùng để verify |
| `revoked` | bool | |
| `revoked_reason`, `revoked_by`, `revoked_date` | thông tin thu hồi | |
| `frozen`, `frozen_date` | cờ khoá | |

#### Nhóm G — Nhắc lịch

**`reminder_log`**  
`id (PK)`, `customer_schedule_id`, `user_id`, `recipient_email`, `recipient_name`, `type` (enum `ReminderType: UPCOMING_INJECTION|NEXT_DOSE`), `vaccine_name`, `subject_info`, `sent_at`, `success` (bool), `error_message`  
Index: `idx_reminder_schedule_type (customer_schedule_id, type)`, `idx_reminder_user (user_id)`

#### Nhóm H — Phụ trợ

**`feedback`** — phản hồi của khách  
`id (PK)`, `content`, `rating` (1-5), `response`, `feedback_type` (enum `general|doctor|nurse`), `customer_schedule_id (FK)`, `doctor_id (FK)`, `nurse_id (FK)`, `created_date`

**`chatting`** — tin nhắn realtime  
`id (PK)`, `content`, `is_file` (bool), `is_read` (bool), `file_name`, `sender (FK → account)`, `receiver (FK → account)`, `created_date`

**`news`** — bài viết  
`news_id (PK)`, `title`, `content`, `image`, `author_id (FK)`, `topic_id (FK)`, `created_date`

**`topics`**: `topic_id (PK)`, `topic_name`, `created_date`

**`news_sources`**: `source_id (PK)`, `source_name`, `source_url`, `news_id (FK)`

**`comments`**: `comment_id (PK)`, `content`, `likes_count`, `account_id (FK)`, `vaccine_id (FK)`, `news_id (FK)`, `parent_comment_id (FK self)`, `created_date`

### 7.3 Quan hệ chính (đã liệt kê khoá ngoại)

| Quan hệ                                                                    | Ràng buộc                                                         |
| -------------------------------------------------------------------------- | ----------------------------------------------------------------- |
| `account.authority_id` → `authority.authority_id`                          | N..1                                                              |
| `customer_profile.customer_id` → `account.account_id`                      | N..1 (mỗi user có 1 profile chính, nhưng query bằng `findByUser`) |
| `doctors.account_id` → `account.account_id`                                | 1..1 (logical)                                                    |
| `nurses.account_id` → `account.account_id`                                 | 1..1 (logical)                                                    |
| `vaccine.manufacturer_id/type_id/age_group_id`                             | N..1                                                              |
| `vaccine_schedule.vaccine_id/center_id`                                    | N..1                                                              |
| `vaccine_schedule_time.vaccine_schedule_id`                                | N..1                                                              |
| `customer_schedule.account_id/doctor_id/nurse_id/vaccine_schedule_time_id` | N..1                                                              |
| `payment.customer_schedule_id`                                             | N..1 (1 CS có thể nhiều payment nhưng thực tế 1)                  |
| `vaccination_certificate.customer_schedule_id`                             | UNIQUE → 1..1                                                     |
| `feedback.customer_schedule_id/doctor_id/nurse_id`                         | N..1                                                              |
| `chatting.sender/receiver` → `account.account_id`                          | N..1                                                              |
| `vaccine_inventory.vaccine_id/center_id`                                   | N..1                                                              |
| `vaccine_distribution.inventory_id`                                        | N..1                                                              |
| `reminder_log.customer_schedule_id/user_id`                                | soft FK (không khai báo @ManyToOne)                               |
| `schedule_change_history.customer_schedule_id`                             | soft FK                                                           |

---

## 8. Quy ước & lưu ý kỹ thuật

- **Status workflow `CustomerSchedule`**: `pending_payment → pending → confirmed → injected → finished`. Rẽ nhánh: `cancelled` (bất kỳ trạng thái nào trước khi tiêm), `not_injected` (bác sĩ quyết định hoãn).
- **Hold slot** chống race condition: slot count là dynamic query `count WHERE status != 'cancelled'`, nên `pending_payment` đã chiếm chỗ, `cancelled` không.
- **Đổi lịch** không xoá CS cũ, không đụng tới vaccineScheduleTime cũ → slot cũ tự mở qua dynamic count. Audit qua `ScheduleChangeHistory`.
- **Giấy chứng nhận immutable**: snapshot toàn bộ tại thời điểm cấp, không auto-heal nếu profile sửa về sau. Hash dùng seconds-precision (`getTime()/1000`) tránh bug MySQL truncate millis.
- **AI chat** không persist hội thoại — chỉ in-memory theo `sessionId` (giới hạn 10 round).
- **Cron jobs**: 8h sáng nhắc lịch ngày mai, 8h15 nhắc mũi tiếp theo, mỗi 1 phút release expired holds.
- **JWT**: `JwtAuthenticationFilter` chạy trên mọi request có header `Authorization: Bearer`; `chat-ai/ask` là public nhưng vẫn dùng JWT để biết user (nếu có) cho tool `getMy*`.
- **PDF cert**: Render trong `<iframe srcdoc>` cô lập CSS để tránh bug `oklch()` của html2canvas; dùng fork `html2canvas-pro`.
- **CCCD không bắt buộc khi đặt cho người khác** (cờ `bookingForOther=true`) — chỉ snapshot tên + ngày sinh + SĐT của người được tiêm.
- **`spring.jpa.hibernate.ddl-auto=update`**: DB tự cập nhật khi entity thay đổi (thêm enum value, thêm cột) — không cần migration thủ công.

---

_Tài liệu được sinh từ snapshot codebase iVaccine, cập nhật theo nhánh hiện tại với 99 task changelog._
