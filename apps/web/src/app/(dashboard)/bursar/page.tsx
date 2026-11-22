import { cookies } from 'next/headers';
import { RoleDashboard } from '@/components/dashboard/role-dashboard';
import { SESSION_COOKIE, verifySession } from '@/lib/session';

export default async function BursarDashboardPage() {
  const session = await verifySession((await cookies()).get(SESSION_COOKIE)?.value);
  return (
    <RoleDashboard
      role="BURSAR"
      email={session?.email ?? ''}
      focus="School fees, non-payroll income, operating expenses and finance reporting."
    />
  );
}
