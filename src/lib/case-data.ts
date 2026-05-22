export type CaseStatus = "검토중" | "진행중" | "사건종료";

export interface CaseData {
  id: string;
  status: CaseStatus;
  title: string;
  description: string;
  manager: string;
  date: string;
}

export interface FileData {
  id: string;
  name: string;
  size: string;
  date: string;
  seed: number;
}

const REGIONS = [
  "성남시 분당구", "서울시 강남구", "서울시 서초구", "서울시 송파구",
  "인천시 남동구", "수원시 영통구", "용인시 수지구", "고양시 일산서구",
  "부천시 원미구", "안양시 동안구", "대전시 유성구", "광주시 서구",
  "대구시 수성구", "울산시 남구", "청주시 흥덕구", "천안시 서북구",
  "전주시 완산구", "창원시 의창구", "제주시 노형동", "강릉시 교동",
];
const OFFICERS = [
  "홍길동 경감", "김민수 경위", "이영희 경사", "박지훈 경장",
  "최서연 순경", "정우성 경감", "강현우 경위", "윤소영 경사",
];
const STATUSES: CaseStatus[] = ["검토중", "진행중", "사건종료"];

export function seededRand(seed: number) {
  let s = seed;
  return () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
}

export const ALL_CASES: CaseData[] = (() => {
  const rand = seededRand(42);
  return Array.from({ length: 116 }, (_, i) => {
    const region = REGIONS[Math.floor(rand() * REGIONS.length)];
    const officer = OFFICERS[Math.floor(rand() * OFFICERS.length)];
    const status = STATUSES[Math.floor(rand() * STATUSES.length)];
    const month = String(1 + Math.floor(rand() * 12)).padStart(2, "0");
    const day = String(1 + Math.floor(rand() * 28)).padStart(2, "0");
    return {
      id: String(1000 + i),
      status,
      title: `${region} 사건`,
      description: `${region}의 사건파일 입니다.`,
      manager: officer,
      date: `2026-${month}-${day}`,
    };
  });
})();

export function getCaseById(id: string): CaseData {
  return ALL_CASES.find((c) => c.id === id) ?? ALL_CASES[0];
}

export function generateFiles(caseId: string): FileData[] {
  const rand = seededRand(parseInt(caseId, 10));
  const total = 8 + Math.floor(rand() * 16);
  return Array.from({ length: total }, (_, i) => {
    const kb = (50 + rand() * 400).toFixed(1);
    const m = String(1 + Math.floor(rand() * 12)).padStart(2, "0");
    const d = String(1 + Math.floor(rand() * 28)).padStart(2, "0");
    const hh = String(Math.floor(rand() * 24)).padStart(2, "0");
    const mm = String(Math.floor(rand() * 60)).padStart(2, "0");
    const ss = String(Math.floor(rand() * 60)).padStart(2, "0");
    const idx = String(i).padStart(2, "0");
    return {
      id: `${caseId}-${i}`,
      name: `F0704_F_D_S_${hh}-${mm}-${ss}_${idx}.JPG`,
      size: `${kb}KB`,
      date: `2026-${m}-${d}`,
      seed: i,
    };
  });
}
