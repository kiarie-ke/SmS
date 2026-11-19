import { cookies } from 'next/headers';
import { RoleDashboard } from '@/components/dashboard/role-dashboard';
import { SESSION_COOKIE, verifySession } from '@/lib/session';

export default async function StudentDashboardPage() {
  const session = await verifySession((await cookies()).get(SESSION_COOKIE)?.value);

  return (
    <RoleDashboard
      role="STUDENT"
      email={session?.email ?? ''}
      focus="Your attendance record, published results and fee statement."
      upcoming={['Published results', 'Attendance summary', 'Fee balance']}
    />
  );
}
