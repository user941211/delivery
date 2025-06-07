import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: '배달 플랫폼',
  description: '고객, 배달 기사, 점주를 연결하는 종합적인 배달 플랫폼',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
