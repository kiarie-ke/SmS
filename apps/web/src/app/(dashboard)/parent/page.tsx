import { cookies } from 'next/headers';
import { RoleDashboard } from '@/components/dashboard/role-dashboard';
import { SESSION_COOKIE, verifySession } from '@/lib/session';

export default async function ParentDashboardPage() {
  const session = await verifySession((await cookies()).get(SESSION_COOKIE)?.value);

  return (
    <RoleDashboard
      role="PARENT"
      email={session?.email ?? ''}
      focus="Your children's attendance, published results and fee statements."
      upcoming={['Children overview', 'Absence alerts', 'Results & report cards', 'Fee balance']}
    />
  );
}
