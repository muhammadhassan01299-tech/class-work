import React, { useEffect, useState } from 'react';
import { Eye, EyeOff, ShieldCheck } from 'lucide-react';
import { MediaUploaderModal } from '../components/MediaUploaderModal';
import { useMedia } from '../context/MediaContext';
import { useSiteData } from '../context/SiteDataContext';
import { api, ApiError, errorMessage } from '../utils/api';
import { AdminPage } from './AdminPage';

type Phase = 'checking' | 'signed-out' | 'signed-in';

/** Hidden admin area, reachable only by typing /admin in the address bar. */
export default function AdminApp() {
  const [phase, setPhase] = useState<Phase>('checking');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const { setCanEdit } = useMedia();
  const { loadAdminData } = useSiteData();

  const enter = async () => {
    setCanEdit(true);
    try {
      await loadAdminData();
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        setCanEdit(false);
        setPhase('signed-out');
        return;
      }
      setError(errorMessage(err));
    }
    setPhase('signed-in');
  };

  useEffect(() => {
    api('GET', '/api/admin/me')
      .then(() => enter())
      .catch(() => setPhase('signed-out'));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      await api('POST', '/api/admin/login', { username, password });
      setPassword('');
      await enter();
    } catch (err) {
      setError(errorMessage(err, 'Login failed.'));
    } finally {
      setBusy(false);
    }
  };

  const handleLogout = async () => {
    try {
      await api('POST', '/api/admin/logout');
    } catch {
      // ignore; cookie expires on its own
    }
    setCanEdit(false);
    window.location.assign('/');
  };

  if (phase === 'checking') {
    return (
      <div className="min-h-screen flex items-center justify-center text-[#023E8A] font-semibold" role="status">
        Loading…
      </div>
    );
  }

  if (phase === 'signed-in') {
    return (
      <>
        <AdminPage onExit={() => window.location.assign('/')} onLogout={handleLogout} />
        <MediaUploaderModal />
      </>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-16">
      <div className="glass-card rounded-3xl p-7 sm:p-9 bg-white/95 shadow-2xl space-y-6 w-full max-w-md">
        <div className="text-center space-y-2">
          <div className="w-14 h-14 rounded-2xl bg-[#CAF0F8] border border-[#00B4D8] flex items-center justify-center mx-auto text-[#023E8A]">
            <ShieldCheck className="w-7 h-7" aria-hidden="true" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-[#03045E]">Admin Login</h1>
        </div>

        {error && (
          <div role="alert" className="p-3 rounded-xl bg-[#CAF0F8] border border-[#023E8A] text-sm font-semibold text-[#03045E]">
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label htmlFor="admin-username" className="block text-sm font-bold text-[#023E8A] mb-1">Username</label>
            <input id="admin-username" type="text" autoComplete="username" value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-[#90E0EF] bg-white text-[#03045E] focus:outline-none focus:border-[#0077B6]" />
          </div>
          <div>
            <label htmlFor="admin-password" className="block text-sm font-bold text-[#023E8A] mb-1">Password</label>
            <div className="relative">
              <input id="admin-password" type={showPassword ? 'text' : 'password'} autoComplete="current-password" value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 pr-11 rounded-xl border border-[#90E0EF] bg-white text-[#03045E] focus:outline-none focus:border-[#0077B6]" />
              <button type="button" onClick={() => setShowPassword((p) => !p)} aria-label="Toggle password visibility" aria-pressed={showPassword}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#0077B6]">
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>
          <button type="submit" disabled={busy}
            className="w-full py-3 rounded-2xl bg-gradient-to-r from-[#023E8A] to-[#0077B6] text-white text-sm font-bold glossy-btn disabled:opacity-60">
            {busy ? 'Signing in…' : 'Sign In'}
          </button>
        </form>
      </div>
    </div>
  );
}
