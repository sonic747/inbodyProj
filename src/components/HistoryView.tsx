import React, { useState } from 'react';
import { InBodyRecord } from '../types';

interface HistoryViewProps {
  records: InBodyRecord[];
  onSelectRecord: (record: InBodyRecord) => void;
  onImportData: (importedRecords: InBodyRecord[]) => void;
  onOpenManualEntry: () => void;
}

export const HistoryView: React.FC<HistoryViewProps> = ({
  records,
  onSelectRecord,
  onImportData,
  onOpenManualEntry,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [importStatus, setImportStatus] = useState<string | null>(null);

  // Filter records based on search query
  const filteredRecords = records.filter(
    (r) =>
      r.displayDate.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.notes?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Export records as JSON file
  const handleExportJSON = () => {
    const dataStr =
      'data:text/json;charset=utf-8,' +
      encodeURIComponent(JSON.stringify(records, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute(
      'download',
      `inbody-records-${new Date().toISOString().slice(0, 10)}.json`
    );
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  // Import JSON handler
  const handleFileImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const json = JSON.parse(event.target?.result as string);
        if (Array.isArray(json) && json.length > 0) {
          onImportData(json);
          setImportStatus(`${json.length}개의 기록을 성공적으로 불러왔습니다.`);
          setTimeout(() => setImportStatus(null), 3000);
        } else {
          alert('올바른 인바디 JSON 데이터 형식이 아닙니다.');
        }
      } catch {
        alert('JSON 파일을 읽는 중 오류가 발생했습니다.');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  return (
    <main className="flex-1 max-w-4xl mx-auto w-full flex flex-col gap-6 pb-24 md:pb-8">
      {/* Header & Actions */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-[#E2E4E9]">
            스캔 기록 및 데이터 목록
          </h1>
          <p className="text-sm text-[#9CA3AF] mt-1">
            이전 스캔 항목과 수치를 확인하세요.
          </p>
        </div>
        <div className="flex flex-wrap gap-2 w-full sm:w-auto">
          <label className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3.5 py-2 border border-[#2A2D35] rounded-xl bg-[#12141C] hover:bg-[#1A1D26] hover:border-[#3E424B] cursor-pointer transition-colors duration-200 shadow-sm">
            <span
              className="material-symbols-outlined text-[#9CA3AF]"
              style={{ fontSize: '18px' }}
            >
              upload
            </span>
            <span className="text-xs font-semibold text-[#E2E4E9]">
              데이터 불러오기
            </span>
            <input
              type="file"
              accept=".json"
              onChange={handleFileImport}
              className="hidden"
            />
          </label>

          <button
            onClick={handleExportJSON}
            className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3.5 py-2 border border-[#2A2D35] rounded-xl bg-[#12141C] hover:bg-[#1A1D26] hover:border-[#3E424B] transition-colors duration-200 shadow-sm"
          >
            <span
              className="material-symbols-outlined text-[#9CA3AF]"
              style={{ fontSize: '18px' }}
            >
              download
            </span>
            <span className="text-xs font-semibold text-[#E2E4E9]">
              JSON 내보내기
            </span>
          </button>

          <button
            onClick={onOpenManualEntry}
            className="flex-1 sm:flex-none flex items-center justify-center gap-1 px-3.5 py-2 bg-gradient-to-r from-[#3B82F6] to-[#8B5CF6] hover:from-[#2563EB] hover:to-[#7C3AED] text-white rounded-xl transition-all text-xs font-semibold shadow-lg shadow-blue-500/20"
          >
            <span className="material-symbols-outlined text-[16px]">add</span>
            직접 기록
          </button>
        </div>
      </div>

      {importStatus && (
        <div className="p-3 bg-[#10B981]/15 text-[#34D399] rounded-xl text-xs font-semibold border border-[#10B981]/30 flex items-center gap-2">
          <span className="material-symbols-outlined text-[18px]">check_circle</span>
          {importStatus}
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
          placeholder="날짜로 검색 (예: 2026.08)"
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
            <p className="font-semibold text-sm text-[#E2E4E9]">검색된 기록이 없습니다</p>
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
                  <button
                    className="p-1.5 text-[#60A5FA] group-hover:bg-[#3B82F6]/15 rounded-xl transition-colors"
                    title="상세 보기"
                  >
                    <span className="material-symbols-outlined text-[22px]">
                      chevron_right
                    </span>
                  </button>
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
