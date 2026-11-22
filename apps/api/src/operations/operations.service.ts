import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { type LessonPlanStatus, type Weekday } from "@school-system/shared";
import type { AuthenticatedUser } from "../common/auth-user";
import { paginate } from "../common/pagination";
import { ScopingService } from "../scoping/scoping.service";
import {
  CalendarQueryDto,
  CreateCalendarEventDto,
  CreateLessonPlanDto,
  CreatePeriodDto,
  CreateSubstitutionDto,
  CreateTimetableEntryDto,
  LessonPlanQueryDto,
  PeriodQueryDto,
  ReviewLessonPlanDto,
  SubstitutionQueryDto,
  TimetableQueryDto,
  UpdateCalendarEventDto,
  UpdateLessonPlanDto,
  UpdatePeriodDto,
} from "./operations.dto";
import {
  OperationsRepositoryPort,
  type CalendarEventData,
  type LessonPlanData,
  type PeriodData,
  type TimetableEntryData,
} from "./operations.repository";

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const DAY_BY_UTC_INDEX: readonly Weekday[] = [
  "SUNDAY",
  "MONDAY",
  "TUESDAY",
  "WEDNESDAY",
  "THURSDAY",
  "FRIDAY",
  "SATURDAY",
];

function parseDateOnly(value: string, label: string): Date {
  if (!DATE_PATTERN.test(value))
    throw new BadRequestException(`${label} must use YYYY-MM-DD format`);
  const date = new Date(`${value}T00:00:00.000Z`);
  if (
    Number.isNaN(date.getTime()) ||
    date.toISOString().slice(0, 10) !== value
  ) {
    throw new BadRequestException(`${label} is not a valid date`);
  }
  return date;
}

function timeToMinutes(value: string): number {
  const [hours, minutes] = value.split(":").map(Number);
  return hours * 60 + minutes;
}

function ensureTimeRange(startTime: string, endTime: string): void {
  if (timeToMinutes(startTime) >= timeToMinutes(endTime)) {
    throw new BadRequestException("End time must be later than start time");
  }
}

function ensureMonday(value: string): Date {
  const date = parseDateOnly(value, "weekStarting");
  if (date.getUTCDay() !== 1) {
    throw new BadRequestException("weekStarting must be a Monday");
  }
  return date;
}

function ensureDateRange(fromDate?: string, toDate?: string): void {
  if (fromDate && toDate && fromDate > toDate) {
    throw new BadRequestException("fromDate must be on or before toDate");
  }
}

@Injectable()
export class OperationsService {
  constructor(
    private readonly operations: OperationsRepositoryPort,
    @Inject(ScopingService)
    private readonly scoping: Pick<ScopingService, "teacherIdForUser">,
  ) {}

  async listPeriods(query: PeriodQueryDto) {
    const rows = await this.operations.listPeriods(query.academicYearId);
    return paginate(rows, rows.length, query);
  }

  async createPeriod(dto: CreatePeriodDto) {
    const year = await this.requireAcademicYear(dto.academicYearId);
    ensureTimeRange(dto.startTime, dto.endTime);
    await this.ensurePeriodDoesNotOverlap(year.id, dto.startTime, dto.endTime);
    const data: PeriodData = {
      academicYearId: year.id,
      periodNumber: dto.periodNumber,
      name: dto.name.trim(),
      startTime: dto.startTime,
      endTime: dto.endTime,
      isBreak: dto.isBreak ?? false,
    };
    return this.operations.createPeriod(data);
  }

  async updatePeriod(id: string, dto: UpdatePeriodDto) {
    const current = await this.operations.findPeriod(id);
    if (!current) throw new NotFoundException("Timetable period not found");
    const startTime = dto.startTime ?? current.startTime;
    const endTime = dto.endTime ?? current.endTime;
    ensureTimeRange(startTime, endTime);
    if (
      dto.isBreak === true &&
      !current.isBreak &&
      (await this.operations.periodHasEntries(id))
    ) {
      throw new ConflictException(
        "Remove timetable entries before marking this period as a break",
      );
    }
    await this.ensurePeriodDoesNotOverlap(
      current.academicYearId,
      startTime,
      endTime,
      id,
    );
    return this.operations.updatePeriod(id, {
      ...(dto.periodNumber !== undefined
        ? { periodNumber: dto.periodNumber }
        : {}),
      ...(dto.name !== undefined ? { name: dto.name.trim() } : {}),
      ...(dto.startTime !== undefined ? { startTime: dto.startTime } : {}),
      ...(dto.endTime !== undefined ? { endTime: dto.endTime } : {}),
      ...(dto.isBreak !== undefined ? { isBreak: dto.isBreak } : {}),
    });
  }

