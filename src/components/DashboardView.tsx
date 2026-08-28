import React, { useState } from 'react';
import { InBodyRecord, UserProfile } from '../types';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
} from 'recharts';

interface DashboardViewProps {
  records: InBodyRecord[];
  userProfile: UserProfile;
  onOpenScan: () => void;
  onOpenManualEntry: () => void;
  onSelectRecord: (record: InBodyRecord) => void;
}

type ChartMetric = 'all' | 'weight' | 'skeletalMuscle' | 'bodyFatPercentage';

export const DashboardView: React.FC<DashboardViewProps> = ({
  records,
  userProfile,
  onOpenScan,
  onOpenManualEntry,
  onSelectRecord,
}) => {
  const [selectedMetric, setSelectedMetric] = useState<ChartMetric>('all');
  const latestRecord = records[0] || null;

  // Prepare chronological data for trend charts (oldest to newest)
  const chartData = [...records]
    .sort((a, b) => {
      const timeA = new Date((a.date || '').replace(/\./g, '-')).getTime() || 0;
      const timeB = new Date((b.date || '').replace(/\./g, '-')).getTime() || 0;
      return timeA - timeB;
    })
    .map((r) => ({
      date: (r.displayDate || '').replace(/^2026\./, '').replace(/^2025\./, ''),
      fullDate: r.displayDate,
      weight: Number(r.weight) || 0,
      skeletalMuscleMass: Number(r.skeletalMuscleMass) || 0,
      bodyFatMass: Number(r.bodyFatMass) || 0,
      bodyFatPercentage: Number(r.bodyFatPercentage) || 0,
      bmi: Number(r.bmi) || 0,
      inBodyScore: Number(r.inBodyScore) || 70,
      raw: r,
    }));

  // Format deltas safely
  const formatDelta = (val: number | undefined, unit: string) => {
    const num = Number(val);
    if (isNaN(num) || num === 0) {
      return { text: `0.0 ${unit}`, icon: 'drag_handle', type: 'neutral' };
    }
    if (num > 0) {
      return { text: `+${num.toFixed(1)} ${unit}`, icon: 'arrow_upward', type: 'up' };
    }
    return { text: `${num.toFixed(1)} ${unit}`, icon: 'arrow_downward', type: 'down' };
  };

  const weightDelta = formatDelta(latestRecord?.weightDelta, 'kg');
  const muscleDelta = formatDelta(latestRecord?.skeletalMuscleDelta, 'kg');
  const fatDelta = formatDelta(latestRecord?.bodyFatMassDelta, 'kg');

  // Body Type Classification (C - Weak/Standard, I - Balanced, D - Athletic)
  const getBodyType = (rec: InBodyRecord) => {
    const w = Number(rec?.weight) || 75.5;
    const m = Number(rec?.skeletalMuscleMass) || 30.3;
    const f = Number(rec?.bodyFatMass) || 22.0;
    // Standard heuristic for InBody C/I/D curve
    if (m > (w * 0.42) && f < (w * 0.22)) return { type: 'D형 (강인형/운동선수)', color: 'text-[#34D399] bg-[#10B981]/15 border border-[#10B981]/30', desc: '골격근량이 높고 체지방이 적은 이상적인 체형입니다.' };
    if (m >= (w * 0.38) && f <= (w * 0.28)) return { type: 'I형 (표준형)', color: 'text-[#60A5FA] bg-[#3B82F6]/15 border border-[#3B82F6]/30', desc: '골격근과 체지방이 균형을 이루고 있는 건강한 체형입니다.' };
    return { type: 'C형 (비만/근육부족형)', color: 'text-[#FBBF24] bg-[#F59E0B]/15 border border-[#F59E0B]/30', desc: '체지방 감량 및 점진적 근력 운동이 권장되는 체형입니다.' };
  };

  const bodyTypeInfo = latestRecord ? getBodyType(latestRecord) : null;

  return (
    <div className="flex-1 space-y-6 pb-20 md:pb-8">
      {/* Welcome / Date Context */}
      <section className="flex flex-col sm:flex-row sm:items-end justify-between gap-2">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-[#E2E4E9]">대시보드</h2>
          <p className="text-sm text-[#9CA3AF] mt-0.5">
            최근 측정:{' '}
            <span className="font-semibold text-[#E2E4E9]">
              {latestRecord
                ? (() => {
                    const clean = (latestRecord.date || latestRecord.displayDate || '').replace(/\./g, '-');
                    const parts = clean.split('-');
                    if (parts.length >= 3) {
                      return `${parts[0]}년 ${parseInt(parts[1], 10)}월 ${parseInt(parts[2], 10)}일`;
                    }
                    return latestRecord.displayDate || latestRecord.date;
                  })()
                : '기록 없음'}
            </span>
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={onOpenManualEntry}
            className="text-xs sm:text-sm px-3.5 py-2 rounded-xl border border-[#2A2D35] bg-[#12141C] hover:bg-[#1A1D26] hover:border-[#3E424B] text-[#E2E4E9] font-medium transition-colors flex items-center gap-1.5 shadow-sm"
          >
            <span className="material-symbols-outlined text-[18px] text-[#9CA3AF]">edit_note</span>
            직접 입력
          </button>
          <button
            onClick={onOpenScan}
            className="text-xs sm:text-sm px-3.5 py-2 rounded-xl bg-gradient-to-r from-[#3B82F6] to-[#8B5CF6] hover:from-[#2563EB] hover:to-[#7C3AED] text-white font-semibold transition-all flex items-center gap-1.5 shadow-lg shadow-blue-500/20"
          >
            <span className="material-symbols-outlined text-[18px]">photo_camera</span>
            결과지 스캔
          </button>
        </div>
      </section>

      {/* Latest Scan Summary Cards (Matching Image 1) */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {/* Weight Card */}
        <div
          onClick={() => latestRecord && onSelectRecord(latestRecord)}
          className="bg-[#12141C] border border-[#2A2D35] rounded-2xl p-5 shadow-sm hover:border-[#3E424B] hover:bg-[#161822] transition-all cursor-pointer relative overflow-hidden flex flex-col justify-between h-40 group"
        >
          <div className="flex justify-between items-start">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-xl bg-[#fd761a]/15 border border-[#fd761a]/30 flex items-center justify-center text-[#fd761a]">
                <span className="material-symbols-outlined text-[22px]">monitor_weight</span>
              </div>
              <h3 className="text-xs font-bold text-[#9CA3AF] uppercase tracking-wider">
                체중
              </h3>
            </div>
            <div className="bg-[#fd761a]/15 border border-[#fd761a]/30 px-2.5 py-1 rounded-full flex items-center gap-1 text-[#fd761a]">
              <span className="material-symbols-outlined text-[14px]">
                {weightDelta.icon}
              </span>
              <span className="text-xs font-semibold">{weightDelta.text}</span>
            </div>
          </div>
          <div className="flex items-baseline gap-1 self-end mt-4">
            <span className="text-3xl sm:text-4xl font-bold text-[#E2E4E9] tracking-tight group-hover:text-[#60A5FA] transition-colors">
              {latestRecord ? latestRecord.weight.toFixed(1) : '--'}
            </span>
            <span className="text-sm font-medium text-[#6B7280]">kg</span>
          </div>
        </div>

        {/* Skeletal Muscle Mass Card */}
        <div
          onClick={() => latestRecord && onSelectRecord(latestRecord)}
          className="bg-[#12141C] border border-[#2A2D35] rounded-2xl p-5 shadow-sm hover:border-[#3E424B] hover:bg-[#161822] transition-all cursor-pointer relative overflow-hidden flex flex-col justify-between h-40 group"
        >
          <div className="flex justify-between items-start">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-xl bg-[#3B82F6]/15 border border-[#3B82F6]/30 flex items-center justify-center text-[#60A5FA]">
                <span className="material-symbols-outlined text-[22px]">fitness_center</span>
              </div>
              <h3 className="text-xs font-bold text-[#9CA3AF] uppercase tracking-wider">
                골격근량
              </h3>
            </div>
            <div className="bg-[#3B82F6]/15 border border-[#3B82F6]/30 px-2.5 py-1 rounded-full flex items-center gap-1 text-[#60A5FA]">
              <span className="material-symbols-outlined text-[14px]">
                {muscleDelta.icon}
              </span>
              <span className="text-xs font-semibold">{muscleDelta.text}</span>
            </div>
          </div>
          <div className="flex items-baseline gap-1 self-end mt-4">
            <span className="text-3xl sm:text-4xl font-bold text-[#E2E4E9] tracking-tight group-hover:text-[#60A5FA] transition-colors">
              {latestRecord ? latestRecord.skeletalMuscleMass.toFixed(1) : '--'}
            </span>
            <span className="text-sm font-medium text-[#6B7280]">kg</span>
          </div>
        </div>

        {/* Body Fat Mass Card */}
        <div
          onClick={() => latestRecord && onSelectRecord(latestRecord)}
          className="bg-[#12141C] border border-[#2A2D35] rounded-2xl p-5 shadow-sm hover:border-[#3E424B] hover:bg-[#161822] transition-all cursor-pointer relative overflow-hidden flex flex-col justify-between h-40 group"
        >
          <div className="flex justify-between items-start">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-xl bg-[#10B981]/15 border border-[#10B981]/30 flex items-center justify-center text-[#34D399]">
                <span className="material-symbols-outlined text-[22px]">water_drop</span>
              </div>
              <h3 className="text-xs font-bold text-[#9CA3AF] uppercase tracking-wider">
                체지방량
              </h3>
            </div>
            <div className="bg-[#10B981]/15 border border-[#10B981]/30 px-2.5 py-1 rounded-full flex items-center gap-1 text-[#34D399]">
              <span className="material-symbols-outlined text-[14px]">
                {fatDelta.icon}
              </span>
              <span className="text-xs font-semibold">{fatDelta.text}</span>
            </div>
          </div>
          <div className="flex items-baseline gap-1 self-end mt-4">
            <span className="text-3xl sm:text-4xl font-bold text-[#E2E4E9] tracking-tight group-hover:text-[#60A5FA] transition-colors">
              {latestRecord ? latestRecord.bodyFatMass.toFixed(1) : '--'}
            </span>
            <span className="text-sm font-medium text-[#6B7280]">kg</span>
          </div>
        </div>
      </section>

      {/* Monthly Trends Section */}
      <section className="bg-[#12141C] border border-[#2A2D35] rounded-2xl p-5 sm:p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
          <div>
            <h3 className="text-lg font-bold text-[#E2E4E9]">월간 트렌드</h3>
            <p className="text-xs text-[#9CA3AF]">체성분 변화 추세를 확인하고 목표 달성을 점검하세요.</p>
          </div>
          {/* Metric Selector Pills */}
          <div className="flex items-center gap-1 bg-[#0D0F16] p-1 rounded-xl border border-[#2A2D35] overflow-x-auto">
            <button
              onClick={() => setSelectedMetric('all')}
              className={`px-3 py-1 text-xs font-medium rounded-lg transition-all whitespace-nowrap ${
                selectedMetric === 'all'
                  ? 'bg-[#1A1D26] text-[#60A5FA] border border-[#3E424B] font-semibold'
                  : 'text-[#6B7280] hover:text-[#E2E4E9]'
              }`}
            >
              종합 추이
            </button>
            <button
              onClick={() => setSelectedMetric('weight')}
              className={`px-3 py-1 text-xs font-medium rounded-lg transition-all whitespace-nowrap ${
                selectedMetric === 'weight'
                  ? 'bg-[#fd761a]/20 text-[#fd761a] border border-[#fd761a]/40 font-semibold'
                  : 'text-[#6B7280] hover:text-[#E2E4E9]'
              }`}
            >
              체중
            </button>
            <button
              onClick={() => setSelectedMetric('skeletalMuscle')}
              className={`px-3 py-1 text-xs font-medium rounded-lg transition-all whitespace-nowrap ${
                selectedMetric === 'skeletalMuscle'
                  ? 'bg-[#3B82F6]/20 text-[#60A5FA] border border-[#3B82F6]/40 font-semibold'
                  : 'text-[#6B7280] hover:text-[#E2E4E9]'
              }`}
            >
              골격근량
            </button>
            <button
              onClick={() => setSelectedMetric('bodyFatPercentage')}
              className={`px-3 py-1 text-xs font-medium rounded-lg transition-all whitespace-nowrap ${
                selectedMetric === 'bodyFatPercentage'
                  ? 'bg-[#10B981]/20 text-[#34D399] border border-[#10B981]/40 font-semibold'
                  : 'text-[#6B7280] hover:text-[#E2E4E9]'
              }`}
            >
              체지방률(%)
            </button>
          </div>
        </div>

        {/* Real Interactive Chart using Recharts in Dark Mode */}
        <div className="w-full h-72 sm:h-80 bg-[#0D0F16] rounded-xl p-2 border border-[#2A2D35]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="colorWeight" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#fd761a" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#fd761a" stopOpacity={0.0} />
                </linearGradient>
                <linearGradient id="colorMuscle" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#3B82F6" stopOpacity={0.0} />
                </linearGradient>
                <linearGradient id="colorFatPercent" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10B981" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#10B981" stopOpacity={0.0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#2A2D35" />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 11, fill: '#6B7280' }}
                axisLine={{ stroke: '#2A2D35' }}
                tickLine={false}
              />
              <YAxis
                domain={['auto', 'auto']}
                tick={{ fontSize: 11, fill: '#6B7280' }}
                axisLine={{ stroke: '#2A2D35' }}
                tickLine={false}
              />
              <Tooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const data = payload[0].payload;
                    return (
                      <div className="bg-[#12141C]/95 backdrop-blur-md p-3.5 rounded-xl border border-[#2A2D35] shadow-xl text-xs space-y-1.5 z-50">
                        <p className="font-bold text-[#E2E4E9] border-b border-[#2A2D35] pb-1">
                          {data.fullDate} ({data.raw.title})
                        </p>
                        <div className="flex justify-between gap-4 text-[#fd761a]">
                          <span>체중:</span>
                          <span className="font-semibold">{data.weight} kg</span>
                        </div>
                        <div className="flex justify-between gap-4 text-[#60A5FA]">
                          <span>골격근량:</span>
                          <span className="font-semibold">{data.skeletalMuscleMass} kg</span>
                        </div>
                        <div className="flex justify-between gap-4 text-[#34D399]">
                          <span>체지방률:</span>
                          <span className="font-semibold">{data.bodyFatPercentage} %</span>
                        </div>
                        <div className="flex justify-between gap-4 text-[#9CA3AF]">
                          <span>인바디 점수:</span>
                          <span className="font-semibold text-white">{data.inBodyScore} 점</span>
                        </div>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Legend
                wrapperStyle={{ fontSize: '12px', paddingTop: '8px' }}
                formatter={(val) => {
                  let label = val;
                  if (val === 'weight') label = '체중 (kg)';
                  if (val === 'skeletalMuscleMass') label = '골격근량 (kg)';
                  if (val === 'bodyFatPercentage') label = '체지방률 (%)';
                  return <span style={{ color: '#9CA3AF' }}>{label}</span>;
                }}
              />

              {(selectedMetric === 'all' || selectedMetric === 'weight') && (
                <Area
                  type="monotone"
                  dataKey="weight"
                  name="weight"
                  stroke="#fd761a"
                  strokeWidth={3}
                  fillOpacity={1}
                  fill="url(#colorWeight)"
                  activeDot={{ r: 6, fill: '#fd761a' }}
                />
              )}
              {(selectedMetric === 'all' || selectedMetric === 'skeletalMuscle') && (
                <Area
                  type="monotone"
                  dataKey="skeletalMuscleMass"
                  name="skeletalMuscleMass"
                  stroke="#3B82F6"
                  strokeWidth={3}
                  fillOpacity={1}
                  fill="url(#colorMuscle)"
                  activeDot={{ r: 6, fill: '#3B82F6' }}
                />
              )}
              {(selectedMetric === 'all' || selectedMetric === 'bodyFatPercentage') && (
                <Area
                  type="monotone"
                  dataKey="bodyFatPercentage"
                  name="bodyFatPercentage"
                  stroke="#10B981"
                  strokeWidth={3}
                  fillOpacity={1}
                  fill="url(#colorFatPercent)"
                  activeDot={{ r: 6, fill: '#10B981' }}
                />
              )}
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </section>

      {/* Target Progress & AI Analysis Highlights */}
      {latestRecord && (
        <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Target Progress Card */}
          <div className="bg-[#12141C] border border-[#2A2D35] rounded-2xl p-5 shadow-sm space-y-4">
            <div className="flex justify-between items-center">
              <h4 className="font-bold text-[#E2E4E9] text-sm flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[#60A5FA] text-[20px]">
                  flag
                </span>
                목표 달성률
              </h4>
              <span className="text-xs text-[#9CA3AF]">
                목표: {userProfile.targetWeight}kg / {userProfile.targetBodyFatPercentage}%
              </span>
            </div>

            {/* Weight Goal Progress */}
            <div>
              <div className="flex justify-between text-xs mb-1.5">
                <span className="text-[#9CA3AF]">체중 목표 감량</span>
                <span className="font-bold text-[#E2E4E9]">
                  {latestRecord.weight > userProfile.targetWeight
                    ? `-${(latestRecord.weight - userProfile.targetWeight).toFixed(1)}kg 남음`
                    : '목표 달성!'}
                </span>
              </div>
              <div className="w-full bg-[#1A1D26] h-2 rounded-full overflow-hidden border border-[#2A2D35]">
                <div
                  className="bg-[#fd761a] h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${Math.min(
                      100,
                      Math.max(
                        10,
                        (1 - (latestRecord.weight - userProfile.targetWeight) / 10) * 100
                      )
                    )}%`,
                  }}
                />
              </div>
            </div>

            {/* Body Fat Goal Progress */}
            <div>
              <div className="flex justify-between text-xs mb-1.5">
                <span className="text-[#9CA3AF]">체지방률 목표</span>
                <span className="font-bold text-[#E2E4E9]">
                  {latestRecord.bodyFatPercentage > userProfile.targetBodyFatPercentage
                    ? `-${(latestRecord.bodyFatPercentage - userProfile.targetBodyFatPercentage).toFixed(1)}% 남음`
                    : '목표 달성!'}
                </span>
              </div>
              <div className="w-full bg-[#1A1D26] h-2 rounded-full overflow-hidden border border-[#2A2D35]">
                <div
                  className="bg-[#10B981] h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${Math.min(
                      100,
                      Math.max(
                        10,
                        (1 -
                          (latestRecord.bodyFatPercentage -
                            userProfile.targetBodyFatPercentage) /
                            10) *
                          100
                      )
                    )}%`,
                  }}
                />
              </div>
            </div>

            {bodyTypeInfo && (
              <div className={`p-3 rounded-xl text-xs flex items-center justify-between ${bodyTypeInfo.color}`}>
                <span className="font-semibold">{bodyTypeInfo.type}</span>
                <span className="text-[11px] opacity-90">{bodyTypeInfo.desc}</span>
              </div>
            )}
          </div>

          {/* AI Coach Summary Card */}
          <div className="bg-gradient-to-br from-[#1A1D26] to-[#12141C] border border-[#2A2D35] rounded-2xl p-5 shadow-sm flex flex-col justify-between space-y-3">
            <div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-xs font-bold text-[#60A5FA] flex items-center gap-1.5 uppercase tracking-wider">
                  <span className="material-symbols-outlined text-[16px]">smart_toy</span>
                  인바디 AI 종합 진단
                </span>
                <span className="text-xs bg-gradient-to-r from-[#3B82F6] to-[#8B5CF6] text-white px-2.5 py-0.5 rounded-full font-bold shadow-sm shadow-blue-500/20">
                  인바디 점수 {latestRecord.inBodyScore || 78}점
                </span>
              </div>
              <p className="text-xs sm:text-sm text-[#E2E4E9] leading-relaxed font-medium">
                "{latestRecord.aiFeedback?.summary || '체계적인 체성분 관리가 진행되고 있습니다.'}"
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs pt-2 border-t border-[#2A2D35]">
              <div className="bg-[#0D0F16]/80 border border-[#2A2D35] p-2.5 rounded-xl">
                <span className="font-bold text-[#fd761a] block mb-0.5">🥗 식단 팁</span>
                <p className="text-[11px] text-[#9CA3AF] line-clamp-2">
                  {latestRecord.aiFeedback?.dietTip || '고단백 저염식 식단을 유지하세요.'}
                </p>
              </div>
              <div className="bg-[#0D0F16]/80 border border-[#2A2D35] p-2.5 rounded-xl">
                <span className="font-bold text-[#60A5FA] block mb-0.5">💪 운동 팁</span>
                <p className="text-[11px] text-[#9CA3AF] line-clamp-2">
                  {latestRecord.aiFeedback?.workoutTip || '하체 위주의 다관절 근력 운동을 권장합니다.'}
                </p>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* FAB for Quick Scan (Mobile) */}
      <button
        onClick={onOpenScan}
        className="fixed bottom-24 right-4 md:bottom-8 md:right-8 w-14 h-14 bg-gradient-to-r from-[#3B82F6] to-[#8B5CF6] text-white rounded-2xl flex items-center justify-center shadow-lg shadow-blue-500/30 hover:shadow-xl active:scale-95 transition-all z-40 md:hidden"
        title="인바디 스캔하기"
        aria-label="인바디 스캔하기"
      >
        <span className="material-symbols-outlined text-2xl font-bold">add</span>
      </button>
    </div>
  );
};
