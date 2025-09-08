# Salon Manager PWA

Ứng dụng web (PWA) quản lý đơn hàng cho salon, đăng nhập Google và lưu dữ liệu vào Google Sheets qua Google Apps Script. Bản hiện tại ưu tiên đơn giản, không có offline/cache, tập trung ổn định và cập nhật dễ.

## Tính năng hiện có
- Đăng nhập Google OAuth 2.0 (Google Identity Services) + whitelist email (`config.js`).
- Tạo đơn nhanh: chọn dịch vụ (emoji), nhập giá (nghìn đồng), ghi chú.
- Danh sách đơn trong ngày và xóa đơn.
- Thống kê: số đơn hôm nay, doanh thu ngày/tháng (đồng bộ từ API).
- PWA installable: Manifest + Service Worker tối thiểu (không cache offline), banner cập nhật “Có bản cập nhật — Tải lại”.
- Cache‑busting: tự động gắn `?v=APP_CONFIG.APP_VERSION` cho CSS/JS/manifest; SW đăng ký kèm version để nhận bản mới chắc chắn.

## Cấu trúc
- `index.html` — Trang chính; dynamic loader thêm `?v=` cho asset, banner cập nhật, UI mobile‑first.
- `config.js` — Cấu hình (Client ID, API URL, whitelist, `APP_VERSION`, `PRODUCTION_URL`).
- `js/app.js` — Logic UI, đăng ký SW (kèm version), toast emoji, normalize thông báo.
- `js/auth.js` — Xác thực Google (UTF‑8 tiếng Việt), quản lý phiên, revoke token an toàn.
- `js/api.js` — Gọi API Apps Script (create/orders/delete/stats) với POST + fallback `no-cors`/JSONP khi cần.
- `js/utils.js` — Tiện ích lưu/xóa đơn, cập nhật UI/thống kê.
- `css/styles.css` — Kiểu dáng tùy biến, tối ưu mobile.
- `manifest.json` — Manifest PWA (`start_url`/`scope` là `.`), icon PNG (any + maskable).
- `sw.js` — Service Worker (pass‑through; chỉ no‑store cho HTML/navigate).
- `google-apps-script/Code.gs` — Backend Apps Script làm việc với Google Sheets.
- `.github/workflows/deploy.yml` — Deploy GitHub Pages.

## Thiết lập nhanh
1. Mở `config.js` và cập nhật:
   - `GOOGLE_CLIENT_ID`: Client ID (Web) từ Google Cloud Console.
   - `API_BASE_URL`: URL Web App đã deploy từ Apps Script.
   - `ALLOWED_EMAILS`: Danh sách email được phép đăng nhập.
   - `PRODUCTION_URL`: URL sản phẩm (ví dụ GitHub Pages).
   - `APP_VERSION`: tăng khi phát hành để cache‑bust và cập nhật SW.
2. Đảm bảo domain/host bạn dùng có trong Authorized JavaScript origins của OAuth (ví dụ `http://localhost:5500`, `http://localhost:8080`, domain production).

## Chạy local
- Yêu cầu chạy qua HTTP/HTTPS (không mở trực tiếp `file://`).
- Tuỳ chọn:
  - VS Code Live Server.
  - Python: `python -m http.server 8080`
  - Node serve: `npx serve -p 8080`
- Mở trình duyệt tới `http://localhost:8080` (hoặc port bạn chọn).

## Deploy (tùy chọn)
- GitHub Pages: repo đã có workflow. Push lên `main/master`, Pages sẽ phục vụ thư mục gốc.
- Vì `start_url`/`scope` dùng `.` nên app chạy đúng ở subpath.

## PWA & Cập nhật
- SW: không cache offline; chỉ no‑store cho HTML (navigations). JS/CSS/ảnh dùng cache trình duyệt mặc định.
- Loader tự thêm `?v=APP_VERSION` cho `css/styles.css`, `manifest.json`, `js/*.js` để đảm bảo nhận bản mới.
- SW đăng ký với `sw.js?v=APP_VERSION` để đảm bảo phát hiện SW mới khi phát hành.
- Banner cập nhật: hiển thị khi có SW mới; chỉ reload khi người dùng bấm “Tải lại”.

## Backend Apps Script (Google Sheets)
- Xác minh `idToken` (Google tokeninfo) + whitelist email server‑side.
- Chỉ trả và cho phép thao tác trên đơn do chính email đăng nhập tạo.
- `getOrders`: đọc sheet từ cuối lên (mới→cũ), lọc theo ngày (`date`) và `employee`, giới hạn `limit`, dừng sớm để nhanh.
- `getStats`: tính trong tháng hiện tại (bottom‑up), dừng khi qua đầu tháng; tính cả hôm nay.

## Icon PWA
- PNG khuyến nghị đã dùng:
  - `icons/icon-192.png` (any)
  - `icons/icon-512.png` (any)
  - `icons/icon-512-maskable.png` (maskable)
  - `icons/apple-touch-icon.png` (180×180, iOS)

## Gợi ý nâng cấp (khi cần)
- Tối ưu build Tailwind (purge) cho production để giảm tải đầu.
- Phân mảnh dữ liệu theo tháng (mỗi tháng 1 sheet) nếu số dòng tăng lớn.
- Nếu muốn hạn chế JSONP: tiếp tục ưu tiên POST; JSONP chỉ dùng cho “đọc” khi thật sự cần.

