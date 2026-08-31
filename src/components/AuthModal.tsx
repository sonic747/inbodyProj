import React, { useState } from 'react';
import { UserAccount, UserProfile } from '../types';

interface AuthModalProps {
  isOpen: boolean;
  onClose?: () => void;
  accounts: UserAccount[];
  onLogin: (account: UserAccount) => void;
  onRegister: (newAccount: UserAccount) => void;
  canDismiss?: boolean;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  accounts,
  onLogin,
  onRegister,
  canDismiss = false,
}) => {
  const [mode, setMode] = useState<'login' | 'register'>('login');

  // Login Form State
  const [loginUsername, setLoginUsername] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState('');

  // Register Form State
  const [regUsername, setRegUsername] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regName, setRegName] = useState('');
  const [regGender, setRegGender] = useState<'male' | 'female'>('male');
  const [regAge, setRegAge] = useState(30);
  const [regHeight, setRegHeight] = useState(172);
  const [regTargetWeight, setRegTargetWeight] = useState(68.0);
  const [regTargetPbf, setRegTargetPbf] = useState(18.0);
  const [regError, setRegError] = useState('');

  if (!isOpen) return null;

  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');

    const trimmedUsername = loginUsername.trim().toLowerCase();
    const account = accounts.find(
      (a) =>
        a.username.toLowerCase() === trimmedUsername &&
        a.password === loginPassword.trim()
    );

    if (account) {
      onLogin(account);
    } else {
      setLoginError('아이디 또는 비밀번호가 일치하지 않습니다.');
    }
  };

  const handleQuickFill = (u: string, p: string) => {
    setLoginUsername(u);
    setLoginPassword(p);
    setLoginError('');
  };

  const handleRegisterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setRegError('');

    const trimmedUsername = regUsername.trim().toLowerCase();
    const trimmedName = regName.trim();

    if (!trimmedUsername || !regPassword || !trimmedName) {
      setRegError('모든 필수 항목을 입력해주세요.');
      return;
    }

    if (accounts.some((a) => a.username.toLowerCase() === trimmedUsername)) {
      setRegError('이미 사용 중인 아이디입니다. 다른 아이디를 입력해주세요.');
      return;
    }

    const defaultAvatar =
      regGender === 'male'
        ? 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'
        : 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80';

    const newProfile: UserProfile = {
      name: trimmedName,
      age: Number(regAge) || 30,
      gender: regGender,
      height: Number(regHeight) || 170,
      targetWeight: Number(regTargetWeight) || 65,
      targetBodyFatPercentage: Number(regTargetPbf) || 18,
      avatarUrl: defaultAvatar,
    };

    const newAccount: UserAccount = {
      id: `user_${Date.now()}`,
      username: trimmedUsername,
      password: regPassword,
      name: trimmedName,
      role: 'member',
      profile: newProfile,
      createdAt: new Date().toISOString().split('T')[0],
    };

    onRegister(newAccount);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md overflow-y-auto">
      <div className="relative w-full max-w-md bg-[#12141C] border border-[#2A2D35] rounded-3xl p-6 sm:p-7 shadow-2xl text-[#E2E4E9] my-8">
        {/* Close Button if dismissible */}
        {canDismiss && onClose && (
          <button
            onClick={onClose}
            className="absolute top-5 right-5 w-8 h-8 rounded-full bg-[#1A1D27] hover:bg-[#252936] text-[#9CA3AF] flex items-center justify-center transition-all"
            aria-label="닫기"
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        )}

        {/* Brand Header */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-tr from-[#3B82F6] to-[#8B5CF6] text-white mb-3 shadow-lg shadow-blue-500/25 ring-2 ring-white/10">
            <span className="material-symbols-outlined text-[30px]">lock</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white">
            스윙짐 인바디 로그인
          </h2>
          <p className="text-xs text-[#9CA3AF] mt-1.5 leading-relaxed">
            개인정보 보호를 위해 본인 계정으로 로그인해야 전용 인바디 기록을 조회할 수 있습니다.
          </p>
        </div>

        {/* Quick Demo Credentials Guide Card */}
        <div className="p-3.5 bg-[#0D0F16] border border-[#3B82F6]/30 rounded-2xl mb-5 space-y-2">
          <div className="text-[11px] font-bold text-[#60A5FA] flex items-center gap-1.5">
            <span className="material-symbols-outlined text-[15px]">badge</span>
            접속 계정 안내 (원클릭 자동입력)
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-left">
            {/* Admin Quick Fill */}
            <button
              type="button"
              onClick={() => handleQuickFill('admin', '1111')}
              className="p-2 bg-[#1A1D27] hover:bg-[#252936] border border-amber-500/30 rounded-xl flex items-center justify-between text-left transition-all group"
            >
              <div>
                <div className="text-xs font-bold text-amber-300 flex items-center gap-1">
                  <span>👑 센터 관리자</span>
                </div>
                <div className="text-[10px] text-[#9CA3AF]">
                  ID: <span className="font-mono text-white">admin</span> / PW: <span className="font-mono text-white">1111</span>
                </div>
              </div>
              <span className="text-[10px] font-bold text-amber-400 opacity-80 group-hover:opacity-100">
                입력
              </span>
            </button>

            {/* Member Quick Fill (Demo) */}
            <button
              type="button"
              onClick={() => handleQuickFill('demo', '123')}
              className="p-2 bg-[#1A1D27] hover:bg-[#252936] border border-blue-500/30 rounded-xl flex items-center justify-between text-left transition-all group"
            >
              <div>
                <div className="text-xs font-bold text-blue-400 flex items-center gap-1">
                  <span>👤 김철수 회원</span>
                </div>
                <div className="text-[10px] text-[#9CA3AF]">
                  ID: <span className="font-mono text-white">demo</span> / PW: <span className="font-mono text-white">123</span>
                </div>
              </div>
              <span className="text-[10px] font-bold text-blue-400 opacity-80 group-hover:opacity-100">
                입력
              </span>
            </button>
          </div>
        </div>

        {/* Tab Switcher */}
        <div className="grid grid-cols-2 p-1 bg-[#0A0C10] border border-[#2A2D35] rounded-2xl mb-5">
          <button
            type="button"
            onClick={() => {
              setMode('login');
              setLoginError('');
            }}
            className={`py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
              mode === 'login'
                ? 'bg-[#2563EB] text-white shadow-md shadow-blue-500/30'
                : 'text-[#9CA3AF] hover:text-white'
            }`}
          >
            <span className="material-symbols-outlined text-[16px]">login</span>
            로그인
          </button>
          <button
            type="button"
            onClick={() => {
              setMode('register');
              setRegError('');
            }}
            className={`py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
              mode === 'register'
                ? 'bg-[#2563EB] text-white shadow-md shadow-blue-500/30'
                : 'text-[#9CA3AF] hover:text-white'
            }`}
          >
            <span className="material-symbols-outlined text-[16px]">person_add</span>
            신규 회원가입
          </button>
        </div>

        {/* LOGIN FORM */}
        {mode === 'login' ? (
          <form onSubmit={handleLoginSubmit} className="space-y-4">
            {loginError && (
              <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-xs text-red-400 flex items-center gap-2">
                <span className="material-symbols-outlined text-[16px]">error</span>
                {loginError}
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-[#9CA3AF] mb-1.5">
                아이디 (ID)
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 material-symbols-outlined text-[#6B7280] text-[18px]">
                  person
                </span>
                <input
                  type="text"
                  value={loginUsername}
                  onChange={(e) => setLoginUsername(e.target.value)}
                  placeholder="아이디를 입력하세요 (예: admin 또는 demo)"
                  required
                  className="w-full pl-10 pr-3 py-2.5 bg-[#0D0F16] border border-[#2A2D35] rounded-xl text-sm text-white placeholder-[#6B7280] focus:border-[#3B82F6] outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#9CA3AF] mb-1.5">
                비밀번호 (Password)
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 material-symbols-outlined text-[#6B7280] text-[18px]">
                  lock
                </span>
                <input
                  type="password"
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  placeholder="비밀번호를 입력하세요"
                  required
                  className="w-full pl-10 pr-3 py-2.5 bg-[#0D0F16] border border-[#2A2D35] rounded-xl text-sm text-white placeholder-[#6B7280] focus:border-[#3B82F6] outline-none"
                />
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-3 bg-[#2563EB] hover:bg-[#1D4ED8] text-white rounded-xl text-sm font-bold shadow-lg shadow-blue-500/25 transition-all flex items-center justify-center gap-2 mt-2"
            >
              <span className="material-symbols-outlined text-[18px]">check_circle</span>
              로그인하고 인바디 시작하기
            </button>
          </form>
        ) : (
          /* REGISTER FORM */
          <form onSubmit={handleRegisterSubmit} className="space-y-3.5">
            {regError && (
              <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-xs text-red-400 flex items-center gap-2">
                <span className="material-symbols-outlined text-[16px]">error</span>
                {regError}
              </div>
            )}

            <div className="grid grid-cols-2 gap-2.5">
              <div>
                <label className="block text-xs font-semibold text-[#9CA3AF] mb-1">
                  아이디 (ID) *
                </label>
                <input
                  type="text"
                  value={regUsername}
                  onChange={(e) => setRegUsername(e.target.value)}
                  placeholder="예: user1"
                  required
                  className="w-full px-3 py-2 bg-[#0D0F16] border border-[#2A2D35] rounded-xl text-xs text-white placeholder-[#6B7280] focus:border-[#3B82F6] outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#9CA3AF] mb-1">
                  비밀번호 (PW) *
                </label>
                <input
                  type="password"
                  value={regPassword}
                  onChange={(e) => setRegPassword(e.target.value)}
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
                  value={regName}
                  onChange={(e) => setRegName(e.target.value)}
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
                    onClick={() => setRegGender('male')}
                    className={`py-2 rounded-xl text-xs font-bold border transition-all ${
                      regGender === 'male'
                        ? 'bg-[#3B82F6] text-white border-[#3B82F6]'
                        : 'bg-[#0D0F16] text-[#9CA3AF] border-[#2A2D35]'
                    }`}
                  >
                    남성
                  </button>
                  <button
                    type="button"
                    onClick={() => setRegGender('female')}
                    className={`py-2 rounded-xl text-xs font-bold border transition-all ${
                      regGender === 'female'
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
                  value={regAge}
                  onChange={(e) => setRegAge(Number(e.target.value))}
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
                  value={regHeight}
                  onChange={(e) => setRegHeight(Number(e.target.value))}
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
                  value={regTargetWeight}
                  onChange={(e) => setRegTargetWeight(Number(e.target.value))}
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
                  value={regTargetPbf}
                  onChange={(e) => setRegTargetPbf(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-[#0D0F16] border border-[#2A2D35] rounded-xl text-xs text-[#34D399] font-bold focus:border-[#34D399] outline-none"
                />
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-3 bg-gradient-to-r from-[#3B82F6] to-[#8B5CF6] hover:from-[#2563EB] hover:to-[#7C3AED] text-white rounded-xl text-sm font-bold shadow-lg shadow-blue-500/25 transition-all flex items-center justify-center gap-2 mt-2"
            >
              <span className="material-symbols-outlined text-[18px]">how_to_reg</span>
              회원가입 완료 & 개인 인바디 시작
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
