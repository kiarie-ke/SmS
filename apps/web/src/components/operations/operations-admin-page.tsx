"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { PageHeader } from "@/components/admin/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useApiQuery } from "@/lib/api/use-api-query";
import { toErrorMessage } from "@/lib/api/errors";
import {
  academicYearsControllerList,
  classesControllerList,
  operationsControllerCreateCalendarEvent,
  operationsControllerCreatePeriod,
  operationsControllerCreateSubstitution,
  operationsControllerCreateTimetableEntry,
  operationsControllerDeleteCalendarEvent,
  operationsControllerDeletePeriod,
  operationsControllerDeleteSubstitution,
  operationsControllerDeleteTimetableEntry,
  operationsControllerListCalendarEvents,
  operationsControllerListLessonPlans,
  operationsControllerListPeriods,
  operationsControllerListSubstitutions,
  operationsControllerListTimetable,
  operationsControllerReviewLessonPlan,
  subjectsControllerList,
  streamsControllerList,
  teachersControllerList,
} from "@/lib/api/generated/endpoints";
import type {
  CalendarEventDto,
  LessonPlanDto,
  SubstitutionDto,
  TimetableEntryDto,
  TimetablePeriodDto,
} from "@/lib/api/generated/models";

const DAYS = ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY"] as const;
const EVENT_TYPES = [
  "TERM",
  "HOLIDAY",
  "EXAM",
  "MEETING",
  "SCHOOL_EVENT",
  "OTHER",
] as const;
type Section =
  "timetable" | "periods" | "calendar" | "substitutions" | "lesson-plans";

function dateOnly(value: string) {
  return value.slice(0, 10);
}

