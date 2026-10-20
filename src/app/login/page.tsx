import { Suspense } from 'react';
import { Loader2 } from 'lucide-react';
import LoginClient from '@/components/loginClient';

export const metadata = {
  title: 'Sign In | VetoAxis',
  description: 'Sign in to your VetoAxis lead workspace.'
};

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="app-canvas flex h-screen w-full items-center justify-center bg-background">
        <Loader2 className="h-5 w-5 animate-spin text-primary" />
      </div>
    }>
      <LoginClient />
    </Suspense>
  );
}
