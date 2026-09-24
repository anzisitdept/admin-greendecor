'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Leaf, AlertCircle, Eye, EyeOff } from 'lucide-react';
import { useAdminAuthStore } from '@/lib/store/useAdminAuthStore';
import { Button } from '@/components/admin/Button';

export default function AdminLoginPage() {
  const router = useRouter();
  const { login, isAdmin, isAuthReady, adminUser, loginError, clearLoginError } = useAdminAuthStore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    if (isAuthReady && isAdmin && adminUser) {
      router.replace('/admin/dashboard');
    }
  }, [isAuthReady, isAdmin, adminUser, router]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    if (!email || !password) {
      setFormError('Enter your email and password.');
      return;
    }
    setBusy(true);
    const result = await login(email, password);
    setBusy(false);
    if (result.success) {
      router.replace('/admin/dashboard');
    } else {
      setFormError(result.message);
    }
  };

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-[#14402a] p-6 text-white">
      <div className="pointer-events-none absolute -left-32 -top-32 h-96 w-96 rounded-full bg-[#d47343]/15 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-40 -right-24 h-[28rem] w-[28rem] rounded-full bg-white/5 blur-3xl" />

      <div className="relative z-10 flex w-full max-w-md flex-col items-center text-center">
        <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/10 ring-1 ring-white/10">
          <Leaf className="h-7 w-7" />
        </span>
        <p className="mt-4 font-serif text-2xl">Green Decor</p>
        <p className="mt-1 text-[10px] uppercase tracking-[0.3em] text-white/50">Admin Panel</p>
        <p className="mt-4 font-script text-3xl text-[#d47343]">Nature’s touch</p>

        <div className="mt-8 w-full rounded-3xl border border-[#e5ece3] bg-white p-8 text-left text-[#172b21] card-shadow">
          <h1 className="font-serif text-2xl text-[#172b21]">Welcome back</h1>
          <p className="mt-1 text-sm text-[#52685a]">Sign in to manage your store.</p>

          <form onSubmit={onSubmit} className="mt-6 space-y-4">
            {(formError || loginError) && (
              <div className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-700">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                {formError || loginError}
              </div>
            )}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-[#172b21]">
                Email
              </label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setFormError(null);
                  clearLoginError();
                }}
                className="mt-1 h-11 w-full rounded-xl border border-[#e5ece3] bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#14402a]/30"
                placeholder="admin@greendecor.pk"
              />
            </div>
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-[#172b21]">
                Password
              </label>
              <div className="relative mt-1">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    setFormError(null);
                    clearLoginError();
                  }}
                  className="h-11 w-full rounded-xl border border-[#e5ece3] bg-white px-3 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-[#14402a]/30"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#52685a] hover:text-[#172b21]"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            <Button type="submit" fullWidth size="lg" loading={busy} disabled={!isAuthReady}>
              Sign in
            </Button>
          </form>

          <p className="mt-5 text-center text-xs text-[#52685a]">
            First time? Create the admin account with{' '}
            <code className="rounded bg-[#f4f7f2] px-1 py-0.5">npm run seed:admin</code>
          </p>
        </div>

        <p className="mt-8 text-xs text-white/50">
          © {new Date().getFullYear()} Green Decor Botanical Studio — Admin Panel
        </p>
      </div>
    </div>
  );
}