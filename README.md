# Salon Manager PWA

Ứng dụng web (PWA) quản lý đơn hàng cho salon, đăng nhập bằng Google, lưu dữ liệu vào Google Sheets qua Google Apps Script. Bản này ưu tiên đơn giản, không bao gồm tính năng offline/cache và không kèm các trang test/hướng dẫn riêng.

## Tính Năng Hiện Có
- Đăng nhập Google OAuth 2.0 (Google Identity Services) và whitelist email (`config.js`).
- Tạo đơn nhanh: chọn dịch vụ, nhập giá (nghìn đồng), ghi chú.
- Danh sách đơn trong ngày và xoá đơn.
- Thống kê: số đơn hôm nay, doanh thu hôm nay/tháng (đồng bộ từ API).
- PWA installable: Manifest + Service Worker tối thiểu (không cache offline).

## Không Bao Gồm (đã lược bỏ)
- Tìm kiếm/lọc nâng cao và export dữ liệu.
- Tính năng offline/cache, background sync.
- Các trang test và tài liệu hướng dẫn riêng lẻ.

## Cấu Trúc
- `index.html` — Trang chính (UI, Tailwind CDN, load các script).
- `config.js` — Cấu hình app (Client ID, API URL, whitelist, v.v.).
- `js/app.js` — Logic UI chính, đăng ký Service Worker.
- `js/auth.js` — Xác thực Google, quản lý phiên.
- `js/api.js` — Gọi API Apps Script (create/read/delete/stats) với fallback phù hợp.
- `js/utils.js` — Tiện ích lưu/xoá đơn và cập nhật UI.
- `css/styles.css` — Kiểu dáng tuỳ biến, tối ưu mobile.
- `manifest.json` — Manifest PWA (`start_url`/`scope` đặt là `.`).
- `sw.js` — Service Worker tối thiểu (pass‑through, không cache).
- `google-apps-script/Code.gs` — Backend Apps Script làm việc với Google Sheets.
- `.github/workflows/deploy.yml` — Deploy GitHub Pages.

## Cấu Hình Nhanh
1. Mở `config.js` và cập nhật:
   - `GOOGLE_CLIENT_ID`: Client ID (Web) từ Google Cloud Console.
   - `API_BASE_URL`: URL Web App đã deploy từ Apps Script.
   - `ALLOWED_EMAILS`: Danh sách email được phép đăng nhập.
   - `PRODUCTION_URL`: URL sản phẩm (ví dụ GitHub Pages).
2. Đảm bảo domain/trỏ host bạn dùng có trong danh sách Authorized JavaScript origins của OAuth (ví dụ `http://localhost:5500`, `http://localhost:8080`, domain production). Nếu không, đăng nhập Google sẽ không hoạt động.

## Chạy Local
- Yêu cầu chạy qua HTTP/HTTPS (không mở trực tiếp `file://`).
- Tuỳ chọn:
  - VS Code Live Server.
  - Python: `python -m http.server 8080`
  - Node serve: `npx serve -p 8080`
- Mở trình duyệt tới `http://localhost:8080` (hoặc port bạn chọn).

## Deploy (tùy chọn)
- GitHub Pages: repo đã có workflow. Push lên nhánh `main/master`, Pages sẽ phục vụ thư mục gốc.
- Vì `start_url`/`scope` dùng `.` nên app vẫn chạy đúng ở subpath.

## Lưu Ý Bảo Mật
- Client gửi `idToken` từ Google; server (Apps Script) xác minh token và kiểm tra whitelist email.
- Backend chỉ trả/cho phép thao tác với các đơn do chính email đang đăng nhập tạo.

