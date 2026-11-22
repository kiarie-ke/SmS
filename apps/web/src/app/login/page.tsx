import { ROLE_HOME } from '@school-system/shared';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { LoginScreen } from '@/components/auth/login-screen';
import { SESSION_COOKIE, verifySession } from '@/lib/session';

export default async function LoginPage() {
  const store = await cookies();
  const session = await verifySession(store.get(SESSION_COOKIE)?.value);
  if (session) redirect(ROLE_HOME[session.role]);

  return <LoginScreen />;
}
