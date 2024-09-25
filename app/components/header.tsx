// components/header.tsx:
import Link from "next/link";
import Image from "next/image";

export default function Header() {
  return (
    <header className="fixed top-0 left-0 w-full h-16 bg-white border-b border-gray-200 z-50 flex items-center px-4">
      {/* アイコンとタイトルを横並びに配置 */}
      <Link href="/" passHref className="flex items-center space-x-2">
        {/* アイコンの配置 - 画像ファイルパスに合わせてsrcを変更 */}
        <Image
          src="/icon.svg" // アイコンの画像パスを指定
          alt="App Icon"
          width={32} // アイコンのサイズを指定
          height={32}
        />
        {/* タイトルの配置 */}
        <h1 className="text-lg font-bold cursor-pointer">Meeting Compass</h1>
      </Link>
    </header>
  );
}
