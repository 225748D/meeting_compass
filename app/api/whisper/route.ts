import { base64DecodeAsBlob } from "@/app/utils/base64";
import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function POST(req: NextRequest) {
  if (req.method !== "POST") {
    return NextResponse.json({ error: "Method not allowed" }, { status: 405 });
  }

  try {
    const { blob: _blob } = await req.json();

    if (!_blob) {
      return NextResponse.json({ error: "Blob is required" }, { status: 400 });
    }

    const blob = await base64DecodeAsBlob(_blob);
    const file = new File([blob], "audio.webm", { type: "audio/webm" });

    const debug = false;
    const response = !debug
      ? await openai.audio.transcriptions.create({
          model: "whisper-1",
          language: "ja",
          file: file,
        })
      : {
          text: "Hello, world!",
        };

    return NextResponse.json({ result: response.text });
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 }
    );
  }
}
