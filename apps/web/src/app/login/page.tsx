import { ROLE_HOME } from '@school-system/shared';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { LoginForm } from '@/components/auth/login-form';
import { SESSION_COOKIE, verifySession } from '@/lib/session';

export default async function LoginPage() {
  const store = await cookies();
  const session = await verifySession(store.get(SESSION_COOKIE)?.value);
  if (session) redirect(ROLE_HOME[session.role]);

  return (
    <main className="flex min-h-dvh items-center justify-center bg-muted/40 px-4 py-10">
      <div className="w-full max-w-md">
        <div className="mb-6 text-center">
          <h1 className="text-2xl font-semibold tracking-tight">School System</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Sign in to manage your school
          </p>
        </div>
        <LoginForm />
      </div>
    </main>
  );
}
