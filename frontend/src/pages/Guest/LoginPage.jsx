import { useState, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Mail, Lock, Eye, EyeOff, User, ArrowRight, Zap, ShieldCheck, CheckCircle, XCircle, Scan, MapPin } from 'lucide-react';
import Logo from '../../assets/images/logo.png';
import GarageBg from '../../assets/images/garage-bg.png';
import { loginUser, registerUser, loginWithGoogle, sendOTP, verifyOTP, forgotPassword, verifyResetPasswordOTP, resetPassword } from '../../services/authService';

// ─── Google Icon SVG ───────────────────────────────────────────────────────────
const GoogleIcon = () => (
  <svg viewBox="0 0 24 24" className="w-5 h-5" aria-hidden="true">
    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05" />
    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
  </svg>
);

// ─── Feature Badge ─────────────────────────────────────────────────────────────
const FeatureBadge = ({ icon, title, desc }) => (
  <div className="flex items-center gap-3 p-3 rounded-xl bg-black/30 border border-white/10 backdrop-blur-sm">
    <div className="w-9 h-9 rounded-lg bg-gold/20 border border-gold/30 flex items-center justify-center text-gold shrink-0">
      {icon}
    </div>
    <div>
      <p className="text-white text-xs font-bold">{title}</p>
      <p className="text-gray-400 text-xs">{desc}</p>
    </div>
  </div>
);

