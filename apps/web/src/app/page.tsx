import Link from 'next/link';
import { ThemeToggle } from '@/components/ui/ThemeToggle';
import { SignupCard } from '@/components/auth/SignupCard';
import { RedirectIfAuthed } from '@/components/auth/RedirectIfAuthed';

const FEATURES = [
  {
    icon: '🧠',
    title: 'Mémoire persistante',
    text: 'Chaque expérience, compétence et réalisation est mémorisée, versionnée et jamais perdue.',
  },
  {
    icon: '🔎',
    title: 'Veille + matching ATS',
    text: 'Des offres réelles (France Travail, Adzuna) scorées sur 7 critères, mots-clés ATS et compétences manquantes.',
  },
  {
    icon: '🤖',
    title: 'Agent autonome',
    text: 'Un cycle quotidien percevoir → analyser → agir, qui fait avancer ta carrière sans toi.',
  },
  {
    icon: '✉️',
    title: 'Auto-candidature',
    text: 'CV et lettre sur-mesure générés, envoi automatique opt-in au-dessus de ton seuil — tu gardes la main.',
  },
  {
    icon: '📊',
    title: 'Rapports & marché',
    text: 'Synthèses hebdo/mensuelles, tendances salaires et TJM, couverture de tes compétences.',
  },
  {
    icon: '🎯',
    title: 'Coaching',
    text: 'Compétences prioritaires, certifications et projets recommandés à partir de tes vrais écarts.',
  },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen">
      <RedirectIfAuthed />
      <nav className="sticky top-0 z-10 border-b border-border bg-surface/70 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-2">
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-brand text-sm font-bold text-white">
              C
            </span>
            <span className="text-lg font-bold">Reas</span>
          </div>
          <div className="flex items-center gap-3">
            <ThemeToggle />
            <Link href="/login" className="text-sm text-muted transition hover:text-foreground">
              Se connecter
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero + inscription */}
      <header className="relative overflow-hidden">
        <div
          aria-hidden
          className="pointer-events-none absolute -top-40 left-1/2 h-[28rem] w-[52rem] -translate-x-1/2 rounded-full bg-brand/20 blur-3xl"
        />
        <div className="relative mx-auto grid max-w-5xl items-center gap-10 px-6 py-20 md:grid-cols-2">
          <div className="text-center md:text-left">
            <span className="chip mb-5 inline-block text-xs">
              Assistant de carrière à mémoire persistante
            </span>
            <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
              Ton copilote de carrière, <span className="text-brand">autonome</span>.
            </h1>
            <p className="mt-5 max-w-xl text-lg text-muted">
              Reas mémorise ton parcours, surveille le marché, score les offres, adapte ton CV
              et prépare tes candidatures — automatiquement.
            </p>
          </div>
          <div className="flex justify-center md:justify-end">
            <SignupCard />
          </div>
        </div>
      </header>

      {/* Features */}
      <section className="mx-auto max-w-6xl px-6 py-16">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f) => (
            <div key={f.title} className="card p-6 transition hover:shadow-md">
              <div className="text-2xl">{f.icon}</div>
              <h3 className="mt-3 font-semibold">{f.title}</h3>
              <p className="mt-1 text-sm text-muted">{f.text}</p>
            </div>
          ))}
        </div>
      </section>

      <footer className="border-t border-border py-8 text-center text-sm text-muted">
        Reas — assistant de carrière intelligent. Faits distingués des hypothèses, actions
        externes toujours validées par toi.
      </footer>
    </div>
  );
}
