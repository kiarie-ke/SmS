import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Module,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from "@nestjs/common";
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from "@nestjs/swagger";
import { MessageResponseDto } from "../auth/dto/auth-response.dto";
import type { AuthenticatedUser } from "../common/auth-user";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { Roles } from "../common/decorators/roles.decorator";
import { ScopingModule } from "../scoping/scoping.module";
import {
  OperationsRepository,
  OperationsRepositoryPort,
} from "./operations.repository";
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
  CalendarEventDto,
  LessonPlanDto,
  SubstitutionDto,
  TimetableEntryDto,
  TimetablePeriodDto,
  toCalendarEventDto,
  toLessonPlanDto,
  toPeriodDto,
  toSubstitutionDto,
  toTimetableEntryDto,
} from "./operations.response.dto";
import { OperationsService } from "./operations.service";

@ApiTags("school-operations")
@ApiBearerAuth()
@Roles("ADMIN", "TEACHER")
@Controller("operations")
export class OperationsController {
  constructor(private readonly operations: OperationsService) {}

  @Get("periods")
  @ApiOkResponse({ type: TimetablePeriodDto, isArray: true })
  @ApiOperation({ summary: "List timetable periods" })
  async listPeriods(@Query() query: PeriodQueryDto) {
    const result = await this.operations.listPeriods(query);
    return { ...result, data: result.data.map(toPeriodDto) };
  }

  @Post("periods")
  @Roles("ADMIN")
  @ApiCreatedResponse({ type: TimetablePeriodDto })
  @ApiOperation({ summary: "Create a timetable period or break" })
  async createPeriod(@Body() dto: CreatePeriodDto) {
    return toPeriodDto(await this.operations.createPeriod(dto));
  }

  @Patch("periods/:id")
  @Roles("ADMIN")
  @ApiOkResponse({ type: TimetablePeriodDto })
  @ApiOperation({ summary: "Update a timetable period or break" })
  async updatePeriod(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: UpdatePeriodDto,
  ) {
    return toPeriodDto(await this.operations.updatePeriod(id, dto));
  }

  @Delete("periods/:id")
  @Roles("ADMIN")
  @HttpCode(200)
  @ApiOkResponse({ type: MessageResponseDto })
  @ApiOperation({ summary: "Delete an unused timetable period" })
  deletePeriod(@Param("id", ParseUUIDPipe) id: string) {
    return this.operations.deletePeriod(id);
  }

  @Get("timetable")
  @ApiOkResponse({ type: TimetableEntryDto, isArray: true })
  @ApiOperation({
    summary: "List timetable entries (teachers see only their own)",
  })
  async listTimetable(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: TimetableQueryDto,
  ) {
    const result = await this.operations.listTimetable(user, query);
    return { ...result, data: result.data.map(toTimetableEntryDto) };
  }

  @Post("timetable")
  @Roles("ADMIN")
  @ApiCreatedResponse({ type: TimetableEntryDto })
  @ApiOperation({ summary: "Schedule a class lesson" })
  async createTimetableEntry(@Body() dto: CreateTimetableEntryDto) {
    return toTimetableEntryDto(await this.operations.createTimetableEntry(dto));
  }

  @Delete("timetable/:id")
  @Roles("ADMIN")
  @HttpCode(200)
  @ApiOkResponse({ type: MessageResponseDto })
  @ApiOperation({ summary: "Remove a scheduled lesson" })
  deleteTimetableEntry(@Param("id", ParseUUIDPipe) id: string) {
    return this.operations.deleteTimetableEntry(id);
  }

  @Get("lesson-plans")
  @ApiOkResponse({ type: LessonPlanDto, isArray: true })
  @ApiOperation({ summary: "List lesson plans (teachers see their own)" })
  async listLessonPlans(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: LessonPlanQueryDto,
  ) {
    const result = await this.operations.listLessonPlans(user, query);
    return { ...result, data: result.data.map(toLessonPlanDto) };
  }

  @Post("lesson-plans")
  @Roles("TEACHER")
  @ApiCreatedResponse({ type: LessonPlanDto })
  @ApiOperation({ summary: "Create a weekly lesson plan" })
  async createLessonPlan(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateLessonPlanDto,
  ) {
    return toLessonPlanDto(await this.operations.createLessonPlan(user, dto));
  }

