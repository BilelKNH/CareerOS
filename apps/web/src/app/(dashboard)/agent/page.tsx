import { redirect } from 'next/navigation';

// Le Career Agent est désormais piloté depuis la page Paramètres.
export default function AgentRedirect() {
  redirect('/settings');
}
