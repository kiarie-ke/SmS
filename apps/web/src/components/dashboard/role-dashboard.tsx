import type { Role } from "@school-system/shared";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ROLE_LABEL } from "./nav-items";
import {
  Activity,
  ArrowRight,
  BookMarked,
  BookOpen,
  CalendarCheck,
  CalendarRange,
  CheckCircle2,
  ClipboardList,
  Contact,
  GraduationCap,
  LibraryBig,
  Receipt,
  Users,
  Wallet,
  ReceiptText,
} from "lucide-react";

interface QuickAction {
  title: string;
  description: string;
  href: string;
  icon: any;
  highlight?: boolean;
}

const ACTIONS_BY_ROLE: Record<Role, QuickAction[]> = {
  ADMIN: [
    {
      title: "Students & admissions",
      description:
        "Manage enrolment, student profiles, photos and guardian links.",
      href: "/admin/students",
      icon: Users,
      highlight: true,
    },
    {
      title: "Teaching staff",
      description:
        "Teacher profiles, TSC numbers, BOM staff, and subject assignments.",
      href: "/admin/staff",
      icon: GraduationCap,
    },
    {
      title: "School operations",
      description:
        "Build the weekly timetable, manage the school calendar, assign substitutes and review lesson plans.",
      href: "/admin/operations",
      icon: CalendarRange,
      highlight: true,
    },
    {
      title: "Classes & streams",
      description:
        "PP1 through Form 4 classes, assigned streams, and class teachers.",
      href: "/admin/classes",
      icon: BookOpen,
    },
    {
      title: "Fees & billing",
      description:
        "Set fee structures per term, generate bulk invoices, and record cash receipts.",
      href: "/admin/fees",
      icon: Wallet,
      highlight: true,
    },
    {
      title: "Audit log viewer",
      description:
        "Verify system access, changes, and compliance with Kenya Data Protection Act.",
      href: "/admin/audit",
      icon: Activity,
    },
    {
      title: "Curriculum & subjects",
      description: "Manage standard CBC and 8-4-4 subject offerings and codes.",
      href: "/admin/subjects",
      icon: BookMarked,
    },
  ],
  TEACHER: [
    {
      title: "Timetable & lesson plans",
      description:
        "View your weekly teaching schedule and prepare lesson plans for review.",
      href: "/teacher/operations",
      icon: CalendarRange,
      highlight: true,
    },
    {
      title: "Daily attendance register",
      description:
        "Mark morning attendance for your assigned class with instant guardian notices.",
      href: "/teacher/attendance",
      icon: CalendarCheck,
      highlight: true,
    },
    {
      title: "Exam marks entry",
      description:
        "Enter scores for CATs, Midterms and Endterm exams with auto grade computation.",
      href: "/teacher/marks",
      icon: ClipboardList,
      highlight: true,
    },
    {
      title: "CBC assessments",
      description:
        "Record performance levels (EE, ME, AE, BE) per learning outcome.",
      href: "/teacher/cbc",
      icon: CheckCircle2,
    },
    {
      title: "Term report cards",
      description:
        "Review class rank, teacher remarks, and publish student report cards.",
      href: "/teacher/report-cards",
      icon: Receipt,
    },
    {
      title: "Class fee clearance",
      description:
        "Monitor payment clearance status for students in your classes.",
      href: "/teacher/fees",
      icon: Wallet,
    },
  ],
  STUDENT: [
    {
      title: "My academic results",
      description:
        "View published exam performance, grades, and teacher remarks.",
      href: "/student/results",
      icon: ClipboardList,
      highlight: true,
    },
    {
      title: "Attendance history",
      description: "Review your school attendance records and term percentage.",
      href: "/student/attendance",
      icon: CalendarCheck,
    },
    {
      title: "Fees & M-Pesa payment",
      description:
        "Check fee invoice balances and pay tuition instantly with Safaricom M-Pesa.",
      href: "/student/fees",
      icon: Receipt,
      highlight: true,
    },
  ],
  PARENT: [
    {
      title: "Children overview",
      description:
        "View registered details and enrolled classes for your linked children.",
      href: "/parent/children",
      icon: Users,
    },
    {
      title: "Attendance monitoring",
      description:
        "Stay updated on daily morning attendance and receive absence notifications.",
      href: "/parent/attendance",
      icon: CalendarCheck,
    },
    {
      title: "Children&apos;s report cards",
      description:
        "Access official published term report cards, grading, and teacher comments.",
      href: "/parent/results",
      icon: ClipboardList,
      highlight: true,
    },
    {
      title: "Fee balances & invoices",
      description: "Check student fee statements and track cleared payments.",
      href: "/parent/fees",
      icon: Wallet,
      highlight: true,
    },
  ],
  BURSAR: [
    {
      title: "Fees & billing",
      description:
        "Manage fee structures, generate invoices, and record payments.",
      href: "/bursar/fees",
      icon: Wallet,
      highlight: true,
    },
    {
      title: "Income & expenses",
      description:
        "Record non-fee income and operating expenses and review the balance.",
      href: "/bursar/finance",
      icon: ReceiptText,
    },
  ],
  LIBRARIAN: [
    {
      title: "Book catalogue",
      description:
        "Manage approved book metadata, school copies, and curriculum levels.",
      href: "/librarian/books",
      icon: LibraryBig,
      highlight: true,
    },
    {
      title: "Loans & returns",
      description: "Issue books to students and mark copies returned.",
      href: "/librarian/loans",
      icon: BookOpen,
    },
  ],
};

interface RoleDashboardProps {
  role: Role;
  email: string;
  focus: string;
  upcoming?: string[];
}

export function RoleDashboard({ role, email, focus }: RoleDashboardProps) {
  const actions = ACTIONS_BY_ROLE[role] ?? [];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Welcome, {ROLE_LABEL[role]}
          </h1>
          <p className="text-sm text-muted-foreground">
            Signed in as{" "}
            <span className="font-medium text-foreground">{email}</span>
          </p>
        </div>
        <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-700 dark:text-emerald-300">
          <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
          Academic Term Active
        </div>
      </div>

      <Card className="border-primary/20 bg-primary/5">
        <CardHeader>
          <CardTitle className="text-lg">Dashboard focus</CardTitle>
          <CardDescription className="text-foreground/80">
            {focus}
          </CardDescription>
        </CardHeader>
      </Card>

      <div>
        <h2 className="mb-4 text-base font-semibold">
          Quick access &amp; modules
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {actions.map((action) => {
            const Icon = action.icon;
            return (
              <Link key={action.href} href={action.href} className="group">
                <Card
                  className={`h-full transition-all hover:border-primary/50 hover:shadow-md ${action.highlight ? "ring-1 ring-primary/20" : ""}`}
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div className="rounded-lg bg-primary/10 p-2 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                        <Icon className="h-5 w-5" />
                      </div>
                      <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:translate-x-0.5 group-hover:text-primary transition-all" />
                    </div>
                    <CardTitle className="text-base pt-2">
                      {action.title}
                    </CardTitle>
                    <CardDescription className="text-xs leading-relaxed">
                      {action.description}
                    </CardDescription>
                  </CardHeader>
                </Card>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
