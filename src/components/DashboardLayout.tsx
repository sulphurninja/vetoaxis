'use client';

import { ReactNode, useEffect } from 'react';
import Image from 'next/image';
import { AppSidebar } from "@/components/app-sidebar";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { SiteHeader } from "@/components/site-header";
import { useAuth } from '@/contexts/AuthContext';
import { Loader2 } from 'lucide-react';
import { usePathname, useRouter } from 'next/navigation';

export default function DashboardLayout({ children, hideSidebar }: { children: ReactNode, hideSidebar?: boolean }) {
  const { user, loading: authLoading, authChecked } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!authLoading && authChecked && !user) {
      const target = `/login?from=${encodeURIComponent(pathname)}`;
      router.replace(target);
    }
  }, [authLoading, authChecked, user, pathname, router]);

  if (authLoading || (authChecked && !user)) {
    return (
      <div className="app-canvas flex h-screen w-full flex-col items-center justify-center gap-4 bg-background">
        <div className="flex size-12 items-center justify-center rounded-xl bg-primary/10 ring-1 ring-primary/20">
          <Image src="/logo.png" width={26} height={26} alt="VetoAxis" />
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin text-primary" />
          Loading your workspace…
        </div>
      </div>
    );
  }

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full">
        {!hideSidebar && <AppSidebar />}

        <SidebarInset className="flex flex-col overflow-x-hidden bg-background">
          <SiteHeader />

          <main className="app-canvas flex h-full w-full min-w-0 flex-1 flex-col overflow-x-hidden overflow-y-auto">
            <div className="mx-auto w-full max-w-[1480px] px-4 py-6 md:px-8 md:py-8">
              {children}
            </div>
          </main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
