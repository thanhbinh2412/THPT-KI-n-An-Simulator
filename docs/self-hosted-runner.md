# Deploy bằng GitHub Actions self-hosted runner

Workflow `.github/workflows/container-deploy.yml` build image lên GHCR bằng GitHub-hosted runner, rồi deploy trên server bằng self-hosted runner. Không cần SSH secrets trong repository.

## Chuẩn bị server

1. Cài Docker Engine và Docker Compose plugin trên máy chủ Linux.
2. Tạo runner tại **GitHub repository → Settings → Actions → Runners → New self-hosted runner**. Chọn Linux x64, sau đó chạy các lệnh GitHub cung cấp trên server.
3. Cài runner dưới dạng service, và bảo đảm tài khoản chạy runner được phép gọi Docker (thường là thêm tài khoản vào nhóm `docker`).
4. Tạo thư mục `/opt/kien-an-school-simulator`, rồi tạo file `/opt/kien-an-school-simulator/.env` dựa trên `.env.example`. File này chỉ nằm trên server và không commit.

## Thiết lập repository

- Vào **Settings → Actions → General → Workflow permissions** và chọn **Read and write permissions** để workflow có thể publish image lên GHCR.
- Vào **Settings → Environments → production** và tạo environment `production`. Có thể bật required reviewers để duyệt trước mỗi lần deploy.
- Nếu server không dùng đường dẫn hoặc cổng mặc định, tạo environment variables `SERVER_APP_DIR` và `SERVER_PORT` trong environment `production`.
- GHCR package phải cho repository này quyền truy cập (Package settings → Manage Actions access). Token mặc định của workflow có quyền `packages: read` để runner pull image.

## Cách chạy

Mặc định deploy map cổng `3006` trên server tới cổng `3000` trong container (`3006:3000`). Thiết lập environment variable `SERVER_PORT` trong environment `production` nếu cần dùng một cổng host khác.

Mỗi push vào nhánh `develop` sẽ build image và deploy tự động. Có thể chạy lại thủ công bằng **Actions → Build and deploy school simulator → Run workflow**.

Runner cần có các nhãn `self-hosted`, `linux` và `x64`, đồng thời chỉ nên dùng cho production của repository này.
