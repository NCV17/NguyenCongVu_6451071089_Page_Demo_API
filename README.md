# Facebook Webhook & Kafka Integration System

Hệ thống này được thiết kế để nhận các sự kiện thời gian thực từ Facebook Page (như bình luận, tin nhắn, bài viết), chuẩn hóa dữ liệu và xử lý thông qua Kafka.

## 1. Kiến trúc hệ thống

Hệ thống hoạt động theo luồng sau:
1. **Facebook Webhook**: Facebook gửi sự kiện (POST request) đến endpoint `/webhook`.
2. **Webhook Route**: Kiểm tra tính hợp lệ của request và gửi đến module chuẩn hóa.
3. **Normalization**: Chuyển đổi các cấu trúc dữ liệu khác nhau của Facebook thành một schema chung.
4. **Kafka Producer**: Đẩy dữ liệu đã chuẩn hóa vào Kafka topic `raw_events`.
5. **Kafka Broker**: Lưu trữ và quản lý các sự kiện trong hàng đợi.
6. **Kafka Consumer**: Đọc dữ liệu từ topic `raw_events` để thực hiện các xử lý tiếp theo (lưu DB, gửi thông báo...).

## 2. Cấu trúc thư mục chính

- `routes/webhookRoutes.js`: Xử lý xác thực và nhận sự kiện từ Facebook.
- `kafka/producer.js`: Logic gửi dữ liệu vào Kafka.
- `kafka/consumer.js`: Logic nhận và xử lý dữ liệu từ Kafka.
- `utils/normalize.js`: Công cụ chuẩn hóa dữ liệu Facebook (comment, message, post).
- `server.js`: File chạy chính của ứng dụng Node.js.
- `docker-compose.yml`: Cấu hình chạy toàn bộ hệ thống (Kafka, Zookeeper, App).

## 3. Cách vận hành và chạy dự án

### Cách 1: Chạy bằng Docker (Khuyên dùng)
Đây là cách nhanh nhất vì Docker sẽ tự cài đặt Kafka và các thành phần liên quan.

1. Đảm bảo bạn đã cài đặt **Docker** và **Docker Compose**.
2. Mở terminal tại thư mục gốc của dự án.
3. Chạy lệnh:
   ```bash
   docker-compose up --build
   ```
4. Hệ thống sẽ khởi động:
   - Zookeeper: Cổng 2181
   - Kafka: Cổng 9092
   - Node.js App: Cổng 3001

### Cách 2: Chạy thủ công trên máy local
1. Cài đặt các thư viện:
   ```bash
   npm install
   ```
2. Đảm bảo bạn đã có Kafka đang chạy tại `localhost:9092`.
3. Khởi động ứng dụng:
   ```bash
   npm start
   ```

## 4. Cấu hình Facebook Webhook

Để nhận được sự kiện thực tế, bạn cần cấu hình trên [Meta Developers](https://developers.facebook.com/):

1. **Callback URL**: `https://<ten-mien-cua-ban>/webhook`
   - *Lưu ý: Nếu chạy local, bạn cần dùng công cụ như **Ngrok** để tạo domain công khai trỏ về cổng 3001.*
2. **Verify Token**: `abc123` (Phải khớp với giá trị `VERIFY_TOKEN` trong file `.env`).
3. **Webhooks Fields**: Đăng ký các trường sau để nhận dữ liệu:
   - `feed` (đối với bài viết)
   - `comments` (đối với bình luận)
   - `messages` (đối với tin nhắn)

## 5. File cấu hình .env

File `.env` quản lý các tham số quan trọng:
```env
PORT=3001
VERIFY_TOKEN=....
KAFKA_BROKER=localhost:9092
TOPIC_NAME=raw_events
```

## 6. Kiểm tra kết quả

- Khi có sự kiện từ Facebook gửi đến, bạn sẽ thấy log trong console của Node.js:
  - `Event sent to topic raw_events`: Producer đã gửi thành công.
  - `--- New Event Consumed ---`: Consumer đã nhận và đang xử lý dữ liệu đã chuẩn hóa.

Schema dữ liệu chuẩn hóa sẽ có dạng:
```json
{
  "event_type": "comment",
  "source": "facebook",
  "page_id": "123456789",
  "message": "Nội dung bình luận",
  "created_at": "2026-04-25T..."
}
```
