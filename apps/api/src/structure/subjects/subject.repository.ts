import { Injectable } from '@nestjs/common';
import type { SubjectLevel } from '@school-system/shared';
import type { Prisma } from '../../generated/prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

export interface SubjectRecord {
  id: string;
  name: string;
  code: string;
  level: SubjectLevel;
  isCbc: boolean;
  createdAt: Date;
  updatedAt: Date;
  _count: { classSubjects: number };
}

export type SubjectSortField = 'name' | 'code' | 'createdAt';

export interface SubjectListParams {
  skip: number;
  take: number;
  search?: string;
  sortBy: SubjectSortField;
  sortOrder: 'asc' | 'desc';
  level?: SubjectLevel;
}

export interface SubjectCreateData {
  name: string;
  code: string;
  level: SubjectLevel;
  isCbc?: boolean;
}

export type SubjectUpdateData = Partial<SubjectCreateData>;

export abstract class SubjectRepositoryPort {
  abstract list(
    params: SubjectListParams,
  ): Promise<{ rows: SubjectRecord[]; total: number }>;
  abstract findById(id: string): Promise<SubjectRecord | null>;
  abstract create(data: SubjectCreateData): Promise<SubjectRecord>;
  abstract update(id: string, data: SubjectUpdateData): Promise<SubjectRecord>;
  abstract remove(id: string): Promise<void>;
}

const subjectInclude = {
  _count: { select: { classSubjects: true } },
} satisfies Prisma.SubjectInclude;

@Injectable()
export class SubjectRepository extends SubjectRepositoryPort {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async list(
    params: SubjectListParams,
  ): Promise<{ rows: SubjectRecord[]; total: number }> {
    const where: Prisma.SubjectWhereInput = {
      ...(params.level ? { level: params.level } : {}),
      ...(params.search
        ? {
            OR: [
              { name: { contains: params.search, mode: 'insensitive' } },
              { code: { contains: params.search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };
    const orderBy = {
      [params.sortBy]: params.sortOrder,
    } as Prisma.SubjectOrderByWithRelationInput;

    const [rows, total] = await this.prisma.$transaction([
      this.prisma.subject.findMany({
        where,
        orderBy,
        skip: params.skip,
        take: params.take,
        include: subjectInclude,
      }),
      this.prisma.subject.count({ where }),
    ]);
    return { rows, total };
  }

  findById(id: string): Promise<SubjectRecord | null> {
    return this.prisma.subject.findUnique({ where: { id }, include: subjectInclude });
  }

  create(data: SubjectCreateData): Promise<SubjectRecord> {
    return this.prisma.subject.create({ data, include: subjectInclude });
  }

  update(id: string, data: SubjectUpdateData): Promise<SubjectRecord> {
    return this.prisma.subject.update({ where: { id }, data, include: subjectInclude });
  }

  async remove(id: string): Promise<void> {
    await this.prisma.subject.delete({ where: { id } });
  }
}
