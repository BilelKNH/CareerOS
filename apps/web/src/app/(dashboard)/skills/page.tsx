import { redirect } from 'next/navigation';

// Compétences ont été fusionnées dans la page Parcours.
export default function SkillsRedirect() {
  redirect('/experiences');
}
