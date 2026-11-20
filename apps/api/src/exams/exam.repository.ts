import { Injectable } from '@nestjs/common';
import { EXAM_NAMES, type ExamName } from '@school-system/shared';
import type { Prisma } from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';

export type { ExamName };

export interface ExamRecord {
  id: string;
  termId: string;
  subjectId: string;
  classId: string;
  name: ExamName;
  maxMarks: number;
  date: Date;
  isPublished: boolean;
  publishedAt: Date | null;
  lockedByUserId: string | null;
  lockedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  term?: { id: string; name: string; termNumber: number } | null;
  subject?: { id: string; name: string; code: string } | null;
  class?: { id: string; name: string; level: string } | null;
  _count?: { marks: number };
}

export interface MarkRecord {
  id: string;
  examId: string;
  studentId: string;
  score: number;
  grade: string;
  points: number | null;
  teacherComment: string | null;
  createdAt: Date;
  updatedAt: Date;
  student?: { id: string; firstName: string; lastName: string; admissionNumber: string } | null;
}

export interface ExamListParams {
  skip: number;
  take: number;
  termId?: string;
  subjectId?: string;
  classId?: string;
  name?: ExamName;
  classIds?: string[];
}

export interface ExamCreateData {
  termId: string;
  subjectId: string;
  classId: string;
  name: ExamName;
  maxMarks: number;
  date: Date;
}

export type ExamUpdateData = Partial<Pick<ExamCreateData, 'maxMarks' | 'date'>>;

export interface MarkUpsertEntry {
  examId: string;
  studentId: string;
  score: number;
  grade: string;
  points: number | null;
  teacherComment?: string | null;
}

export abstract class ExamRepositoryPort {
  abstract list(params: ExamListParams): Promise<{ rows: ExamRecord[]; total: number }>;
  abstract findById(id: string): Promise<ExamRecord | null>;
  abstract create(data: ExamCreateData): Promise<ExamRecord>;
  abstract update(id: string, data: ExamUpdateData): Promise<ExamRecord>;
  abstract remove(id: string): Promise<void>;
  abstract listMarks(examId: string): Promise<MarkRecord[]>;
  abstract upsertMarks(entries: MarkUpsertEntry[]): Promise<void>;
  abstract publish(id: string, userId: string): Promise<ExamRecord>;
  abstract lock(id: string, userId: string): Promise<ExamRecord>;
  abstract unlock(id: string): Promise<ExamRecord>;
}

const examInclude = {
  term: { select: { id: true, name: true, termNumber: true } },
  subject: { select: { id: true, name: true, code: true } },
  class: { select: { id: true, name: true, level: true } },
  _count: { select: { marks: true } },
} satisfies Prisma.ExamInclude;

const markInclude = {
  student: { select: { id: true, firstName: true, lastName: true, admissionNumber: true } },
} satisfies Prisma.MarkInclude;

@Injectable()
export class ExamRepository extends ExamRepositoryPort {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async list(params: ExamListParams): Promise<{ rows: ExamRecord[]; total: number }> {
    const where: Prisma.ExamWhereInput = {
      ...(params.termId ? { termId: params.termId } : {}),
      ...(params.subjectId ? { subjectId: params.subjectId } : {}),
      ...(params.classId ? { classId: params.classId } : {}),
      ...(params.name ? { name: params.name } : {}),
      ...(params.classIds ? { classId: { in: params.classIds } } : {}),
    };
    const [rows, total] = await this.prisma.$transaction([
      this.prisma.exam.findMany({
        where,
        orderBy: { date: 'desc' },
        skip: params.skip,
        take: params.take,
        include: examInclude,
      }),
      this.prisma.exam.count({ where }),
    ]);
    return { rows: rows as unknown as ExamRecord[], total };
  }

  async findById(id: string): Promise<ExamRecord | null> {
    return this.prisma.exam.findUnique({
      where: { id },
      include: examInclude,
    }) as unknown as ExamRecord | null;
  }

  async create(data: ExamCreateData): Promise<ExamRecord> {
    return this.prisma.exam.create({
      data: {
        termId: data.termId,
        subjectId: data.subjectId,
        classId: data.classId,
        name: data.name,
        maxMarks: data.maxMarks,
        date: data.date,
      },
      include: examInclude,
    }) as unknown as ExamRecord;
  }

  async update(id: string, data: ExamUpdateData): Promise<ExamRecord> {
    return this.prisma.exam.update({
      where: { id },
      data: {
        ...(data.maxMarks !== undefined ? { maxMarks: data.maxMarks } : {}),
        ...(data.date !== undefined ? { date: data.date } : {}),
      },
      include: examInclude,
    }) as unknown as ExamRecord;
  }

  async remove(id: string): Promise<void> {
    await this.prisma.exam.delete({ where: { id } });
  }

  async listMarks(examId: string): Promise<MarkRecord[]> {
    return this.prisma.mark.findMany({
      where: { examId },
      include: markInclude,
      orderBy: { student: { lastName: 'asc' } },
    }) as unknown as MarkRecord[];
  }

  async upsertMarks(entries: MarkUpsertEntry[]): Promise<void> {
    if (entries.length === 0) return;
    await this.prisma.$transaction(
      entries.map((entry) =>
        this.prisma.mark.upsert({
          where: { examId_studentId: { examId: entry.examId, studentId: entry.studentId } },
          create: {
            examId: entry.examId,
            studentId: entry.studentId,
            score: entry.score,
            grade: entry.grade,
            points: entry.points,
            teacherComment: entry.teacherComment ?? null,
          },
          update: {
            score: entry.score,
            grade: entry.grade,
            points: entry.points,
            teacherComment: entry.teacherComment ?? null,
          },
        }),
      ),
    );
  }

  async publish(id: string, userId: string): Promise<ExamRecord> {
    return this.prisma.exam.update({
      where: { id },
      data: { isPublished: true, publishedAt: new Date(), lockedByUserId: userId, lockedAt: new Date() },
      include: examInclude,
    }) as unknown as ExamRecord;
  }

  async lock(id: string, userId: string): Promise<ExamRecord> {
    return this.prisma.exam.update({
      where: { id },
      data: { lockedByUserId: userId, lockedAt: new Date() },
      include: examInclude,
    }) as unknown as ExamRecord;
  }

  async unlock(id: string): Promise<ExamRecord> {
    return this.prisma.exam.update({
      where: { id },
      data: { lockedByUserId: null, lockedAt: null },
      include: examInclude,
    }) as unknown as ExamRecord;
  }
}