export default function LoginPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState('login'); // 'login' | 'signup'
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', password: '', confirm: '' });
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState(null); // { type: 'success'|'error', message: string }
  const [signupStep, setSignupStep] = useState('form'); // 'form' | 'otp'
  const [otpDigits, setOtpDigits] = useState(Array(6).fill(''));
  const [registeredEmail, setRegisteredEmail] = useState('');
  const [otpLoading, setOtpLoading] = useState(false);
  const otpRefs = useRef([]);

  // ── Forgot password state ──
  const [forgotStep, setForgotStep] = useState(null); // null | 'email' | 'otp' | 'password'
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotOtpDigits, setForgotOtpDigits] = useState(Array(6).fill(''));
  const [forgotVerifiedOTP, setForgotVerifiedOTP] = useState('');
  const [forgotNewPass, setForgotNewPass] = useState('');
  const [forgotConfirmPass, setForgotConfirmPass] = useState('');
  const [forgotLoading, setForgotLoading] = useState(false);
  const [showForgotNewPass, setShowForgotNewPass] = useState(false);
  const [showForgotConfirmPass, setShowForgotConfirmPass] = useState(false);
  const forgotOtpRefs = useRef([]);

  const showToast = (type, message) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 3500);
  };

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isLogin) {
        // ── LOGIN ──
        const { ok, data } = await loginUser(form.email, form.password);

        if (!ok) {
          showToast('error', data.message || 'Email or password is incorrect. Please try again.');
          return;
        }

        const { user, accessToken, refreshToken } = data.data;

        // Store tokens
        localStorage.setItem('accessToken', accessToken);
        localStorage.setItem('refreshToken', refreshToken);
        sessionStorage.setItem('valo_user', JSON.stringify({
          id: user.id,
          name: user.username,
          email: user.email,
          role: user.role,
        }));

        // Notify Navbar to update immediately
        window.dispatchEvent(new Event('valo_auth_change'));
        showToast('success', `Welcome back, ${user.username}!`);

        // ── Redirect theo role ──
        const roleRedirect = {
          admin: '/admin/dashboard',
          staff: '/staff/dashboard',
        };
        const dest = roleRedirect[user.role] || '/';
        setTimeout(() => navigate(dest), 1000);
      } else {
        // ── SIGNUP: basic client-side validation ──
        if (!form.name.trim()) {
          showToast('error', 'Please enter an account name.');
          return;
        }
        if (form.password !== form.confirm) {
          showToast('error', 'Password confirmation does not match.');
          return;
        }

        // ── REGISTER ──
        const { ok, data } = await registerUser(form.name, form.email, form.password, form.confirm);

        if (!ok) {
          const msg = data.errors?.length ? data.errors[0].message : data.message || 'Registration failed. Please try again.';
          showToast('error', msg);
          return;
        }

        // Registration successful → send OTP for email verification
        const { ok: otpOk, data: otpData } = await sendOTP(form.email);

        if (!otpOk) {
          showToast('error', otpData.message || 'Could not send the verification code.');
          return;
        }

        setRegisteredEmail(form.email);
        setSignupStep('otp');
        showToast('success', `Verification code was sent to ${form.email}`);
      }
    } catch {
      showToast('error', 'Could not connect to the server. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  // ── OTP input helpers ──
  const handleOtpChange = (index, value) => {
    if (!/^\d*$/.test(value)) return;
    if (value.length > 1) {
      const digits = value.replace(/\D/g, '').slice(0, 6).split('');
      const next = [...otpDigits];
      digits.forEach((d, i) => { if (index + i < 6) next[index + i] = d; });
      setOtpDigits(next);
      otpRefs.current[Math.min(index + digits.length, 5)]?.focus();
      return;
    }
    const next = [...otpDigits];
    next[index] = value;
    setOtpDigits(next);
    if (value && index < 5) otpRefs.current[index + 1]?.focus();
  };

  const handleOtpKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !otpDigits[index] && index > 0) otpRefs.current[index - 1]?.focus();
    if (e.key === 'ArrowLeft' && index > 0) otpRefs.current[index - 1]?.focus();
    if (e.key === 'ArrowRight' && index < 5) otpRefs.current[index + 1]?.focus();
  };

  const handleVerifyOTP = async (e) => {
    e.preventDefault();
    const code = otpDigits.join('');
    if (code.length !== 6) { showToast('error', 'Please enter all 6 digits.'); return; }
    setOtpLoading(true);
    try {
      const { ok, data } = await verifyOTP(registeredEmail, code);
      if (!ok) {
        showToast('error', data.message || 'Verification code is incorrect.');
        return;
      }
      showToast('success', 'Email verified! Please log in.');
      setTimeout(() => {
        setSignupStep('form');
        setOtpDigits(Array(6).fill(''));
        setMode('login');
        setForm({ name: '', email: '', password: '', confirm: '' });
      }, 1500);
    } catch {
      showToast('error', 'Could not connect to the server. Please try again later.');
    } finally {
      setOtpLoading(false);
    }
  };

  const handleResendOTP = async () => {
    setOtpLoading(true);
    try {
      const { ok, data } = await sendOTP(registeredEmail);
      if (!ok) { showToast('error', data.message || 'Could not send the code.'); return; }
      showToast('success', 'A new verification code was sent!');
      setOtpDigits(Array(6).fill(''));
    } catch {
      showToast('error', 'Could not connect to the server.');
    } finally {
      setOtpLoading(false);
    }
  };

  // ── Forgot password handlers ──
  const handleForgotOtpChange = (index, value) => {
    if (!/^\d*$/.test(value)) return;
    if (value.length > 1) {
      const digits = value.replace(/\D/g, '').slice(0, 6).split('');
      const next = [...forgotOtpDigits];
      digits.forEach((d, i) => { if (index + i < 6) next[index + i] = d; });
      setForgotOtpDigits(next);
      forgotOtpRefs.current[Math.min(index + digits.length, 5)]?.focus();
      return;
    }
    const next = [...forgotOtpDigits];
    next[index] = value;
    setForgotOtpDigits(next);
    if (value && index < 5) forgotOtpRefs.current[index + 1]?.focus();
  };

  const handleForgotOtpKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !forgotOtpDigits[index] && index > 0) forgotOtpRefs.current[index - 1]?.focus();
    if (e.key === 'ArrowLeft' && index > 0) forgotOtpRefs.current[index - 1]?.focus();
    if (e.key === 'ArrowRight' && index < 5) forgotOtpRefs.current[index + 1]?.focus();
  };

  const handleForgotSendOTP = async (e) => {
    e.preventDefault();
    if (!forgotEmail) { showToast('error', 'Please enter your email.'); return; }
    setForgotLoading(true);
    try {
      const { ok, data } = await forgotPassword(forgotEmail);
      if (!ok) { showToast('error', data.message || 'Could not send the code.'); return; }
      setForgotStep('otp');
      setForgotVerifiedOTP('');
      setForgotOtpDigits(Array(6).fill(''));
      showToast('success', `OTP code was sent to ${forgotEmail}`);
    } catch {
      showToast('error', 'Could not connect to the server.');
    } finally {
      setForgotLoading(false);
    }
  };

  const handleForgotVerifyOTP = async (e) => {
    e.preventDefault();
    const code = forgotOtpDigits.join('');
    if (code.length !== 6) { showToast('error', 'Please enter all 6 digits.'); return; }
    setForgotLoading(true);
    try {
      const { ok, data } = await verifyResetPasswordOTP(forgotEmail, code);
      if (!ok) { showToast('error', data.message || 'Invalid OTP code.'); return; }
      setForgotVerifiedOTP(code);
      setForgotOtpDigits(Array(6).fill(''));
      setForgotStep('password');
      showToast('success', 'OTP is valid. You can enter a new password.');
    } catch {
      showToast('error', 'Could not connect to the server.');
    } finally {
      setForgotLoading(false);
    }
  };

  const handleForgotReset = async (e) => {
    e.preventDefault();
    if (!forgotVerifiedOTP) { showToast('error', 'Please verify the OTP first.'); return; }
    if (forgotNewPass.length < 6) { showToast('error', 'Password must be at least 6 characters.'); return; }
    if (forgotNewPass !== forgotConfirmPass) { showToast('error', 'Password confirmation does not match.'); return; }
    setForgotLoading(true);
    try {
      const { ok, data } = await resetPassword(forgotEmail, forgotVerifiedOTP, forgotNewPass);
      if (!ok) { showToast('error', data.message || 'Password reset failed.'); return; }
      showToast('success', 'Password reset successful! Please log in.');
      setTimeout(() => {
        setForgotStep(null);
        setForgotEmail('');
        setForgotOtpDigits(Array(6).fill(''));
        setForgotVerifiedOTP('');
        setForgotNewPass('');
        setForgotConfirmPass('');
      }, 1500);
    } catch {
      showToast('error', 'Could not connect to the server.');
    } finally {
      setForgotLoading(false);
    }
  };

  const handleForgotResendOTP = async () => {
    setForgotLoading(true);
    try {
      const { ok, data } = await forgotPassword(forgotEmail);
      if (!ok) { showToast('error', data.message || 'Could not send the code.'); return; }
      showToast('success', 'A new OTP code was sent!');
      setForgotOtpDigits(Array(6).fill(''));
    } catch {
      showToast('error', 'Could not connect to the server.');
    } finally {
      setForgotLoading(false);
    }
  };

  const resetForgot = () => {
    setForgotStep(null);
    setForgotEmail('');
    setForgotOtpDigits(Array(6).fill(''));
    setForgotVerifiedOTP('');
    setForgotNewPass('');
    setForgotConfirmPass('');
  };

  const handleGoogleAuth = () => {
    const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
    const redirectUri = encodeURIComponent(`${window.location.origin}/oauth/callback`);
    const scope = encodeURIComponent('openid email profile');
    const nonce = Math.random().toString(36).slice(2);

    const oauthUrl =
      `https://accounts.google.com/o/oauth2/v2/auth` +
      `?client_id=${clientId}` +
      `&redirect_uri=${redirectUri}` +
      `&response_type=id_token` +
      `&scope=${scope}` +
      `&nonce=${nonce}`;

    const popup = window.open(oauthUrl, 'google-oauth', 'width=500,height=600,left=200,top=100');

    let checkClosed;

    const handleMessage = async (event) => {
      if (event.origin !== window.location.origin) return;
      if (event.data?.type !== 'GOOGLE_OAUTH') return;

      window.removeEventListener('message', handleMessage);
      clearInterval(checkClosed);

      const { idToken, error } = event.data;
      if (error || !idToken) {
        showToast('error', 'Google login was cancelled or failed.');
        return;
      }

      setLoading(true);
      try {
        const { ok, data } = await loginWithGoogle(idToken);
        if (!ok) {
          showToast('error', data.message || 'Google login failed.');
          return;
        }
        const { user, accessToken, refreshToken } = data.data;
        localStorage.setItem('accessToken', accessToken);
        localStorage.setItem('refreshToken', refreshToken);
        sessionStorage.setItem('valo_user', JSON.stringify({
          id: user.id, name: user.username, email: user.email, role: user.role,
        }));
        window.dispatchEvent(new Event('valo_auth_change'));
        showToast('success', `Welcome, ${user.username}!`);
        const roleRedirect = { admin: '/admin/dashboard', staff: '/staff/dashboard' };
        setTimeout(() => navigate(roleRedirect[user.role] || '/'), 1000);
      } catch {
        showToast('error', 'Could not connect to the server.');
      } finally {
        setLoading(false);
      }
    };

    window.addEventListener('message', handleMessage);

    checkClosed = setInterval(() => {
      if (popup?.closed) {
        clearInterval(checkClosed);
        window.removeEventListener('message', handleMessage);
      }
    }, 500);
  };

  const isLogin = mode === 'login';

  return (
    <div className="min-h-screen bg-charcoal flex overflow-hidden relative font-sans">

      {/* ── Toast notification ── */}
      {toast && (
        <div
          className={`fixed top-6 left-1/2 -translate-x-1/2 z-[999] flex items-center gap-3 px-5 py-3.5 rounded-2xl shadow-2xl text-sm font-semibold transition-all duration-300 animate-[fadeInDown_0.3s_ease] ${
            toast.type === 'success'
              ? 'bg-green-950/95 border border-green-500/40 text-green-200'
              : 'bg-red-950/95 border border-red-500/40 text-red-200'
          }`}
          style={{ backdropFilter: 'blur(12px)' }}
        >
          {toast.type === 'success'
            ? <CheckCircle size={18} className="text-green-400 shrink-0" />
            : <XCircle size={18} className="text-red-400 shrink-0" />}
          {toast.message}
        </div>
      )}

      {/* ════════════════════════════════════════════
          LEFT PANEL – Branding / Visual
      ════════════════════════════════════════════ */}
      <div className="hidden lg:flex lg:w-[52%] relative flex-col justify-between overflow-hidden">

        {/* Garage background image */}
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: `url(${GarageBg})` }}
        />

        {/* Multi-layer gradient overlay for depth */}
        <div className="absolute inset-0 bg-gradient-to-br from-black/85 via-black/60 to-black/80" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_20%_50%,rgba(212,175,55,0.15)_0%,transparent_65%)]" />

        {/* Subtle gold grid lines */}
        <div
          className="absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage: `linear-gradient(rgba(212,175,55,1) 1px, transparent 1px),
                              linear-gradient(90deg, rgba(212,175,55,1) 1px, transparent 1px)`,
            backgroundSize: '64px 64px',
          }}
        />

        {/* Right edge separator */}
        <div className="absolute top-0 right-0 w-px h-full bg-gradient-to-b from-transparent via-gold/25 to-transparent" />

        {/* ── TOP: Logo bar ── */}
        <div className="relative z-10 flex items-center gap-3 p-10 pb-0">
          <div className="flex items-center gap-3 py-2 px-4 rounded-full bg-black/40 border border-white/10 backdrop-blur-md">
            <img src={Logo} alt="VALO" className="h-8 w-8 object-contain" />
            <div>
              <span className="text-white font-extrabold text-sm tracking-wide">VALO</span>
              <span className="text-gold text-xs font-semibold ml-1.5">Parking</span>
            </div>
          </div>
        </div>

        {/* ── CENTRE: Hero content ── */}
        <div className="relative z-10 flex-1 flex flex-col justify-center px-10">

          {/* Badge */}
          <div className="inline-flex items-center gap-2 py-1.5 px-4 rounded-full bg-gold/15 border border-gold/30 text-gold text-xs font-bold tracking-widest mb-7 uppercase w-fit backdrop-blur-sm">
            <Zap size={12} /> Smart Parking Platform
          </div>

          {/* Big headline */}
          <h2 className="text-5xl xl:text-6xl font-extrabold text-white leading-[1.1] mb-5 drop-shadow-2xl">
            Park Smarter.<br />
            <span className="bg-gradient-to-r from-yellow-400 via-amber-400 to-yellow-600 bg-clip-text text-transparent">
              Drive Faster.
            </span>
          </h2>

          <p className="text-gray-300/80 text-base leading-relaxed max-w-xs mb-8">
            Nhận diện biển số AI tức thì. Quản lý chỗ đỗ thời gian thực. Thanh toán một chạm.
          </p>

          {/* Feature badges */}
          <div className="flex flex-col gap-2.5 max-w-xs">
            <FeatureBadge icon={<Scan size={15} />} title="AI Gate Recognition" desc="Nhận diện biển số dưới 1 giây" />
            <FeatureBadge icon={<MapPin size={15} />} title="Real-time Parking Map" desc="Bản đồ chỗ đỗ trực tiếp" />
            <FeatureBadge icon={<ShieldCheck size={15} />} title="Secure Touchless Entry" desc="Cổng vào không chạm tay" />
          </div>
        </div>

        {/* ── BOTTOM: Brand card ── */}
        <div className="relative z-10 p-10 pt-0">
          <div className="flex items-center gap-4 p-4 rounded-2xl bg-black/40 border border-white/10 backdrop-blur-md w-fit">
            <img src={Logo} alt="VALO" className="h-11 w-11 object-contain drop-shadow-[0_0_12px_rgba(212,175,55,0.5)]" />
            <div>
              <p className="text-white font-bold text-sm">VALO Enterprise</p>
              <p className="text-gray-400 text-xs">Next-gen parking infrastructure</p>
            </div>
          </div>
        </div>
      </div>

      {/* ════════════════════════════════════════════
          RIGHT PANEL – Auth Form
      ════════════════════════════════════════════ */}
      <div className="w-full lg:w-[48%] flex flex-col items-center justify-center px-6 py-12 relative overflow-y-auto">

        {/* Subtle bg glow */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_60%_20%,rgba(212,175,55,0.07)_0%,transparent_65%)] pointer-events-none" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_80%_80%,rgba(212,175,55,0.04)_0%,transparent_50%)] pointer-events-none" />

        <div className="w-full max-w-[420px] relative z-10">

          {/* ── Mobile logo ── */}
          <div className="flex lg:hidden items-center gap-3 mb-8 justify-center">
            <img src={Logo} alt="VALO" className="h-10 object-contain" />
            <div>
              <span className="text-white font-extrabold text-base tracking-wide">VALO</span>
              <span className="text-gold text-sm font-semibold ml-1.5">Parking</span>
            </div>
          </div>

          {/* ── Greeting ── */}
          {!(isLogin && forgotStep) && mode === 'login' && (
            <div className="mb-7">
              <p className="text-gold text-xs font-bold tracking-widest uppercase mb-2">Chào mừng trở lại</p>
              <h1 className="text-3xl font-extrabold text-white">Đăng nhập tài khoản</h1>
              <p className="text-gray-500 text-sm mt-1.5">Truy cập hệ thống quản lý bãi đỗ xe VALO</p>
            </div>
          )}
          {!(isLogin && forgotStep) && mode === 'signup' && (
            <div className="mb-7">
              <p className="text-gold text-xs font-bold tracking-widest uppercase mb-2">Bắt đầu miễn phí</p>
              <h1 className="text-3xl font-extrabold text-white">Tạo tài khoản</h1>
              <p className="text-gray-500 text-sm mt-1.5">Tham gia VALO và trải nghiệm đỗ xe thông minh</p>
            </div>
          )}

          {/* ── Mode Toggle ── */}
          {!(isLogin && forgotStep) && (
            <div className="flex bg-white/[0.04] border border-white/10 rounded-xl p-1 mb-7">
              {['login', 'signup'].map((m) => (
                <button
                  key={m}
                  id={`tab-${m}`}
                  onClick={() => { setMode(m); setShowPassword(false); setShowConfirm(false); setSignupStep('form'); setOtpDigits(Array(6).fill('')); resetForgot(); }}
                  className={`flex-1 py-2.5 rounded-lg text-sm font-semibold transition-all duration-300 ${
                  mode === m
                    ? 'bg-gold text-charcoal shadow-lg shadow-gold/20'
                    : 'text-gray-400 hover:text-white'
                  }`}
              >
                {m === 'login' ? 'Đăng nhập' : 'Đăng ký'}
              </button>
            ))}
          </div>
          )}

          {isLogin && !forgotStep && (
            <>
              {/* ── Google Button ── */}
              <button
                id="btn-google-auth"
                onClick={handleGoogleAuth}
                className="w-full flex items-center justify-center gap-3 bg-white hover:bg-gray-50 text-gray-800 font-semibold py-3.5 rounded-xl transition-all duration-200 hover:shadow-lg hover:shadow-black/20 hover:-translate-y-0.5 active:scale-95 border border-gray-100 mb-5 text-sm"
              >
                <GoogleIcon />
                <span>Tiếp tục với Google</span>
              </button>

              {/* ── Divider ── */}
              <div className="flex items-center gap-3 mb-5">
                <div className="flex-1 h-px bg-white/8" />
                <span className="text-gray-600 text-xs font-medium tracking-wider">hoặc dùng email</span>
                <div className="flex-1 h-px bg-white/8" />
              </div>
            </>
          )}

          {/* ── Form / OTP Step / Forgot Password ── */}
          {isLogin && forgotStep === 'email' ? (
            <form onSubmit={handleForgotSendOTP} className="space-y-5" noValidate>
              <div className="text-center">
                <div className="w-16 h-16 rounded-full bg-gold/10 border border-gold/20 flex items-center justify-center mx-auto mb-4">
                  <Lock size={28} className="text-gold" />
                </div>
                <h2 className="text-xl font-bold text-white mb-2">Quên mật khẩu?</h2>
                <p className="text-gray-400 text-sm">Nhập email tài khoản để nhận mã OTP đặt lại mật khẩu.</p>
              </div>
              <div className="group">
                <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Email</label>
                <div className="relative">
                  <Mail size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-600 group-focus-within:text-gold transition-colors" />
                  <input
                    type="email"
                    required
                    placeholder="ban@example.com"
                    value={forgotEmail}
                    onChange={(e) => setForgotEmail(e.target.value)}
                    className="w-full bg-white/[0.06] border border-white/[0.12] focus:border-gold/50 rounded-xl pl-11 pr-4 py-3.5 text-white placeholder-gray-600 text-sm outline-none transition-all duration-200 focus:bg-white/[0.08] focus:shadow-[0_0_0_3px_rgba(212,175,55,0.08)]"
                  />
                </div>
              </div>
              <button
                type="submit"
                disabled={forgotLoading}
                className="w-full flex items-center justify-center gap-2 bg-gold hover:bg-gold-dark text-charcoal font-bold py-4 rounded-xl transition-all duration-200 hover:shadow-xl hover:shadow-gold/25 hover:-translate-y-0.5 active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed text-sm"
              >
                {forgotLoading ? (
                  <><svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>Đang gửi...</>
                ) : (<>Gửi mã OTP <ArrowRight size={16} /></>)}
              </button>
              <button type="button" onClick={resetForgot} className="w-full text-sm text-gray-500 hover:text-gray-300 transition-colors text-center">
                ← Quay lại đăng nhập
              </button>
            </form>
          ) : isLogin && forgotStep === 'otp' ? (
            <form onSubmit={handleForgotVerifyOTP} className="space-y-5" noValidate>
              <div className="text-center">
                <div className="w-16 h-16 rounded-full bg-gold/10 border border-gold/20 flex items-center justify-center mx-auto mb-4">
                  <Mail size={28} className="text-gold" />
                </div>
                <h2 className="text-xl font-bold text-white mb-2">Nhập mã OTP</h2>
                <p className="text-gray-400 text-sm leading-relaxed">
                  Mã xác nhận đã gửi đến<br /><span className="text-gold font-semibold">{forgotEmail}</span>
                </p>
              </div>
              <div className="flex gap-2 justify-center">
                {forgotOtpDigits.map((digit, i) => (
                  <input
                    key={i}
                    ref={(el) => (forgotOtpRefs.current[i] = el)}
                    type="text"
                    inputMode="numeric"
                    maxLength={6}
                    value={digit}
                    onChange={(e) => handleForgotOtpChange(i, e.target.value)}
                    onKeyDown={(e) => handleForgotOtpKeyDown(i, e)}
                    className="w-11 h-14 text-center text-xl font-bold bg-white/[0.06] border border-white/[0.12] focus:border-gold/50 rounded-xl text-white outline-none transition-all duration-200 focus:shadow-[0_0_0_3px_rgba(212,175,55,0.1)]"
                  />
                ))}
              </div>
              <button
                type="submit"
                disabled={forgotLoading || forgotOtpDigits.join('').length !== 6}
                className="w-full flex items-center justify-center gap-2 bg-gold hover:bg-gold-dark text-charcoal font-bold py-4 rounded-xl transition-all duration-200 hover:shadow-xl hover:shadow-gold/25 hover:-translate-y-0.5 active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed text-sm"
              >
                {forgotLoading ? (
                  <><svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>Đang xác minh...</>
                ) : (<>Xác minh OTP <ArrowRight size={16} /></>)}
              </button>
              <div className="flex items-center justify-between text-sm">
                <button type="button" onClick={() => setForgotStep('email')} className="text-gray-500 hover:text-gray-300 transition-colors">
                  ← Quay lại
                </button>
                <button type="button" onClick={handleForgotResendOTP} disabled={forgotLoading} className="text-gold hover:text-gold-light font-semibold transition-colors disabled:opacity-50">
                  Gửi lại mã
                </button>
              </div>
            </form>
          ) : isLogin && forgotStep === 'password' ? (
            <form onSubmit={handleForgotReset} className="space-y-5" noValidate>
              <div className="text-center">
                <div className="w-16 h-16 rounded-full bg-gold/10 border border-gold/20 flex items-center justify-center mx-auto mb-4">
                  <Lock size={28} className="text-gold" />
                </div>
                <h2 className="text-xl font-bold text-white mb-2">Tạo mật khẩu mới</h2>
                <p className="text-gray-400 text-sm">OTP đã xác minh. Nhập mật khẩu mới cho tài khoản của bạn.</p>
              </div>
              <div className="group">
                <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Mật khẩu mới</label>
                <div className="relative">
                  <Lock size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-600 group-focus-within:text-gold transition-colors" />
                  <input
                    type={showForgotNewPass ? 'text' : 'password'}
                    required
                    placeholder="••••••••"
                    value={forgotNewPass}
                    onChange={(e) => setForgotNewPass(e.target.value)}
                    className="w-full bg-white/[0.06] border border-white/[0.12] focus:border-gold/50 rounded-xl pl-11 pr-12 py-3.5 text-white placeholder-gray-600 text-sm outline-none transition-all duration-200 focus:bg-white/[0.08] focus:shadow-[0_0_0_3px_rgba(212,175,55,0.08)]"
                  />
                  <button type="button" onClick={() => setShowForgotNewPass(!showForgotNewPass)} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-600 hover:text-gray-300 transition-colors">
                    {showForgotNewPass ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>
              <div className="group">
                <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Xác nhận mật khẩu</label>
                <div className="relative">
                  <Lock size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-600 group-focus-within:text-gold transition-colors" />
                  <input
                    type={showForgotConfirmPass ? 'text' : 'password'}
                    required
                    placeholder="••••••••"
                    value={forgotConfirmPass}
                    onChange={(e) => setForgotConfirmPass(e.target.value)}
                    className="w-full bg-white/[0.06] border border-white/[0.12] focus:border-gold/50 rounded-xl pl-11 pr-12 py-3.5 text-white placeholder-gray-600 text-sm outline-none transition-all duration-200 focus:bg-white/[0.08] focus:shadow-[0_0_0_3px_rgba(212,175,55,0.08)]"
                  />
                  <button type="button" onClick={() => setShowForgotConfirmPass(!showForgotConfirmPass)} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-600 hover:text-gray-300 transition-colors">
                    {showForgotConfirmPass ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>
              <button
                type="submit"
                disabled={forgotLoading}
                className="w-full flex items-center justify-center gap-2 bg-gold hover:bg-gold-dark text-charcoal font-bold py-4 rounded-xl transition-all duration-200 hover:shadow-xl hover:shadow-gold/25 hover:-translate-y-0.5 active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed text-sm"
              >
                {forgotLoading ? (
                  <><svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>Đang cập nhật...</>
                ) : (<>Đặt lại mật khẩu <ArrowRight size={16} /></>)}
              </button>
              <div className="flex items-center justify-between text-sm">
                <button type="button" onClick={() => { setForgotStep('otp'); setForgotVerifiedOTP(''); }} className="text-gray-500 hover:text-gray-300 transition-colors">
                  ← Quay lại
                </button>
              </div>
            </form>
          ) : !isLogin && signupStep === 'otp' ? (
            <form onSubmit={handleVerifyOTP} className="space-y-6" noValidate>
              <div className="text-center">
                <div className="w-16 h-16 rounded-full bg-gold/10 border border-gold/20 flex items-center justify-center mx-auto mb-4">
                  <Mail size={28} className="text-gold" />
                </div>
                <h2 className="text-xl font-bold text-white mb-2">Verify Email</h2>
                <p className="text-gray-400 text-sm leading-relaxed">
                  Enter the 6-digit code sent to<br />
                  <span className="text-gold font-semibold">{registeredEmail}</span>
                </p>
              </div>

              <div className="flex gap-2 justify-center">
                {otpDigits.map((digit, i) => (
                  <input
                    key={i}
                    ref={(el) => (otpRefs.current[i] = el)}
                    type="text"
                    inputMode="numeric"
                    maxLength={6}
                    value={digit}
                    onChange={(e) => handleOtpChange(i, e.target.value)}
                    onKeyDown={(e) => handleOtpKeyDown(i, e)}
                    className="w-11 h-14 text-center text-xl font-bold bg-white/[0.06] border border-white/[0.12] focus:border-gold/50 rounded-xl text-white outline-none transition-all duration-200 focus:shadow-[0_0_0_3px_rgba(212,175,55,0.1)]"
                  />
                ))}
              </div>

              <button
                type="submit"
                disabled={otpLoading || otpDigits.join('').length !== 6}
                className="w-full flex items-center justify-center gap-2 bg-gold hover:bg-gold-dark text-charcoal font-bold py-4 rounded-xl transition-all duration-200 hover:shadow-xl hover:shadow-gold/25 hover:-translate-y-0.5 active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed text-sm"
              >
                {otpLoading ? (
                  <>
                    <svg className="animate-spin h-4 w-4 text-charcoal" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Đang xác minh...
                  </>
                ) : (
                  <>Xác minh Email <ArrowRight size={16} /></>
                )}
              </button>

              <div className="flex items-center justify-between text-sm">
                <button
                  type="button"
                  onClick={() => { setSignupStep('form'); setOtpDigits(Array(6).fill('')); }}
                  className="text-gray-500 hover:text-gray-300 transition-colors"
                >
                  ← Quay lại
                </button>
                <button
                  type="button"
                  onClick={handleResendOTP}
                  disabled={otpLoading}
                  className="text-gold hover:text-gold-light font-semibold transition-colors disabled:opacity-50"
                >
                  Gửi lại mã
                </button>
              </div>
            </form>
          ) : (
          <form onSubmit={handleSubmit} className="space-y-4" noValidate>

            {/* Full Name (signup only) */}
            {!isLogin && (
              <div className="group">
                <label htmlFor="name" className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                  Họ và tên
                </label>
                <div className="relative">
                  <User size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-600 group-focus-within:text-gold transition-colors" />
                  <input
                    id="name"
                    name="name"
                    type="text"
                    required={!isLogin}
                    placeholder="Nguyễn Văn A"
                    value={form.name}
                    onChange={handleChange}
                    className="w-full bg-white/[0.06] border border-white/[0.12] focus:border-gold/50 focus:bg-white/[0.08] rounded-xl pl-11 pr-4 py-3.5 text-white placeholder-gray-600 text-sm outline-none transition-all duration-200 focus:shadow-[0_0_0_3px_rgba(212,175,55,0.08)]"
                  />
                </div>
              </div>
            )}

            {/* Email */}
            <div className="group">
              <label htmlFor="email" className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                Email
              </label>
              <div className="relative">
                <Mail size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-600 group-focus-within:text-gold transition-colors" />
                <input
                  id="email"
                  name="email"
                  type="email"
                  required
                  placeholder="ban@example.com"
                  value={form.email}
                  onChange={handleChange}
                  className="w-full bg-white/[0.06] border border-white/[0.12] focus:border-gold/50 focus:bg-white/[0.08] rounded-xl pl-11 pr-4 py-3.5 text-white placeholder-gray-600 text-sm outline-none transition-all duration-200 focus:shadow-[0_0_0_3px_rgba(212,175,55,0.08)]"
                />
              </div>
            </div>

            {/* Password */}
            <div className="group">
              <label htmlFor="password" className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                Mật khẩu
              </label>
              <div className="relative">
                <Lock size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-600 group-focus-within:text-gold transition-colors" />
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  placeholder="••••••••"
                  value={form.password}
                  onChange={handleChange}
                  className="w-full bg-white/[0.06] border border-white/[0.12] focus:border-gold/50 rounded-xl pl-11 pr-12 py-3.5 text-white placeholder-gray-600 text-sm outline-none transition-all duration-200 focus:bg-white/[0.08] focus:shadow-[0_0_0_3px_rgba(212,175,55,0.08)]"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-600 hover:text-gray-300 transition-colors"
                  aria-label="Toggle password visibility"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {/* Confirm Password (signup only) */}
            {!isLogin && (
              <div className="group">
                <label htmlFor="confirm" className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                  Xác nhận mật khẩu
                </label>
                <div className="relative">
                  <Lock size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-600 group-focus-within:text-gold transition-colors" />
                  <input
                    id="confirm"
                    name="confirm"
                    type={showConfirm ? 'text' : 'password'}
                    required={!isLogin}
                    placeholder="••••••••"
                    value={form.confirm}
                    onChange={handleChange}
                    className="w-full bg-white/[0.06] border border-white/[0.12] focus:border-gold/50 rounded-xl pl-11 pr-12 py-3.5 text-white placeholder-gray-600 text-sm outline-none transition-all duration-200 focus:bg-white/[0.08] focus:shadow-[0_0_0_3px_rgba(212,175,55,0.08)]"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirm(!showConfirm)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-600 hover:text-gray-300 transition-colors"
                    aria-label="Toggle confirm password visibility"
                  >
                    {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>
            )}

            {/* Forgot password (login only) */}
            {isLogin && !forgotStep && (
              <div className="flex justify-end -mt-1">
                <button
                  type="button"
                  onClick={() => { setForgotStep('email'); setForgotEmail(form.email); }}
                  className="text-xs text-gray-500 hover:text-gold transition-colors font-medium"
                >
                  Quên mật khẩu?
                </button>
              </div>
            )}

            {/* Submit button */}
            <button
              id="btn-submit-auth"
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 bg-gold hover:bg-gold-dark text-charcoal font-bold py-4 rounded-xl transition-all duration-200 hover:shadow-xl hover:shadow-gold/30 hover:-translate-y-0.5 active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed mt-2 text-sm"
            >
              {loading ? (
                <>
                  <svg className="animate-spin h-4 w-4 text-charcoal" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  {isLogin ? 'Đang đăng nhập…' : 'Đang tạo tài khoản…'}
                </>
              ) : (
                <>
                  {isLogin ? 'Đăng nhập' : 'Tạo tài khoản'}
                  <ArrowRight size={16} />
                </>
              )}
            </button>
          </form>
          )}

          {/* ── Terms (signup only) ── */}
          {!isLogin && signupStep === 'form' && (
            <p className="text-center text-xs text-gray-600 mt-4 leading-relaxed">
              Bằng cách tạo tài khoản, bạn đồng ý với{' '}
              <button className="text-gold hover:underline">Điều khoản dịch vụ</button>{' '}
              và{' '}
              <button className="text-gold hover:underline">Chính sách bảo mật</button>.
            </p>
          )}

          {/* ── Switch mode ── */}
          <p className="text-center text-sm text-gray-500 mt-5">
            {isLogin ? 'Chưa có tài khoản? ' : 'Đã có tài khoản? '}
            <button
              onClick={() => { setMode(isLogin ? 'signup' : 'login'); setShowPassword(false); setShowConfirm(false); setSignupStep('form'); setOtpDigits(Array(6).fill('')); }}
              className="text-gold hover:text-gold-light font-bold transition-colors"
            >
              {isLogin ? 'Đăng ký ngay' : 'Đăng nhập'}
            </button>
          </p>

          {/* ── Back to home ── */}
          <div className="flex justify-center mt-6">
            <Link to="/" className="text-xs text-gray-600 hover:text-gold transition-colors flex items-center gap-1.5 group">
              <span className="group-hover:-translate-x-0.5 transition-transform">←</span> Về trang chủ VALO
            </Link>
          </div>
        </div>
      </div>

    </div>
  );
}
