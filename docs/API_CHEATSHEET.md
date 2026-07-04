# VNPT AI Hackathon — Tài liệu API tích hợp (cheatsheet)

> File này tổng hợp **tất cả** API VNPT cần dùng cho Phylab. Đọc 1 lần — tra cứu mãi.
> Nguồn: `API_document/` (đã đọc ngày 2026-07-02).

---

## 0. Auth chung cho hầu hết API

```
Headers:
  Authorization:  Bearer ${access_token}
  Token-id:        ${token_id}
  Token-key:       ${token_key}
  Content-Type:    application/json    (hoặc multipart/form-data cho upload)
  mac-address:     TEST1               (bắt buộc cho AI endpoints; SmartVision dùng value khác)
```

- `access_token` hết hạn ~8 tiếng → cần **tự refresh**.
- `token_id`, `token_key` cố định (lấy từ Dashboard VNPT).
- Test mode `mac-address` thường là `TEST1`, `EGOV-DIGDOC-WEB-API` (cho SmartReader) hoặc giá trị bất kỳ VNPT cho phép.

---

## 1. VNPT eKYC — `https://api.idg.vnpt.vn`

**Docs đầy đủ**: trang `https://ekyc.vnpt.vn/admin-dashboard/vi/documents/api` (xem trong repo nếu cần).

### 1.1 Upload file → lấy hash
```
POST /file-service/v1/addFile
Body (multipart/form-data): file, title, description
→ { hash: "idg-..." }   ← hash này là đầu vào cho các API AI dưới
```

### 1.2 Phân loại giấy tờ
```
POST /ai/v1/classify/id
Body: { img_card: <hash>, client_session, token }
→ { type: 0|1|2|3|4|5, name: "old_front" }
  (0,1: CMT cũ; 2,3: CCCD; 4: khác; 5: hộ chiếu)
```

### 1.3 Kiểm tra giấy tờ thật/giả
```
POST /ai/v1/card/liveness
Body: { img: <hash>, client_session }
→ { liveness: "success|failure", face_swapping, fake_liveness }
```

### 1.4 OCR mặt trước CCCD
```
POST /ai/v1/ocr/id/front
Body: { img_front: <hash>, client_session, type, validate_postcode, token }
→ { name, birth_day, gender, id, origin_location, recent_location, ... }
```

### 1.5 OCR mặt sau CCCD
```
POST /ai/v1/ocr/id/back
Body: { img_back: <hash>, client_session, type, token }
→ { issue_date, issue_place, ... }
```

### 1.6 OCR cả 2 mặt (gộp)
```
POST /ai/v1/ocr/id
Body: { img_front, img_back, client_session, type, crop_param, validate_postcode, token }
→ kết hợp 1.4 + 1.5
```

### 1.7 So sánh mặt CCCD ↔ selfie
```
POST /ai/v1/face/compare
Body: { img_front, img_face, client_session, token }
→ { msg: "MATCH|NOMATCH", prob: 0..100 }
```

### 1.8 Kiểm tra người thật (liveness)
```
POST /ai/v1/face/liveness
Body: { img, client_session, token }
→ { liveness: "success|failure", is_eye_open: "yes|no" }
```

### 1.9 Kiểm tra đeo khẩu trang
```
POST /ai/v1/face/mask
Body: { img, face_bbox, face_lmark, client_session }
→ { masked: "yes|no" }
```

### 1.10 Thêm khuôn mặt vào DB
```
POST /face-service/face/add
Body: { bbox, landmark, customer_information: {...}, unit }
→ { customer_id }
```

### 1.11 Xác thực theo ID
```
POST /face-service/face/verify
Body: { id_card, id_type: "CARD_ID|PASSPORT_ID|...", img, unit }
→ { msg: "MATCH|NOMATCH", prob }
```

### 1.12 Tìm 1 khuôn mặt giống nhất
```
POST /face-service/face/search
Body: { img, unit }
→ { customer_information, face_probability }
```