  async deletePeriod(id: string) {
    if (!(await this.operations.findPeriod(id))) {
      throw new NotFoundException("Timetable period not found");
    }
    if (await this.operations.periodHasEntries(id)) {
      throw new ConflictException(
        "Remove timetable entries before deleting this period",
      );
    }
    await this.operations.deletePeriod(id);
    return { message: "Timetable period deleted" };
  }

  async listTimetable(user: AuthenticatedUser, query: TimetableQueryDto) {
    const teacherId =
      user.role === "TEACHER" ? await this.requireTeacherId(user) : undefined;
    const { rows, total } = await this.operations.listTimetableEntries({
      classId: query.classId,
      academicYearId: query.academicYearId,
      weekday: query.weekday,
      teacherId,
      page: { skip: query.skip, take: query.limit },
    });
    return paginate(rows, total, query);
  }

  async createTimetableEntry(dto: CreateTimetableEntryDto) {
    const period = await this.operations.findPeriod(dto.periodId);
    if (!period) throw new NotFoundException("Timetable period not found");
    if (period.isBreak)
      throw new BadRequestException(
        "A timetable entry cannot use a break period",
      );

    const schoolClass = await this.operations.findClass(dto.classId);
    if (!schoolClass) throw new NotFoundException("Class not found");
    if (schoolClass.academicYearId !== period.academicYearId) {
      throw new BadRequestException(
        "The period and class must belong to the same academic year",
      );
    }
    if (dto.streamId) {
      const streamClassId = await this.operations.findStreamClassId(
        dto.streamId,
      );
      if (!streamClassId) throw new NotFoundException("Stream not found");
      if (streamClassId !== dto.classId) {
        throw new BadRequestException(
          "The selected stream does not belong to this class",
        );
      }
    }
    if (!(await this.operations.findActiveTeacher(dto.teacherId))) {
      throw new NotFoundException("Active teacher not found");
    }
    if (
      !(await this.operations.hasTeacherAssignment(
        dto.classId,
        dto.subjectId,
        dto.teacherId,
      ))
    ) {
      throw new BadRequestException(
        "The teacher must be assigned to this class and subject",
      );
    }

    const data: TimetableEntryData = {
      periodId: dto.periodId,
      classId: dto.classId,
      streamId: dto.streamId ?? null,
      subjectId: dto.subjectId,
      teacherId: dto.teacherId,
      weekday: dto.weekday,
      venue: dto.venue?.trim() || null,
    };
    const conflicts = await this.operations.listEntryConflicts({
      ...data,
    });
    if (conflicts.some((entry) => entry.classId === data.classId)) {
      throw new ConflictException(
        "The class or stream already has a lesson at this time",
      );
    }
    if (conflicts.some((entry) => entry.teacherId === data.teacherId)) {
      throw new ConflictException(
        "The teacher is already scheduled at this time",
      );
    }
    if (
      data.venue &&
      conflicts.some(
        (entry) => entry.venue?.toLowerCase() === data.venue?.toLowerCase(),
      )
    ) {
      throw new ConflictException("The venue is already booked at this time");
    }
    return this.operations.createTimetableEntry(data);
  }

  async deleteTimetableEntry(id: string) {
    if (!(await this.operations.findTimetableEntry(id))) {
      throw new NotFoundException("Timetable entry not found");
    }
    if (await this.operations.entryHasSubstitutions(id)) {
      throw new ConflictException(
        "Cancel recorded substitutions before removing this timetable entry",
      );
    }
    await this.operations.deleteTimetableEntry(id);
    return { message: "Timetable entry deleted" };
  }

  async listLessonPlans(user: AuthenticatedUser, query: LessonPlanQueryDto) {
    const teacherId =
      user.role === "TEACHER" ? await this.requireTeacherId(user) : undefined;
    const { rows, total } = await this.operations.listLessonPlans({
      teacherId,
      classId: query.classId,
      termId: query.termId,
      status: query.status,
      page: { skip: query.skip, take: query.limit },
    });
    return paginate(rows, total, query);
  }

