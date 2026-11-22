import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import type {
  CalendarEventType,
  LessonPlanStatus,
  Weekday,
} from "@school-system/shared";
import type {
  CalendarEventRecord,
  LessonPlanRecord,
  PeriodRecord,
  SubstitutionRecord,
  TimetableEntryRecord,
} from "./operations.repository";

export class TimetablePeriodDto {
  @ApiProperty() id!: string;
  @ApiProperty() academicYearId!: string;
  @ApiProperty() academicYearName!: string;
  @ApiProperty() periodNumber!: number;
  @ApiProperty() name!: string;
  @ApiProperty() startTime!: string;
  @ApiProperty() endTime!: string;
  @ApiProperty() isBreak!: boolean;
}

export function toPeriodDto(record: PeriodRecord): TimetablePeriodDto {
  return {
    id: record.id,
    academicYearId: record.academicYearId,
    academicYearName: record.academicYear.name,
    periodNumber: record.periodNumber,
    name: record.name,
    startTime: record.startTime,
    endTime: record.endTime,
    isBreak: record.isBreak,
  };
}

export class TimetableEntryDto {
  @ApiProperty() id!: string;
  @ApiProperty({
    enum: [
      "MONDAY",
      "TUESDAY",
      "WEDNESDAY",
      "THURSDAY",
      "FRIDAY",
      "SATURDAY",
      "SUNDAY",
    ],
  })
  weekday!: Weekday;
  @ApiPropertyOptional({ nullable: true, type: String }) venue!: string | null;
  @ApiProperty() classId!: string;
  @ApiProperty() className!: string;
  @ApiPropertyOptional({ nullable: true, type: String }) streamId!:
    string | null;
  @ApiPropertyOptional({ nullable: true, type: String }) streamName!:
    string | null;
  @ApiProperty() subjectId!: string;
  @ApiProperty() subjectName!: string;
  @ApiProperty() teacherId!: string;
  @ApiProperty() teacherName!: string;
  @ApiProperty({ type: TimetablePeriodDto }) period!: TimetablePeriodDto;
}

export function toTimetableEntryDto(
  record: TimetableEntryRecord,
): TimetableEntryDto {
  return {
    id: record.id,
    weekday: record.weekday,
    venue: record.venue,
    classId: record.classId,
    className: record.class.name,
    streamId: record.streamId,
    streamName: record.stream?.name ?? null,
    subjectId: record.subjectId,
    subjectName: record.subject.name,
    teacherId: record.teacherId,
    teacherName: `${record.teacher.firstName} ${record.teacher.lastName}`,
    period: {
      id: record.period.id,
      academicYearId: record.period.academicYearId,
      academicYearName: record.period.academicYear.name,
      periodNumber: record.period.periodNumber,
      name: record.period.name,
      startTime: record.period.startTime,
      endTime: record.period.endTime,
      isBreak: record.period.isBreak,
    },
  };
}

export class CalendarEventDto {
  @ApiProperty() id!: string;
  @ApiPropertyOptional({ nullable: true, type: String }) academicYearId!:
    string | null;
  @ApiProperty() title!: string;
  @ApiPropertyOptional({ nullable: true, type: String }) description!:
    string | null;
  @ApiProperty({
    enum: ["TERM", "HOLIDAY", "EXAM", "MEETING", "SCHOOL_EVENT", "OTHER"],
  })
  type!: CalendarEventType;
  @ApiProperty({ format: "date-time" }) startDate!: string;
  @ApiProperty({ format: "date-time" }) endDate!: string;
  @ApiProperty() createdByEmail!: string;
}

export function toCalendarEventDto(
  record: CalendarEventRecord,
): CalendarEventDto {
  return {
    id: record.id,
    academicYearId: record.academicYearId,
    title: record.title,
    description: record.description,
    type: record.type,
    startDate: record.startDate.toISOString(),
    endDate: record.endDate.toISOString(),
    createdByEmail: record.createdBy.email,
  };
}

