import Image from "next/image";

export default function Home() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100 p-10">
      {/* 中央にアイコンを配置 */}
      <Image
        src="/icon.svg" // アイコンの画像パスを指定
        alt="Transcription Icon"
        className="mt-8"
        width={200} // アイコンのサイズ
        height={200}
      />

      {/* トピックを表示する枠 */}
      <div className="mt-8 p-4 bg-white rounded shadow-lg w-3/4">
        <h2 className="text-xl font-bold mb-2 text-center">Extracted Topics</h2>
        <div className="h-24 border border-gray-300 rounded p-2 text-gray-500 flex items-center justify-center">
          <p>Topics will be displayed here</p>
        </div>
      </div>

      {/* 文字起こしのログを表示する枠 */}
      <div className="mt-4 mb-4 p-4 bg-white rounded shadow-lg w-3/4 max-h-96 overflow-y-auto">
        <h2 className="text-xl font-bold mb-2 text-center">Transcription Logs</h2>
        <div className="h-48 border border-gray-300 rounded p-2 text-gray-500 flex items-center justify-center">
          <p>Transcription logs will be displayed here</p>
        </div>
      </div>
    </div>
  );
}
