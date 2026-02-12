// 2025 재외동포현황 데이터 (출처: 재외동포청 '2025 재외동포현황' PDF, 기준: 2024.12.31)
// 194개국, 총 재외동포 수: 7,006,703명

export interface OverseasKoreanRecord {
  country: string
  population: number
  region: string
}

export const REGIONS = [
  '전체',
  '동북아시아',
  '남아시아태평양',
  '북미',
  '중남미',
  '러시아·CIS',
  '유럽',
  '아프리카',
  '중동',
] as const

export type Region = typeof REGIONS[number]

// 지역별 소계 (PDF 총계 테이블 기준)
export const REGION_TOTALS: Record<string, number> = {
  '동북아시아': 2_816_295,
  '남아시아태평양': 577_483,
  '북미': 2_820_200,
  '중남미': 106_348,
  '러시아·CIS': 444_971,
  '유럽': 213_161,
  '아프리카': 10_422,
  '중동': 17_823,
}

export const TOTAL_OVERSEAS_KOREANS = 7_006_703

export const overseasKoreanData: OverseasKoreanRecord[] = [
  {
    "country": "가나",
    "population": 454,
    "region": "아프리카"
  },
  {
    "country": "가봉",
    "population": 58,
    "region": "아프리카"
  },
  {
    "country": "가이아나",
    "population": 7,
    "region": "중남미"
  },
  {
    "country": "감비아",
    "population": 57,
    "region": "아프리카"
  },
  {
    "country": "과테말라",
    "population": 5680,
    "region": "중남미"
  },
  {
    "country": "그레나다",
    "population": 56,
    "region": "중남미"
  },
  {
    "country": "그리스",
    "population": 379,
    "region": "유럽"
  },
  {
    "country": "기니",
    "population": 40,
    "region": "아프리카"
  },
  {
    "country": "기니비사우",
    "population": 9,
    "region": "아프리카"
  },
  {
    "country": "나미비아",
    "population": 33,
    "region": "아프리카"
  },
  {
    "country": "나우루",
    "population": 0,
    "region": "남아시아태평양"
  },
  {
    "country": "나이지리아",
    "population": 513,
    "region": "아프리카"
  },
  {
    "country": "남수단",
    "population": 16,
    "region": "아프리카"
  },
  {
    "country": "남아프리카공화국",
    "population": 4085,
    "region": "아프리카"
  },
  {
    "country": "네덜란드",
    "population": 10807,
    "region": "유럽"
  },
  {
    "country": "네팔",
    "population": 590,
    "region": "남아시아태평양"
  },
  {
    "country": "노르웨이",
    "population": 8067,
    "region": "유럽"
  },
  {
    "country": "뉴질랜드",
    "population": 39155,
    "region": "남아시아태평양"
  },
  {
    "country": "니우에",
    "population": 0,
    "region": "남아시아태평양"
  },
  {
    "country": "니제르",
    "population": 11,
    "region": "아프리카"
  },
  {
    "country": "니카라과",
    "population": 626,
    "region": "중남미"
  },
  {
    "country": "대만",
    "population": 5319,
    "region": "동북아시아"
  },
  {
    "country": "덴마크",
    "population": 9008,
    "region": "유럽"
  },
  {
    "country": "도미니카공화국",
    "population": 569,
    "region": "중남미"
  },
  {
    "country": "도미니카연방",
    "population": 0,
    "region": "중남미"
  },
  {
    "country": "독일",
    "population": 52588,
    "region": "유럽"
  },
  {
    "country": "동티모르",
    "population": 137,
    "region": "남아시아태평양"
  },
  {
    "country": "라오스",
    "population": 2090,
    "region": "남아시아태평양"
  },
  {
    "country": "라이베리아",
    "population": 31,
    "region": "아프리카"
  },
  {
    "country": "라트비아",
    "population": 68,
    "region": "유럽"
  },
  {
    "country": "러시아",
    "population": 113042,
    "region": "러시아·CIS"
  },
  {
    "country": "레바논",
    "population": 140,
    "region": "중동"
  },
  {
    "country": "레소토",
    "population": 9,
    "region": "아프리카"
  },
  {
    "country": "루마니아",
    "population": 407,
    "region": "유럽"
  },
  {
    "country": "룩셈부르크",
    "population": 915,
    "region": "유럽"
  },
  {
    "country": "르완다",
    "population": 215,
    "region": "아프리카"
  },
  {
    "country": "리비아",
    "population": 11,
    "region": "아프리카"
  },
  {
    "country": "리투아니아",
    "population": 81,
    "region": "유럽"
  },
  {
    "country": "리히텐슈타인",
    "population": 4,
    "region": "유럽"
  },
  {
    "country": "마다가스카르",
    "population": 264,
    "region": "아프리카"
  },
  {
    "country": "마셜제도",
    "population": 25,
    "region": "남아시아태평양"
  },
  {
    "country": "마이크로네시아",
    "population": 10,
    "region": "남아시아태평양"
  },
  {
    "country": "말라위",
    "population": 161,
    "region": "아프리카"
  },
  {
    "country": "말레이시아",
    "population": 17979,
    "region": "남아시아태평양"
  },
  {
    "country": "말리",
    "population": 16,
    "region": "아프리카"
  },
  {
    "country": "멕시코",
    "population": 13680,
    "region": "중남미"
  },
  {
    "country": "모나코",
    "population": 6,
    "region": "유럽"
  },
  {
    "country": "모로코",
    "population": 395,
    "region": "아프리카"
  },
  {
    "country": "모리셔스",
    "population": 33,
    "region": "아프리카"
  },
  {
    "country": "모리타니아",
    "population": 50,
    "region": "아프리카"
  },
  {
    "country": "모잠비크",
    "population": 187,
    "region": "아프리카"
  },
  {
    "country": "몬테네그로",
    "population": 10,
    "region": "유럽"
  },
  {
    "country": "몰도바",
    "population": 76,
    "region": "러시아·CIS"
  },
  {
    "country": "몰디브",
    "population": 23,
    "region": "남아시아태평양"
  },
  {
    "country": "몰타",
    "population": 230,
    "region": "유럽"
  },
  {
    "country": "몽골",
    "population": 1765,
    "region": "동북아시아"
  },
  {
    "country": "미국",
    "population": 2557047,
    "region": "북미"
  },
  {
    "country": "미얀마",
    "population": 1919,
    "region": "남아시아태평양"
  },
  {
    "country": "바누아투",
    "population": 53,
    "region": "남아시아태평양"
  },
  {
    "country": "바레인",
    "population": 150,
    "region": "중동"
  },
  {
    "country": "바베이도스",
    "population": 0,
    "region": "중남미"
  },
  {
    "country": "바하마",
    "population": 0,
    "region": "중남미"
  },
  {
    "country": "방글라데시",
    "population": 1413,
    "region": "남아시아태평양"
  },
  {
    "country": "베냉",
    "population": 32,
    "region": "아프리카"
  },
  {
    "country": "베네수엘라",
    "population": 112,
    "region": "중남미"
  },
  {
    "country": "베트남",
    "population": 192683,
    "region": "남아시아태평양"
  },
  {
    "country": "벨기에",
    "population": 5283,
    "region": "유럽"
  },
  {
    "country": "벨라루스",
    "population": 450,
    "region": "러시아·CIS"
  },
  {
    "country": "벨리즈",
    "population": 10,
    "region": "중남미"
  },
  {
    "country": "보스니아헤르체고비나",
    "population": 12,
    "region": "유럽"
  },
  {
    "country": "보츠와나",
    "population": 87,
    "region": "아프리카"
  },
  {
    "country": "볼리비아",
    "population": 585,
    "region": "중남미"
  },
  {
    "country": "부룬디",
    "population": 21,
    "region": "아프리카"
  },
  {
    "country": "부르키나파소",
    "population": 41,
    "region": "아프리카"
  },
  {
    "country": "부탄",
    "population": 9,
    "region": "남아시아태평양"
  },
  {
    "country": "북마케도니아",
    "population": 19,
    "region": "유럽"
  },
  {
    "country": "불가리아",
    "population": 231,
    "region": "유럽"
  },
  {
    "country": "브라질",
    "population": 51640,
    "region": "중남미"
  },
  {
    "country": "브루나이",
    "population": 154,
    "region": "남아시아태평양"
  },
  {
    "country": "사모아",
    "population": 6,
    "region": "남아시아태평양"
  },
  {
    "country": "사우디아라비아",
    "population": 3011,
    "region": "중동"
  },
  {
    "country": "사이프러스",
    "population": 151,
    "region": "유럽"
  },
  {
    "country": "산마리노",
    "population": 0,
    "region": "유럽"
  },
  {
    "country": "상투메프린시페",
    "population": 0,
    "region": "아프리카"
  },
  {
    "country": "세네갈",
    "population": 338,
    "region": "아프리카"
  },
  {
    "country": "세르비아",
    "population": 158,
    "region": "유럽"
  },
  {
    "country": "세이셸공화국",
    "population": 3,
    "region": "아프리카"
  },
  {
    "country": "세인트루시아",
    "population": 7,
    "region": "중남미"
  },
  {
    "country": "세인트빈센트그레나딘",
    "population": 4,
    "region": "중남미"
  },
  {
    "country": "세인트키츠네비스",
    "population": 0,
    "region": "중남미"
  },
  {
    "country": "소말리아",
    "population": 1,
    "region": "아프리카"
  },
  {
    "country": "솔로몬제도",
    "population": 58,
    "region": "남아시아태평양"
  },
  {
    "country": "수단",
    "population": 0,
    "region": "아프리카"
  },
  {
    "country": "수리남",
    "population": 48,
    "region": "중남미"
  },
  {
    "country": "스페인",
    "population": 4698,
    "region": "유럽"
  },
  {
    "country": "스리랑카",
    "population": 363,
    "region": "남아시아태평양"
  },
  {
    "country": "스웨덴",
    "population": 11767,
    "region": "유럽"
  },
  {
    "country": "스위스",
    "population": 4281,
    "region": "유럽"
  },
  {
    "country": "슬로바키아",
    "population": 1588,
    "region": "유럽"
  },
  {
    "country": "슬로베니아",
    "population": 69,
    "region": "유럽"
  },
  {
    "country": "시에라리온",
    "population": 52,
    "region": "아프리카"
  },
  {
    "country": "싱가포르",
    "population": 25032,
    "region": "남아시아태평양"
  },
  {
    "country": "아랍에미리트",
    "population": 8492,
    "region": "중동"
  },
  {
    "country": "아르메니아",
    "population": 358,
    "region": "러시아·CIS"
  },
  {
    "country": "아르헨티나",
    "population": 23208,
    "region": "중남미"
  },
  {
    "country": "아이슬란드",
    "population": 40,
    "region": "유럽"
  },
  {
    "country": "아이티",
    "population": 54,
    "region": "중남미"
  },
  {
    "country": "아일랜드",
    "population": 1371,
    "region": "유럽"
  },
  {
    "country": "아제르바이잔",
    "population": 180,
    "region": "러시아·CIS"
  },
  {
    "country": "아프가니스탄",
    "population": 4,
    "region": "중동"
  },
  {
    "country": "안도라",
    "population": 4,
    "region": "유럽"
  },
  {
    "country": "알바니아",
    "population": 133,
    "region": "유럽"
  },
  {
    "country": "알제리",
    "population": 240,
    "region": "아프리카"
  },
  {
    "country": "앙골라",
    "population": 76,
    "region": "아프리카"
  },
  {
    "country": "앤티가바부다",
    "population": 0,
    "region": "중남미"
  },
  {
    "country": "에리트레아",
    "population": 0,
    "region": "아프리카"
  },
  {
    "country": "에스와티니",
    "population": 92,
    "region": "아프리카"
  },
  {
    "country": "에스토니아",
    "population": 223,
    "region": "유럽"
  },
  {
    "country": "에콰도르",
    "population": 572,
    "region": "중남미"
  },
  {
    "country": "에티오피아",
    "population": 292,
    "region": "아프리카"
  },
  {
    "country": "엘살바도르",
    "population": 225,
    "region": "중남미"
  },
  {
    "country": "영국",
    "population": 47006,
    "region": "유럽"
  },
  {
    "country": "예멘",
    "population": 6,
    "region": "중동"
  },
  {
    "country": "오만",
    "population": 141,
    "region": "중동"
  },
  {
    "country": "오스트리아",
    "population": 2710,
    "region": "유럽"
  },
  {
    "country": "온두라스",
    "population": 341,
    "region": "중남미"
  },
  {
    "country": "요르단",
    "population": 371,
    "region": "중동"
  },
  {
    "country": "우간다",
    "population": 640,
    "region": "아프리카"
  },
  {
    "country": "우루과이",
    "population": 179,
    "region": "중남미"
  },
  {
    "country": "우즈베키스탄",
    "population": 175338,
    "region": "러시아·CIS"
  },
  {
    "country": "우크라이나",
    "population": 12800,
    "region": "러시아·CIS"
  },
  {
    "country": "이탈리아",
    "population": 4550,
    "region": "유럽"
  },
  {
    "country": "이라크",
    "population": 377,
    "region": "중동"
  },
  {
    "country": "이란",
    "population": 139,
    "region": "중동"
  },
  {
    "country": "이스라엘",
    "population": 489,
    "region": "중동"
  },
  {
    "country": "이집트",
    "population": 1219,
    "region": "중동"
  },
  {
    "country": "인도",
    "population": 12288,
    "region": "남아시아태평양"
  },
  {
    "country": "인도네시아",
    "population": 27308,
    "region": "남아시아태평양"
  },
  {
    "country": "일본",
    "population": 960970,
    "region": "동북아시아"
  },
  {
    "country": "자메이카",
    "population": 61,
    "region": "중남미"
  },
  {
    "country": "잠비아",
    "population": 170,
    "region": "아프리카"
  },
  {
    "country": "적도기니",
    "population": 80,
    "region": "아프리카"
  },
  {
    "country": "조지아",
    "population": 306,
    "region": "러시아·CIS"
  },
  {
    "country": "중국",
    "population": 1848241,
    "region": "동북아시아"
  },
  {
    "country": "중앙아프리카공화국",
    "population": 7,
    "region": "아프리카"
  },
  {
    "country": "지부티",
    "population": 7,
    "region": "아프리카"
  },
  {
    "country": "짐바브웨",
    "population": 92,
    "region": "아프리카"
  },
  {
    "country": "차드",
    "population": 32,
    "region": "아프리카"
  },
  {
    "country": "체코",
    "population": 3039,
    "region": "유럽"
  },
  {
    "country": "칠레",
    "population": 2348,
    "region": "중남미"
  },
  {
    "country": "카메룬",
    "population": 87,
    "region": "아프리카"
  },
  {
    "country": "카보베르데",
    "population": 11,
    "region": "아프리카"
  },
  {
    "country": "카자흐스탄",
    "population": 122554,
    "region": "러시아·CIS"
  },
  {
    "country": "카타르",
    "population": 1993,
    "region": "중동"
  },
  {
    "country": "캄보디아",
    "population": 10626,
    "region": "남아시아태평양"
  },
  {
    "country": "캐나다",
    "population": 263153,
    "region": "북미"
  },
  {
    "country": "케냐",
    "population": 1138,
    "region": "아프리카"
  },
  {
    "country": "코모로",
    "population": 5,
    "region": "아프리카"
  },
  {
    "country": "코소보",
    "population": 21,
    "region": "유럽"
  },
  {
    "country": "코스타리카",
    "population": 334,
    "region": "중남미"
  },
  {
    "country": "코트디부아르",
    "population": 156,
    "region": "아프리카"
  },
  {
    "country": "콜롬비아",
    "population": 468,
    "region": "중남미"
  },
  {
    "country": "콩고공화국",
    "population": 2,
    "region": "아프리카"
  },
  {
    "country": "콩고민주공화국",
    "population": 94,
    "region": "아프리카"
  },
  {
    "country": "쿠바",
    "population": 33,
    "region": "중남미"
  },
  {
    "country": "쿠웨이트",
    "population": 422,
    "region": "중동"
  },
  {
    "country": "쿡 제도",
    "population": 0,
    "region": "남아시아태평양"
  },
  {
    "country": "크로아티아",
    "population": 141,
    "region": "유럽"
  },
  {
    "country": "키르기즈공화국",
    "population": 18434,
    "region": "러시아·CIS"
  },
  {
    "country": "키리바시공화국",
    "population": 6,
    "region": "남아시아태평양"
  },
  {
    "country": "타지키스탄",
    "population": 342,
    "region": "러시아·CIS"
  },
  {
    "country": "탄자니아",
    "population": 625,
    "region": "아프리카"
  },
  {
    "country": "태국",
    "population": 20872,
    "region": "남아시아태평양"
  },
  {
    "country": "튀르키예",
    "population": 2449,
    "region": "중동"
  },
  {
    "country": "토고",
    "population": 65,
    "region": "아프리카"
  },
  {
    "country": "통가",
    "population": 21,
    "region": "남아시아태평양"
  },
  {
    "country": "투르크메니스탄",
    "population": 1167,
    "region": "러시아·CIS"
  },
  {
    "country": "투발루",
    "population": 0,
    "region": "남아시아태평양"
  },
  {
    "country": "튀니지",
    "population": 177,
    "region": "아프리카"
  },
  {
    "country": "트리니다드토바고",
    "population": 51,
    "region": "중남미"
  },
  {
    "country": "파나마",
    "population": 487,
    "region": "중남미"
  },
  {
    "country": "파라과이",
    "population": 3960,
    "region": "중남미"
  },
  {
    "country": "파키스탄",
    "population": 536,
    "region": "남아시아태평양"
  },
  {
    "country": "파푸아뉴기니",
    "population": 126,
    "region": "남아시아태평양"
  },
  {
    "country": "팔라우",
    "population": 28,
    "region": "남아시아태평양"
  },
  {
    "country": "페루",
    "population": 1003,
    "region": "중남미"
  },
  {
    "country": "포르투갈",
    "population": 538,
    "region": "유럽"
  },
  {
    "country": "폴란드",
    "population": 3570,
    "region": "유럽"
  },
  {
    "country": "프랑스",
    "population": 28103,
    "region": "유럽"
  },
  {
    "country": "피지",
    "population": 1059,
    "region": "남아시아태평양"
  },
  {
    "country": "핀란드",
    "population": 1063,
    "region": "유럽"
  },
  {
    "country": "필리핀",
    "population": 52695,
    "region": "남아시아태평양"
  },
  {
    "country": "헝가리",
    "population": 7297,
    "region": "유럽"
  },
  {
    "country": "호주",
    "population": 170215,
    "region": "남아시아태평양"
  }
]
