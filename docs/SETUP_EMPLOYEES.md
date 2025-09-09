Thiết Lập Email Nhân Viên (dành cho chủ cửa hàng)

Tổng quan
- Ứng dụng dùng Đăng nhập Google. Quyền đăng nhập dựa trên danh sách email có trong Google Sheet tab “Nhân viên”.
- Chủ cửa hàng chỉ cần mở Google Sheet và thêm email, không cần sửa mã hay deploy lại.

Các bước thực hiện
1) Mở Google Sheet đã liên kết (Spreadsheet ID nằm trong Apps Script `CONFIG.SPREADSHEET_ID`).
2) Tìm tab “Nhân viên”. Lần đầu, hệ thống sẽ tự tạo tab này (nếu chưa có) với các cột: Email, Tên nhân viên, Vai trò.
3) Thêm/sửa dữ liệu trong tab “Nhân viên”:
   - Email: nhập địa chỉ email nhân viên.
   - Tên nhân viên: tên hiển thị trong ứng dụng.
   - Vai trò: tùy chọn; ví dụ “Quản lý”, “Nhân viên”.
4) Nhân viên được đăng nhập nếu email xuất hiện trong tab “Nhân viên”. Không cần cột Active.

Ghi chú
- Có thể tạo Google Form liên kết tab “Nhân viên” để nhân viên tự gửi yêu cầu; chủ chỉ cần thêm email vào danh sách là có thể đăng nhập.

Khắc phục sự cố
- Nếu nhân viên không đăng nhập được: đảm bảo email được thêm đúng chính tả trong tab “Nhân viên” và email Google đã được xác minh.
- Nếu tab “Nhân viên” không xuất hiện: mở ứng dụng để gọi API (hoặc chạy Apps Script) để hệ thống tự khởi tạo; hoặc tạo thủ công tab “Nhân viên” với đúng tiêu đề cột.

