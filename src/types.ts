export interface InBodyRecord {
  id: string;
  date: string; // YYYY.MM.DD or YYYY-MM-DD
  displayDate: string; // e.g. "2026.08.24"
  title: string; // e.g. "스윙짐 인바디 정밀 측정", "상세 분석"
  weight: number; // kg (체중)
  weightDelta?: number; // kg delta compared to previous
  skeletalMuscleMass: number; // kg (골격근량)
  skeletalMuscleDelta?: number; // kg
  bodyFatMass: number; // kg (체지방량)
  bodyFatMassDelta?: number; // kg
  bodyFatPercentage: number; // % (체지방률 / PBF)
  bodyFatPercentageDelta?: number; // %
  bmi: number; // kg/m² (체질량지수)
  bmr: number; // kcal (기초대사량)
  visceralFatLevel: number; // level 1-20 (내장지방레벨)
  totalBodyWater?: number; // kg / L (체수분)
  fatFreeMass?: number; // kg (제지방량)
  protein?: number; // kg (단백질)
  mineral?: number; // kg (무기질)
  waistHipRatio?: number; // (복부지방률)
  muscleControl?: number; // kg (적정 근육조절)
  fatControl?: number; // kg (적정 지방조절)
  inBodyScore?: number; // 0-100 (신체발달점수)
  height?: number; // cm
  age?: number;
  gender?: 'male' | 'female' | string;
  centerName?: string;
  measuredTime?: string;
  recommendedCalories?: number; // kcal
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
  segmentalEvaluation?: {
    lean?: { rightArm: string; leftArm: string; trunk: string; rightLeg: string; leftLeg: string };
    fat?: { rightArm: string; leftArm: string; trunk: string; rightLeg: string; leftLeg: string };
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
