import { Injectable } from '@nestjs/common';
import type { Prisma } from '../../generated/prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import type {
  GuardianCreateData,
  GuardianListParams,
  GuardianRecord,
  GuardianUpdateData,
} from './guardian.types';

export abstract class GuardianRepositoryPort {
  abstract list(
    params: GuardianListParams,
  ): Promise<{ rows: GuardianRecord[]; total: number }>;
  abstract findById(id: string): Promise<GuardianRecord | null>;
  abstract create(data: GuardianCreateData): Promise<GuardianRecord>;
  abstract update(id: string, data: GuardianUpdateData): Promise<GuardianRecord>;
  abstract remove(id: string): Promise<void>;
}

const guardianInclude = {
  _count: { select: { students: true } },
} satisfies Prisma.GuardianInclude;

@Injectable()
export class GuardianRepository extends GuardianRepositoryPort {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async list(
    params: GuardianListParams,
  ): Promise<{ rows: GuardianRecord[]; total: number }> {
    const where: Prisma.GuardianWhereInput = {
      ...(params.relationship ? { relationship: params.relationship } : {}),
      ...(params.search
        ? {
            OR: [
              { firstName: { contains: params.search, mode: 'insensitive' } },
              { lastName: { contains: params.search, mode: 'insensitive' } },
              { phone: { contains: params.search } },
              { email: { contains: params.search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };
    const orderBy = {
      [params.sortBy]: params.sortOrder,
    } as Prisma.GuardianOrderByWithRelationInput;

    const [rows, total] = await this.prisma.$transaction([
      this.prisma.guardian.findMany({
        where,
        orderBy,
        skip: params.skip,
        take: params.take,
        include: guardianInclude,
      }),
      this.prisma.guardian.count({ where }),
    ]);
    return { rows, total };
  }

  findById(id: string): Promise<GuardianRecord | null> {
    return this.prisma.guardian.findUnique({
      where: { id },
      include: guardianInclude,
    });
  }

  create(data: GuardianCreateData): Promise<GuardianRecord> {
    return this.prisma.guardian.create({ data, include: guardianInclude });
  }

  update(id: string, data: GuardianUpdateData): Promise<GuardianRecord> {
    return this.prisma.guardian.update({
      where: { id },
      data,
      include: guardianInclude,
    });
  }

  async remove(id: string): Promise<void> {
    await this.prisma.guardian.delete({ where: { id } });
  }
}
