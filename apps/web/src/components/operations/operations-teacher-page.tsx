"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { PageHeader } from "@/components/admin/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useApiQuery } from "@/lib/api/use-api-query";
import { toErrorMessage } from "@/lib/api/errors";
import {
  classesControllerList,
  operationsControllerCreateLessonPlan,
  operationsControllerListLessonPlans,
  operationsControllerListTimetable,
  operationsControllerSubmitLessonPlan,
  operationsControllerUpdateLessonPlan,
  subjectsControllerList,
  termsControllerList,
} from "@/lib/api/generated/endpoints";
import type {
  LessonPlanDto,
  TimetableEntryDto,
} from "@/lib/api/generated/models";

const DAY_ORDER = [
  "MONDAY",
  "TUESDAY",
  "WEDNESDAY",
  "THURSDAY",
  "FRIDAY",
  "SATURDAY",
  "SUNDAY",
];

function currentMonday() {
  const today = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Africa/Nairobi",
  }).format(new Date());
  const date = new Date(`${today}T00:00:00.000Z`);
  const offset = (date.getUTCDay() + 6) % 7;
  date.setUTCDate(date.getUTCDate() - offset);
  return date.toISOString().slice(0, 10);
}

export function OperationsTeacherPage() {
  const queryClient = useQueryClient();
  const [section, setSection] = useState<"timetable" | "plans">("timetable");
  const [selectedPlan, setSelectedPlan] = useState<LessonPlanDto | null>(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [classId, setClassId] = useState("");
  const [subjectId, setSubjectId] = useState("");
  const [termId, setTermId] = useState("");
  const [weekStarting, setWeekStarting] = useState(currentMonday());
  const [topic, setTopic] = useState("");
  const [learningObjectives, setLearningObjectives] = useState("");
  const [activities, setActivities] = useState("");
  const [resources, setResources] = useState("");
  const [assessment, setAssessment] = useState("");

  const classes = useApiQuery(["classes", "operations", "teacher"], () =>
    classesControllerList({ limit: 100 }),
  );
  const subjects = useApiQuery(["subjects", "operations", "teacher"], () =>
    subjectsControllerList({ limit: 100 }),
  );
  const terms = useApiQuery(["terms", "operations", "teacher"], () =>
    termsControllerList({ limit: 100 }),
  );
  const timetable = useApiQuery(["operations", "timetable", "teacher"], () =>
    operationsControllerListTimetable({ limit: 100 }),
  );
  const lessonPlans = useApiQuery(
    ["operations", "lesson-plans", "teacher"],
    () => operationsControllerListLessonPlans({ limit: 100 }),
  );

  const entries = timetable.data?.data ?? [];
  const byDay = useMemo(
    () =>
      DAY_ORDER.map((day) => ({
        day,
        entries: entries
          .filter((entry) => entry.weekday === day)
          .sort((a, b) => a.period.periodNumber - b.period.periodNumber),
      })),
    [entries],
  );

  const resetForm = () => {
    setSelectedPlan(null);
    setClassId("");
    setSubjectId("");
    setTermId("");
    setWeekStarting(currentMonday());
    setTopic("");
    setLearningObjectives("");
    setActivities("");
    setResources("");
    setAssessment("");
  };
  const save = useMutation({
    mutationFn: async () => {
      if (selectedPlan) {
        return operationsControllerUpdateLessonPlan(selectedPlan.id, {
          weekStarting,
          topic,
          learningObjectives,
          activities,
          resources,
          assessment,
        });
      }
      return operationsControllerCreateLessonPlan({
        classId,
        subjectId,
        termId,
        weekStarting,
        topic,
        learningObjectives,
        activities,
        ...(resources ? { resources } : {}),
        ...(assessment ? { assessment } : {}),
      });
    },
    onSuccess: async () => {
      setError("");
      setSuccess(
        selectedPlan ? "Lesson plan updated." : "Lesson plan saved as a draft.",
      );
      resetForm();
      await queryClient.invalidateQueries({
        queryKey: ["operations", "lesson-plans"],
      });
    },
    onError: (cause) => {
      setSuccess("");
      setError(toErrorMessage(cause, "Could not save the lesson plan."));
    },
  });
  const submit = useMutation({
    mutationFn: (id: string) => operationsControllerSubmitLessonPlan(id),
    onSuccess: async () => {
      setError("");
      setSuccess("Lesson plan submitted for review.");
      await queryClient.invalidateQueries({
        queryKey: ["operations", "lesson-plans"],
      });
    },
    onError: (cause) => {
      setSuccess("");
      setError(toErrorMessage(cause, "Could not submit the lesson plan."));
    },
  });

  const edit = (plan: LessonPlanDto) => {
    setSelectedPlan(plan);
    setWeekStarting(plan.weekStarting.slice(0, 10));
    setTopic(plan.topic);
    setLearningObjectives(plan.learningObjectives);
    setActivities(plan.activities);
    setResources(plan.resources ?? "");
    setAssessment(plan.assessment ?? "");
  };

  return (
    <div>
      <PageHeader
        title="Teaching operations"
        description="View your assigned weekly timetable and prepare weekly lesson plans for review."
      />
      {error ? (
        <p role="alert" className="mb-3 text-sm text-destructive">
          {error}
        </p>
      ) : null}
      {success ? (
        <p role="status" className="mb-3 text-sm text-green-700">
          {success}
        </p>
      ) : null}
      <div className="mb-4 flex gap-2">
        <Button
          variant={section === "timetable" ? "default" : "outline"}
          onClick={() => setSection("timetable")}
        >
          My timetable
        </Button>
        <Button
          variant={section === "plans" ? "default" : "outline"}
          onClick={() => setSection("plans")}
        >
          Lesson plans
        </Button>
      </div>

      {section === "timetable" ? (
        <div className="space-y-4">
          {byDay.map(({ day, entries: dayEntries }) => (
            <section key={day} className="overflow-hidden rounded-lg border">
              <h2 className="bg-muted/50 px-3 py-2 font-semibold">{day}</h2>
              {dayEntries.length ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-muted-foreground">
                        <th className="p-2">Time</th>
                        <th className="p-2">Class / stream</th>
                        <th className="p-2">Subject</th>
                        <th className="p-2">Venue</th>
                      </tr>
                    </thead>
                    <tbody>
                      {dayEntries.map((entry: TimetableEntryDto) => (
                        <tr key={entry.id} className="border-t">
                          <td className="p-2">
                            {entry.period.startTime}–{entry.period.endTime}
                          </td>
                          <td className="p-2">
                            {entry.className}
                            {entry.streamName ? ` · ${entry.streamName}` : ""}
                          </td>
                          <td className="p-2">{entry.subjectName}</td>
                          <td className="p-2">{entry.venue || "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="p-3 text-sm text-muted-foreground">
                  No lessons scheduled.
                </p>
              )}
            </section>
          ))}
          {timetable.error ? (
            <p role="alert" className="text-sm text-destructive">
              {toErrorMessage(
                timetable.error,
                "Could not load your timetable.",
              )}
            </p>
          ) : null}
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1.5fr)_minmax(18rem,1fr)]">
          <form
            className="space-y-3 rounded-lg border p-4"
            onSubmit={(event) => {
              event.preventDefault();
              setSuccess("");
              setError("");
              save.mutate();
            }}
          >
            <h2 className="font-semibold">
              {selectedPlan ? "Edit lesson plan" : "Create weekly lesson plan"}
            </h2>
            {!selectedPlan ? (
              <div className="grid gap-3 sm:grid-cols-3">
                <label className="text-sm">
                  Class
                  <select
                    id="plan-class"
                    value={classId}
                    onChange={(event) => setClassId(event.target.value)}
                    className="mt-1 h-8 w-full rounded-md border bg-background px-2"
                    required
                  >
                    <option value="">Select</option>
                    {(classes.data?.data ?? []).map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="text-sm">
                  Subject
                  <select
                    id="plan-subject"
                    value={subjectId}
                    onChange={(event) => setSubjectId(event.target.value)}
                    className="mt-1 h-8 w-full rounded-md border bg-background px-2"
                    required
                  >
                    <option value="">Select</option>
                    {(subjects.data?.data ?? []).map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="text-sm">
                  Term
                  <select
                    id="plan-term"
                    value={termId}
                    onChange={(event) => setTermId(event.target.value)}
                    className="mt-1 h-8 w-full rounded-md border bg-background px-2"
                    required
                  >
                    <option value="">Select</option>
                    {(terms.data?.data ?? []).map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.name}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                {selectedPlan.className} · {selectedPlan.subjectName} ·{" "}
                {selectedPlan.termName}
              </p>
            )}
            <label className="block text-sm">
              Week starting (Monday)
              <Input
                type="date"
                value={weekStarting}
                onChange={(event) => setWeekStarting(event.target.value)}
                required
              />
            </label>
            <label className="block text-sm">
              Topic
              <Input
                value={topic}
                onChange={(event) => setTopic(event.target.value)}
                maxLength={200}
                required
              />
            </label>
            <label className="block text-sm">
              Learning objectives
              <textarea
                className="mt-1 min-h-20 w-full rounded-md border bg-background p-2 text-sm"
                value={learningObjectives}
                onChange={(event) => setLearningObjectives(event.target.value)}
                required
              />
            </label>
            <label className="block text-sm">
              Activities
              <textarea
                className="mt-1 min-h-24 w-full rounded-md border bg-background p-2 text-sm"
                value={activities}
                onChange={(event) => setActivities(event.target.value)}
                required
              />
            </label>
            <label className="block text-sm">
              Resources (optional)
              <textarea
                className="mt-1 min-h-16 w-full rounded-md border bg-background p-2 text-sm"
                value={resources}
                onChange={(event) => setResources(event.target.value)}
              />
            </label>
            <label className="block text-sm">
              Assessment (optional)
              <textarea
                className="mt-1 min-h-16 w-full rounded-md border bg-background p-2 text-sm"
                value={assessment}
                onChange={(event) => setAssessment(event.target.value)}
              />
            </label>
            <div className="flex flex-wrap gap-2">
              <Button type="submit" disabled={save.isPending}>
                {save.isPending
                  ? "Saving…"
                  : selectedPlan
                    ? "Update draft"
                    : "Save draft"}
              </Button>
              {selectedPlan ? (
                <Button type="button" variant="outline" onClick={resetForm}>
                  Cancel editing
                </Button>
              ) : null}
            </div>
          </form>

          <section>
            <h2 className="mb-3 font-semibold">My saved lesson plans</h2>
            <ul className="divide-y rounded-lg border">
              {(lessonPlans.data?.data ?? []).map((plan: LessonPlanDto) => (
                <li key={plan.id} className="space-y-2 p-3">
                  <div>
                    <p className="font-medium">
                      {plan.className} · {plan.subjectName}
                    </p>
                    <p className="text-sm">
                      {plan.topic} · week of {plan.weekStarting.slice(0, 10)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Status: {plan.status}
                    </p>
                    {plan.reviewComment ? (
                      <p className="text-sm text-amber-700">
                        Reviewer: {plan.reviewComment}
                      </p>
                    ) : null}
                  </div>
                  {plan.status === "DRAFT" ||
                  plan.status === "REVISION_REQUESTED" ? (
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => edit(plan)}
                      >
                        Edit
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => submit.mutate(plan.id)}
                        disabled={submit.isPending}
                      >
                        Submit
                      </Button>
                    </div>
                  ) : null}
                </li>
              ))}
              {lessonPlans.data?.data.length === 0 ? (
                <li className="p-3 text-sm text-muted-foreground">
                  No lesson plans yet.
                </li>
              ) : null}
            </ul>
            {lessonPlans.error ? (
              <p role="alert" className="mt-2 text-sm text-destructive">
                {toErrorMessage(
                  lessonPlans.error,
                  "Could not load lesson plans.",
                )}
              </p>
            ) : null}
          </section>
        </div>
      )}
    </div>
  );
}
