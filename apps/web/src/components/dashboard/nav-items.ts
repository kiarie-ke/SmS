import type { Role } from '@school-system/shared';
import {
  Activity,
  BookMarked,
  BookOpen,
  CalendarCheck,
  CalendarDays,
  ClipboardList,
  Contact,
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
    { title: 'Students', href: '/admin/students', icon: Users, available: true },
    { title: 'Staff', href: '/admin/staff', icon: GraduationCap, available: true },
    { title: 'Classes', href: '/admin/classes', icon: BookOpen, available: true },
    { title: 'Subjects', href: '/admin/subjects', icon: BookMarked, available: true },
    { title: 'Academic year', href: '/admin/academic-years', icon: CalendarDays, available: true },
    { title: 'Guardians', href: '/admin/guardians', icon: Contact, available: true },
    { title: 'Fees', href: '/admin/fees', icon: Wallet, available: true },
    { title: 'Audit', href: '/admin/audit', icon: Activity, available: true },
    { title: 'Reports', href: '/admin/reports', icon: ClipboardList, available: false },
    { title: 'Settings', href: '/admin/settings', icon: Settings, available: false },
  ],
  TEACHER: [
    { title: 'Dashboard', href: '/teacher', icon: LayoutDashboard, available: true },
    { title: 'My classes', href: '/teacher/classes', icon: BookOpen, available: true },
    { title: 'Attendance', href: '/teacher/attendance', icon: CalendarCheck, available: true },
    { title: 'Marks', href: '/teacher/marks', icon: ClipboardList, available: true },
    { title: 'CBC assessments', href: '/teacher/cbc', icon: ClipboardList, available: true },
    { title: 'Report cards', href: '/teacher/report-cards', icon: ClipboardList, available: true },
    { title: 'Fees', href: '/teacher/fees', icon: Wallet, available: true },
  ],
  STUDENT: [
    { title: 'Dashboard', href: '/student', icon: LayoutDashboard, available: true },
    { title: 'Results', href: '/student/results', icon: ClipboardList, available: true },
    { title: 'Attendance', href: '/student/attendance', icon: CalendarCheck, available: true },
    { title: 'Fees', href: '/student/fees', icon: Receipt, available: true },
  ],
  PARENT: [
    { title: 'Dashboard', href: '/parent', icon: LayoutDashboard, available: true },
    { title: 'My children', href: '/parent/children', icon: Users, available: true },
    { title: 'Attendance', href: '/parent/attendance', icon: CalendarCheck, available: true },
    { title: 'Results', href: '/parent/results', icon: ClipboardList, available: true },
    { title: 'Fees', href: '/parent/fees', icon: Wallet, available: true },
  ],
};

export const ROLE_LABEL: Record<Role, string> = {
  ADMIN: 'Administrator',
  TEACHER: 'Teacher',
  STUDENT: 'Student',
  PARENT: 'Parent',
};
