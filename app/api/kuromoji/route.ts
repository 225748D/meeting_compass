import { NextRequest, NextResponse } from "next/server";
import kuromoji from "kuromoji";

// kuromojiトークナイザーのビルダーを初期化
const tokenizerBuilder = kuromoji.builder({
  dicPath: "node_modules/kuromoji/dict",
});

export async function POST(req: NextRequest) {
  // 環境変数のチェック
  if (!process.env.GEMINI_API_KEY) {
    throw new Error("API key not found");
  }

  // POSTメソッドの確認
  if (req.method !== "POST") {
    return NextResponse.json({ error: "Method not allowed" }, { status: 405 });
  }

  try {
    // リクエストボディの取得
    const { text } = await req.json(); // この行は単一のテキストを期待する

    // トークナイザーをビルド
    const tokenizer: kuromoji.Tokenizer<kuromoji.IpadicFeatures> = await new Promise((resolve, reject) => {
      tokenizerBuilder.build((err, tokenizer) => {
        if (err) {
          console.error("Tokenizer build error:", err);
          reject(new Error("Error building tokenizer"));
        } else {
          resolve(tokenizer);
        }
      });
    });

    // トークンを解析
    const tokens = tokenizer.tokenize(text);
    const keywords = tokens
      .filter((token) => ["名詞", "動詞"].includes(token.pos))
      .map((token) => token.surface_form);

    // キーワードをレスポンスとして返す
    return NextResponse.json({ keywords });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 }
    );
  }
}
