import { useState, useEffect } from 'react';
import { InBodyRecord, UserProfile, ActiveTab } from './types';
import { DEFAULT_USER_PROFILE, INITIAL_INBODY_RECORDS } from './data/initialData';
import { Header } from './components/Header';
import { BottomNavBar } from './components/BottomNavBar';
import { DashboardView } from './components/DashboardView';
import { ScanView } from './components/ScanView';
import { HistoryView } from './components/HistoryView';
import { SettingsView } from './components/SettingsView';
import { ScanDetailModal } from './components/ScanDetailModal';
import { ManualEntryModal } from './components/ManualEntryModal';
import confetti from 'canvas-confetti';

const STORAGE_KEY_RECORDS = 'inbody_app_records_v3';
const STORAGE_KEY_PROFILE = 'inbody_app_profile_v3';

export default function App() {
  // Load stored records or initial records
  const [records, setRecords] = useState<InBodyRecord[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEY_RECORDS);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      } catch {
        // use default
      }
    }
    return INITIAL_INBODY_RECORDS;
  });

  // Load stored profile or default profile
  const [userProfile, setUserProfile] = useState<UserProfile>(() => {
    const saved = localStorage.getItem(STORAGE_KEY_PROFILE);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        // use default
      }
    }
    return DEFAULT_USER_PROFILE;
  });

  const [activeTab, setActiveTab] = useState<ActiveTab>('home');
  const [selectedRecord, setSelectedRecord] = useState<InBodyRecord | null>(null);
  const [showManualEntry, setShowManualEntry] = useState(false);

  const [saveToast, setSaveToast] = useState<{ title: string; weight: number } | null>(null);

  // Save to localStorage with quota-safe sanitization and try-catch
  useEffect(() => {
    try {
      // Omit large base64 image strings from persistent storage to prevent QuotaExceededError
      const safeRecords = records.map((r) => ({
        ...r,
        imageUrl: r.imageUrl && r.imageUrl.length > 20000 ? '' : r.imageUrl,
      }));
      localStorage.setItem(STORAGE_KEY_RECORDS, JSON.stringify(safeRecords));
    } catch (e) {
      console.warn('LocalStorage save error:', e);
    }
  }, [records]);

  // Save to localStorage when profile changes
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_PROFILE, JSON.stringify(userProfile));
    } catch (e) {
      console.warn('LocalStorage profile save error:', e);
    }
  }, [userProfile]);

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

    const sanitizedRecord: InBodyRecord = {
      ...newRecord,
      id: newRecord.id || `rec-${Date.now()}`,
      title: newRecord.title || '스윙짐 인바디 정밀 측정',
      weight,
      skeletalMuscleMass: smm,
      bodyFatMass: bfm,
      bodyFatPercentage: pbf,
      bmi: Number(newRecord.bmi) || +(weight / (1.62 * 1.62)).toFixed(1),
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
    setSelectedRecord(null); // Direct to dashboard without black modal overlay!
    setActiveTab('home');
    setSaveToast({ title: sanitizedRecord.title, weight: sanitizedRecord.weight });

    // Auto dismiss toast after 4.5s
    setTimeout(() => {
      setSaveToast(null);
    }, 4500);

    // Confetti effect on successful new scan
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

  const handleImportRecords = (imported: InBodyRecord[]) => {
    setRecords(imported);
    setActiveTab('history');
  };

  const handleResetData = () => {
    setRecords(INITIAL_INBODY_RECORDS);
    setUserProfile(DEFAULT_USER_PROFILE);
    localStorage.removeItem(STORAGE_KEY_RECORDS);
    localStorage.removeItem(STORAGE_KEY_PROFILE);
    alert('기본 예시 데이터로 초기화되었습니다.');
  };

  return (
    <div className="min-h-screen bg-[#0A0B0E] text-[#E2E4E9] flex flex-col selection:bg-[#3B82F6] selection:text-white">
      {/* Top Header */}
      {activeTab !== 'scan' && (
        <Header
          userProfile={userProfile}
          onOpenProfile={() => setActiveTab('settings')}
          title={
            activeTab === 'history'
              ? '스윙짐 인바디 기록'
              : activeTab === 'settings'
              ? '스윙짐 인바디 설정'
              : '스윙짐 인바디'
          }
        />
      )}

      {/* Main Content Area */}
      <div className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 pt-4 sm:pt-6">
        {activeTab === 'home' && (
          <DashboardView
            records={records}
            userProfile={userProfile}
            onOpenScan={() => setActiveTab('scan')}
            onOpenManualEntry={() => setShowManualEntry(true)}
            onSelectRecord={(rec) => setSelectedRecord(rec)}
          />
        )}

        {activeTab === 'scan' && (
          <ScanView
            onBack={() => setActiveTab('home')}
            onScanComplete={handleAddNewRecord}
            onOpenManualEntry={() => {
              setActiveTab('home');
              setShowManualEntry(true);
            }}
          />
        )}

        {activeTab === 'history' && (
          <HistoryView
            records={records}
            onSelectRecord={(rec) => setSelectedRecord(rec)}
            onDeleteRecord={handleDeleteRecord}
            onClearAllRecords={() => setRecords([])}
            onOpenManualEntry={() => setShowManualEntry(true)}
          />
        )}

        {activeTab === 'settings' && (
          <SettingsView
            userProfile={userProfile}
            onUpdateProfile={setUserProfile}
            onResetData={handleResetData}
            totalRecordsCount={records.length}
          />
        )}
      </div>

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
              {saveToast.title} 데이터가 대시보드에 성공적으로 반영되었습니다.
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
      <BottomNavBar activeTab={activeTab} onChangeTab={setActiveTab} />

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
    </div>
  );
}
