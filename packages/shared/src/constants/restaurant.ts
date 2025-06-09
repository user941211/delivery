/**
 * 음식점 관련 상수 정의
 */

/** 기본 조리 시간 (분) */
export const DEFAULT_PREPARATION_TIME = 20;

/** 최대 조리 시간 (분) */
export const MAX_PREPARATION_TIME = 180;

/** 음식점 상태별 표시명 */
export const RESTAURANT_STATUS_LABELS = {
  active: '운영중',
  inactive: '휴무',
  suspended: '영업정지',
  pending_approval: '승인대기'
} as const;

/** 음식 카테고리 */
export const FOOD_CATEGORIES = {
  korean: '한식',
  chinese: '중식',
  japanese: '일식',
  western: '양식',
  pizza: '피자',
  chicken: '치킨',
  burger: '버거',
  cafe: '카페·디저트',
  asian: '아시안',
  mexican: '멕시칸',
  indian: '인도식',
  thai: '태국식',
  vietnamese: '베트남식',
  fast_food: '패스트푸드',
  bbq: '고기·구이',
  seafood: '해산물',
  salad: '샐러드',
  healthy: '건강식',
  vegetarian: '채식',
  bakery: '베이커리'
} as const;

/** 알레르기 표시명 */
export const ALLERGEN_LABELS = {
  eggs: '달걀',
  milk: '우유',
  buckwheat: '메밀',
  peanuts: '땅콩',
  soybeans: '대두',
  wheat: '밀',
  mackerel: '고등어',
  crab: '게',
  shrimp: '새우',
  pork: '돼지고기',
  peach: '복숭아',
  tomato: '토마토',
  sulfites: '아황산류',
  walnut: '호두',
  chicken: '닭고기',
  beef: '쇠고기',
  squid: '오징어',
  shellfish: '조개류',
  pine_nuts: '잣'
} as const; 