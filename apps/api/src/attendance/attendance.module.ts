import {
  Body,
  Controller,
  Get,
  HttpCode,
  Injectable,
  Module,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import type { AuthenticatedUser } from '../common/auth-user';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { ScopingModule } from '../scoping/scoping.module';
import { ScopingService } from '../scoping/scoping.service';
import { AttendanceRepository, AttendanceRepositoryPort } from './attendance.repository';
import {
  AttendanceDto,
  AttendanceQueryDto,
  ClassSummaryDto,
  RegisterAttendanceDto,
  StudentAttendanceQueryDto,
  StudentSummaryDto,
} from './attendance.dto';
import { AttendanceService } from './attendance.service';

@ApiTags('attendance')
@ApiBearerAuth()
@Controller('attendance')
export class AttendanceController {
  constructor(private readonly attendance: AttendanceService) {}

  @Post('register')
  @Roles('ADMIN', 'TEACHER')
  @HttpCode(200)
  @ApiCreatedResponse({ description: 'Bulk register result' })
  @ApiOperation({ summary: 'Bulk upsert attendance for a class/day' })
  register(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: RegisterAttendanceDto,
  ) {
    return this.attendance.register(user, dto);
  }

  @Get()
  @Roles('ADMIN', 'TEACHER')
  @ApiOkResponse({ type: AttendanceDto, isArray: true })
  @ApiOperation({ summary: 'List attendance for a class/day' })
  list(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: AttendanceQueryDto,
  ) {
    return this.attendance.list(user, query);
  }

  @Get('student/:id')
  @Roles('ADMIN', 'TEACHER', 'PARENT', 'STUDENT')
  @ApiOkResponse({ type: AttendanceDto, isArray: true })
  @ApiOperation({ summary: 'Attendance history for a student (range)' })
  studentAttendance(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Query() query: StudentAttendanceQueryDto,
  ) {
    return this.attendance.studentAttendance(user, id, query);
  }

  @Get('class/:id/summary')
  @Roles('ADMIN', 'TEACHER')
  @ApiOkResponse({ type: ClassSummaryDto, isArray: true })
  @ApiOperation({ summary: 'Class attendance summary over a date range' })
  classSummary(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Query() query: StudentAttendanceQueryDto,
  ) {
    return this.attendance.classSummary(user, id, query);
  }

  @Get('student/:id/summary')
  @Roles('ADMIN', 'TEACHER', 'PARENT', 'STUDENT')
  @ApiOkResponse({ type: StudentSummaryDto })
  @ApiOperation({ summary: 'Student attendance summary over a date range' })
  studentSummary(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Query() query: StudentAttendanceQueryDto,
  ) {
    return this.attendance.studentSummary(user, id, query);
  }
}

@Module({
  imports: [ScopingModule],
  controllers: [AttendanceController],
  providers: [
    AttendanceService,
    { provide: AttendanceRepositoryPort, useClass: AttendanceRepository },
  ],
})
export class AttendanceModule {}
