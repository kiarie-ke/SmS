import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import {
  CALENDAR_EVENT_TYPES,
  LESSON_PLAN_STATUSES,
  WEEKDAYS,
  type CalendarEventType,
  type LessonPlanStatus,
  type Weekday,
} from "@school-system/shared";
import { Transform, Type } from "class-transformer";
import {
  IsBoolean,
  IsDateString,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
} from "class-validator";
import { PaginationQueryDto } from "../common/dto/pagination-query.dto";

const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;

function trim(value: unknown): unknown {
  return typeof value === "string" ? value.trim() : value;
}

export class PeriodQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ format: "uuid" })
  @IsOptional()
  @IsUUID()
  academicYearId?: string;
}

export class CreatePeriodDto {
  @ApiProperty({ format: "uuid" })
  @IsUUID()
  academicYearId!: string;

  @ApiProperty({ minimum: 1, maximum: 20 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(20)
  periodNumber!: number;

  @ApiProperty({ maxLength: 60 })
  @Transform(({ value }) => trim(value))
  @IsString()
  @MinLength(1)
  @MaxLength(60)
  name!: string;

  @ApiProperty({ example: "08:00", pattern: TIME_PATTERN.source })
  @Matches(TIME_PATTERN)
  startTime!: string;

  @ApiProperty({ example: "08:40", pattern: TIME_PATTERN.source })
  @Matches(TIME_PATTERN)
  endTime!: string;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  isBreak?: boolean;
}

export class UpdatePeriodDto {
  @ApiPropertyOptional({ minimum: 1, maximum: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(20)
  periodNumber?: number;

  @ApiPropertyOptional({ maxLength: 60 })
  @IsOptional()
  @Transform(({ value }) => trim(value))
  @IsString()
  @MinLength(1)
  @MaxLength(60)
  name?: string;

  @ApiPropertyOptional({ example: "08:00", pattern: TIME_PATTERN.source })
  @IsOptional()
  @Matches(TIME_PATTERN)
  startTime?: string;

  @ApiPropertyOptional({ example: "08:40", pattern: TIME_PATTERN.source })
  @IsOptional()
  @Matches(TIME_PATTERN)
  endTime?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isBreak?: boolean;
}

export class TimetableQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ format: "uuid" })
  @IsOptional()
  @IsUUID()
  academicYearId?: string;

  @ApiPropertyOptional({ format: "uuid" })
  @IsOptional()
  @IsUUID()
  classId?: string;

  @ApiPropertyOptional({ enum: WEEKDAYS })
  @IsOptional()
  @IsIn([...WEEKDAYS])
  weekday?: Weekday;
}

export class CreateTimetableEntryDto {
  @ApiProperty({ format: "uuid" })
  @IsUUID()
  periodId!: string;

  @ApiProperty({ format: "uuid" })
  @IsUUID()
  classId!: string;

  @ApiPropertyOptional({ format: "uuid" })
  @IsOptional()
  @IsUUID()
  streamId?: string;

  @ApiProperty({ format: "uuid" })
  @IsUUID()
  subjectId!: string;

  @ApiProperty({ format: "uuid" })
  @IsUUID()
  teacherId!: string;

  @ApiProperty({ enum: WEEKDAYS })
  @IsIn([...WEEKDAYS])
  weekday!: Weekday;

  @ApiPropertyOptional({ maxLength: 100 })
  @IsOptional()
  @Transform(({ value }) => trim(value))
  @IsString()
  @MaxLength(100)
  venue?: string;
}

export class CalendarQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ format: "date" })
  @IsOptional()
  @IsDateString()
  fromDate?: string;

  @ApiPropertyOptional({ format: "date" })
  @IsOptional()
  @IsDateString()
  toDate?: string;

  @ApiPropertyOptional({ format: "uuid" })
  @IsOptional()
  @IsUUID()
  academicYearId?: string;
}

export class CreateCalendarEventDto {
  @ApiProperty({ maxLength: 200 })
  @Transform(({ value }) => trim(value))
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  title!: string;

  @ApiPropertyOptional({ maxLength: 2000 })
  @IsOptional()
  @Transform(({ value }) => trim(value))
  @IsString()
  @MaxLength(2000)
  description?: string;

  @ApiProperty({ enum: CALENDAR_EVENT_TYPES })
  @IsIn([...CALENDAR_EVENT_TYPES])
  type!: CalendarEventType;

  @ApiProperty({ format: "date" })
  @IsDateString()
  startDate!: string;

  @ApiProperty({ format: "date" })
  @IsDateString()
  endDate!: string;

  @ApiPropertyOptional({ format: "uuid" })
  @IsOptional()
  @IsUUID()
  academicYearId?: string;
}

export class UpdateCalendarEventDto {
  @ApiPropertyOptional({ maxLength: 200 })
  @IsOptional()
  @Transform(({ value }) => trim(value))
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  title?: string;

  @ApiPropertyOptional({ maxLength: 2000, nullable: true, type: String })
  @IsOptional()
  @Transform(({ value }) => trim(value))
  @IsString()
  @MaxLength(2000)
  description?: string | null;

