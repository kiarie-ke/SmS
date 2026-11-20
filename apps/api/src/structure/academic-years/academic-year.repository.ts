import { Injectable } from '@nestjs/common';
import type { Prisma } from '../../generated/prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

export interface AcademicYearRecord {
  id: string;
  name: string;
  startDate: Date;
  endDate: Date;
  isCurrent: boolean;
  createdAt: Date;
  updatedAt: Date;
  _count: { terms: number; classes: number };
}

export type AcademicYearSortField = 'name' | 'startDate' | 'createdAt';

export interface AcademicYearListParams {
  skip: number;
  take: number;
  search?: string;
  sortBy: AcademicYearSortField;
  sortOrder: 'asc' | 'desc';
  isCurrent?: boolean;
}

export interface AcademicYearCreateData {
  name: string;
  startDate: Date;
  endDate: Date;
  isCurrent?: boolean;
}

export type AcademicYearUpdateData = Partial<AcademicYearCreateData>;

export abstract class AcademicYearRepositoryPort {
  abstract list(
    params: AcademicYearListParams,
  ): Promise<{ rows: AcademicYearRecord[]; total: number }>;
  abstract findById(id: string): Promise<AcademicYearRecord | null>;
  abstract create(data: AcademicYearCreateData): Promise<AcademicYearRecord>;
  abstract update(
    id: string,
    data: AcademicYearUpdateData,
  ): Promise<AcademicYearRecord>;
  abstract remove(id: string): Promise<void>;
}

const yearInclude = {
  _count: { select: { terms: true, classes: true } },
} satisfies Prisma.AcademicYearInclude;

@Injectable()
export class AcademicYearRepository extends AcademicYearRepositoryPort {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async list(
    params: AcademicYearListParams,
  ): Promise<{ rows: AcademicYearRecord[]; total: number }> {
    const where: Prisma.AcademicYearWhereInput = {
      ...(params.isCurrent === undefined ? {} : { isCurrent: params.isCurrent }),
      ...(params.search
        ? { name: { contains: params.search, mode: 'insensitive' } }
        : {}),
    };
    const orderBy = {
      [params.sortBy]: params.sortOrder,
    } as Prisma.AcademicYearOrderByWithRelationInput;

    const [rows, total] = await this.prisma.$transaction([
      this.prisma.academicYear.findMany({
        where,
        orderBy,
        skip: params.skip,
        take: params.take,
        include: yearInclude,
      }),
      this.prisma.academicYear.count({ where }),
    ]);
    return { rows, total };
  }

  findById(id: string): Promise<AcademicYearRecord | null> {
    return this.prisma.academicYear.findUnique({
      where: { id },
      include: yearInclude,
    });
  }

  async create(data: AcademicYearCreateData): Promise<AcademicYearRecord> {
    if (!data.isCurrent) {
      return this.prisma.academicYear.create({ data, include: yearInclude });
    }
    return this.prisma.$transaction(async (tx) => {
      await tx.academicYear.updateMany({
        where: { isCurrent: true },
        data: { isCurrent: false },
      });
      return tx.academicYear.create({ data, include: yearInclude });
    });
  }

  async update(
    id: string,
    data: AcademicYearUpdateData,
  ): Promise<AcademicYearRecord> {
    if (!data.isCurrent) {
      return this.prisma.academicYear.update({
        where: { id },
        data,
        include: yearInclude,
      });
    }
    return this.prisma.$transaction(async (tx) => {
      await tx.academicYear.updateMany({
        where: { isCurrent: true, NOT: { id } },
        data: { isCurrent: false },
      });
      return tx.academicYear.update({ where: { id }, data, include: yearInclude });
    });
  }

  async remove(id: string): Promise<void> {
    await this.prisma.academicYear.delete({ where: { id } });
  }
}
