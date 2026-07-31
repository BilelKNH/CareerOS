'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getAccessToken } from '@/lib/api-client';

/** On the public landing/login, send already-authenticated users to the app. */
export function RedirectIfAuthed() {
  const router = useRouter();
  useEffect(() => {
    if (getAccessToken()) router.replace('/dashboard');
  }, [router]);
  return null;
}
