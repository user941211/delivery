/**
 * 한국 지역 관련 상수 정의
 */

/** 한국 시/도 목록 */
export const KOREAN_PROVINCES = {
  seoul: '서울특별시',
  busan: '부산광역시',
  daegu: '대구광역시',
  incheon: '인천광역시',
  gwangju: '광주광역시',
  daejeon: '대전광역시',
  ulsan: '울산광역시',
  sejong: '세종특별자치시',
  gyeonggi: '경기도',
  gangwon: '강원특별자치도',
  chungbuk: '충청북도',
  chungnam: '충청남도',
  jeonbuk: '전북특별자치도',
  jeonnam: '전라남도',
  gyeongbuk: '경상북도',
  gyeongnam: '경상남도',
  jeju: '제주특별자치도'
} as const;

/** 서울시 구 목록 */
export const SEOUL_DISTRICTS = {
  gangnam: '강남구',
  gangdong: '강동구',
  gangbuk: '강북구',
  gangseo: '강서구',
  gwanak: '관악구',
  gwangjin: '광진구',
  guro: '구로구',
  geumcheon: '금천구',
  nowon: '노원구',
  dobong: '도봉구',
  dongdaemun: '동대문구',
  dongjak: '동작구',
  mapo: '마포구',
  seodaemun: '서대문구',
  seocho: '서초구',
  seongdong: '성동구',
  seongbuk: '성북구',
  songpa: '송파구',
  yangcheon: '양천구',
  yeongdeungpo: '영등포구',
  yongsan: '용산구',
  eunpyeong: '은평구',
  jongno: '종로구',
  jung: '중구',
  jungnang: '중랑구'
} as const;

/** 주요 도시별 좌표 */
export const CITY_COORDINATES = {
  seoul: { latitude: 37.5665, longitude: 126.9780 },
  busan: { latitude: 35.1796, longitude: 129.0756 },
  daegu: { latitude: 35.8714, longitude: 128.6014 },
  incheon: { latitude: 37.4563, longitude: 126.7052 },
  gwangju: { latitude: 35.1595, longitude: 126.8526 },
  daejeon: { latitude: 36.3504, longitude: 127.3845 },
  ulsan: { latitude: 35.5384, longitude: 129.3114 },
  sejong: { latitude: 36.4800, longitude: 127.2890 },
  jeju: { latitude: 33.4996, longitude: 126.5312 }
} as const;

/** 배달 권역 분류 */
export const DELIVERY_REGIONS = {
  metro: {
    label: '수도권',
    cities: ['seoul', 'incheon', 'gyeonggi'],
    baseDeliveryFee: 3000,
    freeDeliveryThreshold: 15000
  },
  busan_ulsan: {
    label: '부산·울산권',
    cities: ['busan', 'ulsan'],
    baseDeliveryFee: 3500,
    freeDeliveryThreshold: 18000
  },
  central: {
    label: '중부권',
    cities: ['daejeon', 'sejong', 'chungbuk', 'chungnam'],
    baseDeliveryFee: 4000,
    freeDeliveryThreshold: 20000
  },
  southwest: {
    label: '호남권',
    cities: ['gwangju', 'jeonbuk', 'jeonnam'],
    baseDeliveryFee: 4000,
    freeDeliveryThreshold: 20000
  },
  southeast: {
    label: '영남권',
    cities: ['daegu', 'gyeongbuk', 'gyeongnam'],
    baseDeliveryFee: 4000,
    freeDeliveryThreshold: 20000
  },
  gangwon: {
    label: '강원권',
    cities: ['gangwon'],
    baseDeliveryFee: 5000,
    freeDeliveryThreshold: 25000
  },
  jeju: {
    label: '제주권',
    cities: ['jeju'],
    baseDeliveryFee: 6000,
    freeDeliveryThreshold: 30000
  }
} as const;

/** 우편번호 형식 패턴 */
export const ZIPCODE_PATTERN = /^\d{5}$/;

/** 한국 전화번호 형식 패턴 */
export const KOREAN_PHONE_PATTERNS = {
  mobile: /^01[016789]-?\d{3,4}-?\d{4}$/,
  landline: /^0[2-6][1-5]?-?\d{3,4}-?\d{4}$/,
  tollfree: /^080-?\d{3,4}-?\d{4}$/
} as const;

/** 사업자등록번호 형식 패턴 */
export const BUSINESS_NUMBER_PATTERN = /^\d{3}-?\d{2}-?\d{5}$/;

/** 지역별 시간대 (한국은 모두 KST) */
export const TIMEZONE = 'Asia/Seoul';

/** 배달 불가 지역 */
export const RESTRICTED_DELIVERY_AREAS = [
  '독도',
  '이어도',
  '백령도',
  '연평도'
] as const; 