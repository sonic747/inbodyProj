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

  // Save to localStorage when records change
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_RECORDS, JSON.stringify(records));
  }, [records]);

  // Save to localStorage when profile changes
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_PROFILE, JSON.stringify(userProfile));
  }, [userProfile]);

  // Handler for adding a newly scanned record
  const handleAddNewRecord = (newRecord: InBodyRecord) => {
    // calculate delta compared to previous latest
    const prevLatest = records[0];
    if (prevLatest) {
      newRecord.weightDelta = +(newRecord.weight - prevLatest.weight).toFixed(1);
      newRecord.skeletalMuscleDelta = +(
        newRecord.skeletalMuscleMass - prevLatest.skeletalMuscleMass
      ).toFixed(1);
      newRecord.bodyFatMassDelta = +(
        newRecord.bodyFatMass - prevLatest.bodyFatMass
      ).toFixed(1);
      newRecord.bodyFatPercentageDelta = +(
        newRecord.bodyFatPercentage - prevLatest.bodyFatPercentage
      ).toFixed(1);
    }

    setRecords((prev) => [newRecord, ...prev]);
    setSelectedRecord(newRecord);
    setActiveTab('home');

    // Confetti effect on successful new scan
    try {
      confetti({
        particleCount: 50,
        spread: 60,
        origin: { y: 0.7 },
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