  async createLessonPlan(user: AuthenticatedUser, dto: CreateLessonPlanDto) {
    const teacherId = await this.requireTeacherId(user);
    const term = await this.requireTerm(dto.termId);
    await this.assertPlanAssignment(
      teacherId,
      dto.classId,
      dto.subjectId,
      term.academicYearId,
    );
    const weekStarting = ensureMonday(dto.weekStarting);
    this.assertWeekInTerm(weekStarting, term.startDate, term.endDate);
    await this.assertLearningOutcome(dto.learningOutcomeId, dto.subjectId);
    const data: LessonPlanData = {
      teacherId,
      classId: dto.classId,
      subjectId: dto.subjectId,
      termId: dto.termId,
      learningOutcomeId: dto.learningOutcomeId ?? null,
      weekStarting,
      topic: dto.topic.trim(),
      learningObjectives: dto.learningObjectives.trim(),
      activities: dto.activities.trim(),
      resources: dto.resources?.trim() || null,
      assessment: dto.assessment?.trim() || null,
      reflection: null,
    };
    return this.operations.createLessonPlan(data);
  }

  async updateLessonPlan(
    user: AuthenticatedUser,
    id: string,
    dto: UpdateLessonPlanDto,
  ) {
    const teacherId = await this.requireTeacherId(user);
    const current = await this.requireLessonPlan(id);
    if (current.teacherId !== teacherId)
      throw new ForbiddenException("You can only edit your own lesson plans");
    if (current.status !== "DRAFT" && current.status !== "REVISION_REQUESTED") {
      throw new ConflictException(
        "Only draft or returned lesson plans can be edited",
      );
    }

    let weekStarting: Date | undefined;
    if (dto.weekStarting !== undefined) {
      weekStarting = ensureMonday(dto.weekStarting);
      const term = await this.requireTerm(current.termId);
      this.assertWeekInTerm(weekStarting, term.startDate, term.endDate);
    }
    if (dto.learningOutcomeId !== undefined) {
      await this.assertLearningOutcome(
        dto.learningOutcomeId ?? undefined,
        current.subjectId,
      );
    }

    return this.operations.updateLessonPlan(id, {
      ...(dto.learningOutcomeId !== undefined
        ? { learningOutcomeId: dto.learningOutcomeId }
        : {}),
      ...(weekStarting !== undefined ? { weekStarting } : {}),
      ...(dto.topic !== undefined ? { topic: dto.topic.trim() } : {}),
      ...(dto.learningObjectives !== undefined
        ? { learningObjectives: dto.learningObjectives.trim() }
        : {}),
      ...(dto.activities !== undefined
        ? { activities: dto.activities.trim() }
        : {}),
      ...(dto.resources !== undefined
        ? { resources: dto.resources?.trim() || null }
        : {}),
      ...(dto.assessment !== undefined
        ? { assessment: dto.assessment?.trim() || null }
        : {}),
      ...(dto.reflection !== undefined
        ? { reflection: dto.reflection?.trim() || null }
        : {}),
    });
  }

  async submitLessonPlan(user: AuthenticatedUser, id: string) {
    const teacherId = await this.requireTeacherId(user);
    const plan = await this.requireLessonPlan(id);
    if (plan.teacherId !== teacherId)
      throw new ForbiddenException("You can only submit your own lesson plans");
    if (plan.status !== "DRAFT" && plan.status !== "REVISION_REQUESTED") {
      throw new ConflictException(
        "Only draft or returned lesson plans can be submitted",
      );
    }
    return this.operations.submitLessonPlan(id, new Date());
  }

  async reviewLessonPlan(
    user: AuthenticatedUser,
    id: string,
    dto: ReviewLessonPlanDto,
  ) {
    const plan = await this.requireLessonPlan(id);
    if (plan.status !== "SUBMITTED")
      throw new ConflictException(
        "Only submitted lesson plans can be reviewed",
      );
    if (dto.decision === "REVISION_REQUESTED" && !dto.comment?.trim()) {
      throw new BadRequestException(
        "A comment is required when requesting revisions",
      );
    }
    return this.operations.reviewLessonPlan(id, {
      status: dto.decision,
      reviewedByUserId: user.id,
      reviewedAt: new Date(),
      reviewComment: dto.comment?.trim() || null,
    });
  }

  async listCalendarEvents(query: CalendarQueryDto) {
    ensureDateRange(query.fromDate, query.toDate);
    const { rows, total } = await this.operations.listCalendarEvents({
      fromDate: query.fromDate
        ? parseDateOnly(query.fromDate, "fromDate")
        : undefined,
      toDate: query.toDate ? parseDateOnly(query.toDate, "toDate") : undefined,
      academicYearId: query.academicYearId,
      page: { skip: query.skip, take: query.limit },
    });
    return paginate(rows, total, query);
  }

