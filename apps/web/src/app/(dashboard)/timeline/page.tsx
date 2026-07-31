import { redirect } from 'next/navigation';

// Timeline merged into Experiences (same data, editable there).
export default function TimelinePage() {
  redirect('/experiences');
}
