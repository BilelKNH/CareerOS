'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { endpoints, setAccessToken } from '@/lib/api-client';

export function SignupCard() {
  const router = useRouter();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const { accessToken } = await endpoints.register(email, password, fullName || undefined);
      setAccessToken(accessToken);
      router.push('/dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur à l’inscription');
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={submit} className="card w-full max-w-sm space-y-3 p-6 text-left">
      <h2 className="font-medium">Créer ton compte</h2>
      <input
        className="input"
        placeholder="Nom"
        value={fullName}
        onChange={(e) => setFullName(e.target.value)}
      />
      <input
        className="input"
        type="email"
        placeholder="Email"
        required
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />
      <input
        className="input"
        type="password"
        placeholder="Mot de passe (8 caractères min.)"
        required
        minLength={8}
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />
      {error && <p className="text-sm text-rose-600">{error}</p>}
      <button type="submit" disabled={loading} className="btn-primary w-full disabled:opacity-50">
        {loading ? 'Création…' : 'Commencer'}
      </button>
      <p className="text-center text-sm text-muted">
        Déjà un compte ?{' '}
        <Link href="/login" className="text-brand hover:underline">
          Se connecter
        </Link>
      </p>
    </form>
  );
}
