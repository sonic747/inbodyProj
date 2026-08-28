import React, { useState } from 'react';
import { InBodyRecord } from '../types';

interface ScanDetailModalProps {
  record: InBodyRecord;
  onClose: () => void;
  onDeleteRecord: (id: string) => void;
  onUpdateRecord: (updatedRecord: InBodyRecord) => void;
}

export const ScanDetailModal: React.FC<ScanDetailModalProps> = ({
  record,
  onClose,
  onDeleteRecord,
  onUpdateRecord,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [title, setTitle] = useState(record.title);
  const [weight, setWeight] = useState(record.weight);
  const [skeletalMuscleMass, setSkeletalMuscleMass] = useState(record.skeletalMuscleMass);
  const [bodyFatMass, setBodyFatMass] = useState(record.bodyFatMass);
  const [bodyFatPercentage, setBodyFatPercentage] = useState(record.bodyFatPercentage);
  const [notes, setNotes] = useState(record.notes || '');

  const handleSaveEdit = () => {
    const h = record.height ? record.height / 100 : 1.62;
    const updated: InBodyRecord = {
      ...record,
      title,
      weight: Number(weight),
      skeletalMuscleMass: Number(skeletalMuscleMass),
      bodyFatMass: Number(bodyFatMass),
      bodyFatPercentage: Number(bodyFatPercentage),
      bmi: +(Number(weight) / (h * h)).toFixed(1),
      notes,
    };
    onUpdateRecord(updated);
    setIsEditing(false);
  };

  const handleConfirmDelete = () => {
    onDeleteRecord(record.id);
    onClose();
  };

  // Helper to render InBody classic range bar
  const renderRangeBar = (
    label: string,
    value: number,
    unit: string,
    minNormal: number,
    maxNormal: number,
    maxScale: number
  ) => {
    const percent = Math.min(100, Math.max(5, (value / maxScale) * 100));
    let statusText = '표준';
    let statusColor = 'text-[#34D399] bg-[#10B981]/15 border border-[#10B981]/30';

    if (value < minNormal) {
      statusText = '표준이하';
      statusColor = 'text-[#60A5FA] bg-[#3B82F6]/15 border border-[#3B82F6]/30';
    } else if (value > maxNormal) {
      statusText = '표준이상';
      statusColor = 'text-[#F87171] bg-[#EF4444]/15 border border-[#EF4444]/30';
    }

    return (
      <div className="space-y-1.5 py-2 border-b border-[#2A2D35]">
        <div className="flex justify-between items-center text-xs">
          <span className="font-bold text-[#E2E4E9]">{label}</span>
          <div className="flex items-center gap-2">
            <span className="font-extrabold text-sm text-[#E2E4E9]">
              {value.toFixed(1)} {unit}
            </span>
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${statusColor}`}>
              {statusText}
            </span>
          </div>
        </div>

        {/* Range bar */}
        <div className="relative w-full h-3.5 bg-[#0D0F16] border border-[#2A2D35] rounded-md overflow-hidden flex items-center">
          {/* Range dividers for 표준이하 / 표준 / 표준이상 */}
          <div className="absolute top-0 bottom-0 left-[35%] w-[1px] bg-[#2A2D35] z-10 opacity-70" />
          <div className="absolute top-0 bottom-0 left-[70%] w-[1px] bg-[#2A2D35] z-10 opacity-70" />

          {/* Active bar */}
          <div
            className="h-full bg-gradient-to-r from-[#3B82F6] via-[#8B5CF6] to-[#EC4899] rounded-md transition-all duration-500"
            style={{ width: `${percent}%` }}
          />
        </div>

        <div className="flex justify-between text-[9px] text-[#6B7280] px-1">
          <span>표준이하</span>
          <span className="text-center font-medium text-[#34D399]">
            표준 ({minNormal} ~ {maxNormal})
          </span>
          <span>표준이상</span>
        </div>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 bg-black/75 backdrop-blur-md z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-[#12141C] text-[#E2E4E9] rounded-3xl w-full max-w-2xl max-h-[92vh] flex flex-col shadow-2xl border border-[#2A2D35] overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-200">
        {/* Modal Header */}
        <div className="bg-[#0D0F16] border-b border-[#2A2D35] px-6 py-4 flex justify-between items-center shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#3B82F6]/15 border border-[#3B82F6]/30 flex items-center justify-center text-[#60A5FA]">
              <span className="material-symbols-outlined text-[24px]">assignment</span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-lg text-[#E2E4E9]">{record.title}</h3>
                <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-gradient-to-r from-[#F59E0B] to-[#D97706] text-black">
                  인바디 {record.inBodyScore || 78}점
                </span>
              </div>
              <p className="text-xs text-[#9CA3AF]">측정 일시: {record.displayDate}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-[#1A1D26] text-[#9CA3AF] hover:text-[#E2E4E9] transition-colors"
          >
            <span className="material-symbols-outlined text-[22px]">close</span>
          </button>
        </div>

        {/* Delete Confirmation Alert Banner */}
        {showDeleteConfirm && (
          <div className="bg-[#EF4444]/15 border-b border-[#EF4444]/30 px-6 py-3.5 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs animate-in fade-in slide-in-from-top duration-200">
            <div className="flex items-center gap-2 text-[#F87171] font-semibold">
              <span className="material-symbols-outlined text-[20px]">warning</span>
              <span>정말 이 인바디 측정 기록을 영구 삭제하시겠습니까?</span>
            </div>
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="flex-1 sm:flex-none px-3 py-1.5 bg-[#1A1D26] text-[#9CA3AF] hover:text-[#E2E4E9] rounded-lg transition-colors"
              >
                취소
              </button>
              <button
                onClick={handleConfirmDelete}
                className="flex-1 sm:flex-none px-3.5 py-1.5 bg-[#EF4444] hover:bg-[#DC2626] text-white font-bold rounded-lg shadow-md transition-all active:scale-95 flex items-center justify-center gap-1"
              >
                <span className="material-symbols-outlined text-[16px]">delete_forever</span>
                삭제 확인
              </button>
            </div>
          </div>
        )}

        {/* Modal Body */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-6">
          {isEditing ? (
            /* Edit Mode */
            <div className="space-y-4 bg-[#0D0F16] p-4 rounded-2xl border border-[#2A2D35]">
              <h4 className="font-bold text-sm text-[#60A5FA]">기록 수치 직접 수정</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div>
                  <label className="block text-[#9CA3AF] font-semibold mb-1">제목</label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-[#2A2D35] bg-[#12141C] text-[#E2E4E9] font-medium text-sm focus:border-[#3B82F6] outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[#9CA3AF] font-semibold mb-1">체중 (kg)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={weight}
                    onChange={(e) => setWeight(Number(e.target.value))}
                    className="w-full p-2.5 rounded-xl border border-[#2A2D35] bg-[#12141C] text-[#E2E4E9] font-medium text-sm focus:border-[#3B82F6] outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[#9CA3AF] font-semibold mb-1">골격근량 (kg)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={skeletalMuscleMass}
                    onChange={(e) => setSkeletalMuscleMass(Number(e.target.value))}
                    className="w-full p-2.5 rounded-xl border border-[#2A2D35] bg-[#12141C] text-[#E2E4E9] font-medium text-sm focus:border-[#3B82F6] outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[#9CA3AF] font-semibold mb-1">체지방량 (kg)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={bodyFatMass}
                    onChange={(e) => setBodyFatMass(Number(e.target.value))}
                    className="w-full p-2.5 rounded-xl border border-[#2A2D35] bg-[#12141C] text-[#E2E4E9] font-medium text-sm focus:border-[#3B82F6] outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[#9CA3AF] font-semibold mb-1">체지방률 (%)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={bodyFatPercentage}
                    onChange={(e) => setBodyFatPercentage(Number(e.target.value))}
                    className="w-full p-2.5 rounded-xl border border-[#2A2D35] bg-[#12141C] text-[#E2E4E9] font-medium text-sm focus:border-[#3B82F6] outline-none"
                  />
                </div>
              </div>
              <div>
                <label className="block text-[#9CA3AF] font-semibold mb-1 text-xs">메모</label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={2}
                  className="w-full p-2.5 rounded-xl border border-[#2A2D35] bg-[#12141C] text-[#E2E4E9] text-xs focus:border-[#3B82F6] outline-none resize-none"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  onClick={() => setIsEditing(false)}
                  className="px-4 py-2 text-xs font-semibold rounded-xl bg-[#1A1D26] text-[#9CA3AF] hover:text-[#E2E4E9]"
                >
                  취소
                </button>
                <button
                  onClick={handleSaveEdit}
                  className="px-4 py-2 text-xs font-semibold rounded-xl bg-[#3B82F6] text-white hover:bg-[#2563EB]"
                >
                  수정 내용 저장
                </button>
              </div>
            </div>
          ) : (
            /* Standard View */
            <>
              {/* 3 Core Metric Cards */}
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-[#0D0F16] border border-[#2A2D35] rounded-2xl p-4 text-center">
                  <span className="text-xs text-[#9CA3AF] font-medium">체중</span>
                  <div className="text-2xl sm:text-3xl font-extrabold text-[#E2E4E9] mt-1">
                    {record.weight.toFixed(1)}
                    <span className="text-xs font-normal text-[#6B7280] ml-1">kg</span>
                  </div>
                  <span className="inline-block mt-1 text-[11px] font-semibold text-[#60A5FA]">
                    {record.weightDelta
                      ? `${record.weightDelta > 0 ? '+' : ''}${record.weightDelta.toFixed(1)} kg`
                      : '기준'}
                  </span>
                </div>

                <div className="bg-[#0D0F16] border border-[#3B82F6]/30 rounded-2xl p-4 text-center">
                  <span className="text-xs text-[#60A5FA] font-medium">골격근량</span>
                  <div className="text-2xl sm:text-3xl font-extrabold text-[#60A5FA] mt-1">
                    {record.skeletalMuscleMass.toFixed(1)}
                    <span className="text-xs font-normal text-[#6B7280] ml-1">kg</span>
                  </div>
                  <span className="inline-block mt-1 text-[11px] font-semibold text-[#34D399]">
                    {record.skeletalMuscleDelta
                      ? `${record.skeletalMuscleDelta > 0 ? '+' : ''}${record.skeletalMuscleDelta.toFixed(1)} kg`
                      : '기준'}
                  </span>
                </div>

                <div className="bg-[#0D0F16] border border-[#2A2D35] rounded-2xl p-4 text-center">
                  <span className="text-xs text-[#F59E0B] font-medium">체지방률</span>
                  <div className="text-2xl sm:text-3xl font-extrabold text-[#F59E0B] mt-1">
                    {record.bodyFatPercentage.toFixed(1)}
                    <span className="text-xs font-normal text-[#6B7280] ml-1">%</span>
                  </div>
                  <span className="inline-block mt-1 text-[11px] font-semibold text-[#F59E0B]">
                    {record.bodyFatPercentageDelta
                      ? `${record.bodyFatPercentageDelta > 0 ? '+' : ''}${record.bodyFatPercentageDelta.toFixed(1)}%`
                      : '기준'}
                  </span>
                </div>
              </div>

              {/* InBody Analysis Range Bars */}
              <div className="bg-[#0D0F16] border border-[#2A2D35] rounded-2xl p-4 sm:p-5 space-y-2">
                <h4 className="font-bold text-sm text-[#E2E4E9] mb-3 flex items-center gap-2">
                  <span className="material-symbols-outlined text-[#60A5FA] text-[18px]">
                    bar_chart
                  </span>
                  골격근 · 지방 분석
                </h4>
                {renderRangeBar('체중', record.weight, 'kg', 50, 68, 100)}
                {renderRangeBar('골격근량', record.skeletalMuscleMass, 'kg', 25, 33, 45)}
                {renderRangeBar('체지방량', record.bodyFatMass, 'kg', 8, 15, 35)}
                {renderRangeBar('체지방률', record.bodyFatPercentage, '%', 10, 20, 45)}
              </div>

              {/* Body Composition Details (체성분 상세 분석) */}
              <div className="bg-[#0D0F16] border border-[#2A2D35] rounded-2xl p-4 sm:p-5 space-y-3">
                <h4 className="font-bold text-sm text-[#E2E4E9] flex items-center gap-2">
                  <span className="material-symbols-outlined text-[#10B981] text-[18px]">
                    biotech
                  </span>
                  체성분 상세 구성
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  <div className="bg-[#12141C] border border-[#2A2D35] p-3 rounded-xl text-center">
                    <span className="text-[10px] text-[#9CA3AF] block font-medium">체수분 (TBW)</span>
                    <span className="text-base font-black text-[#60A5FA] mt-0.5 block">
                      {record.totalBodyWater || 39.4} <span className="text-[10px] font-normal text-[#6B7280]">kg</span>
                    </span>
                    <span className="text-[9px] text-[#34D399]">표준 (34.0~41.6)</span>
                  </div>
                  <div className="bg-[#12141C] border border-[#2A2D35] p-3 rounded-xl text-center">
                    <span className="text-[10px] text-[#9CA3AF] block font-medium">단백질 (Protein)</span>
                    <span className="text-base font-black text-[#E2E4E9] mt-0.5 block">
                      {record.protein || 10.6} <span className="text-[10px] font-normal text-[#6B7280]">kg</span>
                    </span>
                    <span className="text-[9px] text-[#34D399]">표준 (9.1~11.1)</span>
                  </div>
                  <div className="bg-[#12141C] border border-[#2A2D35] p-3 rounded-xl text-center">
                    <span className="text-[10px] text-[#9CA3AF] block font-medium">무기질 (Mineral)</span>
                    <span className="text-base font-black text-[#E2E4E9] mt-0.5 block">
                      {record.mineral || 3.45} <span className="text-[10px] font-normal text-[#6B7280]">kg</span>
                    </span>
                    <span className="text-[9px] text-[#34D399]">표준 (3.15~3.85)</span>
                  </div>
                  <div className="bg-[#12141C] border border-[#2A2D35] p-3 rounded-xl text-center">
                    <span className="text-[10px] text-[#9CA3AF] block font-medium">제지방량 (FFM)</span>
                    <span className="text-base font-black text-[#34D399] mt-0.5 block">
                      {record.fatFreeMass || 53.5} <span className="text-[10px] font-normal text-[#6B7280]">kg</span>
                    </span>
                    <span className="text-[9px] text-[#34D399]">표준 (46.3~56.5)</span>
                  </div>
                </div>
              </div>

              {/* Body Composition Control & Diagnosis (체성분 조절 및 진단) */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-[#0D0F16] border border-[#2A2D35] rounded-xl p-3 text-center">
                  <span className="text-[11px] text-[#9CA3AF] block">BMI</span>
                  <span className="text-base font-bold text-[#E2E4E9] mt-0.5 block">
                    {record.bmi}
                  </span>
                  <span className={`text-[10px] ${record.bmi >= 30 ? 'text-[#EF4444]' : record.bmi >= 25 ? 'text-[#F59E0B]' : 'text-[#34D399]'}`}>
                    {record.bmi >= 30 ? '심한과체중' : record.bmi >= 25 ? '과체중' : '정상'} ({record.bmi})
                  </span>
                </div>
                <div className="bg-[#0D0F16] border border-[#2A2D35] rounded-xl p-3 text-center">
                  <span className="text-[11px] text-[#9CA3AF] block">기초대사량</span>
                  <span className="text-base font-bold text-[#E2E4E9] mt-0.5 block">
                    {record.bmr || 1538}
                  </span>
                  <span className="text-[10px] text-[#6B7280]">kcal (표준이하)</span>
                </div>
                <div className="bg-[#0D0F16] border border-[#2A2D35] rounded-xl p-3 text-center">
                  <span className="text-[11px] text-[#9CA3AF] block">내장지방레벨</span>
                  <span className="text-base font-bold text-[#F59E0B] mt-0.5 block">
                    {record.visceralFatLevel || 9}
                  </span>
                  <span className="text-[10px] text-[#F59E0B]">레벨 {record.visceralFatLevel || 9}</span>
                </div>
                <div className="bg-[#0D0F16] border border-[#2A2D35] rounded-xl p-3 text-center">
                  <span className="text-[11px] text-[#9CA3AF] block">복부지방률</span>
                  <span className="text-base font-bold text-[#60A5FA] mt-0.5 block">
                    {record.waistHipRatio || 0.93}
                  </span>
                  <span className={`text-[10px] ${(record.waistHipRatio || 0.9) >= 0.9 ? 'text-[#F87171]' : 'text-[#34D399]'}`}>
                    {(record.waistHipRatio || 0.9) >= 0.9 ? '복부비만' : '표준'}
                  </span>
                </div>
              </div>

              {/* Target Adjustment (지방조절 / 근육조절) */}
              <div className="bg-[#12141C] border border-[#3B82F6]/30 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-[#3B82F6]/15 border border-[#3B82F6]/30 flex items-center justify-center text-[#60A5FA]">
                    <span className="material-symbols-outlined text-[20px]">tune</span>
                  </div>
                  <div>
                    <h5 className="text-xs font-bold text-[#E2E4E9]">체성분 권장 조절 목표</h5>
                    <p className="text-[10px] text-[#9CA3AF]">적정체중(63.6kg) 도달을 위한 목표치</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 w-full sm:w-auto justify-around sm:justify-end">
                  <div className="text-center px-3 py-1.5 bg-[#0D0F16] rounded-xl border border-[#2A2D35]">
                    <span className="text-[10px] text-[#9CA3AF] block">지방 조절</span>
                    <span className="text-xs font-black text-[#F87171]">
                      {record.fatControl !== undefined ? `${record.fatControl > 0 ? '+' : ''}${record.fatControl} kg` : '-15.4 kg'}
                    </span>
                  </div>
                  <div className="text-center px-3 py-1.5 bg-[#0D0F16] rounded-xl border border-[#2A2D35]">
                    <span className="text-[10px] text-[#9CA3AF] block">근육 조절</span>
                    <span className="text-xs font-black text-[#34D399]">
                      {record.muscleControl !== undefined ? `${record.muscleControl > 0 ? '+' : ''}${record.muscleControl} kg` : '0.0 kg'}
                    </span>
                  </div>
                </div>
              </div>

              {/* InBody Exercise Planner (권장운동 및 열량 소비량 가이드) */}
              <div className="bg-[#0D0F16] border border-[#2A2D35] rounded-2xl p-4 sm:p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-sm text-[#E2E4E9] flex items-center gap-2">
                    <span className="material-symbols-outlined text-[#F59E0B] text-[18px]">
                      directions_run
                    </span>
                    권장 운동 플래너 (30분당 소비열량)
                  </h4>
                  <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-[#F59E0B]/15 text-[#F59E0B] border border-[#F59E0B]/30">
                    권장 열량: {record.recommendedCalories || 1600} kcal
                  </span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                  <div className="bg-[#12141C] p-2.5 rounded-xl border border-[#2A2D35] flex items-center justify-between">
                    <span className="text-[#9CA3AF]">웨이트</span>
                    <span className="font-bold text-[#60A5FA]">395 kcal</span>
                  </div>
                  <div className="bg-[#12141C] p-2.5 rounded-xl border border-[#2A2D35] flex items-center justify-between">
                    <span className="text-[#9CA3AF]">조깅 / 수영</span>
                    <span className="font-bold text-[#34D399]">277 kcal</span>
                  </div>
                  <div className="bg-[#12141C] p-2.5 rounded-xl border border-[#2A2D35] flex items-center justify-between">
                    <span className="text-[#9CA3AF]">등산</span>
                    <span className="font-bold text-[#F59E0B]">258 kcal</span>
                  </div>
                  <div className="bg-[#12141C] p-2.5 rounded-xl border border-[#2A2D35] flex items-center justify-between">
                    <span className="text-[#9CA3AF]">자전거 / 걷기</span>
                    <span className="font-bold text-[#A78BFA]">237 / 158 kcal</span>
                  </div>
                </div>
              </div>

              {/* AI Feedback & Guidance */}
              {record.aiFeedback && (
                <div className="bg-gradient-to-r from-[#1E1B4B]/80 to-[#172554]/80 border border-[#3B82F6]/30 rounded-2xl p-4 sm:p-5 space-y-3">
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-[#60A5FA]">
                      psychology
                    </span>
                    <h4 className="font-bold text-sm text-[#60A5FA]">인바디 AI 분석 가이드</h4>
                  </div>
                  <p className="text-xs text-[#E2E4E9] leading-relaxed font-medium">
                    {record.aiFeedback.summary}
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-2 text-xs">
                    <div className="bg-[#0D0F16]/90 border border-[#2A2D35] p-3 rounded-xl">
                      <span className="font-bold text-[#F59E0B] flex items-center gap-1 mb-1">
                        <span className="material-symbols-outlined text-[16px]">restaurant</span>
                        추천 영양 식단
                      </span>
                      <p className="text-[11px] text-[#9CA3AF]">{record.aiFeedback.dietTip}</p>
                    </div>
                    <div className="bg-[#0D0F16]/90 border border-[#2A2D35] p-3 rounded-xl">
                      <span className="font-bold text-[#60A5FA] flex items-center gap-1 mb-1">
                        <span className="material-symbols-outlined text-[16px]">fitness_center</span>
                        트레이닝 조언
                      </span>
                      <p className="text-[11px] text-[#9CA3AF]">{record.aiFeedback.workoutTip}</p>
                    </div>
                  </div>
                </div>
              )}

              {record.notes && (
                <div className="p-3 bg-[#161822] rounded-xl border border-[#2A2D35] text-xs">
                  <span className="font-bold text-[#9CA3AF] block mb-1">기록 메모</span>
                  <p className="text-[#E2E4E9]">{record.notes}</p>
                </div>
              )}
            </>
          )}
        </div>

        {/* Modal Footer Actions */}
        <div className="bg-[#0D0F16] border-t border-[#2A2D35] px-6 py-3.5 flex justify-between items-center shrink-0">
          <button
            onClick={() => setShowDeleteConfirm(true)}
            className="text-xs font-semibold text-[#F87171] hover:bg-[#EF4444]/15 px-3 py-2 rounded-xl transition-colors flex items-center gap-1 active:scale-95"
            title="이 기록 삭제하기"
          >
            <span className="material-symbols-outlined text-[16px]">delete</span>
            기록 삭제
          </button>

          <div className="flex gap-2">
            {!isEditing && (
              <button
                onClick={() => setIsEditing(true)}
                className="px-4 py-2 text-xs font-semibold rounded-xl border border-[#2A2D35] bg-[#12141C] hover:bg-[#1A1D26] text-[#60A5FA] transition-colors"
              >
                수정
              </button>
            )}
            <button
              onClick={onClose}
              className="px-5 py-2 text-xs font-semibold rounded-xl bg-gradient-to-r from-[#3B82F6] to-[#8B5CF6] text-white hover:from-[#2563EB] hover:to-[#7C3AED] transition-all shadow-md shadow-blue-500/20"
            >
              닫기
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
