import { Injectable } from '@nestjs/common';
import type { Prisma } from '../../generated/prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import type {
  TeacherCreateData,
  TeacherDetailRecord,
  TeacherListParams,
  TeacherRecord,
  TeacherUpdateData,
} from './teacher.types';

export abstract class TeacherRepositoryPort {
  abstract list(
    params: TeacherListParams,
  ): Promise<{ rows: TeacherRecord[]; total: number }>;
  abstract findById(id: string): Promise<TeacherDetailRecord | null>;
  abstract create(data: TeacherCreateData): Promise<TeacherRecord>;
  abstract update(id: string, data: TeacherUpdateData): Promise<TeacherRecord>;
  abstract softDelete(id: string): Promise<void>;
  abstract assignClassSubject(
    teacherId: string,
    classId: string,
    subjectId: string,
  ): Promise<void>;
  /** Used to verify that the linked login account exists and is a TEACHER. */
  abstract findUserRole(userId: string): Promise<string | null>;
}

const teacherInclude = {
  user: { select: { email: true, role: true } },
  _count: { select: { classSubjects: true } },
} satisfies Prisma.TeacherInclude;

const teacherDetailInclude = {
  ...teacherInclude,
  classSubjects: {
    include: {
      class: { select: { id: true, name: true } },
      subject: { select: { id: true, name: true, code: true } },
    },
  },
} satisfies Prisma.TeacherInclude;

@Injectable()
export class TeacherRepository extends TeacherRepositoryPort {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async list(
    params: TeacherListParams,
  ): Promise<{ rows: TeacherRecord[]; total: number }> {
    const where: Prisma.TeacherWhereInput = {
      isDeleted: false,
      ...(params.employmentType ? { employmentType: params.employmentType } : {}),
      ...(params.search
        ? {
            OR: [
              { firstName: { contains: params.search, mode: 'insensitive' } },
              { lastName: { contains: params.search, mode: 'insensitive' } },
              { tscNumber: { contains: params.search, mode: 'insensitive' } },
              { email: { contains: params.search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };
    const orderBy = {
      [params.sortBy]: params.sortOrder,
    } as Prisma.TeacherOrderByWithRelationInput;

    const [rows, total] = await this.prisma.$transaction([
      this.prisma.teacher.findMany({
        where,
        orderBy,
        skip: params.skip,
        take: params.take,
        include: teacherInclude,
      }),
      this.prisma.teacher.count({ where }),
    ]);
    return { rows, total };
  }

  findById(id: string): Promise<TeacherDetailRecord | null> {
    return this.prisma.teacher.findUnique({
      where: { id },
      include: teacherDetailInclude,
    });
  }

  create(data: TeacherCreateData): Promise<TeacherRecord> {
    return this.prisma.teacher.create({ data, include: teacherInclude });
  }

  update(id: string, data: TeacherUpdateData): Promise<TeacherRecord> {
    return this.prisma.teacher.update({
      where: { id },
      data,
      include: teacherInclude,
    });
  }

  async softDelete(id: string): Promise<void> {
    await this.prisma.teacher.update({ where: { id }, data: { isDeleted: true } });
  }

  async assignClassSubject(
    teacherId: string,
    classId: string,
    subjectId: string,
  ): Promise<void> {
    // One teacher per subject per class; assigning replaces the previous teacher.
    await this.prisma.classSubject.upsert({
      where: { classId_subjectId: { classId, subjectId } },
      update: { teacherId },
      create: { classId, subjectId, teacherId },
    });
  }

  async findUserRole(userId: string): Promise<string | null> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { role: true },
    });
    return user?.role ?? null;
  }
}
