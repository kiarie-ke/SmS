import { ForbiddenException, Injectable } from '@nestjs/common';
import type { AuthenticatedUser } from '../common/auth-user';
import { ScopingRepositoryPort } from './scoping.repository';

/**
 * `unrestricted` means the caller may see every record (ADMIN).
 * Otherwise `ids` is the exhaustive allow-list; an empty list means "none".
 */
export interface ResourceScope {
  unrestricted: boolean;
  ids: string[];
}

/**
 * The single place that decides which students/classes a user may touch.
 * Called from services — never only from controllers — so every code path
 * (list, detail, CSV import, photo upload) goes through the same rule.
 */
@Injectable()
export class ScopingService {
  constructor(private readonly scoping: ScopingRepositoryPort) {}

  async studentScope(user: AuthenticatedUser): Promise<ResourceScope> {
    if (user.role === 'ADMIN') return { unrestricted: true, ids: [] };

    if (user.role === 'TEACHER') {
      const teacherId = await this.scoping.findTeacherIdByUserId(user.id);
      return {
        unrestricted: false,
        ids: teacherId ? await this.scoping.findStudentIdsForTeacher(teacherId) : [],
      };
    }

    if (user.role === 'PARENT') {
      const guardianId = await this.scoping.findGuardianIdByUserId(user.id);
      return {
        unrestricted: false,
        ids: guardianId ? await this.scoping.findStudentIdsForGuardian(guardianId) : [],
      };
    }

    // STUDENT: only their own record.
    const studentId = await this.scoping.findStudentIdByUserId(user.id);
    return { unrestricted: false, ids: studentId ? [studentId] : [] };
  }

  async classScope(user: AuthenticatedUser): Promise<ResourceScope> {
    if (user.role === 'ADMIN') return { unrestricted: true, ids: [] };

    if (user.role === 'TEACHER') {
      const teacherId = await this.scoping.findTeacherIdByUserId(user.id);
      return {
        unrestricted: false,
        ids: teacherId ? await this.scoping.findClassIdsForTeacher(teacherId) : [],
      };
    }

    // Students and parents reach classes through the students they can see.
    const studentIds = (await this.studentScope(user)).ids;
    return {
      unrestricted: false,
      ids: await this.scoping.findClassIdsForStudents(studentIds),
    };
  }

  /** Throws 403 when the user may not read/write the student. */
  async assertStudent(user: AuthenticatedUser, studentId: string): Promise<void> {
    const scope = await this.studentScope(user);
    if (scope.unrestricted) return;
    if (!scope.ids.includes(studentId)) {
      throw new ForbiddenException('You do not have access to this student');
    }
  }

  /** Throws 403 when the user may not touch the class. */
  async assertClass(user: AuthenticatedUser, classId: string): Promise<void> {
    const scope = await this.classScope(user);
    if (scope.unrestricted) return;
    if (!scope.ids.includes(classId)) {
      throw new ForbiddenException('You do not have access to this class');
    }
  }
}