  async createCalendarEvent(
    user: AuthenticatedUser,
    dto: CreateCalendarEventDto,
  ) {
    const data = this.toCalendarEventData(dto);
    await this.assertEventDates(data);
    return this.operations.createCalendarEvent({
      ...data,
      createdByUserId: user.id,
    });
  }

  async updateCalendarEvent(id: string, dto: UpdateCalendarEventDto) {
    const current = await this.operations.findCalendarEvent(id);
    if (!current) throw new NotFoundException("Calendar event not found");
    const merged = {
      academicYearId:
        dto.academicYearId === undefined
          ? current.academicYearId
          : dto.academicYearId,
      title: dto.title ?? current.title,
      description:
        dto.description === undefined ? current.description : dto.description,
      type: dto.type ?? current.type,
      startDate: dto.startDate
        ? parseDateOnly(dto.startDate, "startDate")
        : current.startDate,
      endDate: dto.endDate
        ? parseDateOnly(dto.endDate, "endDate")
        : current.endDate,
    };
    await this.assertEventDates(merged);
    return this.operations.updateCalendarEvent(id, {
      ...(dto.academicYearId !== undefined
        ? { academicYearId: dto.academicYearId }
        : {}),
      ...(dto.title !== undefined ? { title: dto.title.trim() } : {}),
      ...(dto.description !== undefined
        ? { description: dto.description?.trim() || null }
        : {}),
      ...(dto.type !== undefined ? { type: dto.type } : {}),
      ...(dto.startDate !== undefined
        ? { startDate: parseDateOnly(dto.startDate, "startDate") }
        : {}),
      ...(dto.endDate !== undefined
        ? { endDate: parseDateOnly(dto.endDate, "endDate") }
        : {}),
    });
  }

  async deleteCalendarEvent(id: string) {
    if (!(await this.operations.findCalendarEvent(id))) {
      throw new NotFoundException("Calendar event not found");
    }
    await this.operations.deleteCalendarEvent(id);
    return { message: "Calendar event deleted" };
  }

  async listSubstitutions(
    user: AuthenticatedUser,
    query: SubstitutionQueryDto,
  ) {
    ensureDateRange(query.fromDate, query.toDate);
    const teacherId =
      user.role === "TEACHER" ? await this.requireTeacherId(user) : undefined;
    const { rows, total } = await this.operations.listSubstitutions({
      teacherId,
      fromDate: query.fromDate
        ? parseDateOnly(query.fromDate, "fromDate")
        : undefined,
      toDate: query.toDate ? parseDateOnly(query.toDate, "toDate") : undefined,
      page: { skip: query.skip, take: query.limit },
    });
    return paginate(rows, total, query);
  }

  async createSubstitution(
    user: AuthenticatedUser,
    dto: CreateSubstitutionDto,
  ) {
    const entry = await this.operations.findTimetableEntry(
      dto.timetableEntryId,
    );
    if (!entry) throw new NotFoundException("Timetable entry not found");
    const date = parseDateOnly(dto.date, "date");
    const weekday = DAY_BY_UTC_INDEX[date.getUTCDay()];
    if (entry.weekday !== weekday) {
      throw new BadRequestException(
        "The substitution date must match the timetable day",
      );
    }
    if (
      date < entry.period.academicYear.startDate ||
      date > entry.period.academicYear.endDate
    ) {
      throw new BadRequestException(
        "The substitution date must be within the timetable academic year",
      );
    }
    if (dto.substituteTeacherId === entry.teacherId) {
      throw new BadRequestException(
        "The substitute teacher must differ from the scheduled teacher",
      );
    }
    if (!(await this.operations.findActiveTeacher(dto.substituteTeacherId))) {
      throw new NotFoundException("Active substitute teacher not found");
    }
    if (await this.operations.findSubstitutionForEntryDate(entry.id, date)) {
      throw new ConflictException(
        "A substitution already exists for this lesson on that date",
      );
    }
    if (
      (await this.operations.teacherHasTimetableSlot(
        dto.substituteTeacherId,
        entry.weekday,
        entry.periodId,
      )) ||
      (await this.operations.teacherHasSubstitutionAtSlot(
        dto.substituteTeacherId,
        date,
        entry.periodId,
      ))
    ) {
      throw new ConflictException(
        "The substitute teacher is already scheduled at this time",
      );
    }
    return this.operations.createSubstitution({
      timetableEntryId: entry.id,
      substituteTeacherId: dto.substituteTeacherId,
      periodId: entry.periodId,
      date,
      note: dto.note?.trim() || null,
      createdByUserId: user.id,
    });
  }

