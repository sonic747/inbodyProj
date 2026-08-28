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
  const [title, setTitle] = useState(record.title);
  const [weight, setWeight] = useState(record.weight);
  const [skeletalMuscleMass, setSkeletalMuscleMass] = useState(record.skeletalMuscleMass);
  const [bodyFatMass, setBodyFatMass] = useState(record.bodyFatMass);
  const [bodyFatPercentage, setBodyFatPercentage] = useState(record.bodyFatPercentage);
  const [notes, setNotes] = useState(record.notes || '');

  const handleSaveEdit = () => {
    const updated: InBodyRecord = {
      ...record,
      title,
      weight: Number(weight),
      skeletalMuscleMass: Number(skeletalMuscleMass),
      bodyFatMass: Number(bodyFatMass),
      bodyFatPercentage: Number(bodyFatPercentage),
      bmi: +(Number(weight) / (1.78 * 1.78)).toFixed(1),
      notes,
    };
    onUpdateRecord(updated);
    setIsEditing(false);
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
                <div className="sm:col-span-2">
                  <label className="block text-[#9CA3AF] font-semibold mb-1">메모</label>
                  <input
                    type="text"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-[#2A2D35] bg-[#12141C] text-[#E2E4E9] font-medium text-sm focus:border-[#3B82F6] outline-none"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  onClick={() => setIsEditing(false)}
                  className="px-4 py-2 text-xs font-semibold rounded-xl border border-[#2A2D35] bg-[#12141C] text-[#9CA3AF] hover:text-[#E2E4E9]"
                >
                  취소
                </button>
                <button
                  onClick={handleSaveEdit}
                  className="px-4 py-2 text-xs font-semibold rounded-xl bg-gradient-to-r from-[#3B82F6] to-[#8B5CF6] text-white"
                >
                  저장하기
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* Section 1: 골격근-지방 분석 */}
              <div className="bg-[#161822] border border-[#2A2D35] rounded-2xl p-4 sm:p-5 space-y-3">
                <div className="flex justify-between items-center border-b border-[#2A2D35] pb-2">
                  <h4 className="font-bold text-sm text-[#E2E4E9] flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-[#60A5FA] text-[18px]">
                      vital_signs
                    </span>
                    골격근 · 지방 분석
                  </h4>
                  <span className="text-[11px] text-[#6B7280]">표준 범위 기준</span>
                </div>

                <div className="space-y-2">
                  {renderRangeBar('체중 (Weight)', record.weight, 'kg', 60.0, 76.0, 110)}
                  {renderRangeBar(
                    '골격근량 (SMM)',
                    record.skeletalMuscleMass,
                    'kg',
                    29.0,
                    36.0,
                    55
                  )}
                  {renderRangeBar(
                    '체지방량 (BFM)',
                    record.bodyFatMass,
                    'kg',
                    10.5,
                    18.5,
                    40
                  )}
                </div>
              </div>

              {/* Section 2: 비만 분석 & 대사 수치 */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-[#161822] border border-[#2A2D35] rounded-2xl p-3 text-center">
                  <span className="text-[11px] text-[#9CA3AF] font-semibold">BMI (체질량)</span>
                  <p className="text-xl font-bold text-[#E2E4E9] my-0.5">{record.bmi}</p>
                  <span className="text-[10px] text-[#34D399] font-bold">표준 (18.5~25)</span>
                </div>

                <div className="bg-[#161822] border border-[#2A2D35] rounded-2xl p-3 text-center">
                  <span className="text-[11px] text-[#9CA3AF] font-semibold">체지방률 (PBF)</span>
                  <p className="text-xl font-bold text-[#F59E0B] my-0.5">
                    {record.bodyFatPercentage}%
                  </p>
                  <span className="text-[10px] text-[#9CA3AF]">표준 (10~20%)</span>
                </div>

                <div className="bg-[#161822] border border-[#2A2D35] rounded-2xl p-3 text-center">
                  <span className="text-[11px] text-[#9CA3AF] font-semibold">기초대사량 (BMR)</span>
                  <p className="text-xl font-bold text-[#60A5FA] my-0.5">{record.bmr}</p>
                  <span className="text-[10px] text-[#6B7280]">kcal</span>
                </div>

                <div className="bg-[#161822] border border-[#2A2D35] rounded-2xl p-3 text-center">
                  <span className="text-[11px] text-[#9CA3AF] font-semibold">내장지방레벨</span>
                  <p className="text-xl font-bold text-[#34D399] my-0.5">
                    {record.visceralFatLevel} 레벨
                  </p>
                  <span className="text-[10px] text-[#34D399] font-bold">안전 (1~9)</span>
                </div>
              </div>

              {/* Section 3: 부위별 근육 분석 (Segmental Muscle) */}
              {record.segmentalMuscle && (
                <div className="bg-[#161822] border border-[#2A2D35] rounded-2xl p-4 sm:p-5 space-y-3">
                  <h4 className="font-bold text-sm text-[#E2E4E9] flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-[#60A5FA] text-[18px]">
                      accessibility_new
                    </span>
                    부위별 근육 분석
                  </h4>
                  <div className="grid grid-cols-3 sm:grid-cols-5 gap-2 text-center text-xs">
                    <div className="p-2.5 rounded-xl bg-[#0D0F16] border border-[#2A2D35]">
                      <span className="text-[11px] text-[#9CA3AF] block">오른팔</span>
                      <span className="font-bold text-[#60A5FA]">
                        {record.segmentalMuscle.rightArm} kg
                      </span>
                    </div>
                    <div className="p-2.5 rounded-xl bg-[#0D0F16] border border-[#2A2D35]">
                      <span className="text-[11px] text-[#9CA3AF] block">왼팔</span>
                      <span className="font-bold text-[#60A5FA]">
                        {record.segmentalMuscle.leftArm} kg
                      </span>
                    </div>
                    <div className="p-2.5 rounded-xl bg-[#3B82F6]/15 border border-[#3B82F6]/40 font-bold">
                      <span className="text-[11px] text-[#60A5FA] block">몸통 (Core)</span>
                      <span className="font-extrabold text-[#60A5FA]">
                        {record.segmentalMuscle.trunk} kg
                      </span>
                    </div>
                    <div className="p-2.5 rounded-xl bg-[#0D0F16] border border-[#2A2D35]">
                      <span className="text-[11px] text-[#9CA3AF] block">오른다리</span>
                      <span className="font-bold text-[#60A5FA]">
                        {record.segmentalMuscle.rightLeg} kg
                      </span>
                    </div>
                    <div className="p-2.5 rounded-xl bg-[#0D0F16] border border-[#2A2D35]">
                      <span className="text-[11px] text-[#9CA3AF] block">왼다리</span>
                      <span className="font-bold text-[#60A5FA]">
                        {record.segmentalMuscle.leftLeg} kg
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Section 4: AI 맞춤 코칭 피드백 */}
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
            onClick={() => {
              if (confirm('이 인바디 기록을 삭제하시겠습니까?')) {
                onDeleteRecord(record.id);
                onClose();
              }
            }}
            className="text-xs font-semibold text-[#F87171] hover:bg-[#EF4444]/15 px-3 py-2 rounded-xl transition-colors flex items-center gap-1"
          >
            <span className="material-symbols-outlined text-[16px]">delete</span>
            삭제
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