export class LessonPlanDto {
  @ApiProperty() id!: string;
  @ApiProperty() teacherId!: string;
  @ApiProperty() teacherName!: string;
  @ApiProperty() classId!: string;
  @ApiProperty() className!: string;
  @ApiProperty() subjectId!: string;
  @ApiProperty() subjectName!: string;
  @ApiProperty() termId!: string;
  @ApiProperty() termName!: string;
  @ApiPropertyOptional({ nullable: true, type: String }) learningOutcomeId!:
    string | null;
  @ApiPropertyOptional({ nullable: true, type: String })
  learningOutcomeDescription!: string | null;
  @ApiProperty({ format: "date-time" }) weekStarting!: string;
  @ApiProperty() topic!: string;
  @ApiProperty() learningObjectives!: string;
  @ApiProperty() activities!: string;
  @ApiPropertyOptional({ nullable: true, type: String }) resources!:
    string | null;
  @ApiPropertyOptional({ nullable: true, type: String }) assessment!:
    string | null;
  @ApiPropertyOptional({ nullable: true, type: String }) reflection!:
    string | null;
  @ApiProperty({
    enum: ["DRAFT", "SUBMITTED", "APPROVED", "REVISION_REQUESTED"],
  })
  status!: LessonPlanStatus;
  @ApiPropertyOptional({ nullable: true, type: String }) reviewComment!:
    string | null;
  @ApiPropertyOptional({ nullable: true, type: String }) reviewedByEmail!:
    string | null;
  @ApiPropertyOptional({ nullable: true, type: String }) reviewedAt!:
    string | null;
}

export function toLessonPlanDto(record: LessonPlanRecord): LessonPlanDto {
  return {
    id: record.id,
    teacherId: record.teacherId,
    teacherName: `${record.teacher.firstName} ${record.teacher.lastName}`,
    classId: record.classId,
    className: record.class.name,
    subjectId: record.subjectId,
    subjectName: record.subject.name,
    termId: record.termId,
    termName: record.term.name,
    learningOutcomeId: record.learningOutcomeId,
    learningOutcomeDescription: record.learningOutcome?.description ?? null,
    weekStarting: record.weekStarting.toISOString(),
    topic: record.topic,
    learningObjectives: record.learningObjectives,
    activities: record.activities,
    resources: record.resources,
    assessment: record.assessment,
    reflection: record.reflection,
    status: record.status,
    reviewComment: record.reviewComment,
    reviewedByEmail: record.reviewedBy?.email ?? null,
    reviewedAt: record.reviewedAt?.toISOString() ?? null,
  };
}

export class SubstitutionDto {
  @ApiProperty() id!: string;
  @ApiProperty({ format: "date-time" }) date!: string;
  @ApiPropertyOptional({ nullable: true, type: String }) note!: string | null;
  @ApiProperty() className!: string;
  @ApiPropertyOptional({ nullable: true, type: String }) streamName!:
    string | null;
  @ApiProperty() subjectName!: string;
  @ApiProperty() originalTeacherName!: string;
  @ApiProperty() substituteTeacherId!: string;
  @ApiProperty() substituteTeacherName!: string;
  @ApiProperty({ type: TimetablePeriodDto }) period!: TimetablePeriodDto;
  @ApiProperty() weekday!: Weekday;
}

export function toSubstitutionDto(record: SubstitutionRecord): SubstitutionDto {
  return {
    id: record.id,
    date: record.date.toISOString(),
    note: record.note,
    className: record.timetableEntry.class.name,
    streamName: record.timetableEntry.stream?.name ?? null,
    subjectName: record.timetableEntry.subject.name,
    originalTeacherName: `${record.timetableEntry.teacher.firstName} ${record.timetableEntry.teacher.lastName}`,
    substituteTeacherId: record.substituteTeacherId,
    substituteTeacherName: `${record.substitute.firstName} ${record.substitute.lastName}`,
    weekday: record.timetableEntry.weekday,
    period: {
      id: record.period.id,
      academicYearId: record.period.academicYearId,
      academicYearName: record.period.academicYear.name,
      periodNumber: record.period.periodNumber,
      name: record.period.name,
      startTime: record.period.startTime,
      endTime: record.period.endTime,
      isBreak: record.period.isBreak,
    },
  };
}
