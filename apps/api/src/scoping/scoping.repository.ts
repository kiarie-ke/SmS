import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

/** DI port for the lookups the scoping rules need. */
export abstract class ScopingRepositoryPort {
  abstract findTeacherIdByUserId(userId: string): Promise<string | null>;
  abstract findGuardianIdByUserId(userId: string): Promise<string | null>;
  abstract findStudentIdByUserId(userId: string): Promise<string | null>;
  abstract findStudentIdsForTeacher(teacherId: string): Promise<string[]>;
  abstract findStudentIdsForGuardian(guardianId: string): Promise<string[]>;
  abstract findClassIdsForTeacher(teacherId: string): Promise<string[]>;
  abstract findClassIdsForStudents(studentIds: string[]): Promise<string[]>;
}

@Injectable()
export class ScopingRepository extends ScopingRepositoryPort {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async findTeacherIdByUserId(userId: string): Promise<string | null> {
    const teacher = await this.prisma.teacher.findFirst({
      where: { userId, isDeleted: false },
      select: { id: true },
    });
    return teacher?.id ?? null;
  }

  async findGuardianIdByUserId(userId: string): Promise<string | null> {
    const guardian = await this.prisma.guardian.findFirst({
      where: { userId },
      select: { id: true },
    });
    return guardian?.id ?? null;
  }

  async findStudentIdByUserId(userId: string): Promise<string | null> {
    const student = await this.prisma.student.findFirst({
      where: { userId, isDeleted: false },
      select: { id: true },
    });
    return student?.id ?? null;
  }

  /**
   * A teacher may see a student when the student is in a class the teacher
   * teaches (a ClassSubject assignment) or is the class teacher of.
   */
  async findStudentIdsForTeacher(teacherId: string): Promise<string[]> {
    const students = await this.prisma.student.findMany({
      where: {
        isDeleted: false,
        class: {
          OR: [
            { classSubjects: { some: { teacherId } } },
            { classTeacherId: teacherId },
          ],
        },
      },
      select: { id: true },
    });
    return students.map((student) => student.id);
  }

  async findStudentIdsForGuardian(guardianId: string): Promise<string[]> {
    const links = await this.prisma.studentGuardian.findMany({
      where: { guardianId, student: { isDeleted: false } },
      select: { studentId: true },
    });
    return links.map((link) => link.studentId);
  }

  async findClassIdsForTeacher(teacherId: string): Promise<string[]> {
    const classes = await this.prisma.class.findMany({
      where: {
        OR: [
          { classSubjects: { some: { teacherId } } },
          { classTeacherId: teacherId },
        ],
      },
      select: { id: true },
    });
    return classes.map((klass) => klass.id);
  }

  async findClassIdsForStudents(studentIds: string[]): Promise<string[]> {
    if (studentIds.length === 0) return [];
    const students = await this.prisma.student.findMany({
      where: { id: { in: studentIds }, isDeleted: false },
      select: { classId: true },
    });
    return [...new Set(students.map((student) => student.classId))];
  }
}
