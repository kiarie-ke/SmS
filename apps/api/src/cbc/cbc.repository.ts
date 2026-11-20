import { Injectable } from '@nestjs/common';
import { CBC_PERFORMANCE_LEVELS, type PerformanceLevel } from '@school-system/shared';
import type { Prisma } from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';

export type { PerformanceLevel };

export interface CbcAssessmentRecord {
  id: string;
  studentId: string;
  learningOutcomeId: string;
  termId: string;
  performanceLevel: PerformanceLevel;
  teacherComment: string | null;
  assessedAt: Date;
  createdAt: Date;
  updatedAt: Date;
  student?: { id: string; firstName: string; lastName: string; admissionNumber: string; classId: string } | null;
  learningOutcome?: { id: string; description: string; strand?: { subject?: { id: string; name: string; code: string } | null } | null } | null;
  term?: { id: string; name: string; termNumber: number } | null;
}

export interface CbcListParams {
  skip: number;
  take: number;
  studentId?: string;
  termId?: string;
  learningOutcomeId?: string;
  classId?: string;
  subjectId?: string;
  studentIds?: string[];
}

export interface CbcCreateData {
  studentId: string;
  learningOutcomeId: string;
  termId: string;
  performanceLevel: PerformanceLevel;
  teacherComment?: string | null;
}

export type CbcUpdateData = Partial<Pick<CbcCreateData, 'performanceLevel' | 'teacherComment'>>;

export abstract class CbcRepositoryPort {
  abstract list(params: CbcListParams): Promise<{ rows: CbcAssessmentRecord[]; total: number }>;
  abstract findById(id: string): Promise<CbcAssessmentRecord | null>;
  abstract upsert(data: CbcCreateData): Promise<CbcAssessmentRecord>;
  abstract update(id: string, data: CbcUpdateData): Promise<CbcAssessmentRecord>;
  abstract remove(id: string): Promise<void>;
  abstract listLearningOutcomes(subjectId?: string): Promise<
    Array<{
      id: string;
      description: string;
      strandName: string;
      subStrandName: string;
      subjectName?: string;
      subjectId?: string;
    }>
  >;
}

const cbcInclude = {
  student: { select: { id: true, firstName: true, lastName: true, admissionNumber: true, classId: true } },
  learningOutcome: {
    select: {
      id: true,
      description: true,
      subStrand: {
        select: {
          strand: { select: { subject: { select: { id: true, name: true, code: true } } } },
        },
      },
    },
  },
  term: { select: { id: true, name: true, termNumber: true } },
} satisfies Prisma.CbcAssessmentInclude;

@Injectable()
export class CbcRepository extends CbcRepositoryPort {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async list(params: CbcListParams): Promise<{ rows: CbcAssessmentRecord[]; total: number }> {
    const where: Prisma.CbcAssessmentWhereInput = {
      ...(params.studentId ? { studentId: params.studentId } : {}),
      ...(params.termId ? { termId: params.termId } : {}),
      ...(params.learningOutcomeId ? { learningOutcomeId: params.learningOutcomeId } : {}),
      ...(params.studentIds ? { studentId: { in: params.studentIds } } : {}),
      ...(params.classId
        ? { student: { classId: params.classId, isDeleted: false } }
        : {}),
      ...(params.subjectId
        ? { learningOutcome: { subStrand: { strand: { subjectId: params.subjectId } } } }
        : {}),
    };
    const [rows, total] = await this.prisma.$transaction([
      this.prisma.cbcAssessment.findMany({
        where,
        orderBy: { assessedAt: 'desc' },
        skip: params.skip,
        take: params.take,
        include: cbcInclude,
      }),
      this.prisma.cbcAssessment.count({ where }),
    ]);
    return { rows: rows as unknown as CbcAssessmentRecord[], total };
  }

  async findById(id: string): Promise<CbcAssessmentRecord | null> {
    return this.prisma.cbcAssessment.findUnique({
      where: { id },
      include: cbcInclude,
    }) as unknown as CbcAssessmentRecord | null;
  }

  async upsert(data: CbcCreateData): Promise<CbcAssessmentRecord> {
    return this.prisma.cbcAssessment.upsert({
      where: {
        studentId_learningOutcomeId_termId: {
          studentId: data.studentId,
          learningOutcomeId: data.learningOutcomeId,
          termId: data.termId,
        },
      },
      create: {
        studentId: data.studentId,
        learningOutcomeId: data.learningOutcomeId,
        termId: data.termId,
        performanceLevel: data.performanceLevel,
        teacherComment: data.teacherComment ?? null,
      },
      update: {
        performanceLevel: data.performanceLevel,
        teacherComment: data.teacherComment ?? null,
      },
      include: cbcInclude,
    }) as unknown as CbcAssessmentRecord;
  }

  async update(id: string, data: CbcUpdateData): Promise<CbcAssessmentRecord> {
    return this.prisma.cbcAssessment.update({
      where: { id },
      data: {
        ...(data.performanceLevel !== undefined ? { performanceLevel: data.performanceLevel } : {}),
        ...(data.teacherComment !== undefined ? { teacherComment: data.teacherComment } : {}),
      },
      include: cbcInclude,
    }) as unknown as CbcAssessmentRecord;
  }

  async remove(id: string): Promise<void> {
    await this.prisma.cbcAssessment.delete({ where: { id } });
  }

  async listLearningOutcomes(subjectId?: string) {
    const where: Prisma.LearningOutcomeWhereInput = subjectId
      ? { subStrand: { strand: { subjectId } } }
      : {};
    const rows = await this.prisma.learningOutcome.findMany({
      where,
      include: {
        subStrand: {
          include: {
            strand: {
              include: {
                subject: true,
              },
            },
          },
        },
      },
      orderBy: { order: 'asc' },
    });
    return rows.map((r) => ({
      id: r.id,
      description: r.description,
      strandName: r.subStrand.strand.name,
      subStrandName: r.subStrand.name,
      subjectName: r.subStrand.strand.subject?.name,
      subjectId: r.subStrand.strand.subjectId,
    }));
  }
}
