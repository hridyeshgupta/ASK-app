'use client';

// app/pc/generate/page.tsx
// Redirect to the new 4-step report generation page.
// This old page has been replaced by /pc/report-generation.

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function PCGenerateRedirect() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/pc/report-generation');
  }, [router]);

  return (
    <div className="flex items-center justify-center h-64 text-muted-foreground">
      Redirecting to Report Generation...
    </div>
  );
}
