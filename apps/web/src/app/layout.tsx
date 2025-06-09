import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';

/**
 * 배달 플랫폼 웹 애플리케이션 루트 레이아웃
 * 
 * 주요 기능:
 * - 전역 스타일 적용 (Tailwind CSS)
 * - 폰트 설정 (Inter)
 * - 메타데이터 설정
 * - 반응형 뷰포트 설정
 */

const inter = Inter({ 
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
});

export const metadata: Metadata = {
  title: {
    default: '배달플랫폼',
    template: '%s | 배달플랫폼'
  },
  description: '고객, 배달 기사, 점주를 연결하는 종합적인 배달 플랫폼입니다. 빠르고 안전한 음식 배달 서비스를 제공합니다.',
  keywords: ['배달', '음식', '주문', '레스토랑', '배달앱', '음식배달'],
  authors: [{ name: 'Delivery Platform Team' }],
  creator: 'Delivery Platform Team',
  publisher: 'Delivery Platform',
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'),
  openGraph: {
    type: 'website',
    locale: 'ko_KR',
    url: '/',
    title: '배달플랫폼',
    description: '고객, 배달 기사, 점주를 연결하는 종합적인 배달 플랫폼',
    siteName: '배달플랫폼',
  },
  twitter: {
    card: 'summary_large_image',
    title: '배달플랫폼',
    description: '고객, 배달 기사, 점주를 연결하는 종합적인 배달 플랫폼',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  viewport: {
    width: 'device-width',
    initialScale: 1,
    maximumScale: 1,
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko" className={inter.variable}>
      <body className={`${inter.className} antialiased`}>
        <div id="root">
          {children}
        </div>
      </body>
    </html>
  );
}
