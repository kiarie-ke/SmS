import type { Role } from '@school-system/shared';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { ROLE_LABEL } from './nav-items';

interface RoleDashboardProps {
  role: Role;
  email: string;
  focus: string;
  upcoming: string[];
}

export function RoleDashboard({ role, email, focus, upcoming }: RoleDashboardProps) {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          Welcome, {ROLE_LABEL[role].toLowerCase()}
        </h1>
        <p className="text-sm text-muted-foreground">
          Signed in as {email}
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Your focus area</CardTitle>
          <CardDescription>{focus}</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Phase 1 covers the foundation: authentication, roles and the school
            structure. Data modules below are unlocked in later phases.
          </p>
        </CardContent>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {upcoming.map((item) => (
          <Card key={item}>
            <CardHeader>
              <CardTitle className="text-base">{item}</CardTitle>
              <CardDescription>Coming in a later phase</CardDescription>
            </CardHeader>
          </Card>
        ))}
      </div>
    </div>
  );
}
