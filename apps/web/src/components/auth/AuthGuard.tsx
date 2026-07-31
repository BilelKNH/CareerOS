'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getAccessToken } from '@/lib/api-client';

/** Blocks rendering of protected content until a token is present; else redirects. */
export function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [authed, setAuthed] = useState(false);

  useEffect(() => {
    if (!getAccessToken()) router.replace('/login');
    else setAuthed(true);
  }, [router]);

  if (!authed) return null;
  return <>{children}</>;
}
