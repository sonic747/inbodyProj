export interface InBodyRecord {
  id: string;
  date: string; // YYYY.MM.DD or YYYY-MM-DD
  displayDate: string; // e.g. "2026.08.24"
  title: string; // e.g. "상세 분석", "추적 스캔", "초기 기준 스캔"
  weight: number; // kg
  weightDelta?: number; // kg delta compared to previous
  skeletalMuscleMass: number; // kg (골격근량)
  skeletalMuscleDelta?: number; // kg
  bodyFatMass: number; // kg (체지방량)
  bodyFatMassDelta?: number; // kg
  bodyFatPercentage: number; // % (체지방률)
  bodyFatPercentageDelta?: number; // %
  bmi: number; // kg/m²
  bmr: number; // kcal (기초대사량)
  visceralFatLevel: number; // level 1-20 (내장지방레벨)
  totalBodyWater?: number; // L (체수분)
  inBodyScore?: number; // 0-100 (인바디 점수)
  imageUrl?: string;
  notes?: string;
  aiFeedback?: {
    summary: string;
    dietTip: string;
    workoutTip: string;
    evaluation: 'excellent' | 'good' | 'average' | 'attention';
  };
  segmentalMuscle?: {
    rightArm: number;
    leftArm: number;
    trunk: number;
    rightLeg: number;
    leftLeg: number;
  };
}

export interface UserProfile {
  name: string;
  age: number;
  gender: 'male' | 'female';
  height: number; // cm
  targetWeight: number; // kg
  targetBodyFatPercentage: number; // %
  avatarUrl: string;
}

export type ActiveTab = 'home' | 'scan' | 'history' | 'settings';