  @Patch("lesson-plans/:id")
  @Roles("TEACHER")
  @ApiOkResponse({ type: LessonPlanDto })
  @ApiOperation({ summary: "Update a draft or returned lesson plan" })
  async updateLessonPlan(
    @CurrentUser() user: AuthenticatedUser,
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: UpdateLessonPlanDto,
  ) {
    return toLessonPlanDto(
      await this.operations.updateLessonPlan(user, id, dto),
    );
  }

  @Post("lesson-plans/:id/submit")
  @Roles("TEACHER")
  @HttpCode(200)
  @ApiOkResponse({ type: LessonPlanDto })
  @ApiOperation({ summary: "Submit a lesson plan for admin review" })
  async submitLessonPlan(
    @CurrentUser() user: AuthenticatedUser,
    @Param("id", ParseUUIDPipe) id: string,
  ) {
    return toLessonPlanDto(await this.operations.submitLessonPlan(user, id));
  }

  @Post("lesson-plans/:id/review")
  @Roles("ADMIN")
  @ApiOkResponse({ type: LessonPlanDto })
  @ApiOperation({ summary: "Approve a lesson plan or request revisions" })
  async reviewLessonPlan(
    @CurrentUser() user: AuthenticatedUser,
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: ReviewLessonPlanDto,
  ) {
    return toLessonPlanDto(
      await this.operations.reviewLessonPlan(user, id, dto),
    );
  }

  @Get("calendar")
  @ApiOkResponse({ type: CalendarEventDto, isArray: true })
  @ApiOperation({ summary: "List school calendar events" })
  async listCalendarEvents(@Query() query: CalendarQueryDto) {
    const result = await this.operations.listCalendarEvents(query);
    return { ...result, data: result.data.map(toCalendarEventDto) };
  }

  @Post("calendar")
  @Roles("ADMIN")
  @ApiCreatedResponse({ type: CalendarEventDto })
  @ApiOperation({ summary: "Create a school calendar event" })
  async createCalendarEvent(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateCalendarEventDto,
  ) {
    return toCalendarEventDto(
      await this.operations.createCalendarEvent(user, dto),
    );
  }

  @Patch("calendar/:id")
  @Roles("ADMIN")
  @ApiOkResponse({ type: CalendarEventDto })
  @ApiOperation({ summary: "Update a school calendar event" })
  async updateCalendarEvent(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: UpdateCalendarEventDto,
  ) {
    return toCalendarEventDto(
      await this.operations.updateCalendarEvent(id, dto),
    );
  }

  @Delete("calendar/:id")
  @Roles("ADMIN")
  @HttpCode(200)
  @ApiOkResponse({ type: MessageResponseDto })
  @ApiOperation({ summary: "Delete a school calendar event" })
  deleteCalendarEvent(@Param("id", ParseUUIDPipe) id: string) {
    return this.operations.deleteCalendarEvent(id);
  }

  @Get("substitutions")
  @ApiOkResponse({ type: SubstitutionDto, isArray: true })
  @ApiOperation({
    summary: "List substitutions (teachers see substitutions involving them)",
  })
  async listSubstitutions(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: SubstitutionQueryDto,
  ) {
    const result = await this.operations.listSubstitutions(user, query);
    return { ...result, data: result.data.map(toSubstitutionDto) };
  }

  @Post("substitutions")
  @Roles("ADMIN")
  @ApiCreatedResponse({ type: SubstitutionDto })
  @ApiOperation({
    summary: "Assign a substitute teacher for a timetable lesson",
  })
  async createSubstitution(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateSubstitutionDto,
  ) {
    return toSubstitutionDto(
      await this.operations.createSubstitution(user, dto),
    );
  }

  @Delete("substitutions/:id")
  @Roles("ADMIN")
  @HttpCode(200)
  @ApiOkResponse({ type: MessageResponseDto })
  @ApiOperation({ summary: "Cancel a teacher substitution" })
  deleteSubstitution(@Param("id", ParseUUIDPipe) id: string) {
    return this.operations.deleteSubstitution(id);
  }
}

@Module({
  imports: [ScopingModule],
  controllers: [OperationsController],
  providers: [
    OperationsService,
    { provide: OperationsRepositoryPort, useClass: OperationsRepository },
  ],
})
export class OperationsModule {}
