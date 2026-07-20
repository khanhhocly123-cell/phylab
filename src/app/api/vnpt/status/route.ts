import { NextRequest, NextResponse } from "next/server";

import { getSmartBotConfig } from "@/lib/vnpt-smartbot";

export async function GET(req: NextRequest) {
  try {
    // Check SmartBot Config
    const botConfig = getSmartBotConfig();
    
    // Check eKYC config
    const ekycConfigured = !!(
      process.env.VNPT_EKYC_ACCESS_TOKEN &&
      process.env.VNPT_EKYC_TOKEN_ID &&
      process.env.VNPT_EKYC_TOKEN_KEY
    );
    
    // Check TTS config
    const ttsConfigured = !!(
      process.env.VNPT_VOICE_ACCESS_TOKEN &&
      process.env.VNPT_VOICE_TOKEN_ID &&
      process.env.VNPT_VOICE_TOKEN_KEY
    );
    
    // Check Reader config
    const readerConfigured = !!(
      process.env.VNPT_READER_ACCESS_TOKEN &&
      process.env.VNPT_READER_TOKEN_ID &&
      process.env.VNPT_READER_TOKEN_KEY
    );

    return NextResponse.json({
      ok: true,
      smartbot: { configured: botConfig.isConfigured },
      ekyc: { configured: ekycConfigured },
      tts: { configured: ttsConfigured },
      ocr: { configured: readerConfigured },
    });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "Failed to retrieve status" },
      { status: 500 }
    );
  }
}
