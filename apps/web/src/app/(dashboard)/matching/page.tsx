import { redirect } from 'next/navigation';

// Matching merged into the Offres hub (sort by best match + recompute there).
export default function MatchingPage() {
  redirect('/jobs');
}