### 1.13 Tìm top-K
```
POST /face-service/face/search-k
Body: { img, unit, k, threshold }
→ { customer_informations: [...] }
```

### Type codes
```
type: -1 (CMT/CCCD), 5 (hộ chiếu), 6 (bằng lái), 7 (CM quân đội)
id_type: CARD_ID | PASSPORT_ID | DRIVER_LICENSE_ID | MILITARY_ID | POLICE_ID | OTHER_ID
```

### Mã lỗi chung
```
IDG-00000000 = thành công
IDG-00010102 = dữ liệu đầu vào sai
IDG-00000500 = lỗi hệ thống
IDG-00000400 = bad request
```

---

## 2. VNPT SmartBot — `https://assistant-stream.vnpt.vn`

### 2.1 Gửi tin nhắn (streaming)
```
POST /v1/conversation
Headers: Authorization, Token-id, Token-key, Content-Type: application/json
Body: {
  bot_id,                  // bot tạo trên platform SmartBot
  sender_id,               // ID user (mapping HS - lớp)
  text,                    // câu hỏi
  input_channel,           // "platform" | "livechat" | ...
  session_id,              // session của user
  metadata: { button_variables: [{ variableName, value }] },
  settings: { system_prompt, advance_prompt }
}
→ {
  message: "IDG-00000200",
  object: {
    sb: {
      card_data: [         // MẢNG card (text/image/quickreply/carousel)
        {
          type: "text|quickreply|image|carousel|chuyen_gdv",
          text, audio_url, play_type: "text|audio|both",
          buttons: [{ title, payload, type: "postback|web_url|phone_number", color, icon }]
        }
      ],
      card_data_info: { status: 0|1|2, totals, current }
    }
  }
}
```

**status codes trong card_data_info:**
- `0`: bản tin cuối, không streaming
- `1`: bản tin giữa (đang streaming)
- `2`: bản tin cuối (có streaming)

### 2.2 Standard API (non-streaming)
```
POST /assistant-service/v1/standard/sb
Body: { bot_id, sender_id, text, input_channel, tts_config: { model, region } }
→ giống trên
```

### 2.3 Settings / Prompts
- `system_prompt`: thiết lập bot là ai
- `advance_prompt`: hướng dẫn bot làm tác vụ (cần bật "tri thức nâng cao" trên bot)

### 2.4 Metadata
- Truyền biến từ app → bot: `metadata.button_variables[]`
- Bot phải khai báo biến trước thì mới nhận.

---

## 3. VNPT SmartReader (OCR) — `https://api.idg.vnpt.vn`

> Cùng base với eKYC. **mac-address** = `EGOV-DIGDOC-WEB-API` (Postman sample).

### 3.1 Upload file
```
POST /file-service/v1/addFile
Body (form-data): file, title, description
→ { object: { hash, fileType } }
```

### 3.2 OCR cơ bản (sync)
```
POST /rpa-service/aidigdoc/v1/ocr/scan
Body: {
  file_hash: <hash từ 3.1>,
  file_type: "pdf|jpg|png|...",
  token: "chuỗi-id-bất-kỳ",
  client_session: "...",
  details: true
}
→ text OCR
```

### 3.3 OCR nâng cao (sync) — có table
```
POST /rpa-service/aidigdoc/v1/ocr/scan-table
Body: giống 3.2
→ text + table structure
```

### 3.4 OCR nâng cao (async) — file lớn
```
POST /rpa-service/aidigdoc/v1/integration/ocr/scan-table
Body: giống 3.2 + exporter: "json"
→ { session_id }
```

### 3.5 Lấy kết quả OCR async
```
POST /rpa-service/aidigdoc/v1/integration/ocr/scan-table/result
Body: { session_id }
→ text + table structure
```

### 3.6 Hủy OCR async
```
POST /rpa-service/aidigdoc/v1/integration/ocr/scan-table/cancel
Body: { session_id }
```

**Lưu ý**: OCR trên dev chậm hơn production nhiều.

---

## 4. VNPT SmartVision — `https://api.idg.vnpt.vn`

