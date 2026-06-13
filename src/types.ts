export interface Student {
  id: string; // unique ID for React lists
  stuNo: string; // 학번 (A열, e.g., 1101, 1205, 2103)
  name: string; // 이름 (B열)
  dept1: string; // 희망학과1 (C열)
  dept2: string; // 희망학과2 (D열)
  careersRaw: string; // 진로 (E열, e.g. "경찰, 프로파일러, 소방관")
  submittedAt?: string; // 작성시간 (선택적)
  track: string; // 계열 (F열, e.g. "의료보건", "경상", "예술", "공학")
  ref1?: string; // 참고1 (G열)
  ref2?: string; // 참고2 (H열)
  ref3?: string; // 참고3 (I열)
  ref4?: string; // 참고4 (J열)
  ref5?: string; // 참고5 (K열)
}

export interface ChartDataPoint {
  name: string;
  count: number;
}

export interface GASCodeTemplates {
  codeGs: string;
  indexHtml: string;
}
