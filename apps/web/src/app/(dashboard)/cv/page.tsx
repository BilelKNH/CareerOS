import { redirect } from 'next/navigation';

// La page CV a été abandonnée : l'import se fait désormais depuis la page Parcours.
export default function CvRedirect() {
  redirect('/experiences');
}
