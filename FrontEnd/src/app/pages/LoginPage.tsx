import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { Eye, EyeOff, Leaf, Lock, Mail, UserPlus } from 'lucide-react';
import { authService } from '../../service/authService';

type AuthMode = 'login' | 'signup';

export default function LoginPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<AuthMode>('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const isSignup = mode === 'signup';

  useEffect(() => {
    if (authService.isLoggedIn()) {
      navigate('/dashboard');
    }
  }, [navigate]);

  const resetMessage = () => setError('');

  const switchMode = () => {
    setMode((current) => (current === 'login' ? 'signup' : 'login'));
    setError('');
  };

  const validateForm = () => {
    if (!email.trim() || !password.trim()) {
      return '이메일과 비밀번호를 입력해주세요.';
    }

    if (!email.includes('@')) {
      return '올바른 이메일 형식으로 입력해주세요.';
    }

    if (isSignup && password.length < 4) {
      return '비밀번호는 4자 이상으로 입력해주세요.';
    }

    return '';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const validationMessage = validateForm();
    if (validationMessage) {
      setError(validationMessage);
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const response = isSignup
        ? await authService.signup({ email, password, name })
        : await authService.login(email, password);

      if (response.success) {
        navigate('/dashboard');
        return;
      }

      setError(response.message || '인증에 실패했습니다. 입력 정보를 확인해주세요.');
    } catch {
      setError('인증 처리 중 오류가 발생했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-sky-50 flex items-center justify-center p-4">
      <main className="bg-white rounded-2xl shadow-xl border border-emerald-100 p-8 w-full max-w-md">
        <div className="flex flex-col items-center mb-8">
          <div className="bg-emerald-600 p-4 rounded-2xl mb-4 shadow-lg shadow-emerald-100">
            <Leaf size={40} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">스마트팜 관리 시스템</h1>
          <p className="text-gray-500 mt-2">
            {isSignup ? '새 계정을 만들어 대시보드에 접속하세요.' : '계정으로 로그인해 대시보드를 확인하세요.'}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5" noValidate>
          {isSignup && (
            <label className="block">
              <span className="block text-sm font-medium text-gray-700 mb-1">이름</span>
              <div className="relative">
                <UserPlus size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value);
                    resetMessage();
                  }}
                  className="w-full pl-11 pr-4 py-3 rounded-xl border-2 border-gray-200 focus:border-emerald-500 focus:outline-none transition-colors"
                  placeholder="사용자 이름"
                  disabled={isLoading}
                />
              </div>
            </label>
          )}

          <label className="block">
            <span className="block text-sm font-medium text-gray-700 mb-1">이메일</span>
            <div className="relative">
              <Mail size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  resetMessage();
                }}
                className="w-full pl-11 pr-4 py-3 rounded-xl border-2 border-gray-200 focus:border-emerald-500 focus:outline-none transition-colors"
                placeholder="demo@gmail.com"
                disabled={isLoading}
                autoComplete="email"
              />
            </div>
          </label>

          <label className="block">
            <span className="block text-sm font-medium text-gray-700 mb-1">비밀번호</span>
            <div className="relative">
              <Lock size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  resetMessage();
                }}
                className="w-full pl-11 pr-12 py-3 rounded-xl border-2 border-gray-200 focus:border-emerald-500 focus:outline-none transition-colors"
                placeholder="비밀번호"
                disabled={isLoading}
                autoComplete={isSignup ? 'new-password' : 'current-password'}
              />
              <button
                type="button"
                onClick={() => setShowPassword((current) => !current)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700 p-1"
                disabled={isLoading}
                aria-label={showPassword ? '비밀번호 숨기기' : '비밀번호 보기'}
              >
                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
          </label>

          {error && (
            <p className="text-red-600 text-sm bg-red-50 border border-red-100 rounded-lg px-3 py-2">{error}</p>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className={`w-full ${
              isLoading ? 'bg-emerald-400' : 'bg-emerald-600 hover:bg-emerald-700'
            } text-white py-3 rounded-xl font-semibold transition-colors flex justify-center items-center`}
          >
            {isLoading ? (
              <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : isSignup ? (
              '회원가입'
            ) : (
              '로그인'
            )}
          </button>
        </form>

        <div className="mt-6 space-y-3 text-center">
          <p className="text-sm text-gray-500">
            {isSignup ? '이미 계정이 있으신가요?' : '아직 계정이 없으신가요?'}
            <button
              type="button"
              onClick={switchMode}
              className="ml-2 font-semibold text-emerald-700 hover:text-emerald-800"
              disabled={isLoading}
            >
              {isSignup ? '로그인' : '회원가입'}
            </button>
          </p>
          <p className="text-xs text-gray-400">관리자 계정: demo@gmail.com / 1234</p>
        </div>
      </main>
    </div>
  );
}
