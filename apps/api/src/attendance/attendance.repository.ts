import { Injectable } from '@nestjs/common';
import type { AttendanceStatus as SharedAttendanceStatus } from '@school-system/shared';
import type { Prisma } from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';

export type AttendanceStatus = SharedAttendanceStatus;

export interface AttendanceRecord {
  id: string;
  studentId: string;
  classId: string;
  date: Date;
  status: AttendanceStatus;
  markedByTeacherId: string;
  remarks: string | null;
  createdAt: Date;
  updatedAt: Date;
  student?: {
    id: string;
    firstName: string;
    lastName: string;
    admissionNumber: string;
  } | null;
}

export interface AttendanceUpsertEntry {
  studentId: string;
  classId: string;
  date: Date;
  status: AttendanceStatus;
  markedByTeacherId: string;
  remarks?: string | null;
}

export interface AttendanceListParams {
  classId: string;
  date: Date;
}

export interface AttendanceRangeParams {
  studentId: string;
  from: Date;
  to: Date;
}

export interface ClassSummaryRow {
  studentId: string;
  admissionNumber: string;
  firstName: string;
  lastName: string;
  present: number;
  absent: number;
  late: number;
  excused: number;
  total: number;
}

export interface StudentSummaryRow {
  present: number;
  absent: number;
  late: number;
  excused: number;
  total: number;
  percentage: number;
}

export abstract class AttendanceRepositoryPort {
  abstract findByClassAndDate(
    params: AttendanceListParams,
  ): Promise<AttendanceRecord[]>;
  abstract findByStudent(params: AttendanceRangeParams): Promise<AttendanceRecord[]>;
  abstract upsertMany(entries: AttendanceUpsertEntry[]): Promise<void>;
  abstract classSummary(
    classId: string,
    from: Date,
    to: Date,
  ): Promise<ClassSummaryRow[]>;
  abstract studentSummary(
    studentId: string,
    from: Date,
    to: Date,
  ): Promise<StudentSummaryRow>;
  abstract notifyAbsence(studentIds: string[], date: Date): Promise<void>;
}

const attendanceInclude = {
  student: {
    select: {
      id: true,
      firstName: true,
      lastName: true,
      admissionNumber: true,
    },
  },
} satisfies Prisma.AttendanceInclude;

@Injectable()
export class AttendanceRepository extends AttendanceRepositoryPort {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async findByClassAndDate(
    params: AttendanceListParams,
  ): Promise<AttendanceRecord[]> {
    return this.prisma.attendance.findMany({
      where: { classId: params.classId, date: params.date },
      include: attendanceInclude,
      orderBy: { student: { lastName: 'asc' } },
    }) as unknown as AttendanceRecord[];
  }

  async findByStudent(params: AttendanceRangeParams): Promise<AttendanceRecord[]> {
    return this.prisma.attendance.findMany({
      where: {
        studentId: params.studentId,
        date: { gte: params.from, lte: params.to },
      },
      include: attendanceInclude,
      orderBy: { date: 'asc' },
    }) as unknown as AttendanceRecord[];
  }

  async upsertMany(entries: AttendanceUpsertEntry[]): Promise<void> {
    if (entries.length === 0) return;
    await this.prisma.$transaction(
      entries.map((entry) =>
        this.prisma.attendance.upsert({
          where: {
            studentId_date: { studentId: entry.studentId, date: entry.date },
          },
          create: {
            studentId: entry.studentId,
            classId: entry.classId,
            date: entry.date,
            status: entry.status,
            markedByTeacherId: entry.markedByTeacherId,
            remarks: entry.remarks ?? null,
          },
          update: {
            classId: entry.classId,
            status: entry.status,
            markedByTeacherId: entry.markedByTeacherId,
            remarks: entry.remarks ?? null,
          },
        }),
      ),
    );
  }

  async classSummary(
    classId: string,
    from: Date,
    to: Date,
  ): Promise<ClassSummaryRow[]> {
    const students = await this.prisma.student.findMany({
      where: { classId, isDeleted: false },
      select: { id: true, firstName: true, lastName: true, admissionNumber: true },
      orderBy: { lastName: 'asc' },
    });

    const records = await this.prisma.attendance.findMany({
      where: { classId, date: { gte: from, lte: to } },
      select: { studentId: true, status: true },
    });

    const counts = new Map<
      string,
      { present: number; absent: number; late: number; excused: number; total: number }
    >();
    for (const student of students) {
      counts.set(student.id, { present: 0, absent: 0, late: 0, excused: 0, total: 0 });
    }
    for (const record of records) {
      const bucket = counts.get(record.studentId);
      if (!bucket) continue;
      const key = record.status.toLowerCase() as 'present' | 'absent' | 'late' | 'excused';
      if (key in bucket) bucket[key] += 1;
      bucket.total += 1;
    }

    return students.map((student) => {
      const bucket = counts.get(student.id)!;
      return {
        studentId: student.id,
        admissionNumber: student.admissionNumber,
        firstName: student.firstName,
        lastName: student.lastName,
        present: bucket.present,
        absent: bucket.absent,
        late: bucket.late,
        excused: bucket.excused,
        total: bucket.total,
      };
    });
  }

  async studentSummary(
    studentId: string,
    from: Date,
    to: Date,
  ): Promise<StudentSummaryRow> {
    const records = await this.prisma.attendance.findMany({
      where: { studentId, date: { gte: from, lte: to } },
      select: { status: true },
    });
    const summary = { present: 0, absent: 0, late: 0, excused: 0, total: records.length };
    for (const record of records) {
      const key = record.status.toLowerCase() as 'present' | 'absent' | 'late' | 'excused';
      if (key in summary) summary[key] += 1;
    }
    const percentage =
      summary.total === 0
        ? 0
        : Math.round(((summary.present + summary.late) / summary.total) * 100);
    return { ...summary, percentage };
  }

  async notifyAbsence(studentIds: string[], date: Date): Promise<void> {
    if (studentIds.length === 0) return;
    const links = await this.prisma.studentGuardian.findMany({
      where: { studentId: { in: studentIds } },
      include: {
        guardian: { select: { userId: true, firstName: true, lastName: true } },
        student: { select: { firstName: true, lastName: true } },
      },
    });
    const data = links
      .filter((link) => link.guardian.userId)
      .map((link) => ({
        recipientUserId: link.guardian.userId as string,
        title: 'Absence recorded',
        body: `${link.student.firstName} ${link.student.lastName} was marked absent on ${date.toISOString().slice(0, 10)}.`,
        channel: 'IN_APP' as const,
        type: 'ABSENCE' as const,
      }));
    if (data.length === 0) return;
    await this.prisma.notification.createMany({ data });
  }
}
