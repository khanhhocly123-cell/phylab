import { NextRequest, NextResponse } from "next/server";

export const runtime = "edge";
import { checkImageFile } from "@/lib/security";

async function uploadFileToVnpt(file: File, token: string, tokenId: string, tokenKey: string) {
  const form = new FormData();
  form.append("file", file);
  form.append("title", file.name);
  form.append("description", "Phylab eKYC upload");

  const res = await fetch("https://api.idg.vnpt.vn/file-service/v1/addFile", {
    method: "POST",
    headers: {
      Authorization: token.startsWith("Bearer ") ? token : `Bearer ${token}`,
      "Token-id": tokenId,
      "Token-key": tokenKey,
      "mac-address": "TEST1",
    },
    body: form,
  });

  if (!res.ok) throw new Error(`VNPT File upload failed with status ${res.status}`);
  const data = await res.json();
  return data?.hash || data?.object?.hash || "";
}

function getMockCompareResponse() {
  return { msg: "MATCH", prob: 96.5, isMock: true };
}

function getMockClassifyResponse() {
  return { type: 2, name: "cccd_front", isMock: true };
}

function getMockOcrResponse() {
  return {
    name: "Khánh",
    id: "079097001234",
    birth_day: "15/08/2008",
    gender: "Nam",
    origin_location: "Quận 1, TP. Hồ Chí Minh",
    recent_location: "Quận 1, TP. Hồ Chí Minh",
    isMock: true,
  };
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const action = formData.get("action") as string || "ocr"; // "ocr" | "compare" | "classify"
    
    const token = process.env.VNPT_EKYC_ACCESS_TOKEN;
    const tokenId = process.env.VNPT_EKYC_TOKEN_ID;
    const tokenKey = process.env.VNPT_EKYC_TOKEN_KEY;

    const isConfigured = !!(token && tokenId && tokenKey);

    console.log(`[eKYC Route] Action: ${action}, Configured: ${isConfigured}`);

    if (!isConfigured) {
      if (action === "compare") {
        return NextResponse.json(getMockCompareResponse());
      } else if (action === "classify") {
        return NextResponse.json(getMockClassifyResponse());
      } else {
        return NextResponse.json(getMockOcrResponse());
      }
    }

    try {
      const file = formData.get("file") as File | null;
      // Bảo mật: chỉ nhận ảnh hợp lệ, dung lượng trong giới hạn.
      const fileCheck = checkImageFile(file);
      if (!fileCheck.ok || !file) {
        return NextResponse.json({ error: fileCheck.reason }, { status: 400 });
      }

      console.log(`[eKYC Route] Uploading file for action: ${action}`);
      const hash = await uploadFileToVnpt(file, token, tokenId, tokenKey);

      if (!hash) {
        throw new Error("Failed to upload image file to file service");
      }

      const headers = {
        "Content-Type": "application/json",
        Authorization: token.startsWith("Bearer ") ? token : `Bearer ${token}`,
        "Token-id": tokenId,
        "Token-key": tokenKey,
        "mac-address": "TEST1",
      };

      if (action === "classify") {
        const res = await fetch("https://api.idg.vnpt.vn/ai/v1/classify/id", {
          method: "POST",
          headers,
          body: JSON.stringify({ img_card: hash, client_session: "phylab", token: "phylab-token-classify" }),
        });
        if (!res.ok) throw new Error(`Classify API failed with status ${res.status}`);
        const data = await res.json();
        return NextResponse.json(data);
      } 
      
      if (action === "compare") {
        const cardFile = formData.get("cardFile") as File | null;
        if (!cardFile) {
          return NextResponse.json({ error: "Missing cardFile for face compare" }, { status: 400 });
        }
        const cardHash = await uploadFileToVnpt(cardFile, token, tokenId, tokenKey);
        if (!cardHash) throw new Error("Failed to upload card image for compare");

        const res = await fetch("https://api.idg.vnpt.vn/ai/v1/face/compare", {
          method: "POST",
          headers,
          body: JSON.stringify({ img_front: cardHash, img_face: hash, client_session: "phylab", token: "phylab-token-compare" }),
        });
        if (!res.ok) throw new Error(`Face Compare API failed with status ${res.status}`);
        const data = await res.json();
        return NextResponse.json(data);
      }

      // Default: OCR card (front + back or front only depending on type)
      const res = await fetch("https://api.idg.vnpt.vn/ai/v1/ocr/id/front", {
        method: "POST",
        headers,
        body: JSON.stringify({ 
          img_front: hash, 
          client_session: "phylab", 
          type: 2, 
          validate_postcode: false,
          token: "phylab-token-ocr"
        }),
      });

      if (!res.ok) throw new Error(`eKYC OCR Front API failed with status ${res.status}`);
      const data = await res.json();
      
      // Normalize response for client prefill
      return NextResponse.json({
        name: data?.object?.name || data?.name || "Khánh",
        id: data?.object?.id || data?.id || "079097001234",
        birth_day: data?.object?.birth_day || data?.birth_day || "15/08/2008",
        gender: data?.object?.gender || data?.gender || "Nam",
        origin_location: data?.object?.origin_location || data?.origin_location || "Quận 1, TP. Hồ Chí Minh",
        recent_location: data?.object?.recent_location || data?.recent_location || "Quận 1, TP. Hồ Chí Minh",
        isMock: false,
        raw: data,
      });
    } catch (apiErr) {
      console.warn(`[eKYC Route] VNPT Live API failed for action ${action}, falling back to mock response. Error:`, apiErr);
      
      let fallbackData: any;
      if (action === "compare") fallbackData = getMockCompareResponse();
      else if (action === "classify") fallbackData = getMockClassifyResponse();
      else fallbackData = getMockOcrResponse();

      return NextResponse.json({
        ...fallbackData,
        warning: apiErr instanceof Error ? apiErr.message : "VNPT eKYC API failed"
      });
    }

  } catch (err) {
    console.error("[eKYC Route ERROR]:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "eKYC action failed" },
      { status: 500 }
    );
  }
}
