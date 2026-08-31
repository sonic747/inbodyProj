import React, { useState, useMemo } from 'react';
import { UserAccount, InBodyRecord, UserProfile } from '../types';

interface AdminMembersViewProps {
  accounts: UserAccount[];
  getUserRecords: (userId: string) => InBodyRecord[];
  onSelectMemberForMonitoring: (account: UserAccount) => void;
  onOpenScanForMember: (account: UserAccount) => void;
  onOpenHistoryForMember: (account: UserAccount) => void;
  onAddMember: (newAccount: UserAccount) => void;
  onUpdateMember: (updatedAccount: UserAccount) => void;
  onDeleteMember: (accountId: string) => void;
}

export const AdminMembersView: React.FC<AdminMembersViewProps> = ({
  accounts,
  getUserRecords,
  onSelectMemberForMonitoring,
  onOpenScanForMember,
  onOpenHistoryForMember,
  onAddMember,
  onUpdateMember,
  onDeleteMember,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterGender, setFilterGender] = useState<'all' | 'male' | 'female'>('all');
  const [sortBy, setSortBy] = useState<'recent' | 'name' | 'score' | 'weight'>('recent');
  
  // Add Member Modal State
  const [showAddModal, setShowAddModal] = useState(false);
  const [addUsername, setAddUsername] = useState('');
  const [addPassword, setAddPassword] = useState('1234');
  const [addName, setAddName] = useState('');
  const [addGender, setAddGender] = useState<'male' | 'female'>('male');
  const [addAge, setAddAge] = useState(30);
  const [addHeight, setAddHeight] = useState(172);
  const [addTargetWeight, setAddTargetWeight] = useState(68.0);
  const [addTargetPbf, setAddTargetPbf] = useState(18.0);
  const [addError, setAddError] = useState('');

  // Edit Member Modal State
  const [editingAccount, setEditingAccount] = useState<UserAccount | null>(null);

  // Filter only regular members (exclude admin accounts from regular member list)
  const regularMembers = useMemo(() => {
    return accounts.filter((a) => a.role !== 'admin');
  }, [accounts]);

  // Aggregate stats across all members
  const stats = useMemo(() => {
    let totalRecordsCount = 0;
    let totalScoreSum = 0;
    let totalScoreCount = 0;
    let totalPbfSum = 0;
    let totalPbfCount = 0;

    regularMembers.forEach((member) => {
      const recs = getUserRecords(member.id);
      totalRecordsCount += recs.length;
      if (recs.length > 0) {
        const latest = recs[0];
        if (latest.inBodyScore) {
          totalScoreSum += latest.inBodyScore;
          totalScoreCount += 1;
        }
        if (latest.bodyFatPercentage) {
          totalPbfSum += latest.bodyFatPercentage;
          totalPbfCount += 1;
        }
      }
    });

    const avgScore = totalScoreCount > 0 ? (totalScoreSum / totalScoreCount).toFixed(1) : '-';
    const avgPbf = totalPbfCount > 0 ? (totalPbfSum / totalPbfCount).toFixed(1) : '-';

    return {
      memberCount: regularMembers.length,
      totalRecordsCount,
      avgScore,
      avgPbf,
    };
  }, [regularMembers, getUserRecords]);

  // Filtered & Sorted member list
  const filteredMembers = useMemo(() => {
    return regularMembers
      .filter((member) => {
        const matchesSearch =
          member.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          member.username.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesGender =
          filterGender === 'all' || member.profile.gender === filterGender;
        return matchesSearch && matchesGender;
      })
      .sort((a, b) => {
        const aRecs = getUserRecords(a.id);
        const bRecs = getUserRecords(b.id);
        const aLatest = aRecs[0];
        const bLatest = bRecs[0];

        if (sortBy === 'name') {
          return a.name.localeCompare(b.name, 'ko');
        }
        if (sortBy === 'score') {
          return (bLatest?.inBodyScore || 0) - (aLatest?.inBodyScore || 0);
        }
        if (sortBy === 'weight') {
          return (bLatest?.weight || 0) - (aLatest?.weight || 0);
        }
        // default recent
        const aDate = aLatest?.date || a.createdAt;
        const bDate = bLatest?.date || b.createdAt;
        return bDate.localeCompare(aDate);
      });
  }, [regularMembers, searchTerm, filterGender, sortBy, getUserRecords]);

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setAddError('');

    const trimmedUsername = addUsername.trim().toLowerCase();
    const trimmedName = addName.trim();

    if (!trimmedUsername || !addPassword || !trimmedName) {
      setAddError('모든 필수 항목을 입력해주세요.');
      return;
    }

    if (accounts.some((a) => a.username.toLowerCase() === trimmedUsername)) {
      setAddError('이미 존재하는 아이디입니다.');
      return;
    }

    const defaultAvatar =
      addGender === 'male'
        ? 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'
        : 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80';

    const newProfile: UserProfile = {
      name: trimmedName,
      age: Number(addAge) || 30,
      gender: addGender,
      height: Number(addHeight) || 170,
      targetWeight: Number(addTargetWeight) || 65,
      targetBodyFatPercentage: Number(addTargetPbf) || 18,
      avatarUrl: defaultAvatar,
    };

    const newAccount: UserAccount = {
      id: `user_${Date.now()}`,
      username: trimmedUsername,
      password: addPassword,
      name: trimmedName,
      role: 'member',
      profile: newProfile,
      createdAt: new Date().toISOString().split('T')[0],
    };

    onAddMember(newAccount);
    setShowAddModal(false);
    setAddUsername('');
    setAddName('');
  };

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingAccount) return;

    onUpdateMember(editingAccount);
    setEditingAccount(null);
  };

  return (
    <div className="flex-1 max-w-6xl mx-auto w-full space-y-6 pb-24 md:pb-8">
      {/* Top Banner: Center Master Admin Mode */}
      <div className="bg-gradient-to-r from-[#1E293B] via-[#1E1B4B] to-[#0F172A] border border-[#3B82F6]/30 rounded-3xl p-6 sm:p-7 shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl -z-0 pointer-events-none"></div>
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30 text-xs font-bold mb-2.5">
              <span className="material-symbols-outlined text-[16px]">admin_panel_settings</span>
              스윙짐 센터 최고 관리자 (Admin Mode)
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
              전체 회원 인바디 통합 관리 센터
            </h1>
            <p className="text-xs sm:text-sm text-[#9CA3AF] mt-1 max-w-2xl">
              개인회원은 본인 ID로 로그인 시 본인 기록만 열람되며, 관리자는 모든 회원의 체성분 변화, 측정 기록 모니터링 및 대리 스캔 등록이 가능합니다.
            </p>
          </div>

          <button
            onClick={() => setShowAddModal(true)}
            className="self-start md:self-auto px-4 py-2.5 bg-gradient-to-r from-[#3B82F6] to-[#6366F1] hover:from-[#2563EB] hover:to-[#4F46E5] text-white rounded-2xl text-xs font-bold shadow-lg shadow-blue-500/25 transition-all flex items-center gap-2"
          >
            <span className="material-symbols-outlined text-[18px]">person_add</span>
            신규 회원 직접 등록
          </button>
        </div>

        {/* Aggregate Stats Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-5 border-t border-[#2A2D35]/80">
          <div className="p-3 bg-[#0D0F16]/80 rounded-2xl border border-[#2A2D35]/80">
            <div className="text-[11px] font-semibold text-[#9CA3AF] flex items-center gap-1.5">
              <span className="material-symbols-outlined text-[15px] text-[#60A5FA]">groups</span>
              관리 등록 회원
            </div>
            <div className="text-xl font-bold text-white mt-1">
              {stats.memberCount} <span className="text-xs font-normal text-[#9CA3AF]">명</span>
            </div>
          </div>

          <div className="p-3 bg-[#0D0F16]/80 rounded-2xl border border-[#2A2D35]/80">
            <div className="text-[11px] font-semibold text-[#9CA3AF] flex items-center gap-1.5">
              <span className="material-symbols-outlined text-[15px] text-[#34D399]">fact_check</span>
              총 누적 측정건수
            </div>
            <div className="text-xl font-bold text-white mt-1">
              {stats.totalRecordsCount} <span className="text-xs font-normal text-[#9CA3AF]">건</span>
            </div>
          </div>

          <div className="p-3 bg-[#0D0F16]/80 rounded-2xl border border-[#2A2D35]/80">
            <div className="text-[11px] font-semibold text-[#9CA3AF] flex items-center gap-1.5">
              <span className="material-symbols-outlined text-[15px] text-[#F59E0B]">avg_pace</span>
              회원 평균 점수
            </div>
            <div className="text-xl font-bold text-[#F59E0B] mt-1">
              {stats.avgScore} <span className="text-xs font-normal text-[#9CA3AF]">점</span>
            </div>
          </div>

          <div className="p-3 bg-[#0D0F16]/80 rounded-2xl border border-[#2A2D35]/80">
            <div className="text-[11px] font-semibold text-[#9CA3AF] flex items-center gap-1.5">
              <span className="material-symbols-outlined text-[15px] text-[#EC4899]">percent</span>
              평균 체지방률
            </div>
            <div className="text-xl font-bold text-[#EC4899] mt-1">
              {stats.avgPbf} <span className="text-xs font-normal text-[#9CA3AF]">%</span>
            </div>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-[#12141C] border border-[#2A2D35] rounded-3xl p-4 sm:p-5 shadow-sm space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          {/* Search */}
          <div className="relative flex-1">
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 material-symbols-outlined text-[#6B7280] text-[18px]">
              search
            </span>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="회원 이름 또는 아이디(ID) 검색..."
              className="w-full pl-10 pr-4 py-2 bg-[#0D0F16] border border-[#2A2D35] rounded-xl text-xs text-white placeholder-[#6B7280] focus:border-[#3B82F6] outline-none"
            />
          </div>

          {/* Filters */}
          <div className="flex items-center gap-2">
            <select
              value={filterGender}
              onChange={(e) => setFilterGender(e.target.value as any)}
              className="px-3 py-2 bg-[#0D0F16] border border-[#2A2D35] rounded-xl text-xs text-[#E2E4E9] focus:border-[#3B82F6] outline-none"
            >
              <option value="all">성별: 전체</option>
              <option value="male">남성 회원</option>
              <option value="female">여성 회원</option>
            </select>

            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="px-3 py-2 bg-[#0D0F16] border border-[#2A2D35] rounded-xl text-xs text-[#E2E4E9] focus:border-[#3B82F6] outline-none"
            >
              <option value="recent">정렬: 최근 측정순</option>
              <option value="name">정렬: 이름 가나다순</option>
              <option value="score">정렬: 인바디 점수순</option>
              <option value="weight">정렬: 체중순</option>
            </select>
          </div>
        </div>
      </div>

      {/* Member Cards Grid */}
      {filteredMembers.length === 0 ? (
        <div className="bg-[#12141C] border border-[#2A2D35] rounded-3xl p-12 text-center text-[#9CA3AF] space-y-3">
          <span className="material-symbols-outlined text-4xl text-[#6B7280]">person_search</span>
          <p className="text-sm font-semibold">검색 조건에 일치하는 회원이 없습니다.</p>
          <button
            onClick={() => {
              setSearchTerm('');
              setFilterGender('all');
            }}
            className="px-4 py-2 bg-[#1A1D27] hover:bg-[#252936] text-xs text-white rounded-xl font-bold"
          >
            검색 필터 초기화
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {filteredMembers.map((member) => {
            const memberRecords = getUserRecords(member.id);
            const latest = memberRecords[0] || null;
            const recordCount = memberRecords.length;

            return (
              <div
                key={member.id}
                className="bg-[#12141C] border border-[#2A2D35] hover:border-[#3B82F6]/50 rounded-3xl p-5 shadow-sm transition-all duration-200 flex flex-col justify-between space-y-4"
              >
                {/* Member Profile Header */}
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl overflow-hidden bg-[#1A1D26] ring-2 ring-[#3B82F6]/30 shrink-0">
                      <img
                        src={member.profile.avatarUrl}
                        alt={member.name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-base font-bold text-white">{member.name}</h3>
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-[#3B82F6]/15 text-[#60A5FA] border border-[#3B82F6]/25">
                          ID: {member.username}
                        </span>
                        <span
                          className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                            member.profile.gender === 'male'
                              ? 'bg-blue-500/20 text-blue-400'
                              : 'bg-pink-500/20 text-pink-400'
                          }`}
                        >
                          {member.profile.gender === 'male' ? '남성' : '여성'} {member.profile.age}세
                        </span>
                      </div>
                      <div className="text-[11px] text-[#9CA3AF] mt-1 flex items-center gap-2">
                        <span>신장 {member.profile.height}cm</span>
                        <span>·</span>
                        <span>목표 {member.profile.targetWeight}kg / {member.profile.targetBodyFatPercentage}%</span>
                        <span>·</span>
                        <span className="text-[#6B7280]">가입 {member.createdAt}</span>
                      </div>
                    </div>
                  </div>

                  {/* Actions Menu */}
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setEditingAccount(member)}
                      className="w-8 h-8 rounded-xl bg-[#1A1D27] hover:bg-[#252936] text-[#9CA3AF] hover:text-white flex items-center justify-center transition-all"
                      title="회원 정보 수정"
                    >
                      <span className="material-symbols-outlined text-[16px]">edit</span>
                    </button>
                    <button
                      onClick={() => {
                        if (confirm(`'${member.name}' 회원의 계정과 모든 측정 데이터를 삭제하시겠습니까?`)) {
                          onDeleteMember(member.id);
                        }
                      }}
                      className="w-8 h-8 rounded-xl bg-[#1A1D27] hover:bg-red-500/20 text-[#9CA3AF] hover:text-red-400 flex items-center justify-center transition-all"
                      title="회원 삭제"
                    >
                      <span className="material-symbols-outlined text-[16px]">delete</span>
                    </button>
                  </div>
                </div>

                {/* Latest InBody Summary */}
                {latest ? (
                  <div className="p-3.5 bg-[#0D0F16] border border-[#2A2D35] rounded-2xl space-y-2.5">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="font-bold text-[#E2E4E9] flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                        최신 측정: {latest.displayDate}
                      </span>
                      <span className="text-[10px] text-[#9CA3AF] bg-[#1E293B] px-2 py-0.5 rounded-md font-mono">
                        총 {recordCount}회 측정됨
                      </span>
                    </div>

                    <div className="grid grid-cols-4 gap-2 text-center pt-1">
                      <div className="p-2 bg-[#12141C] rounded-xl border border-[#2A2D35]/60">
                        <div className="text-[10px] text-[#9CA3AF]">체중</div>
                        <div className="text-xs sm:text-sm font-bold text-white mt-0.5">
                          {latest.weight}kg
                        </div>
                      </div>
                      <div className="p-2 bg-[#12141C] rounded-xl border border-[#2A2D35]/60">
                        <div className="text-[10px] text-[#9CA3AF]">골격근량</div>
                        <div className="text-xs sm:text-sm font-bold text-[#60A5FA] mt-0.5">
                          {latest.skeletalMuscleMass}kg
                        </div>
                      </div>
                      <div className="p-2 bg-[#12141C] rounded-xl border border-[#2A2D35]/60">
                        <div className="text-[10px] text-[#9CA3AF]">체지방률</div>
                        <div className="text-xs sm:text-sm font-bold text-[#F87171] mt-0.5">
                          {latest.bodyFatPercentage}%
                        </div>
                      </div>
                      <div className="p-2 bg-[#12141C] rounded-xl border border-[#2A2D35]/60">
                        <div className="text-[10px] text-[#9CA3AF]">인바디점수</div>
                        <div className="text-xs sm:text-sm font-bold text-[#F59E0B] mt-0.5">
                          {latest.inBodyScore || '-'}점
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="p-3.5 bg-[#0D0F16] border border-dashed border-[#2A2D35] rounded-2xl text-center py-4">
                    <span className="material-symbols-outlined text-2xl text-[#4B5563]">schedule</span>
                    <p className="text-xs text-[#9CA3AF] mt-1">아직 등록된 인바디 측정 기록이 없습니다.</p>
                  </div>
                )}

                {/* Card Bottom CTA Buttons */}
                <div className="grid grid-cols-2 gap-2 pt-1 border-t border-[#2A2D35]/60">
                  <button
                    onClick={() => onSelectMemberForMonitoring(member)}
                    className="py-2.5 px-3 bg-[#2563EB] hover:bg-[#1D4ED8] text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-blue-500/20 flex items-center justify-center gap-1.5"
                  >
                    <span className="material-symbols-outlined text-[16px]">query_stats</span>
                    인바디 상세 모니터링
                  </button>

                  <button
                    onClick={() => onOpenScanForMember(member)}
                    className="py-2.5 px-3 bg-[#1A1D27] hover:bg-[#252936] text-[#60A5FA] border border-[#3B82F6]/30 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5"
                  >
                    <span className="material-symbols-outlined text-[16px]">photo_camera</span>
                    인바디 스캔 등록
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ADD MEMBER MODAL */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md overflow-y-auto">
          <div className="relative w-full max-w-md bg-[#12141C] border border-[#2A2D35] rounded-3xl p-6 sm:p-7 shadow-2xl text-[#E2E4E9] my-8">
            <button
              onClick={() => setShowAddModal(false)}
              className="absolute top-5 right-5 w-8 h-8 rounded-full bg-[#1A1D27] hover:bg-[#252936] text-[#9CA3AF] flex items-center justify-center transition-all"
            >
              <span className="material-symbols-outlined text-[20px]">close</span>
            </button>

            <div className="text-center mb-5">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-gradient-to-tr from-[#3B82F6] to-[#8B5CF6] text-white mb-2 shadow-lg shadow-blue-500/25">
                <span className="material-symbols-outlined text-[24px]">person_add</span>
              </div>
              <h2 className="text-lg font-bold text-white">신규 회원 직접 등록</h2>
              <p className="text-xs text-[#9CA3AF] mt-0.5">
                관리자가 새 회원의 로그인 계정과 신체 목표 정보를 생성합니다.
              </p>
            </div>

            {addError && (
              <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-xs text-red-400 flex items-center gap-2 mb-4">
                <span className="material-symbols-outlined text-[16px]">error</span>
                {addError}
              </div>
            )}

            <form onSubmit={handleAddSubmit} className="space-y-3">
              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-xs font-semibold text-[#9CA3AF] mb-1">
                    아이디 (ID) *
                  </label>
                  <input
                    type="text"
                    value={addUsername}
                    onChange={(e) => setAddUsername(e.target.value)}
                    placeholder="예: member01"
                    required
                    className="w-full px-3 py-2 bg-[#0D0F16] border border-[#2A2D35] rounded-xl text-xs text-white placeholder-[#6B7280] focus:border-[#3B82F6] outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#9CA3AF] mb-1">
                    비밀번호 *
                  </label>
                  <input
                    type="text"
                    value={addPassword}
                    onChange={(e) => setAddPassword(e.target.value)}
                    placeholder="비밀번호"
                    required
                    className="w-full px-3 py-2 bg-[#0D0F16] border border-[#2A2D35] rounded-xl text-xs text-white placeholder-[#6B7280] focus:border-[#3B82F6] outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-xs font-semibold text-[#9CA3AF] mb-1">
                    회원 이름 *
                  </label>
                  <input
                    type="text"
                    value={addName}
                    onChange={(e) => setAddName(e.target.value)}
                    placeholder="예: 홍길동"
                    required
                    className="w-full px-3 py-2 bg-[#0D0F16] border border-[#2A2D35] rounded-xl text-xs text-white placeholder-[#6B7280] focus:border-[#3B82F6] outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#9CA3AF] mb-1">
                    성별 *
                  </label>
                  <div className="grid grid-cols-2 gap-1.5">
                    <button
                      type="button"
                      onClick={() => setAddGender('male')}
                      className={`py-2 rounded-xl text-xs font-bold border transition-all ${
                        addGender === 'male'
                          ? 'bg-[#3B82F6] text-white border-[#3B82F6]'
                          : 'bg-[#0D0F16] text-[#9CA3AF] border-[#2A2D35]'
                      }`}
                    >
                      남성
                    </button>
                    <button
                      type="button"
                      onClick={() => setAddGender('female')}
                      className={`py-2 rounded-xl text-xs font-bold border transition-all ${
                        addGender === 'female'
                          ? 'bg-[#EC4899] text-white border-[#EC4899]'
                          : 'bg-[#0D0F16] text-[#9CA3AF] border-[#2A2D35]'
                      }`}
                    >
                      여성
                    </button>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-xs font-semibold text-[#9CA3AF] mb-1">
                    나이 (세)
                  </label>
                  <input
                    type="number"
                    value={addAge}
                    onChange={(e) => setAddAge(Number(e.target.value))}
                    min={10}
                    max={100}
                    className="w-full px-3 py-2 bg-[#0D0F16] border border-[#2A2D35] rounded-xl text-xs text-white focus:border-[#3B82F6] outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#9CA3AF] mb-1">
                    신장 (cm)
                  </label>
                  <input
                    type="number"
                    value={addHeight}
                    onChange={(e) => setAddHeight(Number(e.target.value))}
                    min={100}
                    max={230}
                    className="w-full px-3 py-2 bg-[#0D0F16] border border-[#2A2D35] rounded-xl text-xs text-white focus:border-[#3B82F6] outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-xs font-semibold text-[#9CA3AF] mb-1">
                    목표 체중 (kg)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={addTargetWeight}
                    onChange={(e) => setAddTargetWeight(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-[#0D0F16] border border-[#2A2D35] rounded-xl text-xs text-[#fd761a] font-bold focus:border-[#fd761a] outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#9CA3AF] mb-1">
                    목표 체지방률 (%)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={addTargetPbf}
                    onChange={(e) => setAddTargetPbf(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-[#0D0F16] border border-[#2A2D35] rounded-xl text-xs text-[#34D399] font-bold focus:border-[#34D399] outline-none"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-3 bg-gradient-to-r from-[#3B82F6] to-[#8B5CF6] hover:from-[#2563EB] hover:to-[#7C3AED] text-white rounded-xl text-xs font-bold shadow-lg shadow-blue-500/25 transition-all flex items-center justify-center gap-2 mt-3"
              >
                <span className="material-symbols-outlined text-[16px]">how_to_reg</span>
                회원 등록 완료
              </button>
            </form>
          </div>
        </div>
      )}

      {/* EDIT MEMBER MODAL */}
      {editingAccount && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md overflow-y-auto">
          <div className="relative w-full max-w-md bg-[#12141C] border border-[#2A2D35] rounded-3xl p-6 sm:p-7 shadow-2xl text-[#E2E4E9] my-8">
            <button
              onClick={() => setEditingAccount(null)}
              className="absolute top-5 right-5 w-8 h-8 rounded-full bg-[#1A1D27] hover:bg-[#252936] text-[#9CA3AF] flex items-center justify-center transition-all"
            >
              <span className="material-symbols-outlined text-[20px]">close</span>
            </button>

            <h2 className="text-lg font-bold text-white mb-1">
              회원 정보 수정: {editingAccount.name}
            </h2>
            <p className="text-xs text-[#9CA3AF] mb-4">
              ID: <span className="font-mono text-[#60A5FA]">{editingAccount.username}</span>
            </p>

            <form onSubmit={handleEditSubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-[#9CA3AF] mb-1">
                  비밀번호 변경
                </label>
                <input
                  type="text"
                  value={editingAccount.password}
                  onChange={(e) =>
                    setEditingAccount({
                      ...editingAccount,
                      password: e.target.value,
                    })
                  }
                  required
                  className="w-full px-3 py-2 bg-[#0D0F16] border border-[#2A2D35] rounded-xl text-xs text-white focus:border-[#3B82F6] outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-xs font-semibold text-[#9CA3AF] mb-1">
                    이름
                  </label>
                  <input
                    type="text"
                    value={editingAccount.name}
                    onChange={(e) =>
                      setEditingAccount({
                        ...editingAccount,
                        name: e.target.value,
                        profile: { ...editingAccount.profile, name: e.target.value },
                      })
                    }
                    required
                    className="w-full px-3 py-2 bg-[#0D0F16] border border-[#2A2D35] rounded-xl text-xs text-white focus:border-[#3B82F6] outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#9CA3AF] mb-1">
                    성별
                  </label>
                  <select
                    value={editingAccount.profile.gender}
                    onChange={(e) =>
                      setEditingAccount({
                        ...editingAccount,
                        profile: {
                          ...editingAccount.profile,
                          gender: e.target.value as 'male' | 'female',
                        },
                      })
                    }
                    className="w-full px-3 py-2 bg-[#0D0F16] border border-[#2A2D35] rounded-xl text-xs text-white focus:border-[#3B82F6] outline-none"
                  >
                    <option value="male">남성</option>
                    <option value="female">여성</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-xs font-semibold text-[#9CA3AF] mb-1">
                    나이 (세)
                  </label>
                  <input
                    type="number"
                    value={editingAccount.profile.age}
                    onChange={(e) =>
                      setEditingAccount({
                        ...editingAccount,
                        profile: {
                          ...editingAccount.profile,
                          age: Number(e.target.value),
                        },
                      })
                    }
                    className="w-full px-3 py-2 bg-[#0D0F16] border border-[#2A2D35] rounded-xl text-xs text-white focus:border-[#3B82F6] outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#9CA3AF] mb-1">
                    신장 (cm)
                  </label>
                  <input
                    type="number"
                    value={editingAccount.profile.height}
                    onChange={(e) =>
                      setEditingAccount({
                        ...editingAccount,
                        profile: {
                          ...editingAccount.profile,
                          height: Number(e.target.value),
                        },
                      })
                    }
                    className="w-full px-3 py-2 bg-[#0D0F16] border border-[#2A2D35] rounded-xl text-xs text-white focus:border-[#3B82F6] outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-xs font-semibold text-[#9CA3AF] mb-1">
                    목표 체중 (kg)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={editingAccount.profile.targetWeight}
                    onChange={(e) =>
                      setEditingAccount({
                        ...editingAccount,
                        profile: {
                          ...editingAccount.profile,
                          targetWeight: Number(e.target.value),
                        },
                      })
                    }
                    className="w-full px-3 py-2 bg-[#0D0F16] border border-[#2A2D35] rounded-xl text-xs text-[#fd761a] font-bold focus:border-[#fd761a] outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#9CA3AF] mb-1">
                    목표 체지방률 (%)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={editingAccount.profile.targetBodyFatPercentage}
                    onChange={(e) =>
                      setEditingAccount({
                        ...editingAccount,
                        profile: {
                          ...editingAccount.profile,
                          targetBodyFatPercentage: Number(e.target.value),
                        },
                      })
                    }
                    className="w-full px-3 py-2 bg-[#0D0F16] border border-[#2A2D35] rounded-xl text-xs text-[#34D399] font-bold focus:border-[#34D399] outline-none"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-2.5 bg-[#2563EB] hover:bg-[#1D4ED8] text-white rounded-xl text-xs font-bold shadow-md transition-all mt-3"
              >
                수정 내용 저장
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
