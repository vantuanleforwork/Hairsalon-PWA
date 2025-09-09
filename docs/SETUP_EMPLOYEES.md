Thiết Lập Email Nhân Viên (dành cho chủ cửa hàng không rành kỹ thuật)

Tổng quan
- App dùng Google Đăng Nhập. Quyền đăng nhập dựa trên danh sách email có trong Google Sheet tab “Nhân viên”.
- Chủ cửa hàng chỉ cần mở Google Sheet và thêm email, không cần sửa mã.

Bước thực hiện
1) Mở Google Sheet được liên kết (Spreadsheet ID nằm trong Apps Script `CONFIG.SPREADSHEET_ID`).
2) Tìm tab “Nhân viên”. Lần đầu, hệ thống sẽ tự tạo tab này (nếu chưa có) với các cột: Email, Tên nhân viên, Vai trò.
3) Thêm/sửa email trực tiếp trong Sheet “Nhân viên”:
   - Email: nhập địa chỉ email nhân viên.
   - Tên nhân viên: tên hiển thị để chủ dễ nhận.
   - Vai trò: tùy chọn; ví dụ “chủ”, “nhân viên”.
4) Nhân viên chỉ đăng nhập được khi email có Active=TRUE. Không cần deploy lại.

Ghi chú
- Có thể tạo Google Form liên kết tab “Nhân viên” để nhân viên tự gửi yêu cầu; chủ chỉ cần thêm email vào danh sách là có thể đăng nhập.

Khắc phục sự cố
- Nếu nhân viên không đăng nhập được: kiểm tra cột Active có TRUE, email có đúng chính tả, và đã xác minh email Google.
- Nếu tab Employees không xuất hiện: mở app gọi bất kỳ API (hoặc chạy Apps Script) để hệ thống tự khởi tạo; hoặc tạo thủ công tab Employees với đúng tiêu đề cột.
