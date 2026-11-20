import { Injectable } from '@nestjs/common';
import type { Prisma } from '../../generated/prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

export interface TermRecord {
  id: string;
  academicYearId: string;
  termNumber: number;
  name: string;
  startDate: Date;
  endDate: Date;
  isCurrent: boolean;
  createdAt: Date;
  updatedAt: Date;
  academicYear: { id: string; name: string };
}

export type TermSortField = 'termNumber' | 'name' | 'startDate';

export interface TermListParams {
  skip: number;
  take: number;
  search?: string;
  sortBy: TermSortField;
  sortOrder: 'asc' | 'desc';
  academicYearId?: string;
  isCurrent?: boolean;
}

export interface TermCreateData {
  academicYearId: string;
  termNumber: number;
  name: string;
  startDate: Date;
  endDate: Date;
  isCurrent?: boolean;
}

export type TermUpdateData = Partial<TermCreateData>;

export abstract class TermRepositoryPort {
  abstract list(
    params: TermListParams,
  ): Promise<{ rows: TermRecord[]; total: number }>;
  abstract findById(id: string): Promise<TermRecord | null>;
  abstract findCurrent(): Promise<TermRecord | null>;
  abstract create(data: TermCreateData): Promise<TermRecord>;
  abstract update(id: string, data: TermUpdateData): Promise<TermRecord>;
  abstract remove(id: string): Promise<void>;
}

const termInclude = {
  academicYear: { select: { id: true, name: true } },
} satisfies Prisma.TermInclude;

@Injectable()
export class TermRepository extends TermRepositoryPort {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async list(params: TermListParams): Promise<{ rows: TermRecord[]; total: number }> {
    const where: Prisma.TermWhereInput = {
      ...(params.academicYearId ? { academicYearId: params.academicYearId } : {}),
      ...(params.isCurrent === undefined ? {} : { isCurrent: params.isCurrent }),
      ...(params.search ? { name: { contains: params.search, mode: 'insensitive' } } : {}),
    };
    const orderBy = {
      [params.sortBy]: params.sortOrder,
    } as Prisma.TermOrderByWithRelationInput;

    const [rows, total] = await this.prisma.$transaction([
      this.prisma.term.findMany({
        where,
        orderBy,
        skip: params.skip,
        take: params.take,
        include: termInclude,
      }),
      this.prisma.term.count({ where }),
    ]);
    return { rows, total };
  }

  findById(id: string): Promise<TermRecord | null> {
    return this.prisma.term.findUnique({ where: { id }, include: termInclude });
  }

  findCurrent(): Promise<TermRecord | null> {
    return this.prisma.term.findFirst({
      where: { isCurrent: true },
      include: termInclude,
    });
  }

  async create(data: TermCreateData): Promise<TermRecord> {
    if (!data.isCurrent) {
      return this.prisma.term.create({ data, include: termInclude });
    }
    return this.prisma.$transaction(async (tx) => {
      await tx.term.updateMany({ where: { isCurrent: true }, data: { isCurrent: false } });
      return tx.term.create({ data, include: termInclude });
    });
  }

  async update(id: string, data: TermUpdateData): Promise<TermRecord> {
    if (!data.isCurrent) {
      return this.prisma.term.update({ where: { id }, data, include: termInclude });
    }
    return this.prisma.$transaction(async (tx) => {
      await tx.term.updateMany({
        where: { isCurrent: true, NOT: { id } },
        data: { isCurrent: false },
      });
      return tx.term.update({ where: { id }, data, include: termInclude });
    });
  }

  async remove(id: string): Promise<void> {
    await this.prisma.term.delete({ where: { id } });
  }
}
