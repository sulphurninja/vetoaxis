'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Loader2,
  Mail,
  Lock,
  AlertCircle,
  ArrowRight,
  Info,
  Eye,
  EyeOff,
  ShieldCheck,
  Copy,
  BarChart3,
} from 'lucide-react';
import { motion } from 'framer-motion';

const HIGHLIGHTS = [
  { icon: Copy, title: 'Duplicate protection', body: 'Name, phone, email, address, and witness checks before anything saves.' },
  { icon: ShieldCheck, title: 'Verified contact data', body: 'Genuine 10-digit US numbers only. Junk and sequential numbers are rejected.' },
  { icon: BarChart3, title: 'Pipeline clarity', body: 'Live status breakdowns, vendor codes, and full activity history.' },
];

export default function LoginClient() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);
  const { login, loading, error, user } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get('from') || '/dashboard';

  useEffect(() => {
    if (user) {
      router.push(redirectTo);
    }
  }, [user, router, redirectTo]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError(null);

    try {
      await login(email, password);
      window.location.href = redirectTo;
    } catch (err: any) {
      setLoginError(err.message || 'Failed to login. Please try again.');
    }
  };

  return (
    <div className="grid min-h-screen bg-background lg:grid-cols-[1.05fr_1fr]">
      <aside className="relative hidden overflow-hidden bg-[oklch(0.24_0.045_190)] p-12 text-white lg:flex lg:flex-col">
        <div className="pointer-events-none absolute inset-0" aria-hidden>
          <div className="absolute -left-24 -top-24 size-[460px] rounded-full bg-[oklch(0.62_0.13_178)] opacity-30 blur-[110px]" />
          <div className="absolute -bottom-32 right-[-80px] size-[420px] rounded-full bg-[oklch(0.6_0.14_230)] opacity-25 blur-[120px]" />
          <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.04)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.04)_1px,transparent_1px)] bg-[size:44px_44px] [mask-image:radial-gradient(ellipse_at_center,black_30%,transparent_75%)]" />
        </div>

        <div className="relative flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-xl bg-white/10 ring-1 ring-white/20 backdrop-blur">
            <img src="/logo.png" alt="" className="size-6 object-contain" />
          </div>
          <div className="leading-tight">
            <p className="font-bold tracking-tight">VetoAxis</p>
            <p className="text-xs text-white/60">Lead CRM</p>
          </div>
        </div>

        <div className="relative mt-auto max-w-md space-y-8">
          <div className="space-y-3">
            <h2 className="text-[34px] font-bold leading-[1.15] tracking-tight">
              Clean leads in.<br />
              <span className="bg-gradient-to-r from-[oklch(0.86_0.12_170)] to-[oklch(0.82_0.1_215)] bg-clip-text text-transparent">Confident decisions out.</span>
            </h2>
            <p className="text-[15px] text-white/65">
              One workspace for intake, verification, and vendor routing, built for teams that care about data quality.
            </p>
          </div>

          <ul className="space-y-4">
            {HIGHLIGHTS.map(({ icon: Icon, title, body }, index) => (
              <motion.li
                key={title}
                initial={{ opacity: 0, x: -12 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.15 + index * 0.08, duration: 0.4 }}
                className="flex gap-3.5"
              >
                <span className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-lg bg-white/10 ring-1 ring-white/15">
                  <Icon className="size-4 text-[oklch(0.86_0.12_170)]" />
                </span>
                <div>
                  <p className="text-sm font-semibold">{title}</p>
                  <p className="text-[13px] text-white/60">{body}</p>
                </div>
              </motion.li>
            ))}
          </ul>
        </div>

        <p className="relative mt-12 text-xs text-white/40">© {new Date().getFullYear()} VetoAxis Systems</p>
      </aside>

      <main className="app-canvas flex items-center justify-center p-6 sm:p-10">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="w-full max-w-[400px]"
        >
          <div className="mb-8 flex items-center gap-3 lg:hidden">
            <div className="flex size-10 items-center justify-center rounded-xl bg-primary/10 ring-1 ring-primary/20">
              <img src="/logo.png" alt="" className="size-6 object-contain" />
            </div>
            <p className="text-lg font-bold tracking-tight">VetoAxis</p>
          </div>

          <div className="space-y-1.5">
            <h1 className="text-2xl font-bold tracking-tight text-foreground">Sign in</h1>
            <p className="text-sm text-muted-foreground">Welcome back. Enter your work credentials to continue.</p>
          </div>

          {searchParams.get('from') && !(loginError || error) && (
            <div className="mt-6 flex items-center gap-2.5 rounded-lg border border-chart-2/25 bg-chart-2/8 px-3.5 py-2.5 text-[13px] text-foreground">
              <Info className="size-4 shrink-0 text-chart-2" />
              Please sign in to continue to that page.
            </div>
          )}

          {(loginError || error) && (
            <div role="alert" className="mt-6 flex items-start gap-2.5 rounded-lg border border-destructive/25 bg-destructive/8 px-3.5 py-2.5 text-[13px] text-destructive">
              <AlertCircle className="mt-0.5 size-4 shrink-0" />
              {loginError || error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <div className="relative">
                <Mail className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  autoComplete="email"
                  placeholder="name@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="h-11 pl-10"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Lock className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="h-11 pl-10 pr-11"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(v => !v)}
                  className="absolute right-2 top-1/2 flex size-8 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>
            </div>

            <Button type="submit" className="mt-2 h-11 w-full text-[15px]" disabled={loading}>
              {loading ? <Loader2 className="size-4 animate-spin" /> : <>Sign in <ArrowRight className="size-4" /></>}
            </Button>
          </form>

          <p className="mt-8 flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
            <ShieldCheck className="size-3.5" /> Protected by session-based authentication
          </p>
        </motion.div>
      </main>
    </div>
  );
}
