"use client";
import React from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";

export default function Home() {
  const router = useRouter();
  const handleButtonClick = () => {
    router.push("/transcription");
  };
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

      {/* スタートボタン */}
      <button
        onClick={handleButtonClick} // ボタンが押された時の処理
        className="mt-5 px-5 py-2 text-lg rounded text-white"
      >
        <Image src="/assets/play.svg" alt="Play" width={70} height={70} />
      </button>

      {/* 説明テキスト */}
      <p className="mt-2 text-lg text-center mb-5">
        このアプリを使えば、音声を簡単かつ効率的にテキストに書き起こせます。
      </p>
    </div>
  );
}