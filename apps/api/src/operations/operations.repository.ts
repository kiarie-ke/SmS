import { Injectable } from "@nestjs/common";
import type {
  CalendarEventType,
  LessonPlanStatus,
  Weekday,
} from "@school-system/shared";
import type { Prisma } from "../generated/prisma/client";
import { PrismaService } from "../prisma/prisma.service";

const periodInclude = {
  academicYear: {
    select: {
      id: true,
      name: true,
      isCurrent: true,
      startDate: true,
      endDate: true,
    },
  },
} satisfies Prisma.TimetablePeriodInclude;

const entryInclude = {
  period: {
    include: {
      academicYear: {
        select: {
          id: true,
          name: true,
          isCurrent: true,
          startDate: true,
          endDate: true,
        },
      },
    },
  },
  class: {
    select: {
      id: true,
      name: true,
      academicYearId: true,
      classTeacherId: true,
    },
  },
  stream: { select: { id: true, name: true } },
  subject: { select: { id: true, name: true, code: true } },
  teacher: {
    select: { id: true, firstName: true, lastName: true, isDeleted: true },
  },
} satisfies Prisma.TimetableEntryInclude;

const lessonPlanInclude = {
  teacher: {
    select: { id: true, firstName: true, lastName: true, isDeleted: true },
  },
  class: { select: { id: true, name: true, academicYearId: true } },
  subject: { select: { id: true, name: true, code: true } },
  term: {
    select: { id: true, name: true, termNumber: true, academicYearId: true },
  },
  learningOutcome: { select: { id: true, description: true } },
  reviewedBy: { select: { email: true } },
} satisfies Prisma.LessonPlanInclude;

const calendarEventInclude = {
  createdBy: { select: { email: true } },
} satisfies Prisma.SchoolCalendarEventInclude;

const substitutionInclude = {
  timetableEntry: { include: entryInclude },
  substitute: {
    select: { id: true, firstName: true, lastName: true, isDeleted: true },
  },
  period: {
    include: {
      academicYear: {
        select: {
          id: true,
          name: true,
          isCurrent: true,
          startDate: true,
          endDate: true,
        },
      },
    },
  },
} satisfies Prisma.TeacherSubstitutionInclude;

export type PeriodRecord = Prisma.TimetablePeriodGetPayload<{
  include: typeof periodInclude;
}>;
export type TimetableEntryRecord = Prisma.TimetableEntryGetPayload<{
  include: typeof entryInclude;
}>;
export type LessonPlanRecord = Prisma.LessonPlanGetPayload<{
  include: typeof lessonPlanInclude;
}>;
export type CalendarEventRecord = Prisma.SchoolCalendarEventGetPayload<{
  include: typeof calendarEventInclude;
}>;
export type SubstitutionRecord = Prisma.TeacherSubstitutionGetPayload<{
  include: typeof substitutionInclude;
}>;

export interface OperationsPage {
  skip: number;
  take: number;
}

export interface PeriodData {
  academicYearId: string;
  periodNumber: number;
  name: string;
  startTime: string;
  endTime: string;
  isBreak?: boolean;
}

export interface TimetableEntryData {
  periodId: string;
  classId: string;
  streamId: string | null;
  subjectId: string;
  teacherId: string;
  weekday: Weekday;
  venue: string | null;
}

export interface TimetableConflictRecord {
  classId: string;
  streamId: string | null;
  teacherId: string;
  venue: string | null;
}

export interface LessonPlanData {
  teacherId: string;
  classId: string;
  subjectId: string;
  termId: string;
  learningOutcomeId: string | null;
  weekStarting: Date;
  topic: string;
  learningObjectives: string;
  activities: string;
  resources: string | null;
  assessment: string | null;
  reflection: string | null;
}

export interface CalendarEventData {
  academicYearId: string | null;
  title: string;
  description: string | null;
  type: CalendarEventType;
  startDate: Date;
  endDate: Date;
  createdByUserId?: string;
}

