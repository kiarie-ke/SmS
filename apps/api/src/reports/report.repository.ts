import { Injectable } from '@nestjs/common';
import type { Prisma } from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';

export interface ReportSummaryRecord {
  term: {
    id: string;
    name: string;
    academicYearId: string;
    startDate: Date;
    endDate: Date;
    academicYear: { name: string };
  } | null;
  totalStudents: number;
  enrollment: { className: string; classLevel: string; studentCount: number }[];
  attendanceRecords: number;
  attendanceRate: number;
  attendance: { status: string; count: number }[];
  marksRecorded: number;
  averageScore: number | null;
  academics: { grade: string; count: number; averageScore: number | null }[];
  cbcAssessments: { performanceLevel: string; count: number }[];
  publishedReportCards: number;
  invoiceCount: number;
  billedAmount: number;
  collectedAmount: number;
  outstandingAmount: number;
  fees: { status: string; invoiceCount: number; billedAmount: number }[];
}

export abstract class ReportRepositoryPort {
  abstract summary(termId?: string): Promise<ReportSummaryRecord>;
}

@Injectable()
export class ReportRepository extends ReportRepositoryPort {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async summary(termId?: string): Promise<ReportSummaryRecord> {
    const term = termId
      ? await this.prisma.term.findUnique({
          where: { id: termId },
          select: {
            id: true,
            name: true,
            startDate: true,
            endDate: true,
            academicYearId: true,
            academicYear: { select: { name: true } },
          },
        })
      : await this.prisma.term.findFirst({
          where: { isCurrent: true },
          select: {
            id: true,
            name: true,
            startDate: true,
            endDate: true,
            academicYearId: true,
            academicYear: { select: { name: true } },
          },
        });
    if (termId && !term) {
      return {
        term: null,
        totalStudents: 0,
        enrollment: [],
        attendanceRecords: 0,
        attendanceRate: 0,
        attendance: [],
        marksRecorded: 0,
        averageScore: null,
        academics: [],
        cbcAssessments: [],
        publishedReportCards: 0,
        invoiceCount: 0,
        billedAmount: 0,
        collectedAmount: 0,
        outstandingAmount: 0,
        fees: [],
      };
    }

    const attendanceWhere: Prisma.AttendanceWhereInput = term
      ? { date: { gte: term.startDate, lte: term.endDate } }
      : {};
    const studentWhere: Prisma.StudentWhereInput = {
      isDeleted: false,
      ...(term ? { class: { academicYearId: term.academicYearId } } : {}),
    };
    const classWhere: Prisma.ClassWhereInput = term
      ? { academicYearId: term.academicYearId }
      : {};
    const termRelation = term ? { termId: term.id } : {};

    const [
      totalStudents,
      classes,
      attendanceGroups,
      marksAggregate,
      academicGroups,
      cbcGroups,
      publishedReportCards,
      feeGroups,
      paymentsAggregate,
    ] = await Promise.all([
      this.prisma.student.count({ where: studentWhere }),
      this.prisma.class.findMany({
        where: classWhere,
        orderBy: [{ level: 'asc' }, { name: 'asc' }],
        select: {
          name: true,
          level: true,
          _count: { select: { students: { where: { isDeleted: false } } } },
        },
      }),
      this.prisma.attendance.groupBy({
        by: ['status'],
        where: attendanceWhere,
        _count: { _all: true },
      }),
      this.prisma.mark.aggregate({
        where: { exam: termRelation },
        _count: { _all: true },
        _avg: { score: true },
      }),
      this.prisma.mark.groupBy({
        by: ['grade'],
        where: { exam: termRelation },
        _count: { _all: true },
        _avg: { score: true },
        orderBy: { grade: 'asc' },
      }),
      this.prisma.cbcAssessment.groupBy({
        by: ['performanceLevel'],
        where: termRelation,
        _count: { _all: true },
        orderBy: { performanceLevel: 'asc' },
      }),
      this.prisma.reportCard.count({
        where: { ...termRelation, publishedAt: { not: null } },
      }),
      this.prisma.feeInvoice.groupBy({
        by: ['status'],
        where: termRelation,
        _count: { _all: true },
        _sum: { totalAmount: true },
        orderBy: { status: 'asc' },
      }),
      this.prisma.feePayment.aggregate({
        where: { invoice: termRelation },
        _sum: { amount: true },
      }),
    ]);

    const attendanceRecords = attendanceGroups.reduce(
      (total, row) => total + row._count._all,
      0,
    );
    const presentAndLate = attendanceGroups
      .filter((row) => row.status === 'PRESENT' || row.status === 'LATE')
      .reduce((total, row) => total + row._count._all, 0);
    const fees = feeGroups.map((row) => ({
      status: row.status,
      invoiceCount: row._count._all,
      billedAmount: Number(row._sum.totalAmount ?? 0),
    }));
    const billedAmount = fees.reduce((total, row) => total + row.billedAmount, 0);
    const collectedAmount = Number(paymentsAggregate._sum.amount ?? 0);

    return {
      term,
      totalStudents,
      enrollment: classes.map((row) => ({
        className: row.name,
        classLevel: row.level,
        studentCount: row._count.students,
      })),
      attendanceRecords,
      attendanceRate:
        attendanceRecords === 0 ? 0 : Math.round((presentAndLate / attendanceRecords) * 100),
      attendance: attendanceGroups.map((row) => ({
        status: row.status,
        count: row._count._all,
      })),
      marksRecorded: marksAggregate._count._all,
      averageScore:
        marksAggregate._avg.score === null ? null : Number(marksAggregate._avg.score),
      academics: academicGroups.map((row) => ({
        grade: row.grade,
        count: row._count._all,
        averageScore: row._avg.score === null ? null : Number(row._avg.score),
      })),
      cbcAssessments: cbcGroups.map((row) => ({
        performanceLevel: row.performanceLevel,
        count: row._count._all,
      })),
      publishedReportCards,
      invoiceCount: fees.reduce((total, row) => total + row.invoiceCount, 0),
      billedAmount,
      collectedAmount,
      outstandingAmount: Math.max(0, billedAmount - collectedAmount),
      fees,
    };
  }
}
