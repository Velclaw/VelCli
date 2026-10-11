<div align="center">

<img src="assets/velcli-logo.svg" width="128" alt="VelCli logo" />

# VelCli

### AI Engineering Workspace · Build · Deploy · Scale

**Từ ý tưởng đến ứng dụng — AI Agent, trình chỉnh sửa dự án và luồng triển khai trong một workspace.**

[🌐 Mở VelCli](https://velcli.dev) · [📦 Mã nguồn](https://github.com/Velclaw/VelCli) · [🛡️ VelclawHost](https://github.com/Velclaw/VelclawHost) · [Báo lỗi](https://github.com/Velclaw/VelCli/issues)

</div>

---

## 📸 Tổng quan ứng dụng

![VelCli — tổng quan giao diện AI Agent, Workspace Editor, Projects và VelclawHost](assets/velcli-app-overview.svg)

> Hình trên là minh họa giao diện sản phẩm để giới thiệu kiến trúc và các khu vực chính; trạng thái tính năng thực tế phụ thuộc bản đang chạy trên production.

## ✨ Các khu vực chính

| Khu vực | Vai trò |
|---|---|
| **AI Agent** | Nhận yêu cầu bằng ngôn ngữ tự nhiên và hỗ trợ các tác vụ phát triển phần mềm. |
| **Plan Mode** | Endpoint `/api/agent/plan` tạo kế hoạch JSON chỉ đọc, không gọi tool hoặc thực thi lệnh; yêu cầu phiên đăng nhập. |
| **Workspace Editor** | Duyệt tệp, chỉnh sửa mã nguồn và làm việc với bản xem trước. |
| **Projects & Chat History** | Quản lý dự án và lịch sử trò chuyện; cần cấu hình PostgreSQL để lưu dữ liệu có cấu trúc bền vững. |
| **VelclawHost** | Tầng điều phối hosting/deployment trong hệ sinh thái; repository riêng: [Velclaw/VelclawHost](https://github.com/Velclaw/VelclawHost). |
| **VelcliHub** | Khu vực dành cho template và tài nguyên có thể tái sử dụng. |
| **Community & Plugins** | Điểm mở rộng cho cộng đồng và tích hợp. |
| **Settings** | Khu vực cấu hình tùy chọn ứng dụng và provider khi được hỗ trợ. |

## 🧩 Tích hợp VelclawHost

VelCli và [VelclawHost](https://github.com/Velclaw/VelclawHost) là hai repository riêng trong cùng hệ sinh thái:

- **VelCli** là giao diện phát triển, AI Agent và workspace dự án.
- **VelclawHost** là dự án hosting/control plane cho các luồng dịch vụ và triển khai.
- Mục tiêu tích hợp là để người dùng đi từ workspace của VelCli đến luồng hosting/deployment của VelclawHost mà không phải nhập lại thông tin dự án.
- Liên kết repository ở đây không có nghĩa toàn bộ API deployment đã được kết nối tự động. Hãy xác minh endpoint, xác thực, quyền truy cập và trạng thái deployment trước khi bật luồng production.

## 🚀 Production & triển khai

- Ứng dụng: [https://velcli.dev](https://velcli.dev)
- Render: [Mở dashboard service](https://dashboard.render.com/web/srv-db40auqd0e5s73fbabog)
- Repository chính: [Velclaw/VelCli](https://github.com/Velclaw/VelCli)
- Hosting control plane: [Velclaw/VelclawHost](https://github.com/Velclaw/VelclawHost)

Build/start thường dùng:

```bash
npm install
npm run build
npm start
```

## 💾 Dữ liệu và lưu trữ

- **PostgreSQL:** cấu hình `DATABASE_URL` trong Render để lưu lịch sử chat, metadata dự án và lựa chọn dự án đang hoạt động khi backend hỗ trợ.
- **Workspace files:** tệp dự án cần cơ chế lưu bền vững riêng; filesystem tạm của hosting có thể bị xóa khi restart/redeploy.
- **Backup export:** sau khi đăng nhập, mở `/api/admin/backup` để tải JSON gồm lịch sử, dự án, cài đặt và workspace files. Endpoint chỉ cho phiên đã xác thực; hãy lưu file backup ở nơi an toàn.
- **Settings:** cài đặt người dùng cần được lưu theo tài khoản/phạm vi người dùng và khôi phục từ backend; không lưu các bí mật vào bảng settings.
- **Health check:** kiểm tra endpoint `/health`; trường `database.connected` cần là `true` để xác nhận ứng dụng kết nối được PostgreSQL. HTTP 200 một mình không chứng minh dữ liệu đã được ghi/đọc thành công.

## 🔐 Biến môi trường và bảo mật

Chỉ cấu hình secret trong **Render → Service → Environment**. Không commit giá trị bí mật vào GitHub, README, mã nguồn phía trình duyệt, lịch sử chat hoặc ảnh chụp màn hình.

| Biến | Mục đích |
|---|---|
| `DATABASE_URL` | Chuỗi kết nối PostgreSQL; chỉ lưu trong Render. |
| `VELCLI_ADMIN_PASSWORD` | Mật khẩu quản trị; đặt mật khẩu mạnh, riêng biệt trong Render. |
| `GEMINI_API_KEY` | Khóa API Gemini nếu dùng provider này; chỉ lưu trong Render. |
| `VELCLI_PROVIDER` | Tên provider được chọn, ví dụ `gemini`. |

Không chia sẻ giá trị của các biến này. Chỉ cấu hình những biến thực sự cần cho bản triển khai.

## 🛠️ Phát triển và xác minh

Trước mỗi lần phát hành:

1. Kiểm tra diff và loại bỏ secrets khỏi thay đổi.
2. Chạy build, kiểm tra kiểu và smoke tests hiện có.
3. Xác nhận Render deploy đúng commit mới và trạng thái là **Live**.
4. Kiểm tra `/health`, đăng nhập và các luồng chính.
5. Ghi rồi đọc lại dữ liệu kiểm thử qua PostgreSQL để xác minh persistence thực sự hoạt động.

## ⚠️ Giới hạn cần lưu ý

VelCli đang được phát triển tích cực. Không nên mặc định mọi khu vực giao diện đã có backend production hoàn chỉnh. Session trong bộ nhớ có thể mất khi tiến trình khởi động lại; shared admin password không thay thế hệ thống tài khoản nhiều người dùng; static preview và command allowlist không phải sandbox bảo mật toàn diện.

## 🤝 Đóng góp

Mở [GitHub Issues](https://github.com/Velclaw/VelCli/issues) hoặc gửi pull request. Khi báo lỗi, hãy cung cấp bước tái hiện và log đã loại bỏ thông tin nhạy cảm.

---

<div align="center">

**VelCli — Build · Deploy · Scale**

[velcli.dev](https://velcli.dev) · [VelclawHost](https://github.com/Velclaw/VelclawHost) · [GitHub](https://github.com/Velclaw/VelCli)

</div>
