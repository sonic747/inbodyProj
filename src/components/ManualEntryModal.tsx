import React, { useState } from 'react';
import { InBodyRecord } from '../types';

interface ManualEntryModalProps {
  onClose: () => void;
  onSave: (record: InBodyRecord) => void;
}

export const ManualEntryModal: React.FC<ManualEntryModalProps> = ({
  onClose,
  onSave,
}) => {
  const today = new Date().toISOString().slice(0, 10);
  const [date, setDate] = useState(today);
  const [title, setTitle] = useState('인바디 측정');
  const [weight, setWeight] = useState<string>('72.5');
  const [skeletalMuscleMass, setSkeletalMuscleMass] = useState<string>('31.2');
  const [bodyFatMass, setBodyFatMass] = useState<string>('15.4');
  const [bodyFatPercentage, setBodyFatPercentage] = useState<string>('21.2');
  const [visceralFatLevel, setVisceralFatLevel] = useState<string>('6');
  const [notes, setNotes] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const numWeight = Number(weight) || 70;
    const numSmm = Number(skeletalMuscleMass) || 30;
    const numBfm = Number(bodyFatMass) || 15;
    const numPbf = Number(bodyFatPercentage) || 20;
    const numVisceral = Number(visceralFatLevel) || 5;

    const yyyyMmDd = date.replace(/-/g, '.');
    const heightM = 1.72;
    const bmiVal = +(numWeight / (heightM * heightM)).toFixed(1);
    const bmrVal = Math.round(370 + 21.6 * (numWeight - numBfm));

    const newRecord: InBodyRecord = {
      id: `rec-${Date.now()}`,
      date: date,
      displayDate: yyyyMmDd,
      title: title || '직접 입력',
      weight: numWeight,
      skeletalMuscleMass: numSmm,
      bodyFatMass: numBfm,
      bodyFatPercentage: numPbf,
      bmi: bmiVal,
      bmr: bmrVal,
      visceralFatLevel: numVisceral,
      totalBodyWater: +(numWeight * 0.58).toFixed(1),
      inBodyScore: Math.min(
        100,
        Math.max(60, Math.round(80 + (numSmm - 30) * 2 - (numPbf - 18) * 1.5))
      ),
      notes,
      aiFeedback: {
        summary: `체중 ${numWeight}kg, 골격근량 ${numSmm}kg, 체지방률 ${numPbf}%로 기록되었습니다.`,
        dietTip: '충분한 단백질 섭취와 규칙적인 식사 주기를 유지하세요.',
        workoutTip: '주 3~4회 웨이트 트레이닝과 적절한 유산소 운동을 병행하세요.',
        evaluation: 'good',
      },
      segmentalMuscle: {
        rightArm: +(numSmm * 0.103).toFixed(1),
        leftArm: +(numSmm * 0.101).toFixed(1),
        trunk: +(numSmm * 0.77).toFixed(1),
        rightLeg: +(numSmm * 0.29).toFixed(1),
        leftLeg: +(numSmm * 0.288).toFixed(1),
      },
    };

    onSave(newRecord);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/75 backdrop-blur-md z-50 flex items-center justify-center p-4">
      <div className="bg-[#12141C] text-[#E2E4E9] rounded-3xl w-full max-w-lg shadow-2xl border border-[#2A2D35] overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-200">
        <div className="bg-[#0D0F16] border-b border-[#2A2D35] px-6 py-4 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[#60A5FA]">edit_note</span>
            <h3 className="font-bold text-lg text-[#E2E4E9]">인바디 수치 직접 입력</h3>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full hover:bg-[#1A1D26] flex items-center justify-center text-[#9CA3AF] hover:text-[#E2E4E9]"
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div>
              <label className="block text-[#9CA3AF] font-semibold mb-1">측정 날짜</label>
              <input
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full p-2.5 rounded-xl border border-[#2A2D35] bg-[#0D0F16] text-[#E2E4E9] font-medium focus:border-[#3B82F6] outline-none"
              />
            </div>
            <div>
              <label className="block text-[#9CA3AF] font-semibold mb-1">기록 제목</label>
              <input
                type="text"
                placeholder="예: 정기 측정, 헬스장 인바디"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full p-2.5 rounded-xl border border-[#2A2D35] bg-[#0D0F16] text-[#E2E4E9] font-medium placeholder-[#6B7280] focus:border-[#3B82F6] outline-none"
              />
            </div>
            <div>
              <label className="block text-[#9CA3AF] font-semibold mb-1">
                체중 (kg) <span className="text-[#EF4444]">*</span>
              </label>
              <input
                type="number"
                step="0.1"
                required
                value={weight}
                onChange={(e) => setWeight(e.target.value)}
                placeholder="예: 72.5"
                className="w-full p-2.5 rounded-xl border border-[#2A2D35] bg-[#0D0F16] text-[#E2E4E9] font-medium text-sm placeholder-[#6B7280] focus:border-[#3B82F6] outline-none"
              />
            </div>
            <div>
              <label className="block text-[#9CA3AF] font-semibold mb-1">
                골격근량 (kg) <span className="text-[#EF4444]">*</span>
              </label>
              <input
                type="number"
                step="0.1"
                required
                value={skeletalMuscleMass}
                onChange={(e) => setSkeletalMuscleMass(e.target.value)}
                placeholder="예: 31.2"
                className="w-full p-2.5 rounded-xl border border-[#2A2D35] bg-[#0D0F16] text-[#E2E4E9] font-medium text-sm placeholder-[#6B7280] focus:border-[#3B82F6] outline-none"
              />
            </div>
            <div>
              <label className="block text-[#9CA3AF] font-semibold mb-1">
                체지방량 (kg) <span className="text-[#EF4444]">*</span>
              </label>
              <input
                type="number"
                step="0.1"
                required
                value={bodyFatMass}
                onChange={(e) => setBodyFatMass(e.target.value)}
                placeholder="예: 15.4"
                className="w-full p-2.5 rounded-xl border border-[#2A2D35] bg-[#0D0F16] text-[#E2E4E9] font-medium text-sm placeholder-[#6B7280] focus:border-[#3B82F6] outline-none"
              />
            </div>
            <div>
              <label className="block text-[#9CA3AF] font-semibold mb-1">
                체지방률 (%) <span className="text-[#EF4444]">*</span>
              </label>
              <input
                type="number"
                step="0.1"
                required
                value={bodyFatPercentage}
                onChange={(e) => setBodyFatPercentage(e.target.value)}
                placeholder="예: 21.2"
                className="w-full p-2.5 rounded-xl border border-[#2A2D35] bg-[#0D0F16] text-[#E2E4E9] font-medium text-sm placeholder-[#6B7280] focus:border-[#3B82F6] outline-none"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-[#9CA3AF] font-semibold mb-1">내장지방 레벨 (1~20)</label>
              <input
                type="number"
                min="1"
                max="20"
                value={visceralFatLevel}
                onChange={(e) => setVisceralFatLevel(e.target.value)}
                placeholder="예: 6"
                className="w-full p-2.5 rounded-xl border border-[#2A2D35] bg-[#0D0F16] text-[#E2E4E9] font-medium text-sm placeholder-[#6B7280] focus:border-[#3B82F6] outline-none"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-[#9CA3AF] font-semibold mb-1">메모</label>
              <textarea
                rows={2}
                placeholder="식단, 운동 내용 또는 특이사항 기록"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full p-2.5 rounded-xl border border-[#2A2D35] bg-[#0D0F16] text-[#E2E4E9] placeholder-[#6B7280] font-medium text-xs resize-none focus:border-[#3B82F6] outline-none"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-[#2A2D35]">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 text-xs font-semibold rounded-xl border border-[#2A2D35] bg-[#12141C] text-[#9CA3AF] hover:text-[#E2E4E9] hover:bg-[#1A1D26]"
            >
              취소
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 text-xs font-semibold rounded-xl bg-gradient-to-r from-[#3B82F6] to-[#8B5CF6] text-white hover:from-[#2563EB] hover:to-[#7C3AED] transition-all shadow-md shadow-blue-500/20"
            >
              기록 저장
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
