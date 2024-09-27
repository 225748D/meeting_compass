import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextRequest, NextResponse } from "next/server";

// Access your API key as an environment variable (see "Set up your API key" above)
// const genAI = new GoogleGenerativeAI({
//     apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY
// });

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
    console.log(_prompt);

    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    const prompt = _prompt;
    // const prompt = "Write a story about a magic backpack.";

    const result = await model.generateContent(prompt);
    const response = result.response;
    const text = response.text();
    //   const response = result.response;
    //   const text = response.text();
    //   return text;

    return NextResponse.json({ result: text });
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 }
    );
  }
}

// run().then((res) => console.log(res));
// Output: AI 生成の物語がつらつら表示される