export abstract class OperationsRepositoryPort {
  abstract listPeriods(academicYearId?: string): Promise<PeriodRecord[]>;
  abstract findPeriod(id: string): Promise<PeriodRecord | null>;
  abstract createPeriod(data: PeriodData): Promise<PeriodRecord>;
  abstract updatePeriod(
    id: string,
    data: Partial<Omit<PeriodData, "academicYearId">>,
  ): Promise<PeriodRecord>;
  abstract deletePeriod(id: string): Promise<void>;
  abstract findAcademicYear(id: string): Promise<{
    id: string;
    name: string;
    isCurrent: boolean;
    startDate: Date;
    endDate: Date;
  } | null>;
  abstract listPeriodsForYear(
    academicYearId: string,
    excludeId?: string,
  ): Promise<
    Array<{
      id: string;
      periodNumber: number;
      startTime: string;
      endTime: string;
    }>
  >;
  abstract periodHasEntries(id: string): Promise<boolean>;
  abstract listTimetableEntries(params: {
    classId?: string;
    teacherId?: string;
    academicYearId?: string;
    weekday?: Weekday;
    page: OperationsPage;
  }): Promise<{ rows: TimetableEntryRecord[]; total: number }>;
  abstract findTimetableEntry(id: string): Promise<TimetableEntryRecord | null>;
  abstract entryHasSubstitutions(id: string): Promise<boolean>;
  abstract listEntryConflicts(params: {
    periodId: string;
    weekday: Weekday;
    classId: string;
    streamId: string | null;
    teacherId: string;
    venue: string | null;
    excludeId?: string;
  }): Promise<TimetableConflictRecord[]>;
  abstract createTimetableEntry(
    data: TimetableEntryData,
  ): Promise<TimetableEntryRecord>;
  abstract deleteTimetableEntry(id: string): Promise<void>;
  abstract findClass(id: string): Promise<{
    id: string;
    academicYearId: string;
    classTeacherId: string | null;
  } | null>;
  abstract findStreamClassId(id: string): Promise<string | null>;
  abstract findActiveTeacher(id: string): Promise<boolean>;
  abstract hasTeacherAssignment(
    classId: string,
    subjectId: string,
    teacherId: string,
  ): Promise<boolean>;
  abstract findTerm(id: string): Promise<{
    id: string;
    name: string;
    academicYearId: string;
    startDate: Date;
    endDate: Date;
  } | null>;
  abstract findLearningOutcomeSubject(id: string): Promise<string | null>;
  abstract listLessonPlans(params: {
    teacherId?: string;
    classId?: string;
    termId?: string;
    status?: LessonPlanStatus;
    page: OperationsPage;
  }): Promise<{ rows: LessonPlanRecord[]; total: number }>;
  abstract findLessonPlan(id: string): Promise<LessonPlanRecord | null>;
  abstract createLessonPlan(data: LessonPlanData): Promise<LessonPlanRecord>;
  abstract updateLessonPlan(
    id: string,
    data: Partial<
      Omit<LessonPlanData, "teacherId" | "classId" | "subjectId" | "termId">
    >,
  ): Promise<LessonPlanRecord>;
  abstract submitLessonPlan(
    id: string,
    submittedAt: Date,
  ): Promise<LessonPlanRecord>;
  abstract reviewLessonPlan(
    id: string,
    data: {
      status: "APPROVED" | "REVISION_REQUESTED";
      reviewedByUserId: string;
      reviewedAt: Date;
      reviewComment: string | null;
    },
  ): Promise<LessonPlanRecord>;
  abstract listCalendarEvents(params: {
    fromDate?: Date;
    toDate?: Date;
    academicYearId?: string;
    page: OperationsPage;
  }): Promise<{ rows: CalendarEventRecord[]; total: number }>;
  abstract findCalendarEvent(id: string): Promise<CalendarEventRecord | null>;
  abstract createCalendarEvent(
    data: CalendarEventData & { createdByUserId: string },
  ): Promise<CalendarEventRecord>;
  abstract updateCalendarEvent(
    id: string,
    data: Partial<CalendarEventData>,
  ): Promise<CalendarEventRecord>;
  abstract deleteCalendarEvent(id: string): Promise<void>;
  abstract listSubstitutions(params: {
    teacherId?: string;
    fromDate?: Date;
    toDate?: Date;
    page: OperationsPage;
  }): Promise<{ rows: SubstitutionRecord[]; total: number }>;
  abstract findSubstitution(id: string): Promise<SubstitutionRecord | null>;
  abstract findSubstitutionForEntryDate(
    entryId: string,
    date: Date,
  ): Promise<boolean>;
  abstract teacherHasTimetableSlot(
    teacherId: string,
    weekday: Weekday,
    periodId: string,
  ): Promise<boolean>;
  abstract teacherHasSubstitutionAtSlot(
    teacherId: string,
    date: Date,
    periodId: string,
  ): Promise<boolean>;
  abstract createSubstitution(data: {
    timetableEntryId: string;
    substituteTeacherId: string;
    periodId: string;
    date: Date;
    note: string | null;
    createdByUserId: string;
  }): Promise<SubstitutionRecord>;
  abstract deleteSubstitution(id: string): Promise<void>;
}

