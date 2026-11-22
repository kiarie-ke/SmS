'use client';

import { PageHeader } from '@/components/admin/page-header';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { useAuth } from '@/lib/auth-context';
import { ROLE_LABEL } from '@/components/dashboard/nav-items';

export default function ProfilePage() {
  const { user, isLoading } = useAuth();

  return (
    <div className="space-y-6">
      <PageHeader
        title="My profile"
        description="Your account details and access role."
      />
      {isLoading ? (
        <p role="status" className="text-sm text-muted-foreground">Loading profile…</p>
      ) : user ? (
        <Card className="max-w-2xl">
          <CardHeader>
            <CardTitle>Account information</CardTitle>
            <CardDescription>Profile details are managed by your school administrator.</CardDescription>
          </CardHeader>
          <CardContent>
            <dl className="grid gap-4 sm:grid-cols-2">
              <div>
                <dt className="text-sm text-muted-foreground">Email</dt>
                <dd className="mt-1 font-medium">{user.email}</dd>
              </div>
              <div>
                <dt className="text-sm text-muted-foreground">Phone</dt>
                <dd className="mt-1 font-medium">{user.phone}</dd>
              </div>
              <div>
                <dt className="text-sm text-muted-foreground">Role</dt>
                <dd className="mt-1 font-medium">{ROLE_LABEL[user.role]}</dd>
              </div>
              <div>
                <dt className="text-sm text-muted-foreground">Account status</dt>
                <dd className="mt-1 font-medium">{user.isActive ? 'Active' : 'Inactive'}</dd>
              </div>
              {user.lastLoginAt ? (
                <div>
                  <dt className="text-sm text-muted-foreground">Last sign-in</dt>
                  <dd className="mt-1 font-medium">
                    {new Date(user.lastLoginAt).toLocaleString('en-KE', { timeZone: 'Africa/Nairobi' })}
                  </dd>
                </div>
              ) : null}
            </dl>
          </CardContent>
        </Card>
      ) : (
        <p role="alert" className="text-sm text-destructive">
          Could not load your account details. Please sign out and sign in again.
        </p>
      )}
    </div>
  );
}
