import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "amber",
  description: "RSSリーダー — YAML で購読フィードを管理し、サーバー側で RSS/Atom を取得して表示します。",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <body>{children}</body>
    </html>
  );
}
