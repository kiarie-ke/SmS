import { Injectable } from '@nestjs/common';
import type { Prisma } from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';

export type SchoolSettingsRecord = Prisma.SchoolGetPayload<Record<string, never>>;
export type SchoolSettingsUpdateData = Partial<
  Pick<
    SchoolSettingsRecord,
    | 'name'
    | 'motto'
    | 'county'
    | 'subCounty'
    | 'type'
    | 'category'
    | 'levels'
    | 'gradeScaleType'
    | 'phone'
    | 'email'
    | 'address'
    | 'principalName'
    | 'nemisCode'
    | 'knecCenterNumber'
  >
>;

export abstract class SchoolSettingsRepositoryPort {
  abstract findDefault(): Promise<SchoolSettingsRecord | null>;
  abstract update(id: string, data: SchoolSettingsUpdateData): Promise<SchoolSettingsRecord>;
  abstract setAcademicPeriod(academicYearId: string, termId: string): Promise<boolean>;
}

@Injectable()
export class SchoolSettingsRepository extends SchoolSettingsRepositoryPort {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  findDefault(): Promise<SchoolSettingsRecord | null> {
    return this.prisma.school.findFirst({ orderBy: { createdAt: 'asc' } });
  }

  update(id: string, data: SchoolSettingsUpdateData): Promise<SchoolSettingsRecord> {
    return this.prisma.school.update({ where: { id }, data });
  }

  setAcademicPeriod(academicYearId: string, termId: string): Promise<boolean> {
    return this.prisma.$transaction(async (transaction) => {
      const [academicYear, term] = await Promise.all([
        transaction.academicYear.findUnique({
          where: { id: academicYearId },
          select: { id: true },
        }),
        transaction.term.findUnique({
          where: { id: termId },
          select: { id: true, academicYearId: true },
        }),
      ]);
      if (!academicYear || !term || term.academicYearId !== academicYearId) {
        return false;
      }

      await transaction.academicYear.updateMany({
        where: { isCurrent: true },
        data: { isCurrent: false },
      });
      await transaction.term.updateMany({
        where: { isCurrent: true },
        data: { isCurrent: false },
      });
      await transaction.academicYear.update({
        where: { id: academicYearId },
        data: { isCurrent: true },
      });
      await transaction.term.update({
        where: { id: termId },
        data: { isCurrent: true },
      });
      return true;
    });
  }
}