  @ApiPropertyOptional({ enum: CALENDAR_EVENT_TYPES })
  @IsOptional()
  @IsIn([...CALENDAR_EVENT_TYPES])
  type?: CalendarEventType;

  @ApiPropertyOptional({ format: "date" })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({ format: "date" })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiPropertyOptional({ format: "uuid", nullable: true, type: String })
  @IsOptional()
  @IsUUID()
  academicYearId?: string | null;
}

export class LessonPlanQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ format: "uuid" })
  @IsOptional()
  @IsUUID()
  classId?: string;

  @ApiPropertyOptional({ format: "uuid" })
  @IsOptional()
  @IsUUID()
  termId?: string;

  @ApiPropertyOptional({ enum: LESSON_PLAN_STATUSES })
  @IsOptional()
  @IsIn([...LESSON_PLAN_STATUSES])
  status?: LessonPlanStatus;
}

export class CreateLessonPlanDto {
  @ApiProperty({ format: "uuid" })
  @IsUUID()
  classId!: string;

  @ApiProperty({ format: "uuid" })
  @IsUUID()
  subjectId!: string;

  @ApiProperty({ format: "uuid" })
  @IsUUID()
  termId!: string;

  @ApiPropertyOptional({ format: "uuid" })
  @IsOptional()
  @IsUUID()
  learningOutcomeId?: string;

  @ApiProperty({
    format: "date",
    description: "Monday of the planned school week",
  })
  @IsDateString()
  weekStarting!: string;

  @ApiProperty({ maxLength: 200 })
  @Transform(({ value }) => trim(value))
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  topic!: string;

  @ApiProperty({ maxLength: 4000 })
  @Transform(({ value }) => trim(value))
  @IsString()
  @MinLength(1)
  @MaxLength(4000)
  learningObjectives!: string;

  @ApiProperty({ maxLength: 6000 })
  @Transform(({ value }) => trim(value))
  @IsString()
  @MinLength(1)
  @MaxLength(6000)
  activities!: string;

  @ApiPropertyOptional({ maxLength: 2000 })
  @IsOptional()
  @Transform(({ value }) => trim(value))
  @IsString()
  @MaxLength(2000)
  resources?: string;

  @ApiPropertyOptional({ maxLength: 2000 })
  @IsOptional()
  @Transform(({ value }) => trim(value))
  @IsString()
  @MaxLength(2000)
  assessment?: string;
}

export class UpdateLessonPlanDto {
  @ApiPropertyOptional({ format: "uuid", nullable: true, type: String })
  @IsOptional()
  @IsUUID()
  learningOutcomeId?: string | null;

  @ApiPropertyOptional({
    format: "date",
    description: "Monday of the planned school week",
  })
  @IsOptional()
  @IsDateString()
  weekStarting?: string;

  @ApiPropertyOptional({ maxLength: 200 })
  @IsOptional()
  @Transform(({ value }) => trim(value))
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  topic?: string;

  @ApiPropertyOptional({ maxLength: 4000 })
  @IsOptional()
  @Transform(({ value }) => trim(value))
  @IsString()
  @MinLength(1)
  @MaxLength(4000)
  learningObjectives?: string;

  @ApiPropertyOptional({ maxLength: 6000 })
  @IsOptional()
  @Transform(({ value }) => trim(value))
  @IsString()
  @MinLength(1)
  @MaxLength(6000)
  activities?: string;

  @ApiPropertyOptional({ maxLength: 2000, nullable: true, type: String })
  @IsOptional()
  @Transform(({ value }) => trim(value))
  @IsString()
  @MaxLength(2000)
  resources?: string | null;

  @ApiPropertyOptional({ maxLength: 2000, nullable: true, type: String })
  @IsOptional()
  @Transform(({ value }) => trim(value))
  @IsString()
  @MaxLength(2000)
  assessment?: string | null;

  @ApiPropertyOptional({ maxLength: 2000, nullable: true, type: String })
  @IsOptional()
  @Transform(({ value }) => trim(value))
  @IsString()
  @MaxLength(2000)
  reflection?: string | null;
}

export class ReviewLessonPlanDto {
  @ApiProperty({ enum: ["APPROVED", "REVISION_REQUESTED"] })
  @IsIn(["APPROVED", "REVISION_REQUESTED"])
  decision!: "APPROVED" | "REVISION_REQUESTED";

  @ApiPropertyOptional({ maxLength: 2000 })
  @IsOptional()
  @Transform(({ value }) => trim(value))
  @IsString()
  @MaxLength(2000)
  comment?: string;
}

export class SubstitutionQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ format: "date" })
  @IsOptional()
  @IsDateString()
  fromDate?: string;

  @ApiPropertyOptional({ format: "date" })
  @IsOptional()
  @IsDateString()
  toDate?: string;
}

export class CreateSubstitutionDto {
  @ApiProperty({ format: "uuid" })
  @IsUUID()
  timetableEntryId!: string;

  @ApiProperty({ format: "uuid" })
  @IsUUID()
  substituteTeacherId!: string;

  @ApiProperty({ format: "date" })
  @IsDateString()
  date!: string;

  @ApiPropertyOptional({ maxLength: 500 })
  @IsOptional()
  @Transform(({ value }) => trim(value))
  @IsString()
  @MaxLength(500)
  note?: string;
}
