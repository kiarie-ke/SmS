import { cookies } from 'next/headers';
import { RoleDashboard } from '@/components/dashboard/role-dashboard';
import { SESSION_COOKIE, verifySession } from '@/lib/session';

export default async function TeacherDashboardPage() {
  const session = await verifySession((await cookies()).get(SESSION_COOKIE)?.value);

  return (
    <RoleDashboard
      role="TEACHER"
      email={session?.email ?? ''}
      focus="Your assigned classes, daily attendance and assessment entries."
      upcoming={['Class register', 'Marks entry', 'CBC assessments']}
    />
  );
}
