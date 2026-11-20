import { Injectable } from '@nestjs/common';
import type { ClassLevel } from '@school-system/shared';
import type { Prisma } from '../../generated/prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

export interface ClassRecord {
  id: string;
  level: ClassLevel;
  name: string;
  academicYearId: string;
  classTeacherId: string | null;
  createdAt: Date;
  updatedAt: Date;
  academicYear: { id: string; name: string; isCurrent: boolean };
  classTeacher: { id: string; firstName: string; lastName: string } | null;
  _count: { students: number; streams: number; classSubjects: number };
}

export type ClassSortField = 'name' | 'level' | 'createdAt';

export interface ClassListParams {
  skip: number;
  take: number;
  search?: string;
  sortBy: ClassSortField;
  sortOrder: 'asc' | 'desc';
  academicYearId?: string;
  level?: ClassLevel;
  /** undefined = unrestricted; otherwise the only classes the caller may see. */
  classIds?: string[];
}

export interface ClassCreateData {
  level: ClassLevel;
  name: string;
  academicYearId: string;
  classTeacherId?: string | null;
}

export type ClassUpdateData = Partial<ClassCreateData>;

export abstract class ClassRepositoryPort {
  abstract list(
    params: ClassListParams,
  ): Promise<{ rows: ClassRecord[]; total: number }>;
  abstract findById(id: string): Promise<ClassRecord | null>;
  abstract create(data: ClassCreateData): Promise<ClassRecord>;
  abstract update(id: string, data: ClassUpdateData): Promise<ClassRecord>;
  abstract remove(id: string): Promise<void>;
}

const classInclude = {
  academicYear: { select: { id: true, name: true, isCurrent: true } },
  classTeacher: { select: { id: true, firstName: true, lastName: true } },
  _count: { select: { students: true, streams: true, classSubjects: true } },
} satisfies Prisma.ClassInclude;

@Injectable()
export class ClassRepository extends ClassRepositoryPort {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async list(params: ClassListParams): Promise<{ rows: ClassRecord[]; total: number }> {
    const where: Prisma.ClassWhereInput = {
      ...(params.classIds ? { id: { in: params.classIds } } : {}),
      ...(params.academicYearId ? { academicYearId: params.academicYearId } : {}),
      ...(params.level ? { level: params.level } : {}),
      ...(params.search
        ? {
            OR: [
              { name: { contains: params.search, mode: 'insensitive' } },
              { classTeacher: { lastName: { contains: params.search, mode: 'insensitive' } } },
            ],
          }
        : {}),
    };
    const orderBy = {
      [params.sortBy]: params.sortOrder,
    } as Prisma.ClassOrderByWithRelationInput;

    const [rows, total] = await this.prisma.$transaction([
      this.prisma.class.findMany({
        where,
        orderBy,
        skip: params.skip,
        take: params.take,
        include: classInclude,
      }),
      this.prisma.class.count({ where }),
    ]);
    return { rows, total };
  }

  findById(id: string): Promise<ClassRecord | null> {
    return this.prisma.class.findUnique({ where: { id }, include: classInclude });
  }

  create(data: ClassCreateData): Promise<ClassRecord> {
    return this.prisma.class.create({ data, include: classInclude });
  }

  update(id: string, data: ClassUpdateData): Promise<ClassRecord> {
    return this.prisma.class.update({ where: { id }, data, include: classInclude });
  }

  async remove(id: string): Promise<void> {
    await this.prisma.class.delete({ where: { id } });
  }
}
