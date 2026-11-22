import { cookies } from "next/headers";
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ROLE_HOME } from "@school-system/shared";
import {
  ArrowRight,
  BookOpenCheck,
  CalendarDays,
  GraduationCap,
  LibraryBig,
  ShieldCheck,
  UsersRound,
} from "lucide-react";
import { SESSION_COOKIE, verifySession } from "@/lib/session";

export const metadata: Metadata = {
  title: "School System | A clearer view of school life",
  description:
    "A school management platform for Kenyan schools, bringing people, learning, attendance and daily operations together.",
};

const FEATURES = [
  {
    icon: UsersRound,
    title: "People & classes",
    description:
      "Keep student, guardian, staff and class information connected in one place.",
  },
  {
    icon: BookOpenCheck,
    title: "Learning & attendance",
    description:
      "Support daily attendance, assessments, results and weekly lesson planning.",
  },
  {
    icon: CalendarDays,
    title: "School operations",
    description:
      "Coordinate timetables, school events and teacher cover throughout the term.",
  },
  {
    icon: LibraryBig,
    title: "Fees & library",
    description:
      "Help school teams manage fee records, finances, book copies and loans.",
  },
];

export default async function HomePage() {
  const store = await cookies();
  const session = await verifySession(store.get(SESSION_COOKIE)?.value);
  if (session) redirect(ROLE_HOME[session.role]);

  return (
    <main className="min-h-dvh overflow-hidden bg-[#fbfaf7] text-slate-950">
      <header className="mx-auto flex w-full max-w-7xl items-center justify-between px-5 py-5 sm:px-8 lg:px-10">
        <Link
          href="/"
          className="flex items-center gap-3"
          aria-label="School System home"
        >
          <span className="flex size-10 items-center justify-center rounded-xl bg-emerald-900 text-white">
            <GraduationCap className="size-6" aria-hidden="true" />
          </span>
          <span className="text-lg font-semibold tracking-tight">
            School System
          </span>
        </Link>
        <Link
          href="/login"
          className="inline-flex h-10 items-center gap-2 rounded-lg bg-emerald-900 px-4 text-sm font-medium text-white transition-colors hover:bg-emerald-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-800"
        >
          Log in <ArrowRight className="size-4" aria-hidden="true" />
        </Link>
      </header>

      <section className="relative mx-auto grid w-full max-w-7xl items-center gap-14 px-5 pb-20 pt-10 sm:px-8 sm:pt-16 lg:grid-cols-[1.05fr_0.95fr] lg:px-10 lg:pb-28 lg:pt-20">
        <div className="relative z-10">
          <p className="mb-5 inline-flex items-center gap-2 rounded-full border border-emerald-900/10 bg-white/70 px-3 py-1.5 text-xs font-medium tracking-wide text-emerald-900">
            <span className="size-1.5 rounded-full bg-emerald-600" />
            MADE FOR THE EVERYDAY WORK OF SCHOOLS
          </p>
          <h1 className="max-w-2xl text-4xl font-semibold leading-[1.08] tracking-tight sm:text-5xl lg:text-6xl">
            A clearer view of{" "}
            <span className="text-emerald-800">school life.</span>
          </h1>
          <p className="mt-6 max-w-xl text-base leading-7 text-slate-600 sm:text-lg sm:leading-8">
            Bring the people, learning and daily work of your school together.
            One thoughtful place for school teams and families to stay
            organised.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Link
              href="/login"
              className="inline-flex h-12 items-center gap-2 rounded-lg bg-emerald-900 px-5 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-800"
            >
              Sign in to your account
              <ArrowRight className="size-4" aria-hidden="true" />
            </Link>
            <p className="flex items-center gap-2 px-1 text-sm text-slate-500">
              <ShieldCheck
                className="size-4 text-emerald-800"
                aria-hidden="true"
              />
              Secure access provided by your school
            </p>
          </div>
          <div className="mt-12 flex flex-wrap gap-x-7 gap-y-3 border-t border-slate-200 pt-6 text-sm text-slate-600">
            <span>Built for Kenyan schools</span>
            <span>Designed around school roles</span>
            <span>Works across the school year</span>
          </div>
        </div>

        <div className="relative mx-auto w-full max-w-xl lg:ml-auto">
          <div className="absolute -right-10 -top-10 size-44 rounded-full bg-amber-200/50 blur-3xl" />
          <div className="absolute -bottom-12 -left-10 size-48 rounded-full bg-emerald-200/60 blur-3xl" />
          <div className="relative rounded-[1.75rem] border border-white bg-white/80 p-3 shadow-[0_24px_80px_-32px_rgba(15,55,43,0.35)] sm:p-5">
            <div className="rounded-[1.25rem] bg-[#f3f6f1] p-5 sm:p-7">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-medium uppercase tracking-[0.16em] text-emerald-800">
                    Your school, in sync
                  </p>
                  <h2 className="mt-2 text-xl font-semibold tracking-tight sm:text-2xl">
                    More time for what matters
                  </h2>
                </div>
                <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-white text-emerald-900 shadow-sm">
                  <GraduationCap className="size-6" aria-hidden="true" />
                </div>
              </div>

              <div className="mt-7 grid grid-cols-2 gap-3">
                <div className="rounded-xl bg-white p-4 shadow-sm">
                  <div className="flex size-9 items-center justify-center rounded-lg bg-emerald-50 text-emerald-800">
                    <UsersRound className="size-5" aria-hidden="true" />
                  </div>
                  <p className="mt-3 text-sm font-semibold">People connected</p>
                  <p className="mt-1 text-xs leading-5 text-slate-500">
                    Students, families &amp; staff
                  </p>
                </div>
                <div className="rounded-xl bg-white p-4 shadow-sm">
                  <div className="flex size-9 items-center justify-center rounded-lg bg-amber-50 text-amber-800">
                    <CalendarDays className="size-5" aria-hidden="true" />
                  </div>
                  <p className="mt-3 text-sm font-semibold">Days organised</p>
                  <p className="mt-1 text-xs leading-5 text-slate-500">
                    Timetables, terms &amp; events
                  </p>
                </div>
              </div>

              <div className="mt-3 rounded-xl bg-emerald-950 p-5 text-white sm:p-6">
                <div className="flex items-center gap-3">
                  <span className="flex size-10 items-center justify-center rounded-lg bg-white/10">
                    <BookOpenCheck className="size-5" aria-hidden="true" />
                  </span>
                  <div>
                    <p className="text-sm font-semibold">
                      Support the whole school
                    </p>
                    <p className="mt-0.5 text-xs text-emerald-100/75">
                      From the classroom to the school office
                    </p>
                  </div>
                </div>
                <div className="mt-5 h-1.5 overflow-hidden rounded-full bg-white/15">
                  <div className="h-full w-2/3 rounded-full bg-emerald-300" />
                </div>
                <p className="mt-2 text-right text-[11px] text-emerald-100/70">
                  Connected school workflows
                </p>
              </div>
            </div>
          </div>
          <div className="absolute -bottom-5 right-5 flex items-center gap-2 rounded-xl border border-emerald-900/5 bg-white px-4 py-3 text-xs font-medium text-slate-700 shadow-lg sm:right-0">
            <ShieldCheck
              className="size-4 text-emerald-800"
              aria-hidden="true"
            />
            Access shaped by your role
          </div>
        </div>
      </section>

      <section className="border-y border-slate-200/80 bg-white/70">
        <div className="mx-auto max-w-7xl px-5 py-16 sm:px-8 lg:px-10 lg:py-20">
          <div className="max-w-2xl">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-emerald-800">
              One school, working together
            </p>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
              The essentials, all in one place.
            </h2>
            <p className="mt-4 leading-7 text-slate-600">
              Reduce the day-to-day juggling with tools designed around the
              people and responsibilities that keep a school moving.
            </p>
          </div>
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {FEATURES.map(({ icon: Icon, title, description }) => (
              <article
                key={title}
                className="rounded-2xl border border-slate-200/80 bg-white p-5 transition hover:-translate-y-0.5 hover:shadow-md"
              >
                <span className="flex size-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-900">
                  <Icon className="size-5" aria-hidden="true" />
                </span>
                <h3 className="mt-4 font-semibold">{title}</h3>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  {description}
                </p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto flex max-w-7xl flex-col gap-5 px-5 py-14 sm:px-8 md:flex-row md:items-center md:justify-between lg:px-10 lg:py-16">
        <div className="max-w-2xl">
          <h2 className="text-2xl font-semibold tracking-tight">
            Already part of a school?
          </h2>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            Sign in with the account details provided by your school
            administrator. Accounts are managed by the school.
          </p>
        </div>
        <Link
          href="/login"
          className="inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-4 text-sm font-medium transition hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-800"
        >
          Go to sign in <ArrowRight className="size-4" aria-hidden="true" />
        </Link>
      </section>

      <footer className="border-t border-slate-200 bg-white/60">
        <div className="mx-auto flex max-w-7xl flex-col gap-2 px-5 py-6 text-xs text-slate-500 sm:flex-row sm:items-center sm:justify-between sm:px-8 lg:px-10">
          <span>School System</span>
          <span>
            School management for Kenyan primary, JSS and secondary schools
          </span>
        </div>
      </footer>
    </main>
  );
}
