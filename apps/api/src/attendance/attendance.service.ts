import { BadRequestException, Injectable } from '@nestjs/common';
import type { AuthenticatedUser } from '../common/auth-user';
import { ScopingService } from '../scoping/scoping.service';
import { AttendanceRepositoryPort } from './attendance.repository';
import {
  RegisterAttendanceDto,
  StudentAttendanceQueryDto,
  AttendanceQueryDto,
  toAttendanceDto,
  toClassSummaryDto,
  toStudentSummaryDto,
} from './attendance.dto';
import type { AttendanceUpsertEntry } from './attendance.repository';

@Injectable()
export class AttendanceService {
  constructor(
    private readonly attendance: AttendanceRepositoryPort,
    private readonly scoping: ScopingService,
  ) {}

  private nairobiToday(): string {
    return new Intl.DateTimeFormat('en-CA', { timeZone: 'Africa/Nairobi' }).format(
      new Date(),
    );
  }

  private toDate(value: string): Date {
    return new Date(`${value}T00:00:00.000Z`);
  }

  async register(user: AuthenticatedUser, dto: RegisterAttendanceDto) {
    await this.scoping.assertClass(user, dto.classId);

    const teacherId = await this.scoping.teacherIdForUser(user);
    if (!teacherId) {
      throw new BadRequestException('A teacher account is required to mark attendance');
    }

    const date = this.toDate(dto.date);
    const entries: AttendanceUpsertEntry[] = dto.entries.map((entry) => ({
      studentId: entry.studentId,
      classId: dto.classId,
      date,
      status: entry.status,
      markedByTeacherId: teacherId,
      remarks: entry.remarks,
    }));

    await this.attendance.upsertMany(entries);

    const absentIds = dto.entries
      .filter((entry) => entry.status === 'ABSENT')
      .map((entry) => entry.studentId);
    await this.attendance.notifyAbsence(absentIds, date);

    return { registered: entries.length, date: dto.date };
  }

  async list(user: AuthenticatedUser, query: AttendanceQueryDto) {
    await this.scoping.assertClass(user, query.classId);
    const date = this.toDate(query.date);
    const rows = await this.attendance.findByClassAndDate({
      classId: query.classId,
      date,
    });
    return rows.map(toAttendanceDto);
  }

  async studentAttendance(
    user: AuthenticatedUser,
    studentId: string,
    query: StudentAttendanceQueryDto,
  ) {
    await this.scoping.assertStudent(user, studentId);
    const to = query.to ? this.toDate(query.to) : this.toDate(this.nairobiToday());
    const from = query.from
      ? this.toDate(query.from)
      : new Date(to.getTime() - 30 * 24 * 60 * 60 * 1000);
    const rows = await this.attendance.findByStudent({
      studentId,
      from,
      to,
    });
    return rows.map(toAttendanceDto);
  }

  async classSummary(
    user: AuthenticatedUser,
    classId: string,
    query: StudentAttendanceQueryDto,
  ) {
    await this.scoping.assertClass(user, classId);
    const to = query.to ? this.toDate(query.to) : this.toDate(this.nairobiToday());
    const from = query.from
      ? this.toDate(query.from)
      : new Date(to.getTime() - 30 * 24 * 60 * 60 * 1000);
    const rows = await this.attendance.classSummary(classId, from, to);
    return rows.map(toClassSummaryDto);
  }

  async studentSummary(
    user: AuthenticatedUser,
    studentId: string,
    query: StudentAttendanceQueryDto,
  ) {
    await this.scoping.assertStudent(user, studentId);
    const to = query.to ? this.toDate(query.to) : this.toDate(this.nairobiToday());
    const from = query.from
      ? this.toDate(query.from)
      : new Date(to.getTime() - 30 * 24 * 60 * 60 * 1000);
    const row = await this.attendance.studentSummary(studentId, from, to);
    return toStudentSummaryDto(row);
  }
}
