'use client';

import type { Role } from '@school-system/shared';
import { GraduationCap, LogOut, Menu, UserRound } from 'lucide-react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState } from 'react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Separator } from '@/components/ui/separator';
import { useAuth } from '@/lib/auth-context';
import { NAV_BY_ROLE, ROLE_LABEL } from './nav-items';

interface DashboardShellProps {
  role: Role;
  email: string;
  children: React.ReactNode;
}

function initials(email: string): string {
  const [name] = email.split('@');
  return name.slice(0, 2).toUpperCase();
}

export function DashboardShell({ role, email, children }: DashboardShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { logout } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const items = NAV_BY_ROLE[role];

  async function handleLogout() {
    await logout();
    router.replace('/login');
    router.refresh();
  }

  const nav = (
    <nav className="space-y-1 px-3" aria-label="Main navigation">
      {items.map((item) => {
        const active = pathname === item.href;
        return item.available ? (
          <Link
            key={item.href}
            href={item.href}
            onClick={() => setMobileOpen(false)}
            className={`flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
              active
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
            }`}
          >
            <item.icon className="size-4" aria-hidden />
            {item.title}
          </Link>
        ) : (
          <div
            key={item.href}
            className="flex items-center justify-between gap-2 rounded-md px-3 py-2 text-sm text-muted-foreground/60"
            aria-disabled
          >
            <span className="flex items-center gap-3">
              <item.icon className="size-4" aria-hidden />
              {item.title}
            </span>
            <Badge variant="outline" className="text-[10px]">
              Soon
            </Badge>
          </div>
        );
      })}
    </nav>
  );

  return (
    <div className="flex min-h-dvh bg-muted/30">
      <aside className="hidden w-64 shrink-0 border-r bg-sidebar md:flex md:flex-col">
        <div className="flex h-16 items-center gap-2 px-5">
          <GraduationCap className="size-6 text-primary" aria-hidden />
          <span className="text-sm font-semibold">School System</span>
        </div>
        <Separator />
        <div className="flex-1 overflow-y-auto py-4">{nav}</div>
        <div className="border-t px-5 py-3 text-xs text-muted-foreground">
          Kenya · KES · Africa/Nairobi
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-16 items-center justify-between gap-3 border-b bg-background px-4 md:px-6">
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden"
              onClick={() => setMobileOpen((open) => !open)}
              aria-label="Toggle navigation"
            >
              <Menu className="size-5" />
            </Button>
            <div>
              <p className="text-sm font-medium">{ROLE_LABEL[role]} portal</p>
              <p className="text-xs text-muted-foreground">
                Mwangaza Academy · 2026 Term 2
              </p>
            </div>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
              <Avatar className="size-8">
                <AvatarFallback>{initials(email)}</AvatarFallback>
              </Avatar>
              <span className="hidden text-sm sm:inline">{email}</span>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>
                <span className="block text-sm">{email}</span>
                <span className="block text-xs font-normal text-muted-foreground">
                  {ROLE_LABEL[role]}
                </span>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => router.push('/profile')}>
                <UserRound className="mr-2 size-4" /> Profile
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => void handleLogout()}>
                <LogOut className="mr-2 size-4" /> Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </header>

        {mobileOpen ? (
          <div className="border-b bg-background py-3 md:hidden">{nav}</div>
        ) : null}

        <main className="flex-1 px-4 py-6 md:px-6">{children}</main>
      </div>
    </div>
  );
}
