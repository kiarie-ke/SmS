import { ForbiddenException } from '@nestjs/common';
import type { AuthenticatedUser } from '../common/auth-user';
import { ScopingRepositoryPort } from '../scoping/scoping.repository';
import { ScopingService } from '../scoping/scoping.service';
import { AttendanceRepositoryPort } from './attendance.repository';
import { AttendanceService } from './attendance.service';
import type { AttendanceUpsertEntry } from './attendance.repository';

const TEACHER: AuthenticatedUser = {
  id: 'user-teacher',
  email: 'teacher@mwangaza.ac.ke',
  phone: '+254720123458',
  role: 'TEACHER',
};
const PARENT: AuthenticatedUser = {
  id: 'user-parent',
  email: 'parent@mwangaza.ac.ke',
  phone: '+254720123462',
  role: 'PARENT',
};
const ADMIN: AuthenticatedUser = {
  id: 'user-admin',
  email: 'admin@mwangaza.ac.ke',
  phone: '+254720123457',
  role: 'ADMIN',
};
const STUDENT_USER: AuthenticatedUser = {
  id: 'user-student',
  email: 'student@mwangaza.ac.ke',
  phone: '+254720123460',
  role: 'STUDENT',
};

class FakeScopingRepository extends ScopingRepositoryPort {
  async findTeacherIdByUserId(userId: string) {
    return userId === TEACHER.id || userId === ADMIN.id ? 'teacher-1' : null;
  }
  async findGuardianIdByUserId(userId: string) {
    return userId === PARENT.id ? 'guardian-1' : null;
  }
  async findStudentIdByUserId(userId: string) {
    return userId === STUDENT_USER.id ? 's1' : null;
  }
  async findStudentIdsForTeacher(teacherId: string) {
    return teacherId === 'teacher-1' ? ['s1'] : [];
  }
  async findStudentIdsForGuardian(guardianId: string) {
    return guardianId === 'guardian-1' ? ['s1'] : [];
  }
  async findClassIdsForTeacher() {
    return ['c1'];
  }
  async findClassIdsForStudents() {
    return ['c1'];
  }
}

class FakeAttendanceRepository extends AttendanceRepositoryPort {
  private records = new Map<string, AttendanceUpsertEntry>();

  async findByClassAndDate() {
    return [];
  }
  async findByStudent() {
    return [];
  }
  async upsertMany(entries: AttendanceUpsertEntry[]) {
    for (const entry of entries) {
      this.records.set(`${entry.studentId}|${entry.date.toISOString().slice(0, 10)}`, entry);
    }
  }
  async classSummary() {
    return [];
  }
  async studentSummary() {
    return { present: 0, absent: 0, late: 0, excused: 0, total: 0, percentage: 0 };
  }
  async notifyAbsence() {
    return;
  }
  recordCount() {
    return this.records.size;
  }
}

describe('AttendanceService scoping', () => {
  let repo: FakeAttendanceRepository;
  let service: AttendanceService;

  beforeEach(() => {
    repo = new FakeAttendanceRepository();
    const scoping = new ScopingService(new FakeScopingRepository());
    service = new AttendanceService(repo, scoping);
  });

  it('denies a teacher registering attendance for an unassigned class', async () => {
    // c2 not in teacher scope (only c1). assertClass uses classScope -> findClassIdsForTeacher returns ['c1']
    await expect(
      service.register(TEACHER, {
        classId: 'c2',
        date: '2026-05-04',
        entries: [{ studentId: 's1', status: 'PRESENT' }],
      } as never),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('allows a teacher to register attendance for an assigned class', async () => {
    const result = await service.register(TEACHER, {
      classId: 'c1',
      date: '2026-05-04',
      entries: [{ studentId: 's1', status: 'PRESENT' }],
    } as never);
    expect(result.registered).toBe(1);
  });

  it('is idempotent: re-registering the same day keeps a single row', async () => {
    await service.register(TEACHER, {
      classId: 'c1',
      date: '2026-05-04',
      entries: [{ studentId: 's1', status: 'PRESENT' }],
    } as never);
    await service.register(TEACHER, {
      classId: 'c1',
      date: '2026-05-04',
      entries: [{ studentId: 's1', status: 'ABSENT' }],
    } as never);
    expect(repo.recordCount()).toBe(1);
  });

  it('denies a parent reading attendance of an unlinked child', async () => {
    await expect(
      service.studentAttendance(PARENT, 's2', {} as never),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('allows a parent to read attendance of a linked child', async () => {
    await expect(
      service.studentAttendance(PARENT, 's1', {} as never),
    ).resolves.toBeDefined();
  });

  it('lets an admin register attendance', async () => {
    const result = await service.register(ADMIN, {
      classId: 'c1',
      date: '2026-05-04',
      entries: [{ studentId: 's1', status: 'LATE' }],
    } as never);
    expect(result.registered).toBe(1);
  });
});
