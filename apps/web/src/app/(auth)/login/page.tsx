'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { endpoints, setAccessToken } from '@/lib/api-client';
import { RedirectIfAuthed } from '@/components/auth/RedirectIfAuthed';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('bilelknh@gmail.com');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const { accessToken } = await endpoints.login(email, password);
      setAccessToken(accessToken);
      router.push('/dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur de connexion');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden p-6">
      <RedirectIfAuthed />
      <div
        aria-hidden
        className="pointer-events-none absolute -top-40 left-1/2 h-96 w-[42rem] -translate-x-1/2 rounded-full bg-brand/20 blur-3xl"
      />
      <form onSubmit={onSubmit} className="card relative w-full max-w-sm space-y-4 p-8">
        <div className="flex items-center gap-2">
          <span className="grid h-9 w-9 place-items-center rounded-lg bg-brand text-sm font-bold text-white">
            R
          </span>
          <div>
            <h1 className="brand-gradient text-2xl font-semibold leading-none">Reas</h1>
            <p className="mt-1 text-[11px] uppercase tracking-[0.12em] text-brand">
              Recherche d’Emplois Autonome Simplifiée
            </p>
          </div>
        </div>
        <p className="text-sm text-muted">Connecte-toi pour accéder à ton copilote de carrière.</p>
        <input
          className="input"
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <input
          className="input"
          type="password"
          placeholder="Mot de passe"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-lg bg-brand px-3 py-2 font-medium text-white disabled:opacity-50"
        >
          {loading ? 'Connexion…' : 'Se connecter'}
        </button>
        <p className="text-center text-sm text-muted">
          Pas encore de compte ?{' '}
          <Link href="/" className="text-brand hover:underline">
            Créer un compte
          </Link>
        </p>
      </form>
    </main>
  );
}
