import { NextRequest, NextResponse } from "next/server";

import { classifyLesson } from "@/lib/lessonMatch";
import { checkImageFile } from "@/lib/security";

/**
 * /api/vnpt/ocr — OCR trang SGK bằng VNPT SmartReader (KHÔNG mock/fallback giả).
 *
 * Luồng: upload ảnh → lấy hash → gọi ocr/scan → lấy text + confidence THẬT →
 * phân loại bài + độ tin cậy thật. Nếu chưa cấu hình / API lỗi / không đọc ra nội
 * dung → recognized=false ("không nhận diện được"), báo trung thực lý do.
 */

function bearer(token: string) {
  return token.startsWith("Bearer ") ? token : `Bearer ${token}`;
}

async function uploadFileToVnpt(file: File, token: string, tokenId: string, tokenKey: string): Promise<string> {
  const form = new FormData();
  form.append("file", file);
  form.append("title", file.name);
  form.append("description", "Phylab OCR scan");

  const res = await fetch("https://api.idg.vnpt.vn/file-service/v1/addFile", {
    method: "POST",
    headers: {
      Authorization: bearer(token),
      "Token-id": tokenId,
      "Token-key": tokenKey,
      "mac-address": "EGOV-DIGDOC-WEB-API",
    },
    body: form,
  });
  if (!res.ok) throw new Error(`FILE_UPLOAD_HTTP_${res.status}`);
  const data = await res.json();
  return data?.object?.hash || data?.hash || "";
}

/**
 * Trích text từ response VNPT SmartReader.
 * Dạng thực tế: object.phrases[].cells[].text (mỗi cell 1 dòng).
 * Có kèm các fallback cho các dạng khác (text / pages / result).
 */
function extractText(data: unknown): string {
  if (typeof data === "string") return data;
  const d = data as Record<string, any>;
  const obj = d?.object ?? d;

  // Dạng chuẩn của SmartReader: phrases[].cells[].text
  if (Array.isArray(obj?.phrases)) {
    const parts: string[] = [];
    for (const ph of obj.phrases) {
      if (Array.isArray(ph?.cells)) {
        for (const cell of ph.cells) if (typeof cell?.text === "string") parts.push(cell.text);
      } else if (typeof ph?.text === "string") {
        parts.push(ph.text);
      }
    }
    if (parts.length) return parts.join("\n");
  }

  if (typeof obj?.text === "string") return obj.text;
  if (Array.isArray(obj?.pages)) {
    return obj.pages
      .map((p: any) =>
        typeof p?.text === "string"
          ? p.text
          : Array.isArray(p?.lines)
            ? p.lines.map((l: any) => l?.text ?? "").join(" ")
            : ""
      )
      .join("\n");
  }
  if (Array.isArray(obj?.result)) {
    return obj.result.map((r: any) => r?.text ?? "").join(" ");
  }
  return "";
}

/** Trích confidence trung bình THẬT từ confidence_score của các cell. */
function extractConfidence(data: unknown): number | undefined {
  const d = data as Record<string, any>;
  const obj = d?.object ?? d;

  const scores: number[] = [];
  if (Array.isArray(obj?.phrases)) {
    for (const ph of obj.phrases) {
      if (Array.isArray(ph?.cells)) {
        for (const cell of ph.cells) {
          if (typeof cell?.confidence_score === "number") scores.push(cell.confidence_score);
        }
      } else if (typeof ph?.confidence_score === "number") {
        scores.push(ph.confidence_score);
      }
    }
  }
  if (scores.length) return scores.reduce((a, b) => a + b, 0) / scores.length;

  const direct = obj?.confidence ?? obj?.prob ?? obj?.score;
  if (typeof direct === "number") return direct > 1 ? direct / 100 : direct;
  return undefined;
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    // Bảo mật: chỉ nhận ảnh hợp lệ, dung lượng trong giới hạn.
    const fileCheck = checkImageFile(file);
    if (!fileCheck.ok || !file) {
      return NextResponse.json({ recognized: false, error: fileCheck.reason }, { status: 400 });
    }

    const token = process.env.VNPT_READER_ACCESS_TOKEN;
    const tokenId = process.env.VNPT_READER_TOKEN_ID;
    const tokenKey = process.env.VNPT_READER_TOKEN_KEY;

    if (!token || !tokenId || !tokenKey) {
      // KHÔNG giả lập: báo trung thực chưa cấu hình.
      return NextResponse.json({
        recognized: false,
        confidence: 0,
        text: "",
        error: "VNPT SmartReader chưa được cấu hình (thiếu token).",
      });
    }

    let ocrText = "";
    let apiConfidence: number | undefined;
    try {
      const hash = await uploadFileToVnpt(file, token, tokenId, tokenKey);
      if (!hash) throw new Error("NO_FILE_HASH");

      const ocrRes = await fetch("https://api.idg.vnpt.vn/rpa-service/aidigdoc/v1/ocr/scan", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: bearer(token),
          "Token-id": tokenId,
          "Token-key": tokenKey,
          "mac-address": "EGOV-DIGDOC-WEB-API",
        },
        body: JSON.stringify({
          file_hash: hash,
          file_type: file.type.split("/")[1] || file.name.split(".").pop() || "png",
          token: "phylab-session-token",
          client_session: "phylab",
          details: true,
        }),
      });
      if (!ocrRes.ok) throw new Error(`OCR_SCAN_HTTP_${ocrRes.status}`);

      const ocrData = await ocrRes.json();
      ocrText = extractText(ocrData);
      apiConfidence = extractConfidence(ocrData);
    } catch (apiErr) {
      // API lỗi → KHÔNG bịa kết quả, báo không nhận diện được.
      return NextResponse.json({
        recognized: false,
        confidence: 0,
        text: "",
        error: apiErr instanceof Error ? apiErr.message : "OCR API failed",
      });
    }

    // Phân loại + độ tin cậy thật từ chính văn bản OCR.
    const match = classifyLesson(ocrText, apiConfidence);
    return NextResponse.json({
      recognized: match.recognized,
      lessonId: match.lessonId,
      title: match.title,
      confidence: match.confidence,
      apiConfidence: apiConfidence ?? null,
      text: ocrText.slice(0, 400),
      reason: match.reason,
    });
  } catch (err) {
    console.error("[OCR Route ERROR]:", err);
    return NextResponse.json(
      { recognized: false, confidence: 0, error: err instanceof Error ? err.message : "OCR processing failed" },
      { status: 500 }
    );
  }
}
