import { cookies } from 'next/headers';
import { RoleDashboard } from '@/components/dashboard/role-dashboard';
import { SESSION_COOKIE, verifySession } from '@/lib/session';

export default async function LibrarianDashboardPage() {
  const session = await verifySession((await cookies()).get(SESSION_COOKIE)?.value);
  return (
    <RoleDashboard
      role="LIBRARIAN"
      email={session?.email ?? ''}
      focus="School library catalogue, physical copies, textbook assignments and book returns."
    />
  );
}
