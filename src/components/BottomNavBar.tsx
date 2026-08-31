import React from 'react';
import { ActiveTab } from '../types';

interface BottomNavBarProps {
  activeTab: ActiveTab;
  onChangeTab: (tab: ActiveTab) => void;
  isAdmin?: boolean;
}

export const BottomNavBar: React.FC<BottomNavBarProps> = ({
  activeTab,
  onChangeTab,
  isAdmin = false,
}) => {
  const navItems = isAdmin
    ? [
        { id: 'admin_members' as ActiveTab, label: '회원관리', icon: 'groups' },
        { id: 'home' as ActiveTab, label: '대시보드', icon: 'dashboard' },
        { id: 'scan' as ActiveTab, label: '스캔', icon: 'photo_camera' },
        { id: 'history' as ActiveTab, label: '기록', icon: 'history' },
        { id: 'settings' as ActiveTab, label: '설정', icon: 'settings' },
      ]
    : [
        { id: 'home' as ActiveTab, label: '홈', icon: 'dashboard' },
        { id: 'scan' as ActiveTab, label: '스캔', icon: 'photo_camera' },
        { id: 'history' as ActiveTab, label: '기록', icon: 'history' },
        { id: 'settings' as ActiveTab, label: '설정', icon: 'settings' },
      ];

  return (
    <nav className="fixed bottom-0 left-0 w-full z-50 flex justify-around items-center px-1 pb-3 pt-1.5 bg-[#0D0F16]/95 backdrop-blur-md border-t border-[#2A2D35] md:hidden shadow-[0_-4px_16px_rgba(0,0,0,0.6)]">
      {navItems.map((item) => {
        const isActive = activeTab === item.id;
        return (
          <button
            key={item.id}
            onClick={() => onChangeTab(item.id)}
            className="flex flex-col items-center justify-center flex-1 group outline-none"
          >
            <div
              className={`flex flex-col items-center justify-center rounded-xl px-3 py-1 mb-0.5 transition-all duration-150 group-active:scale-90 ${
                isActive
                  ? 'bg-gradient-to-r from-[#3B82F6] to-[#8B5CF6] text-[#ffffff] shadow-md shadow-blue-500/20'
                  : 'text-[#6B7280] group-hover:bg-[#1A1D26] group-hover:text-[#E2E4E9]'
              }`}
            >
              <span
                className={`material-symbols-outlined text-[20px] ${
                  isActive ? 'fill' : ''
                }`}
              >
                {item.icon}
              </span>
            </div>
            <span
              className={`text-[11px] ${
                isActive
                  ? 'font-bold text-[#E2E4E9]'
                  : 'font-medium text-[#6B7280] group-hover:text-[#E2E4E9]'
              }`}
            >
              {item.label}
            </span>
          </button>
        );
      })}
    </nav>
  );
};
