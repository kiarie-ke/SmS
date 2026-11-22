'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { PageHeader } from '@/components/admin/page-header';
import { Button } from '@/components/ui/button';
import {
  authControllerRegister,
  usersControllerList,
} from '@/lib/api/generated/endpoints';
import type {
  RegisterDto,
  RegisterDtoRole,
  UserAccountDto,
} from '@/lib/api/generated/models';
import { toErrorMessage } from '@/lib/api/errors';
import { useApiQuery } from '@/lib/api/use-api-query';

const INITIAL_ACCOUNT: RegisterDto = {
  email: '',
  phone: '',
  password: '',
  role: 'BURSAR',
};

export default function AdminAccountsPage() {
  const queryClient = useQueryClient();
  const [form, setForm] = useState(INITIAL_ACCOUNT);
  const accountsQuery = useApiQuery(['staff-accounts'], () =>
    usersControllerList({ limit: 100 }),
  );
  const create = useMutation({
    mutationFn: (account: RegisterDto) => authControllerRegister(account),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['staff-accounts'] });
      setForm(INITIAL_ACCOUNT);
    },
  });

  const accounts = (accountsQuery.data?.data ?? []).filter(
    (account): account is UserAccountDto =>
      account.role === 'BURSAR' || account.role === 'LIBRARIAN',
  );

  return (
    <div>
      <PageHeader
        title="Bursar & Librarian accounts"
        description="Create separate sign-in accounts for finance and library staff."
      />

      <form
        className="mb-8 grid gap-3 rounded-lg border bg-card p-4 sm:grid-cols-2 lg:grid-cols-3"
        onSubmit={(event) => {
          event.preventDefault();
          create.mutate(form);
        }}
      >
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium">Role</span>
          <select
            className="rounded-md border bg-background px-3 py-2"
            value={form.role}
            onChange={(event) =>
              setForm({ ...form, role: event.target.value as RegisterDtoRole })
            }
          >
            <option value="BURSAR">Bursar</option>
            <option value="LIBRARIAN">Librarian</option>
          </select>
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium">Email</span>
          <input
            required
            type="email"
            autoComplete="email"
            className="rounded-md border bg-background px-3 py-2"
            value={form.email}
            onChange={(event) => setForm({ ...form, email: event.target.value })}
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium">Kenyan phone</span>
          <input
            required
            type="tel"
            pattern="\\+254[17][0-9]{8}"
            placeholder="+254712345678"
            className="rounded-md border bg-background px-3 py-2"
            value={form.phone}
            onChange={(event) => setForm({ ...form, phone: event.target.value })}
          />
        </label>
        <label className="flex flex-col gap-1 text-sm sm:col-span-2 lg:col-span-1">
          <span className="font-medium">Temporary password (8+ characters)</span>
          <input
            required
            type="password"
            minLength={8}
            maxLength={72}
            autoComplete="new-password"
            className="rounded-md border bg-background px-3 py-2"
            value={form.password}
            onChange={(event) => setForm({ ...form, password: event.target.value })}
          />
        </label>
        <div className="flex items-end">
          <Button type="submit" disabled={create.isPending}>
            {create.isPending ? 'Creating…' : 'Create account'}
          </Button>
        </div>
        {create.error ? (
          <p role="alert" className="text-sm text-destructive sm:col-span-2 lg:col-span-3">
            {toErrorMessage(create.error, 'Could not create account')}
          </p>
        ) : null}
        {create.isSuccess ? (
          <p className="text-sm text-emerald-700 sm:col-span-2 lg:col-span-3">
            Account created. Share the sign-in details with the staff member securely.
          </p>
        ) : null}
      </form>

      <section>
        <h2 className="mb-3 text-base font-semibold">Current accounts</h2>
        {accountsQuery.error ? (
          <p role="alert" className="mb-3 text-sm text-destructive">
            {toErrorMessage(accountsQuery.error, 'Could not load accounts')}
          </p>
        ) : null}
        <div className="overflow-x-auto rounded-lg border bg-card">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-left text-muted-foreground">
              <tr>
                <th className="px-4 py-3">Role</th>
                <th className="px-4 py-3">Email</th>
                <th className="px-4 py-3">Phone</th>
                <th className="px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {accounts.map((account) => (
                <tr key={account.id}>
                  <td className="px-4 py-3">{account.role}</td>
                  <td className="px-4 py-3">{account.email}</td>
                  <td className="px-4 py-3">{account.phone}</td>
                  <td className="px-4 py-3">{account.isActive ? 'Active' : 'Disabled'}</td>
                </tr>
              ))}
              {accounts.length === 0 && !accountsQuery.isLoading ? (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-muted-foreground">
                    No Bursar or Librarian accounts have been created.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
