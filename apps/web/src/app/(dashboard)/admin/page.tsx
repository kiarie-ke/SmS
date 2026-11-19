import { cookies } from 'next/headers';
import { RoleDashboard } from '@/components/dashboard/role-dashboard';
import { SESSION_COOKIE, verifySession } from '@/lib/session';

export default async function AdminDashboardPage() {
  const session = await verifySession((await cookies()).get(SESSION_COOKIE)?.value);

  return (
    <RoleDashboard
      role="ADMIN"
      email={session?.email ?? ''}
      focus="School-wide operations: enrolment, staff, academics, fees and reporting."
      upcoming={['People & structure', 'Attendance registers', 'Exams & results', 'Fees & M-Pesa']}
    />
  );
}
