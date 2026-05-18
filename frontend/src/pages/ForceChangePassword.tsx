import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { toast } from 'react-toastify';
import { Lock, ShieldAlert, KeyRound, Check, X, Eye, EyeOff } from 'lucide-react';

export const ForceChangePassword: React.FC = () => {
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  const [showOld, setShowOld] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const [loading, setLoading] = useState(false);
  const { user, refetchUser, logout } = useAuth();
  const navigate = useNavigate();

  // If user has already changed password, send them to dashboard
  useEffect(() => {
    if (user && !user.mustChangePassword) {
      navigate('/dashboard');
    }
  }, [user, navigate]);

  // Password policy check indicators
  const hasMinLen = newPassword.length >= 8;
  const hasUpper = /[A-Z]/.test(newPassword);
  const hasLower = /[a-z]/.test(newPassword);
  const hasDigit = /[0-9]/.test(newPassword);
  const hasSpecial = /[^A-Za-z0-9]/.test(newPassword);
  const doesNotMatchUsername = user ? newPassword.toLowerCase() !== user.username.toLowerCase() : true;

  const isPolicyValid = hasMinLen && hasUpper && hasLower && hasDigit && hasSpecial && doesNotMatchUsername;
  const matchesConfirm = newPassword === confirmPassword && confirmPassword !== '';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!isPolicyValid) {
      toast.error('Mật khẩu mới chưa đáp ứng chính sách bảo mật của Danko Group.');
      return;
    }

    if (!matchesConfirm) {
      toast.error('Xác nhận mật khẩu mới không khớp.');
      return;
    }

    setLoading(true);
    try {
      await api.post('/auth/change-password-force', {
        oldPassword,
        newPassword
      });
      toast.success('Đổi mật khẩu thành công! Chào mừng bạn vào hệ thống.');
      
      // Update Auth context user status
      await refetchUser();
      navigate('/dashboard');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Đổi mật khẩu thất bại. Vui lòng kiểm tra lại mật khẩu cũ.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-2xl border border-slate-100 overflow-hidden">
        
        {/* Banner */}
        <div className="p-8 bg-amber-600 text-white text-center relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-amber-600 to-orange-600 opacity-90 z-0"></div>
          <div className="relative z-10">
            <div className="mx-auto w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center mb-4 backdrop-blur-sm">
              <ShieldAlert className="h-10 w-10 text-white" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight">Đổi mật khẩu bắt buộc</h1>
            <p className="text-amber-100 mt-2 opacity-90 text-sm">
              Đây là lần đăng nhập đầu tiên hoặc tài khoản của bạn được yêu cầu đổi mật khẩu để bảo mật.
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-5">
          
          {/* Old Password */}
          <div className="space-y-1">
            <label className="text-sm font-bold text-slate-700">Mật khẩu cũ (Hiện tại)</label>
            <div className="relative">
              <Lock className="absolute left-3 top-3 h-5 w-5 text-slate-400" />
              <input 
                type={showOld ? "text" : "password"} 
                className="input-field pl-10 pr-10 py-2.5"
                placeholder="Nhập mật khẩu hiện tại"
                required
                value={oldPassword}
                onChange={e => setOldPassword(e.target.value)}
              />
              <button
                type="button"
                onClick={() => setShowOld(!showOld)}
                className="absolute right-3 top-3 text-slate-400 hover:text-slate-600"
              >
                {showOld ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
              </button>
            </div>
          </div>

          {/* New Password */}
          <div className="space-y-1">
            <label className="text-sm font-bold text-slate-700">Mật khẩu mới</label>
            <div className="relative">
              <KeyRound className="absolute left-3 top-3 h-5 w-5 text-slate-400" />
              <input 
                type={showNew ? "text" : "password"} 
                className="input-field pl-10 pr-10 py-2.5"
                placeholder="••••••••"
                required
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
              />
              <button
                type="button"
                onClick={() => setShowNew(!showNew)}
                className="absolute right-3 top-3 text-slate-400 hover:text-slate-600"
              >
                {showNew ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
              </button>
            </div>
          </div>

          {/* Confirm Password */}
          <div className="space-y-1">
            <label className="text-sm font-bold text-slate-700">Xác nhận mật khẩu mới</label>
            <div className="relative">
              <KeyRound className="absolute left-3 top-3 h-5 w-5 text-slate-400" />
              <input 
                type={showConfirm ? "text" : "password"} 
                className="input-field pl-10 pr-10 py-2.5"
                placeholder="••••••••"
                required
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
              />
              <button
                type="button"
                onClick={() => setShowConfirm(!showConfirm)}
                className="absolute right-3 top-3 text-slate-400 hover:text-slate-600"
              >
                {showConfirm ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
              </button>
            </div>
          </div>

          {/* Policy Checklist */}
          {newPassword && (
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 text-xs space-y-2 text-slate-600">
              <p className="font-bold text-slate-700">Chính sách bảo mật Danko Group:</p>
              
              <div className="grid grid-cols-2 gap-2">
                <div className="flex items-center gap-1.5">
                  {hasMinLen ? <Check className="h-4 w-4 text-emerald-500" /> : <X className="h-4 w-4 text-rose-500" />}
                  <span>Tối thiểu 8 ký tự</span>
                </div>
                
                <div className="flex items-center gap-1.5">
                  {hasUpper ? <Check className="h-4 w-4 text-emerald-500" /> : <X className="h-4 w-4 text-rose-500" />}
                  <span>Ít nhất 1 chữ hoa</span>
                </div>

                <div className="flex items-center gap-1.5">
                  {hasLower ? <Check className="h-4 w-4 text-emerald-500" /> : <X className="h-4 w-4 text-rose-500" />}
                  <span>Ít nhất 1 chữ thường</span>
                </div>

                <div className="flex items-center gap-1.5">
                  {hasDigit ? <Check className="h-4 w-4 text-emerald-500" /> : <X className="h-4 w-4 text-rose-500" />}
                  <span>Ít nhất 1 chữ số</span>
                </div>

                <div className="flex items-center gap-1.5 col-span-2">
                  {hasSpecial ? <Check className="h-4 w-4 text-emerald-500" /> : <X className="h-4 w-4 text-rose-500" />}
                  <span>Ít nhất 1 ký tự đặc biệt (!@#$...)</span>
                </div>

                <div className="flex items-center gap-1.5 col-span-2">
                  {doesNotMatchUsername ? <Check className="h-4 w-4 text-emerald-500" /> : <X className="h-4 w-4 text-rose-500" />}
                  <span>Không trùng tên đăng nhập</span>
                </div>

                <div className="flex items-center gap-1.5 col-span-2 border-t pt-1.5 border-slate-200">
                  {matchesConfirm ? <Check className="h-4 w-4 text-emerald-500" /> : <X className="h-4 w-4 text-rose-500" />}
                  <span>Mật khẩu xác nhận trùng khớp</span>
                </div>
              </div>
            </div>
          )}

          {/* Submit */}
          <button 
            type="submit" 
            disabled={loading || !isPolicyValid || !matchesConfirm}
            className="w-full btn-primary py-3 text-base font-bold shadow-lg shadow-amber-200 disabled:opacity-50"
            style={{ backgroundColor: (isPolicyValid && matchesConfirm) ? '#d97706' : '#94a3b8' }}
          >
            {loading ? "Đang xử lý..." : "Cập nhật mật khẩu"}
          </button>
        </form>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-xs text-slate-400">
          <span>&copy; Danko Group 2026</span>
          <button 
            type="button" 
            onClick={() => logout()} 
            className="text-primary-600 font-bold hover:underline"
          >
            Đăng xuất
          </button>
        </div>
      </div>
    </div>
  );
};
