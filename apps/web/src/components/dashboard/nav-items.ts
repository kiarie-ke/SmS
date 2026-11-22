import type { Role } from "@school-system/shared";
import {
  Activity,
  BookMarked,
  BookOpen,
  CalendarCheck,
  CalendarDays,
  CalendarRange,
  ClipboardList,
  Contact,
  GraduationCap,
  LayoutDashboard,
  LibraryBig,
  Receipt,
  Shield,
  Settings,
  Users,
  Wallet,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

export interface NavItem {
  title: string;
  href: string;
  icon: LucideIcon;
  available: boolean;
}

export const NAV_BY_ROLE: Record<Role, NavItem[]> = {
  ADMIN: [
    {
      title: "Dashboard",
      href: "/admin",
      icon: LayoutDashboard,
      available: true,
    },
    {
      title: "Students",
      href: "/admin/students",
      icon: Users,
      available: true,
    },
    {
      title: "Staff",
      href: "/admin/staff",
      icon: GraduationCap,
      available: true,
    },
    {
      title: "Classes",
      href: "/admin/classes",
      icon: BookOpen,
      available: true,
    },
    {
      title: "Subjects",
      href: "/admin/subjects",
      icon: BookMarked,
      available: true,
    },
    {
      title: "Academic year",
      href: "/admin/academic-years",
      icon: CalendarDays,
      available: true,
    },
    {
      title: "School operations",
      href: "/admin/operations",
      icon: CalendarRange,
      available: true,
    },
    {
      title: "Guardians",
      href: "/admin/guardians",
      icon: Contact,
      available: true,
    },
    { title: "Fees", href: "/admin/fees", icon: Wallet, available: true },
    {
      title: "Other finances",
      href: "/admin/finance",
      icon: Receipt,
      available: true,
    },
    { title: "Audit", href: "/admin/audit", icon: Activity, available: true },
    {
      title: "Reports",
      href: "/admin/reports",
      icon: ClipboardList,
      available: true,
    },
    {
      title: "Library",
      href: "/admin/library",
      icon: LibraryBig,
      available: true,
    },
    {
      title: "Accounts",
      href: "/admin/accounts",
      icon: Shield,
      available: true,
    },
    {
      title: "Settings",
      href: "/admin/settings",
      icon: Settings,
      available: true,
    },
  ],
  TEACHER: [
    {
      title: "Dashboard",
      href: "/teacher",
      icon: LayoutDashboard,
      available: true,
    },
    {
      title: "My classes",
      href: "/teacher/classes",
      icon: BookOpen,
      available: true,
    },
    {
      title: "Timetable & lesson plans",
      href: "/teacher/operations",
      icon: CalendarRange,
      available: true,
    },
    {
      title: "Attendance",
      href: "/teacher/attendance",
      icon: CalendarCheck,
      available: true,
    },
    {
      title: "Marks",
      href: "/teacher/marks",
      icon: ClipboardList,
      available: true,
    },
    {
      title: "CBC assessments",
      href: "/teacher/cbc",
      icon: ClipboardList,
      available: true,
    },
    {
      title: "Report cards",
      href: "/teacher/report-cards",
      icon: ClipboardList,
      available: true,
    },
    { title: "Fees", href: "/teacher/fees", icon: Wallet, available: true },
  ],
  STUDENT: [
    {
      title: "Dashboard",
      href: "/student",
      icon: LayoutDashboard,
      available: true,
    },
    {
      title: "Results",
      href: "/student/results",
      icon: ClipboardList,
      available: true,
    },
    {
      title: "Attendance",
      href: "/student/attendance",
      icon: CalendarCheck,
      available: true,
    },
    { title: "Fees", href: "/student/fees", icon: Receipt, available: true },
    {
      title: "Library books",
      href: "/student/library",
      icon: LibraryBig,
      available: true,
    },
  ],
  PARENT: [
    {
      title: "Dashboard",
      href: "/parent",
      icon: LayoutDashboard,
      available: true,
    },
    {
      title: "My children",
      href: "/parent/children",
      icon: Users,
      available: true,
    },
    {
      title: "Attendance",
      href: "/parent/attendance",
      icon: CalendarCheck,
      available: true,
    },
    {
      title: "Results",
      href: "/parent/results",
      icon: ClipboardList,
      available: true,
    },
    { title: "Fees", href: "/parent/fees", icon: Wallet, available: true },
  ],
  BURSAR: [
    {
      title: "Dashboard",
      href: "/bursar",
      icon: LayoutDashboard,
      available: true,
    },
    { title: "Fees", href: "/bursar/fees", icon: Wallet, available: true },
    {
      title: "Other finances",
      href: "/bursar/finance",
      icon: Receipt,
      available: true,
    },
  ],
  LIBRARIAN: [
    {
      title: "Dashboard",
      href: "/librarian",
      icon: LayoutDashboard,
      available: true,
    },
    {
      title: "Book catalogue",
      href: "/librarian/books",
      icon: LibraryBig,
      available: true,
    },
    {
      title: "Loans & returns",
      href: "/librarian/loans",
      icon: BookOpen,
      available: true,
    },
  ],
};

export const ROLE_LABEL: Record<Role, string> = {
  ADMIN: "Administrator",
  TEACHER: "Teacher",
  STUDENT: "Student",
  PARENT: "Parent",
  BURSAR: "Bursar",
  LIBRARIAN: "Librarian",
};
