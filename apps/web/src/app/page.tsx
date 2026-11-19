import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { ROLE_HOME } from '@school-system/shared';
import { SESSION_COOKIE, verifySession } from '@/lib/session';

export default async function HomePage() {
  const store = await cookies();
  const session = await verifySession(store.get(SESSION_COOKIE)?.value);
  redirect(session ? ROLE_HOME[session.role] : '/login');
}
