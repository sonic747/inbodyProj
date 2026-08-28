import React, { useState } from 'react';
import { InBodyRecord } from '../types';

interface HistoryViewProps {
  records: InBodyRecord[];
  onSelectRecord: (record: InBodyRecord) => void;
  onDeleteRecord?: (id: string) => void;
  onClearAllRecords?: () => void;
  onOpenManualEntry: () => void;
}

export const HistoryView: React.FC<HistoryViewProps> = ({
  records,
  onSelectRecord,
  onDeleteRecord,
  onClearAllRecords,
  onOpenManualEntry,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [recordToDelete, setRecordToDelete] = useState<InBodyRecord | null>(null);
  const [showClearAllConfirm, setShowClearAllConfirm] = useState(false);

  // Filter records based on search query
  const filteredRecords = records.filter(
    (r) =>
      r.displayDate.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.notes?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const confirmDeleteSingle = (record: InBodyRecord, e: React.MouseEvent) => {
    e.stopPropagation();
    setRecordToDelete(record);
  };

  const executeDeleteSingle = () => {
    if (recordToDelete && onDeleteRecord) {
      onDeleteRecord(recordToDelete.id);
      setRecordToDelete(null);
    }
  };

  const executeClearAll = () => {
    if (onClearAllRecords) {
      onClearAllRecords();
      setShowClearAllConfirm(false);
    }
  };

  return (
    <main className="flex-1 max-w-4xl mx-auto w-full flex flex-col gap-6 pb-24 md:pb-8">
      {/* Header & Actions (Removed Import & Export) */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-[#E2E4E9]">
            스캔 기록 및 데이터 목록
          </h1>
          <p className="text-sm text-[#9CA3AF] mt-1">
            저장된 인바디 측정 기록을 확인하고 관리하세요. ({records.length}개)
          </p>
        </div>
        <div className="flex flex-wrap gap-2 w-full sm:w-auto">
          {records.length > 0 && onClearAllRecords && (
            <button
              onClick={() => setShowClearAllConfirm(true)}
              className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3.5 py-2 border border-[#EF4444]/40 rounded-xl bg-[#12141C] hover:bg-[#EF4444]/15 text-[#F87171] transition-colors duration-200 shadow-sm text-xs font-semibold"
              title="모든 인바디 기록 비우기"
            >
              <span className="material-symbols-outlined text-[18px]">delete_sweep</span>
              전체 기록 삭제
            </button>
          )}

          <button
            onClick={onOpenManualEntry}
            className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-4 py-2 bg-gradient-to-r from-[#3B82F6] to-[#8B5CF6] hover:from-[#2563EB] hover:to-[#7C3AED] text-white rounded-xl transition-all text-xs font-semibold shadow-lg shadow-blue-500/20 active:scale-95"
          >
            <span className="material-symbols-outlined text-[16px]">add</span>
            직접 기록
          </button>
        </div>
      </div>

      {/* Clear All Confirmation Modal */}
      {showClearAllConfirm && (
        <div className="p-4 bg-[#EF4444]/15 border border-[#EF4444]/30 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-3 text-xs animate-in fade-in duration-200">
          <div className="flex items-center gap-2 text-[#F87171] font-semibold">
            <span className="material-symbols-outlined text-[20px]">warning</span>
            <span>저장된 모든 인바디 기록({records.length}개)을 완전히 삭제하시겠습니까?</span>
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              onClick={() => setShowClearAllConfirm(false)}
              className="flex-1 sm:flex-none px-3 py-1.5 bg-[#1A1D26] text-[#9CA3AF] hover:text-[#E2E4E9] rounded-lg transition-colors"
            >
              취소
            </button>
            <button
              onClick={executeClearAll}
              className="flex-1 sm:flex-none px-3.5 py-1.5 bg-[#EF4444] hover:bg-[#DC2626] text-white font-bold rounded-lg shadow-md transition-all active:scale-95"
            >
              전체 삭제 확인
            </button>
          </div>
        </div>
      )}

      {/* Single Record Delete Confirmation Modal */}
      {recordToDelete && (
        <div className="p-4 bg-[#161822] border border-[#EF4444]/50 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-3 text-xs animate-in fade-in duration-200 shadow-xl">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#EF4444]/20 flex items-center justify-center text-[#F87171]">
              <span className="material-symbols-outlined text-[18px]">delete</span>
            </div>
            <div>
              <p className="font-bold text-[#E2E4E9]">
                [{recordToDelete.displayDate}] {recordToDelete.title} ({recordToDelete.weight}kg)
              </p>
              <p className="text-[11px] text-[#F87171]">이 기록을 삭제하시겠습니까?</p>
            </div>
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              onClick={() => setRecordToDelete(null)}
              className="flex-1 sm:flex-none px-3 py-1.5 bg-[#1A1D26] text-[#9CA3AF] hover:text-[#E2E4E9] rounded-lg transition-colors"
            >
              취소
            </button>
            <button
              onClick={executeDeleteSingle}
              className="flex-1 sm:flex-none px-3.5 py-1.5 bg-[#EF4444] hover:bg-[#DC2626] text-white font-bold rounded-lg shadow-md transition-all active:scale-95 flex items-center justify-center gap-1"
            >
              삭제
            </button>
          </div>
        </div>
      )}

      {/* Search / Filter */}
      <div className="relative">
        <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-[#6B7280]">
          search
        </span>
        <input
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-11 pr-4 py-3 bg-[#12141C] border border-[#2A2D35] rounded-xl focus:border-[#3B82F6] focus:ring-1 focus:ring-[#3B82F6] outline-none transition-all text-sm text-[#E2E4E9] placeholder-[#6B7280] shadow-sm"
          placeholder="날짜나 제목으로 검색 (예: 2026.08)"
          type="text"
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery('')}
            className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#6B7280] hover:text-[#E2E4E9]"
          >
            <span className="material-symbols-outlined text-[18px]">cancel</span>
          </button>
        )}
      </div>

      {/* Data List */}
      <div className="flex flex-col gap-3">
        {filteredRecords.length === 0 ? (
          <div className="bg-[#12141C] rounded-2xl border border-dashed border-[#2A2D35] p-10 text-center text-[#9CA3AF]">
            <span className="material-symbols-outlined text-4xl mb-2 text-[#6B7280]">
              history_toggle_off
            </span>
            <p className="font-semibold text-sm text-[#E2E4E9]">
              {records.length === 0 ? '저장된 인바디 기록이 없습니다' : '검색된 기록이 없습니다'}
            </p>
            <p className="text-xs text-[#6B7280] mt-1">
              새로운 인바디 결과지를 스캔하거나 직접 입력해 보세요.
            </p>
          </div>
        ) : (
          filteredRecords.map((record) => {
            // Delta color and icon
            const weightDeltaVal = record.weightDelta ?? 0;
            const isFirst = weightDeltaVal === 0;

            // Bar indicator color according to body fat %
            let barColor = 'bg-[#10B981]'; // Healthy
            if (record.bodyFatPercentage > 20) barColor = 'bg-[#EF4444]'; // Higher
            else if (record.bodyFatPercentage > 18) barColor = 'bg-[#F59E0B]'; // Warning

            const barWidth = Math.min(100, Math.max(20, record.bodyFatPercentage * 2.8));

            return (
              <div
                key={record.id}
                onClick={() => onSelectRecord(record)}
                className="bg-[#12141C] rounded-2xl border border-[#2A2D35] p-4 sm:p-5 flex flex-col justify-between items-stretch gap-4 hover:border-[#3E424B] hover:bg-[#161822] transition-all cursor-pointer shadow-sm group"
              >
                {/* Top Row */}
                <div className="flex items-center gap-3 border-b border-[#2A2D35] pb-3">
                  <div className="bg-[#3B82F6]/15 border border-[#3B82F6]/30 rounded-xl w-10 h-10 flex items-center justify-center flex-shrink-0 text-[#60A5FA]">
                    <span className="material-symbols-outlined text-[22px]">
                      assignment
                    </span>
                  </div>
                  <div className="flex-1">
                    <div className="text-xs font-bold text-[#9CA3AF]">
                      {record.displayDate}
                    </div>
                    <div className="text-base font-bold text-[#E2E4E9] group-hover:text-[#60A5FA] transition-colors">
                      {record.title}
                    </div>
                  </div>

                  {/* Actions: Delete Button & Chevron */}
                  <div className="flex items-center gap-1">
                    {onDeleteRecord && (
                      <button
                        onClick={(e) => confirmDeleteSingle(record, e)}
                        className="p-2 text-[#9CA3AF] hover:text-[#F87171] hover:bg-[#EF4444]/15 rounded-xl transition-colors"
                        title="기록 삭제"
                        aria-label="기록 삭제"
                      >
                        <span className="material-symbols-outlined text-[20px]">delete</span>
                      </button>
                    )}
                    <button
                      className="p-1.5 text-[#60A5FA] group-hover:bg-[#3B82F6]/15 rounded-xl transition-colors"
                      title="상세 보기"
                    >
                      <span className="material-symbols-outlined text-[22px]">
                        chevron_right
                      </span>
                    </button>
                  </div>
                </div>

                {/* Bottom Row (2 Columns) */}
                <div className="flex flex-row justify-around items-center pt-1">
                  {/* Column 1: Weight */}
                  <div className="flex flex-col items-center flex-1">
                    <span className="text-xs font-medium text-[#9CA3AF] mb-0.5">체중</span>
                    <div className="flex items-baseline gap-1">
                      <span className="text-2xl font-bold text-[#E2E4E9]">
                        {record.weight.toFixed(1)}
                      </span>
                      <span className="text-xs font-medium text-[#6B7280]">kg</span>
                    </div>
                    {isFirst ? (
                      <div className="flex items-center gap-1 mt-1 text-[#6B7280]">
                        <span
                          className="material-symbols-outlined"
                          style={{ fontSize: '16px' }}
                        >
                          horizontal_rule
                        </span>
                        <span className="text-[10px] font-bold">기준점</span>
                      </div>
                    ) : (
                      <div
                        className={`flex items-center gap-0.5 mt-1 ${
                          weightDeltaVal < 0 ? 'text-[#34D399]' : 'text-[#F59E0B]'
                        }`}
                      >
                        <span
                          className="material-symbols-outlined"
                          style={{ fontSize: '16px' }}
                        >
                          {weightDeltaVal < 0 ? 'trending_down' : 'trending_up'}
                        </span>
                        <span className="text-[10px] font-bold">
                          {weightDeltaVal > 0 ? `+${weightDeltaVal.toFixed(1)}` : `${weightDeltaVal.toFixed(1)}`}
                          kg
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Vertical Divider */}
                  <div className="w-[1px] h-12 bg-[#2A2D35]" />

                  {/* Column 2: Body Fat % */}
                  <div className="flex flex-col items-center flex-1">
                    <span className="text-xs font-medium text-[#9CA3AF] mb-0.5">체지방률</span>
                    <div className="flex items-baseline gap-1">
                      <span className="text-2xl font-bold text-[#E2E4E9]">
                        {record.bodyFatPercentage.toFixed(1)}
                      </span>
                      <span className="text-xs font-medium text-[#6B7280]">%</span>
                    </div>
                    <div className="w-20 sm:w-28 h-2 bg-[#1A1D26] border border-[#2A2D35] mt-1.5 rounded-full overflow-hidden">
                      <div
                        className={`h-full ${barColor} rounded-full transition-all duration-300`}
                        style={{ width: `${barWidth}%` }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </main>
  );
};