### 4.1 Phát hiện người
```
POST /data-service/v1/smartvision/detect-people
Body: { data: <url ảnh> }
→ {
  info: {
    human_bboxs: [[xmin,ymin,xmax,ymax], ...],
    human_scores: [0..1, ...],
    human_class: [0, ...]
  }
}
```

### 4.2 Phát hiện phương tiện + biển số
```
POST /data-service/v1/smartvision/detect-vehicle
Body: { data: <url ảnh>, max_object: 10 }
→ {
  info: {
    vehicle_coords, vehicle_classes (0:motor, 1:car, 2:bus, 3:truck, 4:bicycle),
    vehicle_probs, lp_probs, lpr (biển số - "" nếu không đọc được)
  }
}
```

### 4.3 Nhận diện khuôn mặt
```
POST /data-service/v1/smartvision/detect-face
Body: { data: <url ảnh>, max_object: 10 }
→ {
  info: {
    face_bboxs: [[xmin,ymin,xmax,ymax], ...],
    face_embeddings: "<base64 string - 512-dim vector>",
    face_scores: [0..1],
    face_landmarks: [[[x,y], ...], ...]    // 5 điểm mỗi mặt
  }
}
```

### 4.4 Upload file
```
POST /file-service/v1/addFile
→ { hash }
```

### 4.5 Lấy link download
```
GET /proxy-service/url-file?hash=<hash>
→ { object: { url } }
```

**Lưu ý**: SmartVision cần **URL ảnh** chứ không phải hash — phải upload trước rồi gọi `/url-file` để lấy URL.

---

## 5. VNPT SmartVoice (TTS) — `https://api.idg.vnpt.vn`

> ⚠️ **Auth KHÁC các API khác**: SmartVoice dùng **OAuth riêng** (username/password/client_id/client_secret) để lấy access_token, sau đó mới gọi API TTS với Bearer + Token-id + Token-key (giống eKYC/SmartReader).

### 5.0 Lấy access_token (OAuth riêng)
```
POST /auth-service/oauth/token
Headers: Content-Type: application/json
Body (JSON):
  {
    "username": "...",          // Email đăng nhập
    "password": "...",
    "client_id": "...",         // do VNPT cấp
    "client_secret": "...",
    "grant_type": "..."
  }
→ {
    "access_token": "...",
    "token_type": "Bearer",
    "refresh_token": "...",
    "expires_in": ...,
    "scope": "..."
  }
```

### 5.1 TTS cơ bản (gRPC, nhanh — callbot)
```
POST /tts-service/v2/grpc
Headers: Authorization (Bearer), Token-id, Token-key, Content-Type: application/json
Body: {
  text,                       // 1-5000 ký tự
  text_split: bool,           // true: chia đoạn nhỏ
  region: "female_north" | "female_north_ngochoa" | "female_central" | "female_south"
       | "male_north" | "male_central" | "male_south",   // default: female_north
  audio_format: "wav" | "mp3",  // default: wav
  sample_rate: 8000 | 22050,    // 8000=callbot, 22050=đọc báo
  speed: 0.5..2,                // default 1.0
  prosody: -1..1,               // default 0
  auto_silence: bool,           // default false
  use_abbr_converter: bool,
  domain: "general" | "vinaphone",  // default: general
  clear_cached: bool,
  captcha: "..."                // nếu bật captcha
}
→ { message, object: { code: "success|error|pending", playlist: [{idx, text, text_len, total, audio_link}], r_audio_full, text_id, ... } }
```

### 5.2 TTS nâng cao v2 (sync — đọc báo/sách)
```
POST /tts-service/v2/standard
Body: giống 5.1 + thêm:
  model: "news" | "books",     // default: news
  combine_final: bool,         // gộp audio các đoạn
```
**Giọng Ngọc Hoa**: `region: "female_north_ngochoa"`
**Mẹo thêm khoảng lặng**: chèn `<br 0.3>` sau dấu chấm, `<br 0.5>` xuống đoạn

