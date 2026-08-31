import { useState, useEffect, useCallback, useMemo } from 'react';
import { InBodyRecord, UserProfile, UserAccount, ActiveTab } from './types';
import { DEFAULT_ACCOUNTS, INITIAL_INBODY_RECORDS, INITIAL_LEE_RECORDS } from './data/initialData';
import { Header } from './components/Header';
import { BottomNavBar } from './components/BottomNavBar';
import { DashboardView } from './components/DashboardView';
import { ScanView } from './components/ScanView';
import { HistoryView } from './components/HistoryView';
import { SettingsView } from './components/SettingsView';
import { AdminMembersView } from './components/AdminMembersView';
import { ScanDetailModal } from './components/ScanDetailModal';
import { ManualEntryModal } from './components/ManualEntryModal';
import { AuthModal } from './components/AuthModal';
import confetti from 'canvas-confetti';

const STORAGE_KEY_ACCOUNTS = 'inbody_accounts_v3';
const STORAGE_KEY_ACTIVE_USER_ID = 'inbody_active_user_id_v3';
const STORAGE_KEY_USER_RECORDS_PREFIX = 'inbody_user_records_v3_';

export default function App() {
  // 1. Manage Accounts (All registered users in localStorage)
  const [accounts, setAccounts] = useState<UserAccount[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEY_ACCOUNTS);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          // Ensure admin exists
          if (!parsed.some((a) => a.username === 'admin')) {
            return [...DEFAULT_ACCOUNTS, ...parsed.filter((p) => p.username !== 'admin')];
          }
          return parsed;
        }
      } catch {
        // fallback
      }
    }
    return DEFAULT_ACCOUNTS;
  });

  // Save accounts to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_ACCOUNTS, JSON.stringify(accounts));
    } catch (e) {
      console.warn('Failed to save accounts to localStorage:', e);
    }
  }, [accounts]);

  // 2. Manage Current Logged-in User
  const [currentUser, setCurrentUser] = useState<UserAccount | null>(() => {
    const activeUserId = localStorage.getItem(STORAGE_KEY_ACTIVE_USER_ID);
    if (activeUserId) {
      const found = accounts.find((a) => a.id === activeUserId);
      if (found) return found;
    }
    return null; // Start at login screen if no session
  });

  // Save active user ID to localStorage
  useEffect(() => {
    if (currentUser) {
      localStorage.setItem(STORAGE_KEY_ACTIVE_USER_ID, currentUser.id);
    } else {
      localStorage.removeItem(STORAGE_KEY_ACTIVE_USER_ID);
    }
  }, [currentUser]);

  // Helper to load records for a specific user ID
  const getUserRecords = useCallback((userId: string): InBodyRecord[] => {
    const saved = localStorage.getItem(`${STORAGE_KEY_USER_RECORDS_PREFIX}${userId}`);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      } catch {
        // fallback
      }
    }
    // Default sample data for preloaded demo users
    if (userId === 'user_demo') {
      return INITIAL_INBODY_RECORDS;
    }
    if (userId === 'user_lee') {
      return INITIAL_LEE_RECORDS;
    }
    return [];
  }, []);

  const isAdmin = currentUser?.role === 'admin';

  // 3. For Admin Mode: Track the member currently being monitored
  const [monitoredMemberId, setMonitoredMemberId] = useState<string | null>(() => {
    const regular = accounts.find((a) => a.role !== 'admin');
    return regular ? regular.id : null;
  });

  const monitoredMember = useMemo(() => {
    if (!isAdmin) return null;
    return accounts.find((a) => a.id === monitoredMemberId) || null;
  }, [isAdmin, accounts, monitoredMemberId]);

  // Target User whose records and profile are being viewed/edited
  const targetUser = useMemo(() => {
    if (isAdmin && monitoredMember) {
      return monitoredMember;
    }
    return currentUser || DEFAULT_ACCOUNTS[1];
  }, [isAdmin, monitoredMember, currentUser]);

  // 4. Current Target Records state
  const [records, setRecords] = useState<InBodyRecord[]>(() => {
    return targetUser ? getUserRecords(targetUser.id) : [];
  });

  // 5. Active Tab
  const [activeTab, setActiveTab] = useState<ActiveTab>(() => {
    return isAdmin ? 'admin_members' : 'home';
  });

  const [selectedRecord, setSelectedRecord] = useState<InBodyRecord | null>(null);
  const [showManualEntry, setShowManualEntry] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [saveToast, setSaveToast] = useState<{ title: string; weight: number; targetName: string } | null>(null);

  // Sync records when targetUser changes
  useEffect(() => {
    if (targetUser) {
      const recs = getUserRecords(targetUser.id);
      setRecords(recs);
    }
  }, [targetUser, getUserRecords]);

  // Save current target records whenever records state changes
  useEffect(() => {
    if (!targetUser) return;
    try {
      const safeRecords = records.map((r) => ({
        ...r,
        imageUrl: r.imageUrl && r.imageUrl.length > 20000 ? '' : r.imageUrl,
      }));
      localStorage.setItem(
        `${STORAGE_KEY_USER_RECORDS_PREFIX}${targetUser.id}`,
        JSON.stringify(safeRecords)
      );
    } catch (e) {
      console.warn('LocalStorage save error for user records:', e);
    }
  }, [records, targetUser]);

  // Ensure member cannot access admin_members tab
  useEffect(() => {
    if (!isAdmin && activeTab === 'admin_members') {
      setActiveTab('home');
    }
  }, [isAdmin, activeTab]);

  // Handle Login
  const handleLogin = (account: UserAccount) => {
    setCurrentUser(account);
    setShowAuthModal(false);

    if (account.role === 'admin') {
      setActiveTab('admin_members');
      // default monitored member to first member
      const firstMember = accounts.find((a) => a.role !== 'admin');
      if (firstMember) {
        setMonitoredMemberId(firstMember.id);
      }
    } else {
      setActiveTab('home');
      setMonitoredMemberId(null);
    }

    try {
      confetti({
        particleCount: 50,
        spread: 60,
        origin: { y: 0.5 },
      });
    } catch {
      // ignore
    }
  };

  // Handle Register
  const handleRegisterAccount = (newAccount: UserAccount) => {
    const updated = [...accounts, newAccount];
    setAccounts(updated);
    setCurrentUser(newAccount);
    setShowAuthModal(false);
    setActiveTab('home');
    setRecords([]);

    try {
      confetti({
        particleCount: 80,
        spread: 80,
        origin: { y: 0.5 },
      });
    } catch {
      // ignore
    }
  };

  // Handle Logout
  const handleLogout = () => {
    setCurrentUser(null);
    setMonitoredMemberId(null);
    setShowAuthModal(true);
  };

  // Handle Adding member by Admin
  const handleAddMemberByAdmin = (newMember: UserAccount) => {
    const updated = [...accounts, newMember];
    setAccounts(updated);
    setMonitoredMemberId(newMember.id);

    try {
      confetti({
        particleCount: 60,
        spread: 70,
        origin: { y: 0.6 },
      });
    } catch {
      // ignore
    }
  };

  // Handle Updating member by Admin
  const handleUpdateMemberByAdmin = (updatedMember: UserAccount) => {
    setAccounts((prev) =>
      prev.map((acc) => (acc.id === updatedMember.id ? updatedMember : acc))
    );
  };

  // Handle Deleting member by Admin
  const handleDeleteMemberByAdmin = (memberId: string) => {
    setAccounts((prev) => prev.filter((acc) => acc.id !== memberId));
    localStorage.removeItem(`${STORAGE_KEY_USER_RECORDS_PREFIX}${memberId}`);

    if (monitoredMemberId === memberId) {
      const remaining = accounts.filter((a) => a.role !== 'admin' && a.id !== memberId);
      setMonitoredMemberId(remaining[0]?.id || null);
    }
  };

  // Handle Profile Update (for current profile/targetUser)
  const handleUpdateProfile = (updatedProfile: UserProfile) => {
    if (!targetUser) return;
    const updatedAccount: UserAccount = {
      ...targetUser,
      name: updatedProfile.name,
      profile: updatedProfile,
    };

    setAccounts((prev) =>
      prev.map((acc) => (acc.id === targetUser.id ? updatedAccount : acc))
    );

    if (currentUser?.id === targetUser.id) {
      setCurrentUser(updatedAccount);
    }
  };

  // Handle Admin selecting a member for monitoring
  const handleSelectMemberForMonitoring = (member: UserAccount) => {
    setMonitoredMemberId(member.id);
    const recs = getUserRecords(member.id);
    setRecords(recs);
    setActiveTab('home');
  };

  // Handle Admin scanning for member
  const handleOpenScanForMember = (member: UserAccount) => {
    setMonitoredMemberId(member.id);
    const recs = getUserRecords(member.id);
    setRecords(recs);
    setActiveTab('scan');
  };

  // Handle Admin opening history for member
  const handleOpenHistoryForMember = (member: UserAccount) => {
    setMonitoredMemberId(member.id);
    const recs = getUserRecords(member.id);
    setRecords(recs);
    setActiveTab('history');
  };

  // Handler for adding a newly scanned record
  const handleAddNewRecord = (newRecord: InBodyRecord) => {
    const prevLatest = records[0];
    const weight = Number(newRecord.weight) || 75.5;
    const smm = Number(newRecord.skeletalMuscleMass) || 30.3;
    const bfm = Number(newRecord.bodyFatMass) || 22.0;
    const pbf = Number(newRecord.bodyFatPercentage) || 29.1;

    const weightDelta = prevLatest ? +(weight - prevLatest.weight).toFixed(1) : 0;
    const skeletalMuscleDelta = prevLatest ? +(smm - prevLatest.skeletalMuscleMass).toFixed(1) : 0;
    const bodyFatMassDelta = prevLatest ? +(bfm - prevLatest.bodyFatMass).toFixed(1) : 0;
    const bodyFatPercentageDelta = prevLatest ? +(pbf - prevLatest.bodyFatPercentage).toFixed(1) : 0;

    const userHeightM = (targetUser?.profile.height || 170) / 100;
    const calculatedBmi = +(weight / (userHeightM * userHeightM)).toFixed(1);

    const sanitizedRecord: InBodyRecord = {
      ...newRecord,
      id: newRecord.id || `rec-${Date.now()}`,
      title: newRecord.title || '스윙짐 인바디 정밀 측정',
      weight,
      skeletalMuscleMass: smm,
      bodyFatMass: bfm,
      bodyFatPercentage: pbf,
      bmi: Number(newRecord.bmi) || calculatedBmi,
      bmr: Number(newRecord.bmr) || 1526,
      visceralFatLevel: Number(newRecord.visceralFatLevel) || 8,
      totalBodyWater: Number(newRecord.totalBodyWater) || 39.4,
      fatFreeMass: Number(newRecord.fatFreeMass) || +(weight - bfm).toFixed(1),
      protein: Number(newRecord.protein) || 10.6,
      mineral: Number(newRecord.mineral) || 3.45,
      waistHipRatio: Number(newRecord.waistHipRatio) || 0.87,
      muscleControl: Number(newRecord.muscleControl) || 0.0,
      fatControl: Number(newRecord.fatControl) || -12.5,
      inBodyScore: Number(newRecord.inBodyScore) || 72,
      weightDelta,
      skeletalMuscleDelta,
      bodyFatMassDelta,
      bodyFatPercentageDelta,
      date: newRecord.date || new Date().toISOString().split('T')[0],
      displayDate: newRecord.displayDate || new Date().toISOString().split('T')[0].replace(/-/g, '.'),
      imageUrl: newRecord.imageUrl && newRecord.imageUrl.length > 20000 ? '' : newRecord.imageUrl,
    };

    setRecords((prev) => [sanitizedRecord, ...prev]);
    setSelectedRecord(null);
    setActiveTab('home');
    setSaveToast({
      title: sanitizedRecord.title,
      weight: sanitizedRecord.weight,
      targetName: targetUser?.name || '회원',
    });

    setTimeout(() => {
      setSaveToast(null);
    }, 4500);

    try {
      confetti({
        particleCount: 60,
        spread: 70,
        origin: { y: 0.6 },
      });
    } catch {
      // ignore
    }
  };

  const handleUpdateRecord = (updated: InBodyRecord) => {
    setRecords((prev) => prev.map((r) => (r.id === updated.id ? updated : r)));
    setSelectedRecord(updated);
  };

  const handleDeleteRecord = (id: string) => {
    setRecords((prev) => prev.filter((r) => r.id !== id));
    if (selectedRecord?.id === id) {
      setSelectedRecord(null);
    }
  };

  const handleResetData = () => {
    if (!targetUser) return;
    if (targetUser.id === 'user_demo') {
      setRecords(INITIAL_INBODY_RECORDS);
    } else if (targetUser.id === 'user_lee') {
      setRecords(INITIAL_LEE_RECORDS);
    } else {
      setRecords([]);
    }
  };

  const currentDisplayProfile = targetUser ? targetUser.profile : DEFAULT_ACCOUNTS[0].profile;

  return (
    <div className="min-h-screen bg-[#0A0B0E] text-[#E2E4E9] flex flex-col selection:bg-[#3B82F6] selection:text-white">
      {/* Top Header */}
      {currentUser && activeTab !== 'scan' && (
        <Header
          userProfile={currentDisplayProfile}
          currentUser={currentUser}
          monitoredMember={isAdmin ? monitoredMember : null}
          accounts={accounts}
          onSelectMonitoredMember={handleSelectMemberForMonitoring}
          onLogout={handleLogout}
          onOpenProfile={() => setActiveTab('settings')}
          activeTab={activeTab}
          onChangeTab={setActiveTab}
          title={
            isAdmin
              ? activeTab === 'admin_members'
                ? '스윙짐 회원관리'
                : `스윙짐 [${targetUser?.name || '회원'} 모니터링]`
              : activeTab === 'history'
              ? '스윙짐 인바디 기록'
              : activeTab === 'settings'
              ? '스윙짐 인바디 설정'
              : '스윙짐 인바디'
          }
        />
      )}

      {/* Main Content Area */}
      {currentUser && (
        <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 pt-4 sm:pt-6">
          {/* 1. Admin Full Members Management View */}
          {isAdmin && activeTab === 'admin_members' && (
            <AdminMembersView
              accounts={accounts}
              getUserRecords={getUserRecords}
              onSelectMemberForMonitoring={handleSelectMemberForMonitoring}
              onOpenScanForMember={handleOpenScanForMember}
              onOpenHistoryForMember={handleOpenHistoryForMember}
              onAddMember={handleAddMemberByAdmin}
              onUpdateMember={handleUpdateMemberByAdmin}
              onDeleteMember={handleDeleteMemberByAdmin}
            />
          )}

          {/* 2. Personal / Monitored Member Dashboard View */}
          {activeTab === 'home' && (
            <DashboardView
              records={records}
              userProfile={currentDisplayProfile}
              onOpenScan={() => setActiveTab('scan')}
              onOpenManualEntry={() => setShowManualEntry(true)}
              onSelectRecord={(rec) => setSelectedRecord(rec)}
            />
          )}

          {/* 3. InBody Scan / Camera View */}
          {activeTab === 'scan' && (
            <ScanView
              onBack={() => setActiveTab(isAdmin ? 'admin_members' : 'home')}
              onScanComplete={handleAddNewRecord}
              onOpenManualEntry={() => {
                setActiveTab('home');
                setShowManualEntry(true);
              }}
            />
          )}

          {/* 4. History View */}
          {activeTab === 'history' && (
            <HistoryView
              records={records}
              onSelectRecord={(rec) => setSelectedRecord(rec)}
              onDeleteRecord={handleDeleteRecord}
              onClearAllRecords={() => setRecords([])}
              onOpenManualEntry={() => setShowManualEntry(true)}
            />
          )}

          {/* 5. Settings View */}
          {activeTab === 'settings' && (
            <SettingsView
              userProfile={currentDisplayProfile}
              currentUser={currentUser}
              accounts={accounts}
              onUpdateProfile={handleUpdateProfile}
              onNavigateToAdminMembers={() => setActiveTab('admin_members')}
              onLogout={handleLogout}
              onResetData={handleResetData}
              totalRecordsCount={records.length}
            />
          )}
        </main>
      )}

      {/* Floating Save Success Toast Notification */}
      {saveToast && (
        <div className="fixed top-5 left-1/2 -translate-x-1/2 z-50 bg-[#161822] border border-[#10B981]/50 text-[#E2E4E9] px-5 py-3.5 rounded-2xl shadow-2xl flex items-center gap-3 animate-in fade-in slide-in-from-top-4 duration-300 backdrop-blur-md">
          <div className="w-8 h-8 rounded-full bg-[#10B981]/20 text-[#34D399] flex items-center justify-center flex-shrink-0">
            <span className="material-symbols-outlined text-[20px]">check_circle</span>
          </div>
          <div>
            <p className="text-xs font-bold text-[#E2E4E9]">
              [{saveToast.weight}kg] 인바디 기록 저장 완료!
            </p>
            <p className="text-[11px] text-[#9CA3AF]">
              {saveToast.title} 데이터가 {saveToast.targetName} 님의 기록에 저장되었습니다.
            </p>
          </div>
          <button
            onClick={() => setSaveToast(null)}
            className="text-[#9CA3AF] hover:text-[#E2E4E9] p-1 ml-2"
          >
            <span className="material-symbols-outlined text-[18px]">close</span>
          </button>
        </div>
      )}

      {/* Bottom Navigation Bar (Mobile) */}
      {currentUser && (
        <BottomNavBar
          activeTab={activeTab}
          onChangeTab={setActiveTab}
          isAdmin={isAdmin}
        />
      )}

      {/* Scan Detail Sheet Modal */}
      {selectedRecord && (
        <ScanDetailModal
          record={selectedRecord}
          onClose={() => setSelectedRecord(null)}
          onDeleteRecord={handleDeleteRecord}
          onUpdateRecord={handleUpdateRecord}
        />
      )}

      {/* Manual Entry Modal */}
      {showManualEntry && (
        <ManualEntryModal
          onClose={() => setShowManualEntry(false)}
          onSave={handleAddNewRecord}
        />
      )}

      {/* Authentication / Login Portal */}
      <AuthModal
        isOpen={showAuthModal || !currentUser}
        canDismiss={!!currentUser}
        onClose={() => setShowAuthModal(false)}
        accounts={accounts}
        onLogin={handleLogin}
        onRegister={handleRegisterAccount}
      />
    </div>
  );
}
