'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ArrowRight, BarChart3, Copy, ShieldCheck } from 'lucide-react';

const FEATURES = [
  { icon: Copy, title: 'Duplicate protection', body: 'Name, phone, email, address, and witness checks block repeats before they save.' },
  { icon: ShieldCheck, title: 'Genuine contact data', body: 'Strict 10-digit US phone validation rejects junk and sequential numbers.' },
  { icon: BarChart3, title: 'Pipeline clarity', body: 'Live status breakdowns, vendor codes, and full activity history.' },
];

export default function Home() {
  return (
    <div className="app-canvas flex min-h-screen flex-col bg-background text-foreground">
      <header className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-5">
        <div className="flex items-center gap-2.5">
          <div className="flex size-9 items-center justify-center rounded-xl bg-primary/10 ring-1 ring-primary/20">
            <img src="/logo.png" alt="" className="size-5 object-contain" />
          </div>
          <span className="font-bold tracking-tight">VetoAxis</span>
        </div>
        <Button asChild variant="outline" size="sm">
          <Link href="/login">Sign in</Link>
        </Button>
      </header>

      <main className="relative flex-1">
        <div className="pointer-events-none absolute inset-0 -z-10 bg-[linear-gradient(to_right,color-mix(in_oklch,var(--foreground)_6%,transparent)_1px,transparent_1px),linear-gradient(to_bottom,color-mix(in_oklch,var(--foreground)_6%,transparent)_1px,transparent_1px)] bg-[size:44px_44px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_60%,transparent_100%)]" aria-hidden />

        <section className="mx-auto max-w-4xl px-6 pb-16 pt-20 text-center md:pt-28">
          <span className="inline-flex items-center gap-2 rounded-full border bg-card px-3 py-1 text-xs font-medium text-muted-foreground shadow-xs">
            <span className="size-1.5 rounded-full bg-primary" /> Lead intake and verification
          </span>
          <h1 className="mt-6 text-4xl font-extrabold leading-[1.08] tracking-tight sm:text-5xl md:text-6xl">
            Clean leads in.{' '}
            <span className="bg-gradient-to-r from-primary to-chart-2 bg-clip-text text-transparent">Confident decisions out.</span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-base leading-relaxed text-muted-foreground md:text-lg">
            VetoAxis keeps your pipeline accurate from first contact to payout, with built-in duplicate checks, verified phone numbers, and vendor routing.
          </p>
          <div className="mt-10 flex justify-center">
            <Button asChild size="lg" className="h-12 px-7 text-[15px]">
              <Link href="/login">Go to workspace <ArrowRight className="h-4 w-4" /></Link>
            </Button>
          </div>
        </section>

        <section className="mx-auto grid max-w-5xl grid-cols-1 gap-4 px-6 pb-24 md:grid-cols-3">
          {FEATURES.map(({ icon: Icon, title, body }) => (
            <div key={title} className="surface p-6">
              <span className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary ring-1 ring-primary/15">
                <Icon className="size-5" />
              </span>
              <h3 className="mt-4 font-semibold">{title}</h3>
              <p className="mt-1.5 text-sm text-muted-foreground">{body}</p>
            </div>
          ))}
        </section>
      </main>

      <footer className="border-t py-6 text-center text-xs text-muted-foreground">
        © {new Date().getFullYear()} VetoAxis Systems
      </footer>
    </div>
  );
}
