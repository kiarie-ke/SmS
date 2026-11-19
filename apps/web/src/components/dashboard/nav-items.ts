import type { Role } from '@school-system/shared';
import {
  BookOpen,
  CalendarCheck,
  ClipboardList,
  GraduationCap,
  LayoutDashboard,
  Receipt,
  Settings,
  Users,
  Wallet,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

export interface NavItem {
  title: string;
  href: string;
  icon: LucideIcon;
  available: boolean;
}

export const NAV_BY_ROLE: Record<Role, NavItem[]> = {
  ADMIN: [
    { title: 'Dashboard', href: '/admin', icon: LayoutDashboard, available: true },
    { title: 'Students', href: '/admin/students', icon: Users, available: false },
    { title: 'Staff', href: '/admin/staff', icon: GraduationCap, available: false },
    { title: 'Classes', href: '/admin/classes', icon: BookOpen, available: false },
    { title: 'Fees', href: '/admin/fees', icon: Wallet, available: false },
    { title: 'Reports', href: '/admin/reports', icon: ClipboardList, available: false },
    { title: 'Settings', href: '/admin/settings', icon: Settings, available: false },
  ],
  TEACHER: [
    { title: 'Dashboard', href: '/teacher', icon: LayoutDashboard, available: true },
    { title: 'Attendance', href: '/teacher/attendance', icon: CalendarCheck, available: false },
    { title: 'Marks', href: '/teacher/marks', icon: ClipboardList, available: false },
    { title: 'My classes', href: '/teacher/classes', icon: BookOpen, available: false },
  ],
  STUDENT: [
    { title: 'Dashboard', href: '/student', icon: LayoutDashboard, available: true },
    { title: 'Results', href: '/student/results', icon: ClipboardList, available: false },
    { title: 'Attendance', href: '/student/attendance', icon: CalendarCheck, available: false },
    { title: 'Fees', href: '/student/fees', icon: Receipt, available: false },
  ],
  PARENT: [
    { title: 'Dashboard', href: '/parent', icon: LayoutDashboard, available: true },
    { title: 'My children', href: '/parent/children', icon: Users, available: false },
    { title: 'Attendance', href: '/parent/attendance', icon: CalendarCheck, available: false },
    { title: 'Fees', href: '/parent/fees', icon: Wallet, available: false },
  ],
};

export const ROLE_LABEL: Record<Role, string> = {
  ADMIN: 'Administrator',
  TEACHER: 'Teacher',
  STUDENT: 'Student',
  PARENT: 'Parent',
};