@Injectable()
export class OperationsRepository extends OperationsRepositoryPort {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  listPeriods(academicYearId?: string) {
    return this.prisma.timetablePeriod.findMany({
      where: academicYearId ? { academicYearId } : {},
      include: periodInclude,
      orderBy: [{ academicYear: { name: "desc" } }, { periodNumber: "asc" }],
    });
  }

  findPeriod(id: string) {
    return this.prisma.timetablePeriod.findUnique({
      where: { id },
      include: periodInclude,
    });
  }

  createPeriod(data: PeriodData) {
    return this.prisma.timetablePeriod.create({ data, include: periodInclude });
  }

  updatePeriod(id: string, data: Partial<Omit<PeriodData, "academicYearId">>) {
    return this.prisma.timetablePeriod.update({
      where: { id },
      data,
      include: periodInclude,
    });
  }

  async deletePeriod(id: string) {
    await this.prisma.timetablePeriod.delete({ where: { id } });
  }

  findAcademicYear(id: string) {
    return this.prisma.academicYear.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        isCurrent: true,
        startDate: true,
        endDate: true,
      },
    });
  }

  listPeriodsForYear(academicYearId: string, excludeId?: string) {
    return this.prisma.timetablePeriod.findMany({
      where: {
        academicYearId,
        ...(excludeId ? { id: { not: excludeId } } : {}),
      },
      select: { id: true, periodNumber: true, startTime: true, endTime: true },
      orderBy: { periodNumber: "asc" },
    });
  }

  async periodHasEntries(id: string) {
    const entry = await this.prisma.timetableEntry.findFirst({
      where: { periodId: id },
      select: { id: true },
    });
    return entry !== null;
  }

  async listTimetableEntries(params: {
    classId?: string;
    teacherId?: string;
    academicYearId?: string;
    weekday?: Weekday;
    page: OperationsPage;
  }) {
    const where: Prisma.TimetableEntryWhereInput = {
      ...(params.classId ? { classId: params.classId } : {}),
      ...(params.teacherId ? { teacherId: params.teacherId } : {}),
      ...(params.weekday ? { weekday: params.weekday } : {}),
      ...(params.academicYearId
        ? { period: { academicYearId: params.academicYearId } }
        : {}),
    };
    const [rows, total] = await this.prisma.$transaction([
      this.prisma.timetableEntry.findMany({
        where,
        include: entryInclude,
        orderBy: [
          { weekday: "asc" },
          { period: { periodNumber: "asc" } },
          { class: { name: "asc" } },
        ],
        skip: params.page.skip,
        take: params.page.take,
      }),
      this.prisma.timetableEntry.count({ where }),
    ]);
    return { rows, total };
  }

  findTimetableEntry(id: string) {
    return this.prisma.timetableEntry.findUnique({
      where: { id },
      include: entryInclude,
    });
  }

  async entryHasSubstitutions(id: string) {
    const substitution = await this.prisma.teacherSubstitution.findFirst({
      where: { timetableEntryId: id },
      select: { id: true },
    });
    return substitution !== null;
  }

  listEntryConflicts(params: {
    periodId: string;
    weekday: Weekday;
    classId: string;
    streamId: string | null;
    teacherId: string;
    venue: string | null;
    excludeId?: string;
  }): Promise<TimetableConflictRecord[]> {
    const classConflict: Prisma.TimetableEntryWhereInput = params.streamId
      ? {
          classId: params.classId,
          OR: [{ streamId: null }, { streamId: params.streamId }],
        }
      : { classId: params.classId };
    const or: Prisma.TimetableEntryWhereInput[] = [
      classConflict,
      { teacherId: params.teacherId },
    ];
    if (params.venue) {
      or.push({ venue: { equals: params.venue, mode: "insensitive" } });
    }
    return this.prisma.timetableEntry.findMany({
      where: {
        periodId: params.periodId,
        weekday: params.weekday,
        ...(params.excludeId ? { id: { not: params.excludeId } } : {}),
        OR: or,
      },
      select: { classId: true, streamId: true, teacherId: true, venue: true },
    });
  }

  createTimetableEntry(data: TimetableEntryData) {
    return this.prisma.timetableEntry.create({ data, include: entryInclude });
  }

  async deleteTimetableEntry(id: string) {
    await this.prisma.timetableEntry.delete({ where: { id } });
  }

  findClass(id: string) {
    return this.prisma.class.findUnique({
      where: { id },
      select: { id: true, academicYearId: true, classTeacherId: true },
    });
  }

  async findStreamClassId(id: string) {
    const stream = await this.prisma.stream.findUnique({
      where: { id },
      select: { classId: true },
    });
    return stream?.classId ?? null;
  }

  async findActiveTeacher(id: string) {
    const teacher = await this.prisma.teacher.findFirst({
      where: { id, isDeleted: false },
      select: { id: true },
    });
    return teacher !== null;
  }

  async hasTeacherAssignment(
    classId: string,
    subjectId: string,
    teacherId: string,
  ) {
    const assignment = await this.prisma.classSubject.findUnique({
      where: { classId_subjectId: { classId, subjectId } },
      select: { teacherId: true },
    });
    return assignment?.teacherId === teacherId;
  }

  findTerm(id: string) {
    return this.prisma.term.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        academicYearId: true,
        startDate: true,
        endDate: true,
      },
    });
  }

  async findLearningOutcomeSubject(id: string) {
    const outcome = await this.prisma.learningOutcome.findUnique({
      where: { id },
      select: {
        subStrand: { select: { strand: { select: { subjectId: true } } } },
      },
    });
    return outcome?.subStrand.strand.subjectId ?? null;
  }

  async listLessonPlans(params: {
    teacherId?: string;
    classId?: string;
    termId?: string;
    status?: LessonPlanStatus;
    page: OperationsPage;
  }) {
    const where: Prisma.LessonPlanWhereInput = {
      ...(params.teacherId ? { teacherId: params.teacherId } : {}),
      ...(params.classId ? { classId: params.classId } : {}),
      ...(params.termId ? { termId: params.termId } : {}),
      ...(params.status ? { status: params.status } : {}),
    };
    const [rows, total] = await this.prisma.$transaction([
      this.prisma.lessonPlan.findMany({
        where,
        include: lessonPlanInclude,
        orderBy: [{ weekStarting: "desc" }, { class: { name: "asc" } }],
        skip: params.page.skip,
        take: params.page.take,
      }),
      this.prisma.lessonPlan.count({ where }),
    ]);
    return { rows, total };
  }

  findLessonPlan(id: string) {
    return this.prisma.lessonPlan.findUnique({
      where: { id },
      include: lessonPlanInclude,
    });
  }

  createLessonPlan(data: LessonPlanData) {
    return this.prisma.lessonPlan.create({ data, include: lessonPlanInclude });
  }

  updateLessonPlan(
    id: string,
    data: Partial<
      Omit<LessonPlanData, "teacherId" | "classId" | "subjectId" | "termId">
    >,
  ) {
    return this.prisma.lessonPlan.update({
      where: { id },
      data,
      include: lessonPlanInclude,
    });
  }

  submitLessonPlan(id: string, submittedAt: Date) {
    return this.prisma.lessonPlan.update({
      where: { id },
      data: {
        status: "SUBMITTED",
        submittedAt,
        reviewedAt: null,
        reviewedByUserId: null,
        reviewComment: null,
      },
      include: lessonPlanInclude,
    });
  }

  reviewLessonPlan(
    id: string,
    data: {
      status: "APPROVED" | "REVISION_REQUESTED";
      reviewedByUserId: string;
      reviewedAt: Date;
      reviewComment: string | null;
    },
  ) {
    return this.prisma.lessonPlan.update({
      where: { id },
      data,
      include: lessonPlanInclude,
    });
  }

  async listCalendarEvents(params: {
    fromDate?: Date;
    toDate?: Date;
    academicYearId?: string;
    page: OperationsPage;
  }) {
    const where: Prisma.SchoolCalendarEventWhereInput = {
      ...(params.academicYearId
        ? { academicYearId: params.academicYearId }
        : {}),
      ...(params.fromDate || params.toDate
        ? {
            ...(params.fromDate ? { endDate: { gte: params.fromDate } } : {}),
            ...(params.toDate ? { startDate: { lte: params.toDate } } : {}),
          }
        : {}),
    };
    const [rows, total] = await this.prisma.$transaction([
      this.prisma.schoolCalendarEvent.findMany({
        where,
        include: calendarEventInclude,
        orderBy: [{ startDate: "asc" }, { title: "asc" }],
        skip: params.page.skip,
        take: params.page.take,
      }),
      this.prisma.schoolCalendarEvent.count({ where }),
    ]);
    return { rows, total };
  }

  findCalendarEvent(id: string) {
    return this.prisma.schoolCalendarEvent.findUnique({
      where: { id },
      include: calendarEventInclude,
    });
  }

  createCalendarEvent(data: CalendarEventData & { createdByUserId: string }) {
    return this.prisma.schoolCalendarEvent.create({
      data,
      include: calendarEventInclude,
    });
  }

  updateCalendarEvent(id: string, data: Partial<CalendarEventData>) {
    return this.prisma.schoolCalendarEvent.update({
      where: { id },
      data: {
        ...(data.academicYearId !== undefined
          ? { academicYearId: data.academicYearId }
          : {}),
        ...(data.title !== undefined ? { title: data.title } : {}),
        ...(data.description !== undefined
          ? { description: data.description }
          : {}),
        ...(data.type !== undefined ? { type: data.type } : {}),
        ...(data.startDate !== undefined ? { startDate: data.startDate } : {}),
        ...(data.endDate !== undefined ? { endDate: data.endDate } : {}),
      },
      include: calendarEventInclude,
    });
  }

  async deleteCalendarEvent(id: string) {
    await this.prisma.schoolCalendarEvent.delete({ where: { id } });
  }

  async listSubstitutions(params: {
    teacherId?: string;
    fromDate?: Date;
    toDate?: Date;
    page: OperationsPage;
  }) {
    const where: Prisma.TeacherSubstitutionWhereInput = {
      ...(params.teacherId
        ? {
            OR: [
              { substituteTeacherId: params.teacherId },
              { timetableEntry: { teacherId: params.teacherId } },
            ],
          }
        : {}),
      ...(params.fromDate || params.toDate
        ? {
            ...(params.fromDate ? { date: { gte: params.fromDate } } : {}),
            ...(params.toDate ? { date: { lte: params.toDate } } : {}),
          }
        : {}),
    };
    const [rows, total] = await this.prisma.$transaction([
      this.prisma.teacherSubstitution.findMany({
        where,
        include: substitutionInclude,
        orderBy: [{ date: "asc" }, { period: { periodNumber: "asc" } }],
        skip: params.page.skip,
        take: params.page.take,
      }),
      this.prisma.teacherSubstitution.count({ where }),
    ]);
    return { rows, total };
  }

  findSubstitution(id: string) {
    return this.prisma.teacherSubstitution.findUnique({
      where: { id },
      include: substitutionInclude,
    });
  }

  async findSubstitutionForEntryDate(entryId: string, date: Date) {
    const row = await this.prisma.teacherSubstitution.findUnique({
      where: { timetableEntryId_date: { timetableEntryId: entryId, date } },
      select: { id: true },
    });
    return row !== null;
  }

  async teacherHasSubstitutionAtSlot(
    teacherId: string,
    date: Date,
    periodId: string,
  ) {
    const row = await this.prisma.teacherSubstitution.findFirst({
      where: { substituteTeacherId: teacherId, date, periodId },
      select: { id: true },
    });
    return row !== null;
  }

  async teacherHasTimetableSlot(
    teacherId: string,
    weekday: Weekday,
    periodId: string,
  ) {
    const row = await this.prisma.timetableEntry.findFirst({
      where: { teacherId, weekday, periodId },
      select: { id: true },
    });
    return row !== null;
  }

  createSubstitution(data: {
    timetableEntryId: string;
    substituteTeacherId: string;
    periodId: string;
    date: Date;
    note: string | null;
    createdByUserId: string;
  }) {
    return this.prisma.teacherSubstitution.create({
      data,
      include: substitutionInclude,
    });
  }

  async deleteSubstitution(id: string) {
    await this.prisma.teacherSubstitution.delete({ where: { id } });
  }
}
