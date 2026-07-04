# VNPT API Integration Notes

> Tài liệu dành cho Phylab: tổng hợp endpoint + payload mẫu cho các API VNPT mà BTC yêu cầu.
> Khi có key thật, paste vào `.env` (copy từ `.env.example`).

---

## 1. SmartReader 5.1 — OCR (nhận dạng ký tự)

**Mục đích:** đọc text từ ảnh chụp trang SGK Vật lý.

**Request mẫu:**
```bash
curl -X POST "${VNPT_OCR_URL}${VNPT_OCR_ENDPOINT}" \
  -H "Authorization: Bearer ${VNPT_OCR_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "image": "<base64 của ảnh>",
    "options": { "lang": "vi", "format": "text" }
  }'
```

**Response mẫu:**
```json
{
  "data": {
    "text": "Bài 11. Đo gia tốc rơi tự do...",
    "blocks": [...],
    "confidence": 0.96
  }
}
```

**Phylab dùng:** `src/components/ScanScreen.tsx` (đã có mock — chỉ cần thay `processOCR` để gọi thật).

---

## 2. SmartReader 5.2 — Information Extraction

**Mục đích:** từ text OCR ở trên, tách ra: tên bài, mục tiêu, công thức, danh sách dụng cụ.

**Request mẫu:**
```json
POST ${VNPT_IE_URL}${VNPT_IE_ENDPOINT}
{
  "text": "Bài 11. Đo gia tốc rơi tự do. Mục tiêu: xác định g...",
  "schema": {
    "title": "string",
    "objectives": ["string"],
    "formula": "string",
    "instruments": [{ "name": "string", "role": "string" }]
  }
}
```

**Phylab dùng:** `src/lib/recognizer.ts` (cần tạo) — nhận kết quả, match với `EXPERIMENT_SPECS` qua `keywords`.

---

## 3. SmartVoice 3.1 — Text-to-Speech

**Mục đích:** trợ lý phát thoại câu `assistant` trong `StepSpec`.

**Request mẫu:**
```json
POST ${VNPT_TTS_URL}${VNPT_TTS_ENDPOINT}
{
  "text": "Hãy lắp giá đứng vào ô vuông đứt nét",
  "voice": "female-vi-1",
  "speed": 1.0,
  "format": "mp3"
}
```
→ Response: binary audio (mp3/ogg).

**Phylab dùng:** trong `Bench.tsx`, sau khi hoàn thành `step.title`, gọi TTS với `step.assistant` rồi `audio.play()`.

---

## 4. SmartVoice 3.2 — Speech-to-Text (tuỳ chọn)

**Mục đích:** HS đọc kết quả đo vào mic thay vì gõ.

```
POST ${VNPT_STT_URL}${VNPT_STT_ENDPOINT}  (multipart/form-data, field "audio")
→ { "text": "0,203 giây", "confidence": 0.91 }
```

---

## 5. SmartBot — Chatbot

**Mục đích:** trợ lý Q&A cho HS (hỏi về lý thuyết / cách làm thí nghiệm).

```
POST ${SMARTBOT_URL}${SMARTBOT_ENDPOINT}
{
  "bot_id": "${SMARTBOT_BOT_ID}",
  "session_id": "<user-session>",
  "message": "Tại sao dùng trụ thép mà không dùng bi nhựa?"
}
→ { "reply": "...", "sources": [...] }
```

**Phylab dùng:** widget góc phải màn hình Lab, dùng context từ `activeSpec.theory.bullets` + `activeSpec.homework`.

---

## 6. SmartUX 7.1 — Analytics

**Mục đích:** tracking hành vi UX (click, scroll, time-on-task) → điểm mục 2 (20đ).

```
POST ${SMARTUX_URL}${SMARTUX_ENDPOINT}/events  (batch)
POST ${SMARTUX_URL}${SMARTUX_ENDPOINT}/funnel
POST ${SMARTUX_URL}${SMARTUX_ENDPOINT}/session
```

**Event mẫu:**
```json
{
  "session_id": "sess-123",
  "user_id": "PH-2026-09",
  "event": "lab_completed",
  "props": { "lesson_id": "do-gia-toc-roi-tu-do", "score": 95, "duration_ms": 1230000 }
}
```

**Phylab dùng:** track 7 event chính:
1. `lesson_open` — mở phòng Lab
2. `step_completed` — hoàn thành 1 step
3. `measure_recorded` — ghi 1 số liệu
4. `report_submitted` — nộp báo cáo
5. `notes_read` — đọc tài liệu
6. `scan_completed` — quét xong bài
7. `idle_over_30s` — không tương tác quá 30s

---

## File mapping trong Phylab

| API | File đã chạm / cần tạo | Trạng thái |
|---|---|---|
| SmartReader 5.1 | `src/lib/ocr.ts` (cần tạo), dùng trong `ScanScreen.tsx` | Mock đã sẵn |
| SmartReader 5.2 | `src/lib/recognizer.ts` (cần tạo) | Mock đã sẵn |
| SmartVoice 3.1 | `src/lib/tts.ts` (cần tạo), dùng trong `Bench.tsx` | Chưa có |
| SmartVoice 3.2 | `src/lib/stt.ts` (cần tạo), tuỳ chọn | Chưa có |
| SmartBot | `src/lib/smartbot.ts` (cần tạo) | Chưa có |
| SmartUX 7.1 | `src/lib/analytics.ts` (cần tạo) | Chưa có |

---

## Lệnh test nhanh (sau khi có key)

```bash
# Test OCR
curl -X POST "$VNPT_OCR_URL$VNPT_OCR_ENDPOINT" \
  -H "Authorization: Bearer $VNPT_OCR_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"image\":\"$(base64 -w0 test.jpg)\",\"options\":{\"lang\":\"vi\"}}"

# Test TTS  
curl -X POST "$VNPT_TTS_URL$VNPT_TTS_ENDPOINT" \
  -H "Authorization: Bearer $VNPT_TTS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"text":"Xin chào","voice":"female-vi-1","format":"mp3"}' \
  -o test_tts.mp3
```
