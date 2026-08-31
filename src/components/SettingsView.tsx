import React, { useState, useEffect } from 'react';
import { UserProfile, UserAccount } from '../types';

interface SettingsViewProps {
  userProfile: UserProfile;
  currentUser?: UserAccount | null;
  accounts?: UserAccount[];
  onUpdateProfile: (profile: UserProfile) => void;
  onNavigateToAdminMembers?: () => void;
  onLogout?: () => void;
  onResetData: () => void;
  totalRecordsCount: number;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  userProfile,
  currentUser,
  accounts = [],
  onUpdateProfile,
  onNavigateToAdminMembers,
  onLogout,
  onResetData,
  totalRecordsCount,
}) => {
  const isAdmin = currentUser?.role === 'admin';
  const [name, setName] = useState(userProfile.name);
  const [age, setAge] = useState(userProfile.age);
  const [gender, setGender] = useState<'male' | 'female'>(userProfile.gender);
  const [height, setHeight] = useState(userProfile.height);
  const [targetWeight, setTargetWeight] = useState(userProfile.targetWeight);
  const [targetBodyFatPercentage, setTargetBodyFatPercentage] = useState(
    userProfile.targetBodyFatPercentage
  );
  const [savedToast, setSavedToast] = useState(false);

  useEffect(() => {
    setName(userProfile.name);
    setAge(userProfile.age);
    setGender(userProfile.gender);
    setHeight(userProfile.height);
    setTargetWeight(userProfile.targetWeight);
    setTargetBodyFatPercentage(userProfile.targetBodyFatPercentage);
  }, [userProfile]);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateProfile({
      name,
      age: Number(age),
      gender,
      height: Number(height),
      targetWeight: Number(targetWeight),
      targetBodyFatPercentage: Number(targetBodyFatPercentage),
      avatarUrl: userProfile.avatarUrl,
    });
    setSavedToast(true);
    setTimeout(() => setSavedToast(false), 3000);
  };

  return (
    <div className="flex-1 max-w-2xl mx-auto w-full space-y-6 pb-24 md:pb-8">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-[#E2E4E9]">
          {isAdmin ? '센터 관리자 설정' : '개인 프로필 및 목표 설정'}
        </h1>
        <p className="text-sm text-[#9CA3AF] mt-0.5">
          {isAdmin
            ? '센터 관리자 계정 상태 및 회원 관리 정책을 확인하세요.'
            : '신체 기본 정보와 목표치를 설정하여 정확한 인바디 분석을 받아보세요.'}
        </p>
      </div>

      {savedToast && (
        <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 rounded-2xl text-xs font-bold flex items-center gap-2 shadow-lg">
          <span className="material-symbols-outlined text-[18px]">check_circle</span>
          설정 및 신체 목표 정보가 성공적으로 저장되었습니다.
        </div>
      )}

      {/* Account Info Card */}
      <div className="bg-[#12141C] border border-[#2A2D35] rounded-3xl p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-sm text-[#E2E4E9] flex items-center gap-2">
            <span className="material-symbols-outlined text-[#60A5FA]">account_circle</span>
            접속 계정 정보
          </h3>
          <span
            className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${
              isAdmin
                ? 'bg-amber-500/20 text-amber-400 border-amber-500/30'
                : 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
            }`}
          >
            {isAdmin ? '👑 센터 최고 관리자' : '👤 개인 회원 (개인정보 보호 적용)'}
          </span>
        </div>

        <div className="p-4 bg-[#0D0F16] border border-[#2A2D35] rounded-2xl flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl overflow-hidden bg-[#1A1D26] ring-2 ring-[#3B82F6]/40 shrink-0">
              <img
                src={userProfile.avatarUrl}
                alt="아바타"
                className="w-full h-full object-cover"
              />
            </div>
            <div>
              <div className="text-sm font-bold text-white flex items-center gap-2">
                <span>{userProfile.name}</span>
                {currentUser && (
                  <span className="text-[11px] font-mono text-[#60A5FA] bg-[#3B82F6]/10 px-2 py-0.5 rounded">
                    ID: {currentUser.username}
                  </span>
                )}
              </div>
              <div className="text-[11px] text-[#9CA3AF] mt-1">
                {isAdmin
                  ? `총 ${accounts.filter((a) => a.role !== 'admin').length}명의 회원 데이터를 통합 관리 중입니다.`
                  : '본인 고유 계정으로 로그인되어 타 회원의 데이터와 철저히 분리됩니다.'}
              </div>
            </div>
          </div>
        </div>

        {/* Action button */}
        <div className="flex flex-wrap gap-2 pt-2 border-t border-[#2A2D35]/60">
          {isAdmin && onNavigateToAdminMembers && (
            <button
              type="button"
              onClick={onNavigateToAdminMembers}
              className="flex-1 py-2.5 px-3 bg-[#2563EB] hover:bg-[#1D4ED8] text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 shadow-md shadow-blue-500/20"
            >
              <span className="material-symbols-outlined text-[16px]">groups</span>
              전체 회원 목록 관리로 이동
            </button>
          )}

          {onLogout && (
            <button
              type="button"
              onClick={onLogout}
              className="py-2.5 px-4 bg-[#161822] hover:bg-red-500/10 text-[#F87171] border border-[#2A2D35] rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5"
            >
              <span className="material-symbols-outlined text-[16px]">logout</span>
              로그아웃
            </button>
          )}
        </div>
      </div>

      {/* User Profile & Target Goals Form */}
      <form onSubmit={handleSave} className="bg-[#12141C] border border-[#2A2D35] rounded-3xl p-6 shadow-sm space-y-5">
        <div className="flex items-center gap-4 pb-4 border-b border-[#2A2D35]">
          <div className="w-14 h-14 rounded-2xl overflow-hidden bg-[#1A1D26] ring-2 ring-[#3B82F6]/50 shrink-0">
            <img
              src={userProfile.avatarUrl}
              alt="사용자 아바타"
              className="w-full h-full object-cover"
            />
          </div>
          <div>
            <h3 className="font-bold text-sm text-[#E2E4E9]">
              {isAdmin ? '관리자 신체/목표 정보' : '신체 스펙 및 감량 목표치'}
            </h3>
            <p className="text-xs text-[#9CA3AF] mt-0.5">
              정확한 인바디 BMI 및 표준 체중 산출을 위해 최신 신장과 나이를 기입하세요.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-[#9CA3AF] mb-1.5">이름</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-[#0D0F16] border border-[#2A2D35] rounded-xl text-xs sm:text-sm text-white focus:border-[#3B82F6] outline-none"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#9CA3AF] mb-1.5">성별</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setGender('male')}
                className={`py-2.5 rounded-xl text-xs font-bold border transition-all ${
                  gender === 'male'
                    ? 'bg-[#3B82F6] text-white border-[#3B82F6]'
                    : 'bg-[#0D0F16] text-[#9CA3AF] border-[#2A2D35]'
                }`}
              >
                남성
              </button>
              <button
                type="button"
                onClick={() => setGender('female')}
                className={`py-2.5 rounded-xl text-xs font-bold border transition-all ${
                  gender === 'female'
                    ? 'bg-[#EC4899] text-white border-[#EC4899]'
                    : 'bg-[#0D0F16] text-[#9CA3AF] border-[#2A2D35]'
                }`}
              >
                여성
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#9CA3AF] mb-1.5">나이 (세)</label>
            <input
              type="number"
              value={age}
              onChange={(e) => setAge(Number(e.target.value))}
              min={10}
              max={100}
              className="w-full px-3.5 py-2.5 bg-[#0D0F16] border border-[#2A2D35] rounded-xl text-xs sm:text-sm text-white focus:border-[#3B82F6] outline-none"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#9CA3AF] mb-1.5">신장 (cm)</label>
            <input
              type="number"
              value={height}
              onChange={(e) => setHeight(Number(e.target.value))}
              min={100}
              max={230}
              className="w-full px-3.5 py-2.5 bg-[#0D0F16] border border-[#2A2D35] rounded-xl text-xs sm:text-sm text-white focus:border-[#3B82F6] outline-none"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#9CA3AF] mb-1.5">
              목표 체중 (kg)
            </label>
            <input
              type="number"
              step="0.1"
              value={targetWeight}
              onChange={(e) => setTargetWeight(Number(e.target.value))}
              className="w-full px-3.5 py-2.5 bg-[#0D0F16] border border-[#2A2D35] rounded-xl text-xs sm:text-sm text-[#fd761a] font-bold focus:border-[#fd761a] outline-none"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#9CA3AF] mb-1.5">
              목표 체지방률 (%)
            </label>
            <input
              type="number"
              step="0.1"
              value={targetBodyFatPercentage}
              onChange={(e) => setTargetBodyFatPercentage(Number(e.target.value))}
              className="w-full px-3.5 py-2.5 bg-[#0D0F16] border border-[#2A2D35] rounded-xl text-xs sm:text-sm text-[#34D399] font-bold focus:border-[#34D399] outline-none"
              required
            />
          </div>
        </div>

        <button
          type="submit"
          className="w-full py-3 bg-[#2563EB] hover:bg-[#1D4ED8] text-white rounded-xl text-xs sm:text-sm font-bold shadow-lg shadow-blue-500/25 transition-all flex items-center justify-center gap-2 mt-4"
        >
          <span className="material-symbols-outlined text-[18px]">save</span>
          프로필 및 목표치 저장
        </button>
      </form>

      {/* App Data Management */}
      <div className="bg-[#12141C] border border-[#2A2D35] rounded-3xl p-6 shadow-sm space-y-4">
        <h3 className="font-bold text-sm text-[#E2E4E9] flex items-center gap-2">
          <span className="material-symbols-outlined text-[#60A5FA]">database</span>
          인바디 데이터 관리
        </h3>
        <div className="flex justify-between items-center text-xs p-3.5 bg-[#0D0F16] border border-[#2A2D35] rounded-xl">
          <span className="text-[#9CA3AF]">
            {isAdmin ? '현재 모니터링 대상 저장 기록' : `${userProfile.name} 님의 저장된 인바디 기록`}
          </span>
          <span className="font-bold text-[#60A5FA] text-sm">{totalRecordsCount} 건</span>
        </div>

        <div className="pt-1">
          <button
            onClick={() => {
              if (confirm('현재 회원의 인바디 측정 데이터를 초기화하시겠습니까?')) {
                onResetData();
              }
            }}
            className="w-full py-2.5 px-4 bg-[#161822] hover:bg-red-500/10 text-[#F87171] border border-[#2A2D35] rounded-xl text-xs font-semibold transition-all flex items-center justify-center gap-2"
          >
            <span className="material-symbols-outlined text-[18px]">restart_alt</span>
            현재 대상 데이터 초기화
          </button>
        </div>
      </div>
    </div>
  );
};
