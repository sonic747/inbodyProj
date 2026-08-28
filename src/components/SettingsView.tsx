import React, { useState } from 'react';
import { UserProfile } from '../types';

interface SettingsViewProps {
  userProfile: UserProfile;
  onUpdateProfile: (profile: UserProfile) => void;
  onResetData: () => void;
  totalRecordsCount: number;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  userProfile,
  onUpdateProfile,
  onResetData,
  totalRecordsCount,
}) => {
  const [name, setName] = useState(userProfile.name);
  const [age, setAge] = useState(userProfile.age);
  const [gender, setGender] = useState<'male' | 'female'>(userProfile.gender);
  const [height, setHeight] = useState(userProfile.height);
  const [targetWeight, setTargetWeight] = useState(userProfile.targetWeight);
  const [targetBodyFatPercentage, setTargetBodyFatPercentage] = useState(
    userProfile.targetBodyFatPercentage
  );
  const [savedToast, setSavedToast] = useState(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateProfile({
      ...userProfile,
      name,
      age: Number(age),
      gender,
      height: Number(height),
      targetWeight: Number(targetWeight),
      targetBodyFatPercentage: Number(targetBodyFatPercentage),
    });
    setSavedToast(true);
    setTimeout(() => setSavedToast(false), 2500);
  };

  return (
    <div className="flex-1 max-w-2xl mx-auto w-full space-y-6 pb-24 md:pb-8">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-[#E2E4E9]">설정 및 사용자 프로필</h1>
        <p className="text-sm text-[#9CA3AF] mt-0.5">
          신체 기본 정보와 목표치를 설정하여 정확한 인바디 분석을 받아보세요.
        </p>
      </div>

      {savedToast && (
        <div className="p-3 bg-[#10B981]/15 text-[#34D399] rounded-xl text-xs font-semibold border border-[#10B981]/30 flex items-center gap-2 animate-in fade-in">
          <span className="material-symbols-outlined text-[18px]">check_circle</span>
          프로필 및 목표 설정이 성공적으로 저장되었습니다.
        </div>
      )}

      {/* User Profile Form */}
      <form onSubmit={handleSave} className="bg-[#12141C] border border-[#2A2D35] rounded-3xl p-6 shadow-sm space-y-5">
        <div className="flex items-center gap-4 pb-4 border-b border-[#2A2D35]">
          <div className="w-16 h-16 rounded-full overflow-hidden bg-[#1A1D26] ring-2 ring-[#3B82F6]/30">
            <img
              src={userProfile.avatarUrl}
              alt="프로필 사진"
              className="w-full h-full object-cover"
              referrerPolicy="no-referrer"
            />
          </div>
          <div>
            <h3 className="font-bold text-base text-[#E2E4E9]">{name} 님</h3>
            <p className="text-xs text-[#9CA3AF]">
              {gender === 'male' ? '남성' : '여성'} · {age}세 · {height}cm
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          <div>
            <label className="block text-[#9CA3AF] font-semibold mb-1">이름 / 닉네임</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full p-2.5 rounded-xl border border-[#2A2D35] bg-[#0D0F16] text-[#E2E4E9] font-medium text-sm focus:border-[#3B82F6] outline-none"
              required
            />
          </div>

          <div>
            <label className="block text-[#9CA3AF] font-semibold mb-1">성별</label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setGender('male')}
                className={`flex-1 py-2.5 rounded-xl border text-xs font-semibold transition-all ${
                  gender === 'male'
                    ? 'bg-gradient-to-r from-[#3B82F6] to-[#8B5CF6] text-white border-transparent shadow-sm shadow-blue-500/20'
                    : 'bg-[#0D0F16] text-[#9CA3AF] border-[#2A2D35] hover:bg-[#1A1D26] hover:text-[#E2E4E9]'
                }`}
              >
                남성
              </button>
              <button
                type="button"
                onClick={() => setGender('female')}
                className={`flex-1 py-2.5 rounded-xl border text-xs font-semibold transition-all ${
                  gender === 'female'
                    ? 'bg-gradient-to-r from-[#3B82F6] to-[#8B5CF6] text-white border-transparent shadow-sm shadow-blue-500/20'
                    : 'bg-[#0D0F16] text-[#9CA3AF] border-[#2A2D35] hover:bg-[#1A1D26] hover:text-[#E2E4E9]'
                }`}
              >
                여성
              </button>
            </div>
          </div>

          <div>
            <label className="block text-[#9CA3AF] font-semibold mb-1">나이</label>
            <input
              type="number"
              value={age}
              onChange={(e) => setAge(Number(e.target.value))}
              className="w-full p-2.5 rounded-xl border border-[#2A2D35] bg-[#0D0F16] text-[#E2E4E9] font-medium text-sm focus:border-[#3B82F6] outline-none"
              required
            />
          </div>

          <div>
            <label className="block text-[#9CA3AF] font-semibold mb-1">신장 (키, cm)</label>
            <input
              type="number"
              step="0.1"
              value={height}
              onChange={(e) => setHeight(Number(e.target.value))}
              className="w-full p-2.5 rounded-xl border border-[#2A2D35] bg-[#0D0F16] text-[#E2E4E9] font-medium text-sm focus:border-[#3B82F6] outline-none"
              required
            />
          </div>

          <div>
            <label className="block text-[#9CA3AF] font-semibold mb-1">
              목표 체중 (Target Weight, kg)
            </label>
            <input
              type="number"
              step="0.1"
              value={targetWeight}
              onChange={(e) => setTargetWeight(Number(e.target.value))}
              className="w-full p-2.5 rounded-xl border border-[#2A2D35] bg-[#0D0F16] font-bold text-sm text-[#fd761a] focus:border-[#fd761a] outline-none"
              required
            />
          </div>

          <div>
            <label className="block text-[#9CA3AF] font-semibold mb-1">
              목표 체지방률 (Target PBF, %)
            </label>
            <input
              type="number"
              step="0.1"
              value={targetBodyFatPercentage}
              onChange={(e) => setTargetBodyFatPercentage(Number(e.target.value))}
              className="w-full p-2.5 rounded-xl border border-[#2A2D35] bg-[#0D0F16] font-bold text-sm text-[#34D399] focus:border-[#34D399] outline-none"
              required
            />
          </div>
        </div>

        <button
          type="submit"
          className="w-full py-3 bg-gradient-to-r from-[#3B82F6] to-[#8B5CF6] hover:from-[#2563EB] hover:to-[#7C3AED] text-white font-semibold rounded-xl transition-all text-sm shadow-lg shadow-blue-500/20"
        >
          설정 저장하기
        </button>
      </form>

      {/* App Data Management */}
      <div className="bg-[#12141C] border border-[#2A2D35] rounded-3xl p-6 shadow-sm space-y-4">
        <h3 className="font-bold text-sm text-[#E2E4E9] flex items-center gap-2">
          <span className="material-symbols-outlined text-[#9CA3AF]">storage</span>
          데이터 관리 및 통계
        </h3>
        <div className="flex justify-between items-center text-xs p-3.5 bg-[#0D0F16] border border-[#2A2D35] rounded-xl">
          <span className="text-[#9CA3AF]">저장된 총 인바디 측정 기록</span>
          <span className="font-bold text-[#60A5FA] text-sm">{totalRecordsCount} 건</span>
        </div>

        <div className="pt-2">
          <button
            onClick={() => {
              if (confirm('초기 데모 데이터로 복원하시겠습니까? 기존 기록이 덮어씌워집니다.')) {
                onResetData();
              }
            }}
            className="w-full py-2.5 border border-[#EF4444]/30 bg-[#EF4444]/10 hover:bg-[#EF4444]/20 text-[#F87171] rounded-xl text-xs font-semibold transition-colors flex items-center justify-center gap-1.5"
          >
            <span className="material-symbols-outlined text-[18px]">restart_alt</span>
            기본 예시 데이터로 초기화
          </button>
        </div>
      </div>
    </div>
  );
};
