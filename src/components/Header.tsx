import React, { useState, useRef, useEffect } from 'react';
import { UserProfile, UserAccount, ActiveTab } from '../types';

interface HeaderProps {
  userProfile: UserProfile;
  currentUser?: UserAccount | null;
  monitoredMember?: UserAccount | null;
  accounts?: UserAccount[];
  onSelectMonitoredMember?: (member: UserAccount | null) => void;
  onLogout?: () => void;
  onOpenProfile: () => void;
  title?: string;
  activeTab?: ActiveTab;
  onChangeTab?: (tab: ActiveTab) => void;
}

export const Header: React.FC<HeaderProps> = ({
  userProfile,
  currentUser,
  monitoredMember,
  accounts = [],
  onSelectMonitoredMember,
  onLogout,
  onOpenProfile,
  title = '스윙짐 인바디',
  activeTab = 'home',
  onChangeTab,
}) => {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const isAdmin = currentUser?.role === 'admin';

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const regularMembers = accounts.filter((a) => a.role !== 'admin');

  // Navigation tabs for Admin vs Member
  const navTabs = isAdmin
    ? [
        { id: 'admin_members' as ActiveTab, label: '전체 회원 관리', icon: 'groups' },
        { id: 'home' as ActiveTab, label: '인바디 대시보드', icon: 'dashboard' },
        { id: 'scan' as ActiveTab, label: '인바디 스캔', icon: 'photo_camera' },
        { id: 'history' as ActiveTab, label: '기록 분석', icon: 'history' },
        { id: 'settings' as ActiveTab, label: '설정', icon: 'settings' },
      ]
    : [
        { id: 'home' as ActiveTab, label: '대시보드', icon: 'dashboard' },
        { id: 'scan' as ActiveTab, label: '인바디 스캔', icon: 'photo_camera' },
        { id: 'history' as ActiveTab, label: '기록 조회', icon: 'history' },
        { id: 'settings' as ActiveTab, label: '설정', icon: 'settings' },
      ];

  return (
    <header className="sticky top-0 bg-[#0D0F16]/95 backdrop-blur-md border-b border-[#2A2D35] flex flex-col w-full z-40">
      <div className="flex justify-between items-center w-full px-4 sm:px-6 py-2.5 h-16">
        <div className="flex items-center gap-3 sm:gap-4">
          <div className="flex items-center gap-2.5 sm:gap-3">
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
              <h1 className="text-base sm:text-xl font-bold text-[#E2E4E9] tracking-tight">
                {title}
              </h1>
            </div>
          </div>

          {/* Desktop Navigation Tabs */}
          {onChangeTab && (
            <nav className="hidden md:flex items-center gap-1.5 ml-4 pl-4 border-l border-[#2A2D35]">
              {navTabs.map((tab) => {
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => onChangeTab(tab.id)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all ${
                      isActive
                        ? 'bg-gradient-to-r from-[#3B82F6] to-[#8B5CF6] text-white shadow-sm shadow-blue-500/20'
                        : 'text-[#9CA3AF] hover:text-[#E2E4E9] hover:bg-[#1A1D26]'
                    }`}
                  >
                    <span className="material-symbols-outlined text-[16px]">{tab.icon}</span>
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </nav>
          )}
        </div>

        {/* Right Side: User & Admin Status */}
        <div className="flex items-center gap-2">
          {/* User Account / Role Badge */}
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setDropdownOpen((prev) => !prev)}
              className={`flex items-center gap-2 py-1.5 px-3 rounded-xl border transition-all text-xs ${
                isAdmin
                  ? 'bg-amber-500/10 border-amber-500/30 hover:bg-amber-500/20 text-amber-300'
                  : 'bg-[#12141C] border-[#2A2D35] hover:border-[#3B82F6]/50 hover:bg-[#1A1D26] text-[#E2E4E9]'
              }`}
            >
              {isAdmin ? (
                <span className="material-symbols-outlined text-[16px] text-amber-400">
                  admin_panel_settings
                </span>
              ) : (
                <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
              )}

              <div className="text-left">
                <span className="font-bold max-w-[90px] sm:max-w-[120px] truncate block leading-tight">
                  {isAdmin ? '관리자 (Admin)' : userProfile.name}
                </span>
              </div>

              {currentUser && (
                <span className="text-[10px] opacity-70 font-mono hidden sm:inline">
                  ID: {currentUser.username}
                </span>
              )}

              <span className="material-symbols-outlined text-[16px] opacity-60">
                {dropdownOpen ? 'expand_less' : 'expand_more'}
              </span>
            </button>

            {/* Dropdown Menu */}
            {dropdownOpen && (
              <div className="absolute right-0 mt-2 w-64 bg-[#12141C] border border-[#2A2D35] rounded-2xl shadow-2xl p-2.5 z-50 animate-in fade-in duration-150">
                <div className="px-3 py-2 border-b border-[#2A2D35]/80 mb-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] uppercase font-bold tracking-wider text-[#9CA3AF]">
                      {isAdmin ? '👑 센터 최고 관리자' : '👤 로그인 회원'}
                    </span>
                    <span
                      className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
                        isAdmin
                          ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                          : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                      }`}
                    >
                      {isAdmin ? '전체 권한' : '개인 전용'}
                    </span>
                  </div>
                  <div className="text-xs font-bold text-white mt-1">
                    {userProfile.name}
                  </div>
                  {currentUser && (
                    <div className="text-[11px] text-[#60A5FA] font-mono mt-0.5">
                      아이디: {currentUser.username}
                    </div>
                  )}
                </div>

                {/* If Admin: Quick member selector to monitor */}
                {isAdmin && (
                  <div className="py-1">
                    <div className="px-3 py-1 text-[10px] font-bold text-[#9CA3AF] flex items-center justify-between">
                      <span>모니터링 대상 회원 전환</span>
                      <span className="text-[9px] text-[#6B7280]">{regularMembers.length}명</span>
                    </div>
                    <div className="max-h-40 overflow-y-auto space-y-1 pr-1">
                      {regularMembers.map((member) => {
                        const isMonitored = monitoredMember?.id === member.id;
                        return (
                          <button
                            key={member.id}
                            onClick={() => {
                              setDropdownOpen(false);
                              if (onSelectMonitoredMember) {
                                onSelectMonitoredMember(member);
                              }
                            }}
                            className={`w-full px-2.5 py-1.5 rounded-xl text-left flex items-center justify-between text-xs transition-all ${
                              isMonitored
                                ? 'bg-[#2563EB]/20 text-[#60A5FA] border border-[#3B82F6]/30 font-bold'
                                : 'hover:bg-[#1A1D27] text-[#9CA3AF] hover:text-white'
                            }`}
                          >
                            <div className="flex items-center gap-2 truncate">
                              <span className="material-symbols-outlined text-[15px]">
                                {member.profile.gender === 'female' ? 'face_3' : 'face_6'}
                              </span>
                              <span className="truncate">{member.name}</span>
                            </div>
                            <span className="text-[10px] font-mono opacity-70">
                              {member.username}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Actions */}
                <div className="pt-1 mt-1 border-t border-[#2A2D35]/80 space-y-1">
                  {isAdmin && onChangeTab && (
                    <button
                      onClick={() => {
                        setDropdownOpen(false);
                        onChangeTab('admin_members');
                      }}
                      className="w-full px-2.5 py-2 rounded-xl text-left flex items-center gap-2 text-xs font-semibold text-[#60A5FA] hover:bg-[#3B82F6]/10 transition-all"
                    >
                      <span className="material-symbols-outlined text-[16px]">groups</span>
                      <span>전체 회원 관리 화면</span>
                    </button>
                  )}

                  <button
                    onClick={() => {
                      setDropdownOpen(false);
                      onOpenProfile();
                    }}
                    className="w-full px-2.5 py-2 rounded-xl text-left flex items-center gap-2 text-xs font-semibold text-[#E2E4E9] hover:bg-[#1A1D27] transition-all"
                  >
                    <span className="material-symbols-outlined text-[16px]">settings</span>
                    <span>설정 및 정보 관리</span>
                  </button>

                  {onLogout && (
                    <button
                      onClick={() => {
                        setDropdownOpen(false);
                        onLogout();
                      }}
                      className="w-full px-2.5 py-2 rounded-xl text-left flex items-center gap-2 text-xs font-semibold text-[#F87171] hover:bg-red-500/10 transition-all"
                    >
                      <span className="material-symbols-outlined text-[16px]">logout</span>
                      <span>로그아웃</span>
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Settings quick icon */}
          <button
            onClick={onOpenProfile}
            className="w-9 h-9 flex items-center justify-center rounded-xl bg-[#12141C] border border-[#2A2D35] hover:bg-[#1A1D26] hover:border-[#3E424B] transition-colors duration-200 text-[#9CA3AF] hover:text-[#E2E4E9]"
            title="설정 및 프로필"
          >
            <span className="material-symbols-outlined text-[20px]">settings</span>
          </button>
        </div>
      </div>

      {/* Admin Monitoring Sub-Banner: Displayed when Admin is viewing/monitoring a specific member */}
      {isAdmin && monitoredMember && (
        <div className="bg-[#1E1B4B]/90 border-t border-b border-[#6366F1]/30 px-4 sm:px-6 py-2 flex items-center justify-between text-xs text-indigo-200">
          <div className="flex items-center gap-2 overflow-hidden">
            <span className="material-symbols-outlined text-amber-400 text-[18px]">
              visibility
            </span>
            <span className="font-semibold text-white">
              [관리자 모니터링 모드]
            </span>
            <span className="text-white font-bold bg-[#6366F1]/40 px-2 py-0.5 rounded-lg border border-[#818CF8]/40 truncate">
              {monitoredMember.name} 회원 (ID: {monitoredMember.username})
            </span>
            <span className="text-[#A5B4FC] hidden sm:inline">
              의 인바디 데이터 조회 및 대리 스캔 중
            </span>
          </div>

          {onChangeTab && (
            <button
              onClick={() => onChangeTab('admin_members')}
              className="px-3 py-1 bg-[#6366F1] hover:bg-[#4F46E5] text-white rounded-lg text-[11px] font-bold shrink-0 transition-all flex items-center gap-1 shadow-sm"
            >
              <span className="material-symbols-outlined text-[14px]">arrow_back</span>
              회원 목록으로
            </button>
          )}
        </div>
      )}
    </header>
  );
};
