import React from 'react';
import { UserProfile } from '../types';

interface HeaderProps {
  userProfile: UserProfile;
  onOpenProfile: () => void;
  title?: string;
}

export const Header: React.FC<HeaderProps> = ({
  userProfile,
  onOpenProfile,
  title = '스윙짐 인바디',
}) => {
  return (
    <header className="sticky top-0 bg-[#0D0F16]/95 backdrop-blur-md border-b border-[#2A2D35] flex justify-between items-center w-full px-4 sm:px-6 py-2.5 z-40 h-16">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-full overflow-hidden bg-[#1A1D26] flex items-center justify-center ring-1 ring-[#3B82F6]/40 shrink-0">
          <img
            className="w-full h-full object-cover"
            alt="프로필 아바타"
            src={userProfile.avatarUrl}
            referrerPolicy="no-referrer"
          />
        </div>
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-gradient-to-tr from-[#3B82F6] to-[#8B5CF6] shadow-sm shadow-blue-500/50"></div>
          <h1 className="text-lg sm:text-xl font-bold text-[#E2E4E9] tracking-tight">
            {title}
          </h1>
        </div>
      </div>
      <button
        onClick={onOpenProfile}
        className="w-10 h-10 flex items-center justify-center rounded-xl bg-[#12141C] border border-[#2A2D35] hover:bg-[#1A1D26] hover:border-[#3E424B] transition-colors duration-200 text-[#9CA3AF] hover:text-[#E2E4E9]"
        title="프로필 및 목표 설정"
        aria-label="프로필 및 목표 설정"
      >
        <span className="material-symbols-outlined text-[22px]">account_circle</span>
      </button>
    </header>
  );
};