### 5.3 TTS nâng cao v1 (async)
```
POST /tts-service/v1/standard
Body: giống 5.2
→ { code: "success", text_id, version }
  // KHÔNG có audio_link ngay — phải check-status
```

### 5.4 Check kết quả async
```
POST /tts-service/v1/check-status
Body: { text_id: "..." }
→ { code: "success|pending|error", playlist: [{ audio_link, ... }] }
```

### 5.5 Lưu ý quan trọng
- **Audio link cache 24h** trên server VNPT → phải **download về media server riêng** nếu muốn giữ lâu dài
- **Audio_link là URL HTTPS** (không phải base64) → frontend chỉ cần `<audio src={audio_link}>`
- **Cùng base URL** với eKYC/SmartReader nhưng **token khác nhau hoàn toàn**
- **KHÔNG dùng được** Token-id/Token-key của SmartReader/SmartBot cho SmartVoice (cần OAuth riêng)

---

## 6. VNPT vnFace — `https://api-vnface.vnpt.vn` (production) | `https://api-vnface-dev.icenter.ai` (dev)

> Đây là hệ thống chấm công của VNPT — chỉ phần liên quan đến **quản lý nhân viên / chấm công**.
> Auth KHÁC: `Token-Channel` thay cho `Token-id/Token-key`.

### 6.1 Lấy lịch sử checkin
```
GET /checkin-service/external/his-checkin/list-filter
Headers: Authorization, Token-Channel
Query: startDate, endDate (dd/MM/yyyy HH:mm:ss), page, maxSize, userCodes, filterMode (1|2)
```

### 6.2 Tạo mới nhân viên
```
POST /checkin-service/external/account
Headers: Authorization, Token-Channel, Content-Type: multipart/form-data
Body (form-data): userCode, fullName, email, gender (MALE|FEMALE), phoneNumber,
                  imageFile, groupCodes[], accountChannels (JSON string),
                  password, type (0|5), activeDate, expireDate, accountReason
→ thông tin nhân viên + uuidAccount
```

### 6.3 Cập nhật nhân viên
```
POST /checkin-service/external/account/update
Headers: giống 6.2
Body: giống 6.2 + newUserCode (nếu đổi mã)
```

### 6.4 Xóa nhân viên
```
DELETE /checkin-service/external/account/list
Headers: Authorization, Token-Channel
Body: { userCodes: [...] }
```

### 6.5 Lấy danh sách nhân viên
```
GET /checkin-service/external/account/list
Query: startDate, endDate, page, maxSize, uuidGroup, keySearch
→ [{ uuidAccount, userCode, gender, fullName, imageUrl, lastUpdate }, ...]
```

### 6.6 Lấy chi tiết 1 nhân viên
```
GET /checkin-service/external/account/{userCode}
```

### 6.7 Gửi thông báo (telegram/viber/zalo/fb)
```
POST /checkin-service/external/notify/account
Body: { userCodes[], channels[], content }
```

### 6.8 Lấy danh sách đơn vị
```
GET /checkin-service/external/group/list
```

### 6.9 Lấy ca làm việc
```
GET /checkin-service/external/shift/list
```

### AccountChannel object (cho accountChannels JSON string)
```
{
  uuidChannelCategory: "1|2|3|4",   // 1=viber, 2=telegram, 3=facebook, 4=zalo
  status: 0|1|2,                    // 0=chưa đăng ký, 1=đăng ký, 2=hủy
  userOTT: int
}
```

---

## 7. Tổng hợp base URL theo service

| Service | Base URL | Auth headers đặc biệt |
|---|---|---|
| eKYC | `https://api.idg.vnpt.vn` | `Token-id`, `Token-key`, `mac-address: TEST1` |
| SmartBot | `https://assistant-stream.vnpt.vn` | `Token-id`, `Token-key` |
| SmartReader | `https://api.idg.vnpt.vn` | `mac-address: EGOV-DIGDOC-WEB-API` |
| SmartVision | `https://api.idg.vnpt.vn` | `Token-id`, `Token-key`, `mac-address` |
| SmartVoice | ❓ chưa rõ | ❓ |
| vnFace (prod) | `https://api-vnface.vnpt.vn` | `Token-Channel` |
| vnFace (dev) | `https://api-vnface-dev.icenter.ai` | `Token-Channel` |

