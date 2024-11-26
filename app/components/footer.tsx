import Link from "next/link";

// components/footer.tsx:
export default function Footer() {
  return (
    <footer className="fixed bottom-0 w-full h-20 bg-white border-t border-gray-200 z-50 flex items-center justify-center">
      {/* Footerの内容 */}
      <p className="text-m">
        &copy;2024 enPiT 開発チームせんばる
        <span className="mx-2">|</span>
        <Link
          href="https://forms.gle/htZ78h4SnKXnUsmEA"
          className="text-blue-500 underline hover:text-blue-700"
          aria-label="フィードバックフォームにアクセス"
        >
          フィードバック
        </Link>
        をお寄せください
      </p>
    </footer>
  );
}
