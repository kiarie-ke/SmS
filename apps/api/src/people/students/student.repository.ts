import { Injectable } from '@nestjs/common';
import type { Prisma } from '../../generated/prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import type {
  StudentCreateData,
  StudentDetailRecord,
  StudentListParams,
  StudentRecord,
  StudentUpdateData,
} from './student.types';

/** DI port so services and tests never import Prisma. */
export abstract class StudentRepositoryPort {
  abstract list(
    params: StudentListParams,
  ): Promise<{ rows: StudentRecord[]; total: number }>;
  abstract findById(id: string): Promise<StudentDetailRecord | null>;
  abstract create(data: StudentCreateData): Promise<StudentRecord>;
  abstract update(id: string, data: StudentUpdateData): Promise<StudentRecord>;
  abstract softDelete(id: string): Promise<void>;
  abstract setPhotoUrl(id: string, photoUrl: string): Promise<void>;
  abstract linkGuardian(
    studentId: string,
    guardianId: string,
    isPrimary: boolean,
  ): Promise<void>;
  abstract findClassById(id: string): Promise<{ id: string; name: string } | null>;
  abstract findClassByName(name: string): Promise<{ id: string; name: string } | null>;
  abstract findStreamByName(
    classId: string,
    name: string,
  ): Promise<{ id: string; name: string } | null>;
  abstract findStreamById(
    id: string,
  ): Promise<{ id: string; classId: string } | null>;
}

const studentInclude = {
  class: true,
  stream: true,
  _count: { select: { guardians: true } },
} satisfies Prisma.StudentInclude;

const studentDetailInclude = {
  ...studentInclude,
  guardians: { include: { guardian: true } },
} satisfies Prisma.StudentInclude;

@Injectable()
export class StudentRepository extends StudentRepositoryPort {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async list(
    params: StudentListParams,
  ): Promise<{ rows: StudentRecord[]; total: number }> {
    const where: Prisma.StudentWhereInput = {
      isDeleted: false,
      ...(params.scope.unrestricted ? {} : { id: { in: params.scope.ids } }),
      ...(params.classId ? { classId: params.classId } : {}),
      ...(params.streamId ? { streamId: params.streamId } : {}),
      ...(params.gender ? { gender: params.gender } : {}),
      ...(params.search
        ? {
            OR: [
              { admissionNumber: { contains: params.search, mode: 'insensitive' } },
              { upi: { contains: params.search, mode: 'insensitive' } },
              { firstName: { contains: params.search, mode: 'insensitive' } },
              { lastName: { contains: params.search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    const orderBy = {
      [params.sortBy]: params.sortOrder,
    } as Prisma.StudentOrderByWithRelationInput;

    const [rows, total] = await this.prisma.$transaction([
      this.prisma.student.findMany({
        where,
        orderBy,
        skip: params.skip,
        take: params.take,
        include: studentInclude,
      }),
      this.prisma.student.count({ where }),
    ]);

    return { rows, total };
  }

  findById(id: string): Promise<StudentDetailRecord | null> {
    return this.prisma.student.findUnique({
      where: { id },
      include: studentDetailInclude,
    });
  }

  create(data: StudentCreateData): Promise<StudentRecord> {
    return this.prisma.student.create({ data, include: studentInclude });
  }

  update(id: string, data: StudentUpdateData): Promise<StudentRecord> {
    return this.prisma.student.update({
      where: { id },
      data,
      include: studentInclude,
    });
  }

  async softDelete(id: string): Promise<void> {
    await this.prisma.student.update({ where: { id }, data: { isDeleted: true } });
  }

  async setPhotoUrl(id: string, photoUrl: string): Promise<void> {
    await this.prisma.student.update({ where: { id }, data: { photoUrl } });
  }

  async linkGuardian(
    studentId: string,
    guardianId: string,
    isPrimary: boolean,
  ): Promise<void> {
    await this.prisma.studentGuardian.upsert({
      where: { studentId_guardianId: { studentId, guardianId } },
      update: { isPrimary },
      create: { studentId, guardianId, isPrimary },
    });
  }

  findClassById(id: string): Promise<{ id: string; name: string } | null> {
    return this.prisma.class.findUnique({
      where: { id },
      select: { id: true, name: true },
    });
  }

  findClassByName(name: string): Promise<{ id: string; name: string } | null> {
    return this.prisma.class.findFirst({
      where: { name: { equals: name, mode: 'insensitive' } },
      select: { id: true, name: true },
    });
  }

  findStreamByName(
    classId: string,
    name: string,
  ): Promise<{ id: string; name: string } | null> {
    return this.prisma.stream.findFirst({
      where: { classId, name: { equals: name, mode: 'insensitive' } },
      select: { id: true, name: true },
    });
  }

  findStreamById(id: string): Promise<{ id: string; classId: string } | null> {
    return this.prisma.stream.findUnique({
      where: { id },
      select: { id: true, classId: true },
    });
  }
}
