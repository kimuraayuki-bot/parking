import './globals.css';
import Link from 'next/link';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: '来客駐車場 予約システム',
  description: '来客用駐車場の空き確認・予約・取消・管理'
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja">
      <body>
        <header className="topbar">
          <div className="container topbar-inner">
            <h1>来客駐車場</h1>
            <nav>
              <Link href="/">空き状況</Link>
              <Link href="/reserve">予約</Link>
              <Link href="/cancel">取消</Link>
              <Link href="/admin">管理</Link>
            </nav>
          </div>
        </header>
        <main className="container">{children}</main>
      </body>
    </html>
  );
}