  async deleteSubstitution(id: string) {
    if (!(await this.operations.findSubstitution(id))) {
      throw new NotFoundException("Substitution not found");
    }
    await this.operations.deleteSubstitution(id);
    return { message: "Substitution deleted" };
  }

  private async ensurePeriodDoesNotOverlap(
    academicYearId: string,
    startTime: string,
    endTime: string,
    excludeId?: string,
  ) {
    const start = timeToMinutes(startTime);
    const end = timeToMinutes(endTime);
    const periods = await this.operations.listPeriodsForYear(
      academicYearId,
      excludeId,
    );
    if (
      periods.some(
        (period) =>
          start < timeToMinutes(period.endTime) &&
          end > timeToMinutes(period.startTime),
      )
    ) {
      throw new ConflictException(
        "This period overlaps another period in the school day",
      );
    }
  }

  private async requireAcademicYear(id: string) {
    const year = await this.operations.findAcademicYear(id);
    if (!year) throw new NotFoundException("Academic year not found");
    return year;
  }

  private async requireTerm(id: string) {
    const term = await this.operations.findTerm(id);
    if (!term) throw new NotFoundException("Term not found");
    return term;
  }

  private async requireTeacherId(user: AuthenticatedUser): Promise<string> {
    if (user.role !== "TEACHER")
      throw new ForbiddenException("Only teachers can perform this action");
    const teacherId = await this.scoping.teacherIdForUser(user);
    if (!teacherId)
      throw new ForbiddenException(
        "No teacher profile is linked to this account",
      );
    return teacherId;
  }

  private async assertPlanAssignment(
    teacherId: string,
    classId: string,
    subjectId: string,
    academicYearId: string,
  ) {
    const schoolClass = await this.operations.findClass(classId);
    if (!schoolClass) throw new NotFoundException("Class not found");
    if (schoolClass.academicYearId !== academicYearId) {
      throw new BadRequestException(
        "The class and term must belong to the same academic year",
      );
    }
    if (
      !(await this.operations.hasTeacherAssignment(
        classId,
        subjectId,
        teacherId,
      ))
    ) {
      throw new ForbiddenException(
        "You are not assigned to teach this class and subject",
      );
    }
  }

  private async assertLearningOutcome(
    learningOutcomeId: string | undefined,
    subjectId: string,
  ) {
    if (!learningOutcomeId) return;
    const outcomeSubjectId =
      await this.operations.findLearningOutcomeSubject(learningOutcomeId);
    if (!outcomeSubjectId)
      throw new NotFoundException("Learning outcome not found");
    if (outcomeSubjectId !== subjectId) {
      throw new BadRequestException(
        "The learning outcome must belong to the selected subject",
      );
    }
  }

  private assertWeekInTerm(weekStarting: Date, termStart: Date, termEnd: Date) {
    if (weekStarting < termStart || weekStarting > termEnd) {
      throw new BadRequestException(
        "The planned week must start within the selected term",
      );
    }
  }

  private async requireLessonPlan(id: string) {
    const plan = await this.operations.findLessonPlan(id);
    if (!plan) throw new NotFoundException("Lesson plan not found");
    return plan;
  }

  private toCalendarEventData(dto: CreateCalendarEventDto): CalendarEventData {
    return {
      academicYearId: dto.academicYearId ?? null,
      title: dto.title.trim(),
      description: dto.description?.trim() || null,
      type: dto.type,
      startDate: parseDateOnly(dto.startDate, "startDate"),
      endDate: parseDateOnly(dto.endDate, "endDate"),
    };
  }

  private async assertEventDates(event: {
    academicYearId: string | null;
    startDate: Date;
    endDate: Date;
  }) {
    if (event.endDate < event.startDate) {
      throw new BadRequestException("endDate must be on or after startDate");
    }
    if (!event.academicYearId) return;
    const year = await this.requireAcademicYear(event.academicYearId);
    if (event.startDate < year.startDate || event.endDate > year.endDate) {
      throw new BadRequestException(
        "The event dates must fall within the selected academic year",
      );
    }
  }
}