---

## 8. Mẫu flow Phylab sẽ dùng

### 8.1 Quét đề bài bằng OCR
```
1. Client upload ảnh → POST /api/vnpt/reader/upload (Next.js server route)
2. Server gọi VNPT /file-service/v1/addFile → lấy hash
3. Server gọi VNPT /rpa-service/aidigdoc/v1/ocr/scan-table → lấy text
4. Server trả text về client
5. Client match text với danh sách bài học → % confidence
```

### 8.2 Chatbot hỗ trợ thí nghiệm
```
1. Client → POST /api/vnpt/bot/chat với { message, session_id }
2. Server gọi VNPT /v1/conversation với metadata chứa (lesson_id, step)
3. Server parse card_data → trả về client
4. Client render text + buttons
```

### 8.3 Đăng ký học sinh bằng CCCD
```
1. Client upload ảnh CCCD → /api/vnpt/ekYC/upload
2. Server gọi /file-service/v1/addFile → hash
3. Server gọi /ai/v1/classify/id → type
4. Server gọi /ai/v1/ocr/id (cả 2 mặt) → name, dob, id...
5. Server trả về form pre-fill
```

### 8.4 Chấm danh bằng khuôn mặt
```
1. Client upload ảnh HS → /api/vnpt/vision/upload
2. Server gọi /file-service/v1/addFile → hash
3. Server gọi /proxy-service/url-file → URL
4. Server gọi /data-service/v1/smartvision/detect-face → embedding
5. So sánh với DB HS (đã lưu từ trước) → match
```

---

## 9. Env variables cần có trong `.env.local`

```bash
# VNPT eKYC
VNPT_EKYC_BASE_URL=https://api.idg.vnpt.vn
VNPT_EKYC_TOKEN_ID=
VNPT_EKYC_TOKEN_KEY=
VNPT_EKYC_ACCESS_TOKEN=

# VNPT SmartBot
VNPT_BOT_BASE_URL=https://assistant-stream.vnpt.vn
VNPT_BOT_TOKEN_ID=
VNPT_BOT_TOKEN_KEY=
VNPT_BOT_ACCESS_TOKEN=
VNPT_BOT_ID=

# VNPT SmartReader (OCR)
VNPT_READER_BASE_URL=https://api.idg.vnpt.vn
VNPT_READER_TOKEN_ID=
VNPT_READER_TOKEN_KEY=
VNPT_READER_ACCESS_TOKEN=

# VNPT SmartVision
VNPT_VISION_BASE_URL=https://api.idg.vnpt.vn
VNPT_VISION_TOKEN_ID=
VNPT_VISION_TOKEN_KEY=
VNPT_VISION_ACCESS_TOKEN=

# VNPT SmartVoice (TODO)
VNPT_VOICE_BASE_URL=
VNPT_VOICE_TOKEN_ID=
VNPT_VOICE_TOKEN_KEY=
VNPT_VOICE_ACCESS_TOKEN=

# VNPT vnFace
VNFACE_BASE_URL=https://api-vnface.vnpt.vn
VNFACE_ACCESS_TOKEN=
VNFACE_TOKEN_CHANNEL=
```

---

## 10. TODO khi có thêm thông tin

- [ ] Lấy docs đầy đủ SmartVoice (TTS endpoint, voice list, audio format)
- [ ] Xác nhận SmartUX có thật không, lấy endpoint
- [ ] Xác nhận eKYC cần `mac-address` cố định hay random được
- [ ] Kiểm tra giới hạn rate limit mỗi service
- [ ] Kiểm tra chi phí / quota từng API (để biết dùng cái nào free)
- [ ] Test refresh token flow (access_token hết hạn 8h)
