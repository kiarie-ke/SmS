import { Injectable } from '@nestjs/common';
import { ReportTemplate, type ReportTemplate as ReportTemplateType } from '@school-system/shared';
import type { Prisma } from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';

export type { ReportTemplateType as ReportTemplate };

export interface ReportCardRecord {
  id: string;
  studentId: string;
  termId: string;
  classId: string;
  template: ReportTemplateType;
  teacherComment: string | null;
  principalComment: string | null;
  publishedAt: Date | null;
  pdfUrl: string | null;
  generatedByUserId: string | null;
  createdAt: Date;
  updatedAt: Date;
  student?: { id: string; firstName: string; lastName: string; admissionNumber: string } | null;
  term?: { id: string; name: string; termNumber: number } | null;
  class?: { id: string; name: string; level: string } | null;
}

export interface ReportCardListParams {
  skip: number;
  take: number;
  studentId?: string;
  termId?: string;
  classId?: string;
  isPublished?: boolean;
  studentIds?: string[];
}

export interface ReportCardCreateData {
  studentId: string;
  termId: string;
  classId: string;
  template: ReportTemplateType;
  generatedByUserId?: string | null;
}

export type ReportCardUpdateData = Partial<{
  teacherComment: string | null;
  principalComment: string | null;
  publishedAt: Date | null;
  pdfUrl: string | null;
}>;

export abstract class ReportCardRepositoryPort {
  abstract list(params: ReportCardListParams): Promise<{ rows: ReportCardRecord[]; total: number }>;
  abstract findById(id: string): Promise<ReportCardRecord | null>;
  abstract findByStudentTerm(studentId: string, termId: string): Promise<ReportCardRecord | null>;
  abstract upsert(data: ReportCardCreateData): Promise<ReportCardRecord>;
  abstract update(id: string, data: ReportCardUpdateData): Promise<ReportCardRecord>;
}

const rcInclude = {
  student: { select: { id: true, firstName: true, lastName: true, admissionNumber: true } },
  term: { select: { id: true, name: true, termNumber: true } },
  class: { select: { id: true, name: true, level: true } },
} satisfies Prisma.ReportCardInclude;

@Injectable()
export class ReportCardRepository extends ReportCardRepositoryPort {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async list(params: ReportCardListParams): Promise<{ rows: ReportCardRecord[]; total: number }> {
    const where: Prisma.ReportCardWhereInput = {
      ...(params.studentId ? { studentId: params.studentId } : {}),
      ...(params.termId ? { termId: params.termId } : {}),
      ...(params.classId ? { classId: params.classId } : {}),
      ...(params.isPublished !== undefined ? { publishedAt: params.isPublished ? { not: null } : null } : {}),
      ...(params.studentIds ? { studentId: { in: params.studentIds } } : {}),
    };
    const [rows, total] = await this.prisma.$transaction([
      this.prisma.reportCard.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: params.skip,
        take: params.take,
        include: rcInclude,
      }),
      this.prisma.reportCard.count({ where }),
    ]);
    return { rows: rows as unknown as ReportCardRecord[], total };
  }

  async findById(id: string): Promise<ReportCardRecord | null> {
    return this.prisma.reportCard.findUnique({
      where: { id },
      include: rcInclude,
    }) as unknown as ReportCardRecord | null;
  }

  async findByStudentTerm(studentId: string, termId: string): Promise<ReportCardRecord | null> {
    return this.prisma.reportCard.findUnique({
      where: { studentId_termId: { studentId, termId } },
      include: rcInclude,
    }) as unknown as ReportCardRecord | null;
  }

  async upsert(data: ReportCardCreateData): Promise<ReportCardRecord> {
    return this.prisma.reportCard.upsert({
      where: { studentId_termId: { studentId: data.studentId, termId: data.termId } },
      create: {
        studentId: data.studentId,
        termId: data.termId,
        classId: data.classId,
        template: data.template,
        generatedByUserId: data.generatedByUserId ?? null,
      },
      update: {
        classId: data.classId,
        template: data.template,
        generatedByUserId: data.generatedByUserId ?? null,
      },
      include: rcInclude,
    }) as unknown as ReportCardRecord;
  }

  async update(id: string, data: ReportCardUpdateData): Promise<ReportCardRecord> {
    return this.prisma.reportCard.update({
      where: { id },
      data: {
        ...(data.teacherComment !== undefined ? { teacherComment: data.teacherComment } : {}),
        ...(data.principalComment !== undefined ? { principalComment: data.principalComment } : {}),
        ...(data.publishedAt !== undefined ? { publishedAt: data.publishedAt } : {}),
        ...(data.pdfUrl !== undefined ? { pdfUrl: data.pdfUrl } : {}),
      },
      include: rcInclude,
    }) as unknown as ReportCardRecord;
  }
}
