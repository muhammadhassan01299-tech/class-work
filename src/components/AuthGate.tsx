import React, { useState } from 'react';
import { Eye, EyeOff, Lock, UserPlus, LogIn } from 'lucide-react';
import { ResilientImage } from './ResilientImage';
import { useMedia } from '../context/MediaContext';
import { useSiteData } from '../context/SiteDataContext';
import { errorMessage } from '../utils/api';
import {
  registerAccount,
  signIn,
  validateRegistration,
  type AuthSession,
} from '../utils/authStore';
import { DEFAULT_IMAGES } from '../data/siteConfig';

type LockMode = 'signup' | 'login';

interface WebsiteLockScreenProps {
  onUnlock: (session: AuthSession) => void;
}

export function WebsiteLockScreen({ onUnlock }: WebsiteLockScreenProps) {
  const { logoUrl, resolveImage } = useMedia();
  const { brandConfig } = useSiteData();

  // New visitors create an account first (owner's requirement), returning visitors sign in.
  const [mode, setMode] = useState<LockMode>('signup');
  const [fullName, setFullName] = useState('');
  const [emailOrUser, setEmailOrUser] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const resetMessages = (nextMode: LockMode) => {
    setMode(nextMode);
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy) return;
    setError(null);

    try {
      setBusy(true);
      if (mode === 'signup') {
        const input = { fullName, email: emailOrUser, phone, password };
        const validation = validateRegistration(input);
        if (validation) {
          setError(validation);
          return;
        }
        onUnlock(await registerAccount(input));
        return;
      }
      onUnlock(await signIn(emailOrUser, password));
    } catch (err) {
      setError(errorMessage(err, 'Unable to continue. Please try again.'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col justify-center relative overflow-hidden py-10 px-4 sm:px-6 lg:px-8">
      {/* Scenic Alpine Background */}
      <div aria-hidden="true" className="absolute inset-0 z-0">
        <ResilientImage
          src={resolveImage('heroNaran', DEFAULT_IMAGES.heroNaran)}
          alt="Northern Pakistan mountain valley backdrop"
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-br from-[#03045E]/88 via-[#023E8A]/75 to-[#0077B6]/78" />
      </div>

      <div className="relative z-10 max-w-5xl w-full mx-auto">
        {/* Top Brand Row */}
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-3">
            {logoUrl && (
              <img
                src={logoUrl}
                alt={`${brandConfig.companyName} logo`}
                className="h-11 w-auto max-w-[130px] object-contain rounded-xl bg-white/95 p-1 shadow"
              />
            )}
            <span className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
              {brandConfig.companyName}
            </span>
          </div>

          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-2xl bg-white/15 border border-[#90E0EF]/50 text-[#CAF0F8] text-xs font-bold">
            <Lock className="w-3.5 h-3.5 text-[#48CAE4]" aria-hidden="true" />
            <span>Website Locked · Sign Up or Sign In to Continue</span>
          </div>
        </div>

        {/* Main Frosted Glass Gate Card */}
        <div className="glass-card rounded-3xl overflow-hidden bg-white/95 grid grid-cols-1 lg:grid-cols-12 shadow-2xl">
          {/* Left Scenic Intro (Desktop left, Mobile below form) */}
          <div className="order-2 lg:order-1 lg:col-span-5 relative overflow-hidden h-56 sm:h-64 lg:h-auto lg:min-h-[560px]">
            <ResilientImage
              src={resolveImage('fairyMeadows', DEFAULT_IMAGES.fairyMeadows)}
              alt="Fairy Meadows and Nanga Parbat peak"
              className="absolute inset-0 w-full h-full object-cover"
            />
            <div
              aria-hidden="true"
              className="absolute inset-0 bg-gradient-to-t from-[#03045E]/95 via-[#03045E]/55 to-transparent"
            />
            <div className="relative z-10 h-full flex flex-col justify-end p-6 sm:p-7 text-white space-y-2.5">
              <p className="text-xs font-bold text-[#90E0EF]">
                {brandConfig.companyName} Access Portal · {brandConfig.ownerName} Desk
              </p>
              <h2 className="text-xl sm:text-3xl font-bold text-white leading-snug">
                Explore Naran, Hunza, Skardu &amp; Neelum Valley in Comfort.
              </h2>
              <p className="hidden sm:block text-sm text-[#CAF0F8]/90 leading-relaxed">
                Create your traveller account first to unlock all Pakistan destinations, By-Road &amp;
                By-Air PKR calculators, and booking tools.
              </p>
            </div>
          </div>

          {/* Right Account / Lock Form */}
          <div className="order-1 lg:order-2 lg:col-span-7 p-6 sm:p-10 flex flex-col justify-center">
            {/* 3-Mode Tab Bar */}
            <div
              role="tablist"
              aria-label="Unlock options"
              className="grid grid-cols-2 p-1 rounded-2xl bg-[#CAF0F8] border border-[#90E0EF] mb-6 gap-1"
            >
              <button
                type="button"
                role="tab"
                aria-selected={mode === 'signup'}
                onClick={() => resetMessages('signup')}
                className={`py-2.5 px-1.5 sm:px-2.5 rounded-xl text-[11px] sm:text-sm font-bold flex items-center justify-center gap-1 sm:gap-1.5 transition-colors whitespace-nowrap ${
                  mode === 'signup'
                    ? 'bg-[#023E8A] text-white shadow'
                    : 'text-[#03045E] hover:bg-white/50'
                }`}
              >
                <UserPlus className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                <span>Create Account</span>
              </button>

              <button
                type="button"
                role="tab"
                aria-selected={mode === 'login'}
                onClick={() => resetMessages('login')}
                className={`py-2.5 px-1.5 sm:px-2.5 rounded-xl text-[11px] sm:text-sm font-bold flex items-center justify-center gap-1 sm:gap-1.5 transition-colors whitespace-nowrap ${
                  mode === 'login'
                    ? 'bg-[#023E8A] text-white shadow'
                    : 'text-[#03045E] hover:bg-white/50'
                }`}
              >
                <LogIn className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                <span>Sign In</span>
              </button>

            </div>

            <div className="mb-5">
              <h1 className="text-2xl sm:text-3xl font-bold text-[#03045E]">
                {mode === 'signup' && 'Create Account to Unlock'}
                {mode === 'login' && 'Sign In to Unlock'}
              </h1>
              <p className="text-sm text-[#0077B6] mt-1">
                {mode === 'signup' &&
                  'First-time visitors must create an account before opening the website.'}
                {mode === 'login' &&
                  'Sign in using your registered traveller email and password.'}
              </p>
            </div>

            {error && (
              <div
                role="alert"
                className="mb-4 p-3.5 rounded-xl bg-[#CAF0F8] border border-[#023E8A] text-sm font-semibold text-[#03045E]"
              >
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              {mode === 'signup' && (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label
                        htmlFor="lock-fullname"
                        className="block text-sm font-bold text-[#023E8A] mb-1"
                      >
                        Full Name
                      </label>
                      <input
                        id="lock-fullname"
                        type="text"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        placeholder="Your full name"
                        className="w-full px-4 py-3 rounded-xl border border-[#90E0EF] bg-white text-[#03045E] focus:outline-none focus:border-[#0077B6]"
                      />
                    </div>
                    <div>
                      <label
                        htmlFor="lock-phone"
                        className="block text-sm font-bold text-[#023E8A] mb-1"
                      >
                        Phone / WhatsApp (Optional)
                      </label>
                      <input
                        id="lock-phone"
                        type="tel"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="03XX-XXXXXXX"
                        className="w-full px-4 py-3 rounded-xl border border-[#90E0EF] bg-white text-[#03045E] focus:outline-none focus:border-[#0077B6]"
                      />
                    </div>
                  </div>

                  <div>
                    <label
                      htmlFor="lock-signup-email"
                      className="block text-sm font-bold text-[#023E8A] mb-1"
                    >
                      Email Address
                    </label>
                    <input
                      id="lock-signup-email"
                      type="email"
                      value={emailOrUser}
                      onChange={(e) => setEmailOrUser(e.target.value)}
                      placeholder="you@example.com"
                      className="w-full px-4 py-3 rounded-xl border border-[#90E0EF] bg-white text-[#03045E] focus:outline-none focus:border-[#0077B6]"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="lock-signup-password"
                      className="block text-sm font-bold text-[#023E8A] mb-1"
                    >
                      Password
                    </label>
                    <div className="relative">
                      <input
                        id="lock-signup-password"
                        type={showPassword ? 'text' : 'password'}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Minimum 6 characters"
                        className="w-full px-4 py-3 pr-11 rounded-xl border border-[#90E0EF] bg-white text-[#03045E] focus:outline-none focus:border-[#0077B6]"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword((prev) => !prev)}
                        aria-label="Toggle password visibility"
                        aria-pressed={showPassword}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-[#0077B6]"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                </>
              )}

              {mode === 'login' && (
                <>
                  <div>
                    <label
                      htmlFor="lock-login-email"
                      className="block text-sm font-bold text-[#023E8A] mb-1"
                    >
                      Email Address or Username
                    </label>
                    <input
                      id="lock-login-email"
                      type="text"
                      value={emailOrUser}
                      onChange={(e) => setEmailOrUser(e.target.value)}
                      placeholder="you@example.com"
                      className="w-full px-4 py-3 rounded-xl border border-[#90E0EF] bg-white text-[#03045E] focus:outline-none focus:border-[#0077B6]"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="lock-login-password"
                      className="block text-sm font-bold text-[#023E8A] mb-1"
                    >
                      Password
                    </label>
                    <div className="relative">
                      <input
                        id="lock-login-password"
                        type={showPassword ? 'text' : 'password'}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Enter your password"
                        className="w-full px-4 py-3 pr-11 rounded-xl border border-[#90E0EF] bg-white text-[#03045E] focus:outline-none focus:border-[#0077B6]"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword((prev) => !prev)}
                        aria-label="Toggle password visibility"
                        aria-pressed={showPassword}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-[#0077B6]"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                </>
              )}

              <button
                type="submit"
                disabled={busy}
                className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-[#023E8A] to-[#0077B6] text-white text-sm font-bold glossy-btn disabled:opacity-60"
              >
                {busy && 'Please wait…'}
                {!busy && mode === 'signup' && 'Create Account & Open Website'}
                {!busy && mode === 'login' && 'Sign In & Open Website'}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
