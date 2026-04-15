'use client';

// app/module-picker/page.tsx
//  "On login, if a user has access to both modules they hit a picker screen
//       ('continue to RA / continue to PC'). Single-module users go straight in."

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth/auth-context';
import { AuthGuard } from '@/components/auth/auth-guard';
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { FileTextIcon, CreditCardIcon, ArrowRightIcon } from 'lucide-react';

function ModulePickerContent() {
  const { user, setActiveModule } = useAuth();
  const router = useRouter();

  // Auto-redirect if user has only one module
  useEffect(() => {
    if (user && user.modules.length === 1) {
      setActiveModule(user.modules[0]);
      router.replace(`/${user.modules[0]}/dashboard`);
    }
  }, [user, router, setActiveModule]);

  const handleModuleSelect = (module: 'ra' | 'pc') => {
    setActiveModule(module);
    router.push(`/${module}/dashboard`);
  };

  if (!user || user.modules.length === 1) return null;

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-background via-background to-muted/30 px-4">
      <div className="mb-10 text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-lg">
          <span className="text-2xl font-bold">A</span>
        </div>
        <h1 className="text-3xl font-bold tracking-tight">Choose Your Module</h1>
        <p className="mt-2 text-muted-foreground">Select a module to continue</p>
      </div>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 max-w-2xl w-full">
        {/* RA Card */}
        <button onClick={() => handleModuleSelect('ra')} className="text-left group">
          <Card
            id="module-ra"
            className="relative overflow-hidden border-border/50 transition-all duration-300 hover:shadow-xl hover:border-primary/30 hover:-translate-y-1 cursor-pointer h-full"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-blue-600/10 opacity-0 group-hover:opacity-100 transition-opacity" />
            <CardHeader className="relative space-y-4 p-8">
              <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400">
                <FileTextIcon className="h-7 w-7" />
              </div>
              <div>
                <CardTitle className="text-xl font-semibold flex items-center gap-2">
                  Research Analyst
                  <ArrowRightIcon className="h-4 w-4 opacity-0 group-hover:opacity-100 transition-all group-hover:translate-x-1" />
                </CardTitle>
                <CardDescription className="mt-2 text-sm leading-relaxed">
                  Generate comprehensive research Analyst reports with AI-powered analysis and insights.
                </CardDescription>
              </div>
              <span className="inline-flex items-center rounded-full bg-blue-500/10 px-3 py-1 text-xs font-medium text-blue-600 dark:text-blue-400">
                RA Module
              </span>
            </CardHeader>
          </Card>
        </button>

        {/* PC Card */}
        <button onClick={() => handleModuleSelect('pc')} className="text-left group">
          <Card
            id="module-pc"
            className="relative overflow-hidden border-border/50 transition-all duration-300 hover:shadow-xl hover:border-primary/30 hover:-translate-y-1 cursor-pointer h-full"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 to-emerald-600/10 opacity-0 group-hover:opacity-100 transition-opacity" />
            <CardHeader className="relative space-y-4 p-8">
              <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                <CreditCardIcon className="h-7 w-7" />
              </div>
              <div>
                <CardTitle className="text-xl font-semibold flex items-center gap-2">
                  Private Credit
                  <ArrowRightIcon className="h-4 w-4 opacity-0 group-hover:opacity-100 transition-all group-hover:translate-x-1" />
                </CardTitle>
                <CardDescription className="mt-2 text-sm leading-relaxed">
                  Generate private credit analysis reports with document-driven insights and risk assessments.
                </CardDescription>
              </div>
              <span className="inline-flex items-center rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-600 dark:text-emerald-400">
                PC Module
              </span>
            </CardHeader>
          </Card>
        </button>
      </div>
    </div>
  );
}

export default function ModulePickerPage() {
  return (
    <AuthGuard>
      <ModulePickerContent />
    </AuthGuard>
  );
}
