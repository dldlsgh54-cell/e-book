import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "전자책 크리에이터",
  description: "아이디어를 전자책 초안과 PDF로 만드는 AI 작성 도구",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
