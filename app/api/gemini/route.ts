import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  // For text-only input, use the gemini-pro model
  if (!process.env.GEMINI_API_KEY) {
    throw Error("API key not found");
  }
  if (req.method !== "POST") {
    return NextResponse.json({ error: "Method not allowed" }, { status: 405 });
  }
  try {
    const { _prompt } = await req.json();
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({
      model: "gemini-1.5-flash",
    });
    const prompt = _prompt;
    const result = await model.generateContent({
      systemInstruction: {
        role: "system",
        parts: [
          {
            text: `
              あなたは、提供されたテキストから最も重要なトピックを1つ抽出するエキスパートです。
              以下の指示に従ってトピックを特定してください。
              - テキストの内容を理解し、最も重要なテーマやアイデアを1つだけ抽出してください。
              - 抽出したトピックは簡潔に表現し、他の情報やデータは含めないでください。
              - 出力形式は1行で、トピックの名称のみを返してください。
            `,
          },
        ],
      },
      contents: [
        {
          role: "user",
          parts: [{ text: prompt }],
        },
      ],
      generationConfig: {
        maxOutputTokens: 100,
        temperature: 0.1,
      },
    });
    const response = result.response;
    const text = response.text();
    return NextResponse.json({ result: text });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 }
    );
  }
}
// Compare this snippet from app/api/gemini/route.ts:
