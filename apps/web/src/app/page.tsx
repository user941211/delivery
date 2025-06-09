import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Utensils, Truck, Store, Users, Clock, Star } from 'lucide-react';

/**
 * 배달 플랫폼 홈 페이지
 * 
 * 주요 기능:
 * - 서비스 소개 섹션
 * - 주요 기능 카드 표시
 * - 사용자 유형별 접근 버튼
 * - 반응형 디자인
 */

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-orange-50 to-white">
      {/* 헤더 섹션 */}
      <header className="container mx-auto px-4 py-8">
        <nav className="flex justify-between items-center">
          <div className="flex items-center space-x-2">
            <Utensils className="h-8 w-8 text-orange-500" />
            <h1 className="text-2xl font-bold text-gray-900">배달플랫폼</h1>
          </div>
          <div className="flex space-x-4">
            <Button variant="outline" asChild>
              <Link href="/login">로그인</Link>
            </Button>
            <Button asChild>
              <Link href="/signup">회원가입</Link>
            </Button>
          </div>
        </nav>
      </header>

      {/* 히어로 섹션 */}
      <section className="container mx-auto px-4 py-16 text-center">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-5xl font-bold text-gray-900 mb-6">
            <span className="delivery-gradient bg-clip-text text-transparent">
              빠르고 안전한
            </span>
            <br />
            음식 배달 서비스
          </h2>
          <p className="text-xl text-gray-600 mb-8 leading-relaxed">
            고객, 배달 기사, 점주를 연결하는 종합적인 배달 플랫폼입니다.
            <br />
            신선한 음식을 빠르게 배달받으세요.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" className="text-lg px-8 py-6" asChild>
              <Link href="/restaurants">
                <Utensils className="mr-2 h-5 w-5" />
                음식 주문하기
              </Link>
            </Button>
            <Button size="lg" variant="outline" className="text-lg px-8 py-6" asChild>
              <Link href="/partner">
                <Store className="mr-2 h-5 w-5" />
                파트너 신청
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* 통계 섹션 */}
      <section className="bg-white py-16">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 text-center">
            <div className="space-y-2">
              <div className="text-4xl font-bold text-orange-500">1,000+</div>
              <div className="text-gray-600">등록된 음식점</div>
            </div>
            <div className="space-y-2">
              <div className="text-4xl font-bold text-orange-500">50,000+</div>
              <div className="text-gray-600">월 주문 건수</div>
            </div>
            <div className="space-y-2">
              <div className="text-4xl font-bold text-orange-500">30분</div>
              <div className="text-gray-600">평균 배달 시간</div>
            </div>
            <div className="space-y-2">
              <div className="text-4xl font-bold text-orange-500">4.8★</div>
              <div className="text-gray-600">고객 만족도</div>
            </div>
          </div>
        </div>
      </section>

      {/* 서비스 기능 섹션 */}
      <section className="container mx-auto px-4 py-16">
        <div className="text-center mb-12">
          <h3 className="text-3xl font-bold text-gray-900 mb-4">
            모든 사용자를 위한 서비스
          </h3>
          <p className="text-lg text-gray-600">
            고객, 음식점, 배달 기사 모두에게 최적화된 플랫폼
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* 고객용 카드 */}
          <Card className="restaurant-card">
            <CardHeader className="text-center pb-4">
              <div className="mx-auto w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-4">
                <Users className="h-8 w-8 text-blue-600" />
              </div>
              <CardTitle className="text-xl">고객</CardTitle>
              <CardDescription>간편한 주문과 빠른 배달</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center space-x-2">
                <Star className="h-4 w-4 text-yellow-500" />
                <span className="text-sm">리뷰 기반 음식점 추천</span>
              </div>
              <div className="flex items-center space-x-2">
                <Clock className="h-4 w-4 text-green-500" />
                <span className="text-sm">실시간 주문 추적</span>
              </div>
              <div className="flex items-center space-x-2">
                <Utensils className="h-4 w-4 text-orange-500" />
                <span className="text-sm">다양한 음식 카테고리</span>
              </div>
            </CardContent>
          </Card>

          {/* 음식점용 카드 */}
          <Card className="restaurant-card">
            <CardHeader className="text-center pb-4">
              <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
                <Store className="h-8 w-8 text-green-600" />
              </div>
              <CardTitle className="text-xl">음식점</CardTitle>
              <CardDescription>효율적인 주문 관리</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center space-x-2">
                <Star className="h-4 w-4 text-yellow-500" />
                <span className="text-sm">메뉴 관리 시스템</span>
              </div>
              <div className="flex items-center space-x-2">
                <Clock className="h-4 w-4 text-green-500" />
                <span className="text-sm">실시간 주문 알림</span>
              </div>
              <div className="flex items-center space-x-2">
                <Utensils className="h-4 w-4 text-orange-500" />
                <span className="text-sm">매출 분석 대시보드</span>
              </div>
            </CardContent>
          </Card>

          {/* 배달 기사용 카드 */}
          <Card className="restaurant-card">
            <CardHeader className="text-center pb-4">
              <div className="mx-auto w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mb-4">
                <Truck className="h-8 w-8 text-orange-600" />
              </div>
              <CardTitle className="text-xl">배달 기사</CardTitle>
              <CardDescription>효율적인 배달 시스템</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center space-x-2">
                <Star className="h-4 w-4 text-yellow-500" />
                <span className="text-sm">최적 경로 안내</span>
              </div>
              <div className="flex items-center space-x-2">
                <Clock className="h-4 w-4 text-green-500" />
                <span className="text-sm">실시간 배달 현황</span>
              </div>
              <div className="flex items-center space-x-2">
                <Utensils className="h-4 w-4 text-orange-500" />
                <span className="text-sm">수익 관리 도구</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* CTA 섹션 */}
      <section className="bg-gray-50 py-16">
        <div className="container mx-auto px-4 text-center">
          <h3 className="text-3xl font-bold text-gray-900 mb-4">
            지금 바로 시작해보세요
          </h3>
          <p className="text-lg text-gray-600 mb-8">
            간편한 회원가입으로 배달플랫폼의 모든 서비스를 이용하실 수 있습니다.
          </p>
          <Button size="lg" className="text-lg px-8 py-6" asChild>
            <Link href="/signup">
              무료로 시작하기
            </Link>
          </Button>
        </div>
      </section>

      {/* 푸터 */}
      <footer className="bg-gray-900 text-white py-12">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="flex items-center space-x-2 mb-4 md:mb-0">
              <Utensils className="h-6 w-6 text-orange-500" />
              <span className="text-xl font-bold">배달플랫폼</span>
            </div>
            <div className="text-sm text-gray-400">
              © 2024 배달플랫폼. All rights reserved.
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
