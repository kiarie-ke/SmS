-- CreateEnum
CREATE TYPE "Weekday" AS ENUM ('MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY');

-- CreateEnum
CREATE TYPE "LessonPlanStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'APPROVED', 'REVISION_REQUESTED');

-- CreateEnum
CREATE TYPE "CalendarEventType" AS ENUM ('TERM', 'HOLIDAY', 'EXAM', 'MEETING', 'SCHOOL_EVENT', 'OTHER');

-- CreateTable
CREATE TABLE "timetable_periods" (
    "id" UUID NOT NULL,
    "academicYearId" UUID NOT NULL,
    "periodNumber" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "startTime" VARCHAR(5) NOT NULL,
    "endTime" VARCHAR(5) NOT NULL,
    "isBreak" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "timetable_periods_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "timetable_entries" (
    "id" UUID NOT NULL,
    "periodId" UUID NOT NULL,
    "classId" UUID NOT NULL,
    "streamId" UUID,
    "subjectId" UUID NOT NULL,
    "teacherId" UUID NOT NULL,
    "weekday" "Weekday" NOT NULL,
    "venue" VARCHAR(100),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "timetable_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lesson_plans" (
    "id" UUID NOT NULL,
    "teacherId" UUID NOT NULL,
    "classId" UUID NOT NULL,
    "subjectId" UUID NOT NULL,
    "termId" UUID NOT NULL,
    "learningOutcomeId" UUID,
    "weekStarting" DATE NOT NULL,
    "topic" VARCHAR(200) NOT NULL,
    "learningObjectives" TEXT NOT NULL,
    "activities" TEXT NOT NULL,
    "resources" TEXT,
    "assessment" TEXT,
    "reflection" TEXT,
    "status" "LessonPlanStatus" NOT NULL DEFAULT 'DRAFT',
    "submittedAt" TIMESTAMP(3),
    "reviewedByUserId" UUID,
    "reviewedAt" TIMESTAMP(3),
    "reviewComment" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "lesson_plans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "school_calendar_events" (
    "id" UUID NOT NULL,
    "academicYearId" UUID,
    "title" VARCHAR(200) NOT NULL,
    "description" TEXT,
    "type" "CalendarEventType" NOT NULL,
    "startDate" DATE NOT NULL,
    "endDate" DATE NOT NULL,
    "createdByUserId" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "school_calendar_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "teacher_substitutions" (
    "id" UUID NOT NULL,
    "timetableEntryId" UUID NOT NULL,
    "substituteTeacherId" UUID NOT NULL,
    "periodId" UUID NOT NULL,
    "date" DATE NOT NULL,
    "note" VARCHAR(500),
    "createdByUserId" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "teacher_substitutions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "timetable_periods_academicYearId_idx" ON "timetable_periods"("academicYearId");

-- CreateIndex
CREATE UNIQUE INDEX "timetable_periods_academicYearId_periodNumber_key" ON "timetable_periods"("academicYearId", "periodNumber");

-- CreateIndex
CREATE INDEX "timetable_entries_classId_weekday_periodId_idx" ON "timetable_entries"("classId", "weekday", "periodId");

-- CreateIndex
CREATE INDEX "timetable_entries_streamId_weekday_periodId_idx" ON "timetable_entries"("streamId", "weekday", "periodId");

-- CreateIndex
CREATE INDEX "timetable_entries_teacherId_weekday_periodId_idx" ON "timetable_entries"("teacherId", "weekday", "periodId");

-- CreateIndex
CREATE UNIQUE INDEX "timetable_entries_teacherId_weekday_periodId_key" ON "timetable_entries"("teacherId", "weekday", "periodId");

-- CreateIndex
CREATE INDEX "lesson_plans_classId_subjectId_weekStarting_idx" ON "lesson_plans"("classId", "subjectId", "weekStarting");

-- CreateIndex
CREATE INDEX "lesson_plans_status_weekStarting_idx" ON "lesson_plans"("status", "weekStarting");

-- CreateIndex
CREATE UNIQUE INDEX "lesson_plans_teacherId_classId_subjectId_termId_weekStartin_key" ON "lesson_plans"("teacherId", "classId", "subjectId", "termId", "weekStarting");

-- CreateIndex
CREATE INDEX "school_calendar_events_startDate_endDate_idx" ON "school_calendar_events"("startDate", "endDate");

-- CreateIndex
CREATE INDEX "school_calendar_events_academicYearId_idx" ON "school_calendar_events"("academicYearId");

-- CreateIndex
CREATE INDEX "teacher_substitutions_date_idx" ON "teacher_substitutions"("date");

-- CreateIndex
CREATE UNIQUE INDEX "teacher_substitutions_timetableEntryId_date_key" ON "teacher_substitutions"("timetableEntryId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "teacher_substitutions_substituteTeacherId_date_periodId_key" ON "teacher_substitutions"("substituteTeacherId", "date", "periodId");

-- AddForeignKey
ALTER TABLE "timetable_periods" ADD CONSTRAINT "timetable_periods_academicYearId_fkey" FOREIGN KEY ("academicYearId") REFERENCES "academic_years"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "timetable_entries" ADD CONSTRAINT "timetable_entries_periodId_fkey" FOREIGN KEY ("periodId") REFERENCES "timetable_periods"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "timetable_entries" ADD CONSTRAINT "timetable_entries_classId_fkey" FOREIGN KEY ("classId") REFERENCES "classes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "timetable_entries" ADD CONSTRAINT "timetable_entries_streamId_fkey" FOREIGN KEY ("streamId") REFERENCES "streams"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "timetable_entries" ADD CONSTRAINT "timetable_entries_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "subjects"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "timetable_entries" ADD CONSTRAINT "timetable_entries_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "teachers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lesson_plans" ADD CONSTRAINT "lesson_plans_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "teachers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lesson_plans" ADD CONSTRAINT "lesson_plans_classId_fkey" FOREIGN KEY ("classId") REFERENCES "classes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lesson_plans" ADD CONSTRAINT "lesson_plans_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "subjects"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lesson_plans" ADD CONSTRAINT "lesson_plans_termId_fkey" FOREIGN KEY ("termId") REFERENCES "terms"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lesson_plans" ADD CONSTRAINT "lesson_plans_learningOutcomeId_fkey" FOREIGN KEY ("learningOutcomeId") REFERENCES "learning_outcomes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lesson_plans" ADD CONSTRAINT "lesson_plans_reviewedByUserId_fkey" FOREIGN KEY ("reviewedByUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "school_calendar_events" ADD CONSTRAINT "school_calendar_events_academicYearId_fkey" FOREIGN KEY ("academicYearId") REFERENCES "academic_years"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "school_calendar_events" ADD CONSTRAINT "school_calendar_events_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "teacher_substitutions" ADD CONSTRAINT "teacher_substitutions_timetableEntryId_fkey" FOREIGN KEY ("timetableEntryId") REFERENCES "timetable_entries"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "teacher_substitutions" ADD CONSTRAINT "teacher_substitutions_substituteTeacherId_fkey" FOREIGN KEY ("substituteTeacherId") REFERENCES "teachers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "teacher_substitutions" ADD CONSTRAINT "teacher_substitutions_periodId_fkey" FOREIGN KEY ("periodId") REFERENCES "timetable_periods"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "teacher_substitutions" ADD CONSTRAINT "teacher_substitutions_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