export function OperationsAdminPage() {
  const queryClient = useQueryClient();
  const [section, setSection] = useState<Section>("timetable");
  const [academicYearId, setAcademicYearId] = useState("");
  const [selectedClassId, setSelectedClassId] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const years = useApiQuery(["academic-years", "operations"], () =>
    academicYearsControllerList({
      limit: 100,
      sortBy: "startDate",
      sortOrder: "desc",
    }),
  );
  const classes = useApiQuery(["classes", "operations"], () =>
    classesControllerList({ limit: 100 }),
  );
  const subjects = useApiQuery(["subjects", "operations"], () =>
    subjectsControllerList({ limit: 100 }),
  );
  const teachers = useApiQuery(["teachers", "operations"], () =>
    teachersControllerList({ limit: 100 }),
  );
  const streams = useApiQuery(
    ["streams", "operations", selectedClassId],
    () => streamsControllerList({ classId: selectedClassId, limit: 100 }),
    { enabled: !!selectedClassId },
  );
  const periods = useApiQuery(["operations", "periods", academicYearId], () =>
    operationsControllerListPeriods({
      academicYearId: academicYearId || undefined,
      limit: 100,
    }),
  );
  const timetable = useApiQuery(
    ["operations", "timetable", academicYearId],
    () =>
      operationsControllerListTimetable({
        academicYearId: academicYearId || undefined,
        limit: 100,
      }),
  );
  const calendar = useApiQuery(["operations", "calendar"], () =>
    operationsControllerListCalendarEvents({ limit: 100 }),
  );
  const substitutions = useApiQuery(["operations", "substitutions"], () =>
    operationsControllerListSubstitutions({ limit: 100 }),
  );
  const lessonPlans = useApiQuery(["operations", "lesson-plans"], () =>
    operationsControllerListLessonPlans({ status: "SUBMITTED", limit: 100 }),
  );

  const refresh = async (...keys: unknown[][]) => {
    setError("");
    setMessage("Saved successfully.");
    await Promise.all(
      keys.map((queryKey) => queryClient.invalidateQueries({ queryKey })),
    );
  };
  const useOperationMutation = <T,>(
    fn: (value: T) => Promise<unknown>,
    keys: unknown[][],
  ) =>
    useMutation({
      mutationFn: fn,
      onSuccess: () => refresh(...keys),
      onError: (cause) => {
        setMessage("");
        setError(
          toErrorMessage(cause, "The operation could not be completed."),
        );
      },
    });

  const createPeriod = useOperationMutation(operationsControllerCreatePeriod, [
    ["operations", "periods"],
    ["operations", "timetable"],
  ]);
  const deletePeriod = useOperationMutation(operationsControllerDeletePeriod, [
    ["operations", "periods"],
  ]);
  const createEntry = useOperationMutation(
    operationsControllerCreateTimetableEntry,
    [["operations", "timetable"]],
  );
  const deleteEntry = useOperationMutation(
    operationsControllerDeleteTimetableEntry,
    [["operations", "timetable"]],
  );
  const createEvent = useOperationMutation(
    operationsControllerCreateCalendarEvent,
    [["operations", "calendar"]],
  );
  const deleteEvent = useOperationMutation(
    operationsControllerDeleteCalendarEvent,
    [["operations", "calendar"]],
  );
  const createSubstitution = useOperationMutation(
    operationsControllerCreateSubstitution,
    [["operations", "substitutions"]],
  );
  const deleteSubstitution = useOperationMutation(
    operationsControllerDeleteSubstitution,
    [["operations", "substitutions"]],
  );
  const reviewPlan = useOperationMutation(
    ({
      id,
      decision,
    }: {
      id: string;
      decision: "APPROVED" | "REVISION_REQUESTED";
    }) =>
      operationsControllerReviewLessonPlan(id, {
        decision,
        ...(decision === "REVISION_REQUESTED"
          ? { comment: "Please update this weekly plan." }
          : {}),
      }),
    [["operations", "lesson-plans"]],
  );

  const yearsList = years.data?.data ?? [];
  const yearId =
    academicYearId ||
    yearsList.find((year) => year.isCurrent)?.id ||
    yearsList[0]?.id ||
    "";
  useEffect(() => {
    if (!academicYearId && yearId) setAcademicYearId(yearId);
  }, [academicYearId, yearId]);

  const showError =
    error ||
    [
      years.error &&
        toErrorMessage(years.error, "Could not load academic years"),
      classes.error && toErrorMessage(classes.error, "Could not load classes"),
      subjects.error &&
        toErrorMessage(subjects.error, "Could not load subjects"),
      teachers.error &&
        toErrorMessage(teachers.error, "Could not load teachers"),
    ]
      .filter(Boolean)
      .join(" ");

  return (
    <div>
      <PageHeader
        title="School operations"
        description="Manage the weekly timetable, term calendar, lesson-plan reviews, and teacher cover."
      />
      {showError ? (
        <p role="alert" className="mb-3 text-sm text-destructive">
          {showError}
        </p>
      ) : null}
      {message ? (
        <p role="status" className="mb-3 text-sm text-green-700">
          {message}
        </p>
      ) : null}
      <div className="mb-4 flex flex-wrap gap-2">
        {(
          [
            "timetable",
            "periods",
            "calendar",
            "substitutions",
            "lesson-plans",
          ] as const
        ).map((value) => (
          <Button
            key={value}
            variant={section === value ? "default" : "outline"}
            onClick={() => setSection(value)}
          >
            {value === "lesson-plans"
              ? "Lesson-plan reviews"
              : value[0].toUpperCase() + value.slice(1)}
          </Button>
        ))}
        {section === "periods" || section === "timetable" ? (
          <select
            aria-label="Academic year"
            className="h-8 rounded-md border bg-background px-2 text-sm"
            value={yearId}
            onChange={(event) => setAcademicYearId(event.target.value)}
          >
            {yearsList.map((year) => (
              <option key={year.id} value={year.id}>
                {year.name}
              </option>
            ))}
          </select>
        ) : null}
      </div>

      {section === "periods" ? (
        <section className="space-y-4">
          <form
            className="grid gap-3 rounded-lg border p-4 sm:grid-cols-3"
            onSubmit={(event) => {
              event.preventDefault();
              const form = new FormData(event.currentTarget);
              createPeriod.mutate({
                academicYearId: yearId,
                periodNumber: Number(form.get("periodNumber")),
                name: String(form.get("name")),
                startTime: String(form.get("startTime")),
                endTime: String(form.get("endTime")),
                isBreak: form.get("isBreak") === "on",
              });
              event.currentTarget.reset();
            }}
          >
            <label className="text-sm">
              Period number
              <Input
                name="periodNumber"
                type="number"
                min="1"
                max="20"
                required
              />
            </label>
            <label className="text-sm">
              Name
              <Input name="name" required placeholder="Lesson 1 / Break" />
            </label>
            <label className="text-sm">
              Starts
              <Input name="startTime" type="time" required />
            </label>
            <label className="text-sm">
              Ends
              <Input name="endTime" type="time" required />
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input name="isBreak" type="checkbox" /> Break
            </label>
            <Button type="submit" disabled={!yearId || createPeriod.isPending}>
              Add period
            </Button>
          </form>
          <div className="overflow-x-auto rounded-md border">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-muted/50 text-left">
                  <th className="p-2">#</th>
                  <th className="p-2">Period</th>
                  <th className="p-2">Time</th>
                  <th className="p-2">Type</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {(periods.data?.data ?? []).map(
                  (period: TimetablePeriodDto) => (
                    <tr key={period.id} className="border-t">
                      <td className="p-2">{period.periodNumber}</td>
                      <td className="p-2">{period.name}</td>
                      <td className="p-2">
                        {period.startTime}–{period.endTime}
                      </td>
                      <td className="p-2">
                        {period.isBreak ? "Break" : "Lesson"}
                      </td>
                      <td className="p-2 text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => deletePeriod.mutate(period.id)}
                        >
                          Delete
                        </Button>
                      </td>
                    </tr>
                  ),
                )}
                {periods.data?.data.length === 0 ? (
                  <tr>
                    <td className="p-3 text-muted-foreground" colSpan={5}>
                      No periods configured for this year.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}

      {section === "timetable" ? (
        <section className="space-y-4">
          <form
            className="grid gap-3 rounded-lg border p-4 sm:grid-cols-3"
            onSubmit={(event) => {
              event.preventDefault();
              const form = new FormData(event.currentTarget);
              createEntry.mutate({
                periodId: String(form.get("periodId")),
                classId: String(form.get("classId")),
                subjectId: String(form.get("subjectId")),
                teacherId: String(form.get("teacherId")),
                weekday: String(form.get("weekday")) as (typeof DAYS)[number],
                ...(form.get("streamId")
                  ? { streamId: String(form.get("streamId")) }
                  : {}),
                ...(form.get("streamId")
                  ? { streamId: String(form.get("streamId")) }
                  : {}),
                ...(form.get("venue")
                  ? { venue: String(form.get("venue")) }
                  : {}),
              });
              event.currentTarget.reset();
            }}
          >
            <label className="text-sm">
              Day
              <select
                name="weekday"
                className="mt-1 h-8 w-full rounded-md border bg-background px-2"
                required
              >
                {DAYS.map((day) => (
                  <option key={day}>{day}</option>
                ))}
              </select>
            </label>
            <label className="text-sm">
              Period
              <select
                name="periodId"
                className="mt-1 h-8 w-full rounded-md border bg-background px-2"
                required
              >
                <option value="">Select</option>
                {(periods.data?.data ?? [])
                  .filter((p) => !p.isBreak)
                  .map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.periodNumber}. {p.name} ({p.startTime})
                    </option>
                  ))}
              </select>
            </label>
            <label className="text-sm">
              Class
              <select
                name="classId"
                value={selectedClassId}
                onChange={(event) => setSelectedClassId(event.target.value)}
                className="mt-1 h-8 w-full rounded-md border bg-background px-2"
                required
              >
                <option value="">Select</option>
                {(classes.data?.data ?? [])
                  .filter((c) => c.academicYearId === yearId)
                  .map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
              </select>
            </label>
            <label className="text-sm">
              Stream (optional)
              <select
                name="streamId"
                className="mt-1 h-8 w-full rounded-md border bg-background px-2"
                disabled={!selectedClassId}
              >
                <option value="">All streams / no stream</option>
                {(streams.data?.data ?? []).map((stream) => (
                  <option key={stream.id} value={stream.id}>
                    {stream.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-sm">
              Subject
              <select
                name="subjectId"
                className="mt-1 h-8 w-full rounded-md border bg-background px-2"
                required
              >
                <option value="">Select</option>
                {(subjects.data?.data ?? []).map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-sm">
              Teacher
              <select
                name="teacherId"
                className="mt-1 h-8 w-full rounded-md border bg-background px-2"
                required
              >
                <option value="">Select</option>
                {(teachers.data?.data ?? []).map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.fullName}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-sm">
              Venue
              <Input name="venue" placeholder="Optional" />
            </label>
            <Button
              className="sm:col-span-3"
              type="submit"
              disabled={createEntry.isPending}
            >
              Add lesson to timetable
            </Button>
          </form>
          <div className="overflow-x-auto rounded-md border">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-muted/50 text-left">
                  <th className="p-2">Day</th>
                  <th className="p-2">Time</th>
                  <th className="p-2">Class / stream</th>
                  <th className="p-2">Subject</th>
                  <th className="p-2">Teacher</th>
                  <th className="p-2">Venue</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {(timetable.data?.data ?? []).map(
                  (entry: TimetableEntryDto) => (
                    <tr key={entry.id} className="border-t">
                      <td className="p-2">{entry.weekday}</td>
                      <td className="p-2">
                        {entry.period.startTime}–{entry.period.endTime}
                      </td>
                      <td className="p-2">
                        {entry.className}
                        {entry.streamName ? ` · ${entry.streamName}` : ""}
                      </td>
                      <td className="p-2">{entry.subjectName}</td>
                      <td className="p-2">{entry.teacherName}</td>
                      <td className="p-2">{entry.venue || "—"}</td>
                      <td className="p-2 text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => deleteEntry.mutate(entry.id)}
                        >
                          Remove
                        </Button>
                      </td>
                    </tr>
                  ),
                )}
                {timetable.data?.data.length === 0 ? (
                  <tr>
                    <td className="p-3 text-muted-foreground" colSpan={7}>
                      No timetable entries for this year.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}

      {section === "calendar" ? (
        <section className="space-y-4">
          <form
            className="grid gap-3 rounded-lg border p-4 sm:grid-cols-3"
            onSubmit={(event) => {
              event.preventDefault();
              const form = new FormData(event.currentTarget);
              createEvent.mutate({
                title: String(form.get("title")),
                type: String(form.get("type")) as (typeof EVENT_TYPES)[number],
                startDate: String(form.get("startDate")),
                endDate: String(form.get("endDate")),
                ...(form.get("description")
                  ? { description: String(form.get("description")) }
                  : {}),
                ...(yearId ? { academicYearId: yearId } : {}),
              });
              event.currentTarget.reset();
            }}
          >
            <label className="text-sm">
              Title
              <Input name="title" required />
            </label>
            <label className="text-sm">
              Type
              <select
                name="type"
                className="mt-1 h-8 w-full rounded-md border bg-background px-2"
              >
                {EVENT_TYPES.map((type) => (
                  <option key={type}>{type}</option>
                ))}
              </select>
            </label>
            <label className="text-sm">
              Description
              <Input name="description" />
            </label>
            <label className="text-sm">
              Starts
              <Input name="startDate" type="date" required />
            </label>
            <label className="text-sm">
              Ends
              <Input name="endDate" type="date" required />
            </label>
            <Button type="submit" disabled={createEvent.isPending}>
              Add calendar event
            </Button>
          </form>
          <ul className="divide-y rounded-md border">
            {(calendar.data?.data ?? []).map((event: CalendarEventDto) => (
              <li
                key={event.id}
                className="flex flex-wrap items-center justify-between gap-2 p-3"
              >
                <div>
                  <p className="font-medium">
                    {event.title}{" "}
                    <span className="text-xs text-muted-foreground">
                      · {event.type}
                    </span>
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {dateOnly(event.startDate)} – {dateOnly(event.endDate)}
                    {event.description ? ` · ${event.description}` : ""}
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => deleteEvent.mutate(event.id)}
                >
                  Delete
                </Button>
              </li>
            ))}
            {calendar.data?.data.length === 0 ? (
              <li className="p-3 text-sm text-muted-foreground">
                No school calendar events.
              </li>
            ) : null}
          </ul>
        </section>
      ) : null}

      {section === "substitutions" ? (
        <section className="space-y-4">
          <form
            className="grid gap-3 rounded-lg border p-4 sm:grid-cols-3"
            onSubmit={(event) => {
              event.preventDefault();
              const form = new FormData(event.currentTarget);
              createSubstitution.mutate({
                timetableEntryId: String(form.get("timetableEntryId")),
                substituteTeacherId: String(form.get("substituteTeacherId")),
                date: String(form.get("date")),
                ...(form.get("note") ? { note: String(form.get("note")) } : {}),
              });
              event.currentTarget.reset();
            }}
          >
            <label className="text-sm">
              Scheduled lesson
              <select
                name="timetableEntryId"
                className="mt-1 h-8 w-full rounded-md border bg-background px-2"
                required
              >
                <option value="">Select</option>
                {(timetable.data?.data ?? []).map((entry) => (
                  <option key={entry.id} value={entry.id}>
                    {entry.weekday} · {entry.period.startTime} ·{" "}
                    {entry.className} · {entry.subjectName} ·{" "}
                    {entry.teacherName}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-sm">
              Substitute
              <select
                name="substituteTeacherId"
                className="mt-1 h-8 w-full rounded-md border bg-background px-2"
                required
              >
                <option value="">Select</option>
                {(teachers.data?.data ?? []).map((teacher) => (
                  <option key={teacher.id} value={teacher.id}>
                    {teacher.fullName}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-sm">
              Date
              <Input name="date" type="date" required />
            </label>
            <label className="text-sm sm:col-span-2">
              Note
              <Input name="note" />
            </label>
            <Button type="submit" disabled={createSubstitution.isPending}>
              Assign substitute
            </Button>
          </form>
          <ul className="divide-y rounded-md border">
            {(substitutions.data?.data ?? []).map((item: SubstitutionDto) => (
              <li
                key={item.id}
                className="flex flex-wrap items-center justify-between gap-2 p-3"
              >
                <div>
                  <p className="font-medium">
                    {dateOnly(item.date)} · {item.className} ·{" "}
                    {item.subjectName}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {item.period.startTime} · {item.originalTeacherName} →{" "}
                    {item.substituteTeacherName}
                    {item.note ? ` · ${item.note}` : ""}
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => deleteSubstitution.mutate(item.id)}
                >
                  Cancel
                </Button>
              </li>
            ))}
            {substitutions.data?.data.length === 0 ? (
              <li className="p-3 text-sm text-muted-foreground">
                No substitutions recorded.
              </li>
            ) : null}
          </ul>
        </section>
      ) : null}

      {section === "lesson-plans" ? (
        <ul className="divide-y rounded-md border">
          {(lessonPlans.data?.data ?? []).map((plan: LessonPlanDto) => (
            <li key={plan.id} className="space-y-2 p-4">
              <div>
                <p className="font-medium">
                  {plan.className} · {plan.subjectName} · week of{" "}
                  {dateOnly(plan.weekStarting)}
                </p>
                <p className="text-sm text-muted-foreground">
                  {plan.teacherName} · {plan.topic}
                </p>
                <p className="text-sm">{plan.learningObjectives}</p>
              </div>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  onClick={() =>
                    reviewPlan.mutate({ id: plan.id, decision: "APPROVED" })
                  }
                >
                  Approve
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() =>
                    reviewPlan.mutate({
                      id: plan.id,
                      decision: "REVISION_REQUESTED",
                    })
                  }
                >
                  Request revision
                </Button>
              </div>
            </li>
          ))}
          {lessonPlans.data?.data.length === 0 ? (
            <li className="p-3 text-sm text-muted-foreground">
              No lesson plans are awaiting review.
            </li>
          ) : null}
        </ul>
      ) : null}
    </div>
  );
}
