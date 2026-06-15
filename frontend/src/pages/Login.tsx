import React, { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import api from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { toast } from 'react-toastify';
import { Lock, User, ShieldCheck, Mail, ArrowLeft, CheckCircle } from 'lucide-react';

export const Login: React.FC = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // Forgot password form states
  const [isForgotView, setIsForgotView] = useState(false);
  const [forgotInput, setForgotInput] = useState('');
  const [forgotSuccessMessage, setForgotSuccessMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await api.post('/auth/login', { username, password });
      login(res.data.token, res.data.user);
      toast.success("Đăng nhập thành công!");
      if (res.data.user.mustChangePassword) {
        navigate('/force-change-password');
      } else {
        navigate(searchParams.get('redirect') || '/dashboard');
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Đăng nhập thất bại");
    } finally {
      setLoading(false);
    }
  };

  const handleForgotSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setForgotSuccessMessage(null);
    try {
      const res = await api.post('/auth/forgot-password', { usernameOrEmail: forgotInput });
      setForgotSuccessMessage(res.data.message);
      toast.success("Đã gửi yêu cầu thành công!");
    } catch (err: any) {
      if (err.response?.data?.code === 'NO_EMAIL_SERVICE') {
        setForgotSuccessMessage(err.response.data.message);
      } else {
        toast.error(err.response?.data?.message || "Yêu cầu thất bại. Vui lòng thử lại.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div 
      className="min-h-screen flex items-center justify-center bg-cover bg-center bg-no-repeat p-4 relative"
      style={{ backgroundImage: `url('/login_bg_danko.png')` }}
    >
      <div className="absolute inset-0 bg-slate-950/20 backdrop-blur-[1px] pointer-events-none" />
      <div className="max-w-md w-full bg-white/95 backdrop-blur-md rounded-3xl shadow-2xl border border-white/10 overflow-hidden transition-all duration-300 transform hover:scale-[1.01] relative z-10">
        
        {/* Card Header */}
        <div className="p-8 bg-gradient-to-r from-indigo-700 to-violet-800 text-white text-center relative overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-white/10 via-transparent to-transparent pointer-events-none" />
          <div className="mx-auto w-16 h-16 bg-white/15 rounded-2xl flex items-center justify-center mb-4 backdrop-blur-md border border-white/10 shadow-inner">
            <ShieldCheck className="h-9 w-9 text-white animate-pulse" />
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight">AssetManager</h1>
          <p className="text-indigo-100 text-sm mt-1 font-medium opacity-90">Enterprise Asset & Inventory Control</p>
        </div>

        {!isForgotView ? (
          /* Login Form View */
          <form onSubmit={handleSubmit} className="p-8 space-y-6">
            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-500">Username</label>
              <div className="relative">
                <User className="absolute left-3.5 top-3 h-5 w-5 text-slate-400" />
                <input 
                  type="text" 
                  name="username"
                  autoComplete="username"
                  className="w-full bg-slate-50/50 border border-slate-200 rounded-xl pl-11 pr-4 py-2.5 text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all font-medium"
                  placeholder="Nhập tên đăng nhập"
                  required
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-500">Password</label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-3 h-5 w-5 text-slate-400" />
                <input 
                  type="password" 
                  name="password"
                  autoComplete="current-password"
                  className="w-full bg-slate-50/50 border border-slate-200 rounded-xl pl-11 pr-4 py-2.5 text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all font-medium"
                  placeholder="••••••••"
                  required
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                />
              </div>
            </div>

            {/* Remember & Forgot Password Links */}
            <div className="flex items-center justify-between text-sm py-1">
              <label className="flex items-center gap-2 cursor-pointer select-none text-slate-600 font-medium">
                <input 
                  type="checkbox" 
                  checked={rememberMe}
                  onChange={e => setRememberMe(e.target.checked)}
                  className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                />
                Ghi nhớ đăng nhập
              </label>
              <button 
                type="button"
                onClick={() => {
                  setIsForgotView(true);
                  setForgotSuccessMessage(null);
                  setForgotInput('');
                }}
                className="font-semibold text-indigo-600 hover:text-indigo-800 transition-colors"
              >
                Quên mật khẩu?
              </button>
            </div>

            {/* Spacer included before button (24px space-y handles this naturally) */}
            <button 
              type="submit" 
              disabled={loading}
              className="w-full bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white py-3 rounded-xl font-bold shadow-lg shadow-indigo-100 hover:shadow-indigo-200 transition-all disabled:opacity-50 mt-2 text-base tracking-wide flex items-center justify-center gap-2"
            >
              {loading ? "Đang xác thực..." : "Đăng Nhập"}
            </button>
          </form>
        ) : (
          /* Forgot Password View */
          <form onSubmit={handleForgotSubmit} className="p-8 space-y-6">
            <div className="space-y-2">
              <button
                type="button"
                onClick={() => setIsForgotView(false)}
                className="flex items-center gap-1.5 text-sm font-semibold text-slate-500 hover:text-slate-700 transition-colors"
              >
                <ArrowLeft className="w-4 h-4" /> Quay lại đăng nhập
              </button>
              <h2 className="text-xl font-extrabold text-slate-800 pt-2">Khôi phục mật khẩu</h2>
              <p className="text-sm text-slate-500 font-medium leading-relaxed">
                Nhập tên đăng nhập hoặc địa chỉ email đã đăng ký. Chúng tôi sẽ hướng dẫn bạn cách khôi phục lại mật khẩu.
              </p>
            </div>

            {forgotSuccessMessage ? (
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex gap-3 text-slate-700 text-sm leading-relaxed font-medium">
                <CheckCircle className="w-5 h-5 text-indigo-600 flex-shrink-0 mt-0.5" />
                <div>
                  {forgotSuccessMessage}
                </div>
              </div>
            ) : (
              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-500">Username hoặc Email</label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-3 h-5 w-5 text-slate-400" />
                  <input 
                    type="text" 
                    className="w-full bg-slate-50/50 border border-slate-200 rounded-xl pl-11 pr-4 py-2.5 text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all font-medium"
                    placeholder="example@company.com"
                    required
                    value={forgotInput}
                    onChange={e => setForgotInput(e.target.value)}
                  />
                </div>
              </div>
            )}

            {!forgotSuccessMessage && (
              <button 
                type="submit" 
                disabled={loading}
                className="w-full bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white py-3 rounded-xl font-bold shadow-lg shadow-indigo-100 hover:shadow-indigo-200 transition-all disabled:opacity-50 text-base tracking-wide flex items-center justify-center gap-2"
              >
                {loading ? "Đang gửi yêu cầu..." : "Gửi yêu cầu khôi phục"}
              </button>
            )}
          </form>
        )}

        {/* Footer */}
        <div className="p-6 bg-slate-50 border-t border-slate-100 text-center">
          <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider">
            &copy; 2026 Danko Group. All rights reserved.
          </p>
        </div>
      </div>
    </div>
  );
};
