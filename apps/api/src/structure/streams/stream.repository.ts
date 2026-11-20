import { Injectable } from '@nestjs/common';
import type { ClassLevel } from '@school-system/shared';
import type { Prisma } from '../../generated/prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

export interface StreamRecord {
  id: string;
  classId: string;
  name: string;
  createdAt: Date;
  updatedAt: Date;
  class: { id: string; name: string; level: ClassLevel };
  _count: { students: number };
}

export type StreamSortField = 'name' | 'createdAt';

export interface StreamListParams {
  skip: number;
  take: number;
  search?: string;
  sortBy: StreamSortField;
  sortOrder: 'asc' | 'desc';
  classId?: string;
  /** undefined = unrestricted; otherwise only streams of these classes. */
  classIds?: string[];
}

export interface StreamCreateData {
  classId: string;
  name: string;
}

export type StreamUpdateData = Partial<StreamCreateData>;

export abstract class StreamRepositoryPort {
  abstract list(
    params: StreamListParams,
  ): Promise<{ rows: StreamRecord[]; total: number }>;
  abstract findById(id: string): Promise<StreamRecord | null>;
  abstract create(data: StreamCreateData): Promise<StreamRecord>;
  abstract update(id: string, data: StreamUpdateData): Promise<StreamRecord>;
  abstract remove(id: string): Promise<void>;
}

const streamInclude = {
  class: { select: { id: true, name: true, level: true } },
  _count: { select: { students: true } },
} satisfies Prisma.StreamInclude;

@Injectable()
export class StreamRepository extends StreamRepositoryPort {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async list(params: StreamListParams): Promise<{ rows: StreamRecord[]; total: number }> {
    const where: Prisma.StreamWhereInput = {
      ...(params.classId ? { classId: params.classId } : {}),
      ...(params.classIds ? { classId: { in: params.classIds } } : {}),
      ...(params.search ? { name: { contains: params.search, mode: 'insensitive' } } : {}),
    };
    const orderBy = {
      [params.sortBy]: params.sortOrder,
    } as Prisma.StreamOrderByWithRelationInput;

    const [rows, total] = await this.prisma.$transaction([
      this.prisma.stream.findMany({
        where,
        orderBy,
        skip: params.skip,
        take: params.take,
        include: streamInclude,
      }),
      this.prisma.stream.count({ where }),
    ]);
    return { rows, total };
  }

  findById(id: string): Promise<StreamRecord | null> {
    return this.prisma.stream.findUnique({ where: { id }, include: streamInclude });
  }

  create(data: StreamCreateData): Promise<StreamRecord> {
    return this.prisma.stream.create({ data, include: streamInclude });
  }

  update(id: string, data: StreamUpdateData): Promise<StreamRecord> {
    return this.prisma.stream.update({ where: { id }, data, include: streamInclude });
  }

  async remove(id: string): Promise<void> {
    await this.prisma.stream.delete({ where: { id } });
  }
}
