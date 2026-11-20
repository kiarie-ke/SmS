import { ForbiddenException, NotFoundException } from '@nestjs/common';
import type { ConfigService } from '@nestjs/config';
import type { AuthenticatedUser } from '../../common/auth-user';
import { ScopingRepositoryPort } from '../../scoping/scoping.repository';
import { ScopingService } from '../../scoping/scoping.service';
import { PhotoStorageService } from './photo-storage.service';
import { StudentImportService } from './student-import.service';
import { StudentRepositoryPort } from './student.repository';
import { StudentsService } from './students.service';
import type {
  StudentCreateData,
  StudentDetailRecord,
  StudentListParams,
  StudentRecord,
  StudentUpdateData,
} from './student.types';

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

/** Teacher sees s1 (Form 3); the parent is linked to s1 only; s2 is unrelated. */
class FakeScopingRepository extends ScopingRepositoryPort {
  async findTeacherIdByUserId(userId: string) {
    return userId === TEACHER.id ? 'teacher-1' : null;
  }
  async findGuardianIdByUserId(userId: string) {
    return userId === PARENT.id ? 'guardian-1' : null;
  }
  async findStudentIdByUserId() {
    return null;
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

class FakeStudentRepository extends StudentRepositoryPort {
  readonly students = new Map<string, StudentDetailRecord>();

  constructor() {
    super();
    this.students.set('s1', makeStudent('s1', 'ADM-001', 'c1'));
    this.students.set('s2', makeStudent('s2', 'ADM-002', 'c2'));
  }

  async list(params: StudentListParams) {
    const visible = [...this.students.values()].filter(
      (student) =>
        !student.isDeleted &&
        (params.scope.unrestricted || params.scope.ids.includes(student.id)),
    );
    return {
      rows: visible.slice(params.skip, params.skip + params.take),
      total: visible.length,
    };
  }

  async findById(id: string) {
    return this.students.get(id) ?? null;
  }

  async create(data: StudentCreateData): Promise<StudentRecord> {
    const id = `s${this.students.size + 1}`;
    const record = makeStudent(id, data.admissionNumber, data.classId);
    this.students.set(id, record);
    return record;
  }

  async update(id: string, data: StudentUpdateData): Promise<StudentRecord> {
    const record = this.students.get(id)!;
    const next = { ...record, ...data };
    this.students.set(id, next);
    return next;
  }

  async softDelete(id: string) {
    const record = this.students.get(id)!;
    this.students.set(id, { ...record, isDeleted: true });
  }

  async setPhotoUrl(id: string, photoUrl: string) {
    const record = this.students.get(id)!;
    this.students.set(id, { ...record, photoUrl });
  }

  async linkGuardian(studentId: string, guardianId: string, isPrimary: boolean) {
    const record = this.students.get(studentId)!;
    this.students.set(studentId, {
      ...record,
      guardians: [
        ...record.guardians,
        {
          id: `link-${guardianId}`,
          guardianId,
          isPrimary,
          guardian: {
            id: guardianId,
            firstName: 'Joseph',
            lastName: 'Otieno',
            phone: '+254711000010',
            email: null,
            relationship: 'FATHER',
          },
        },
      ],
    });
  }

  async findClassById(id: string) {
    return { id, name: 'Form 3 South' };
  }
  async findClassByName(name: string) {
    return { id: 'c1', name };
  }
  async findStreamByName() {
    return null;
  }
  async findStreamById() {
    return null;
  }
}

function makeStudent(
  id: string,
  admissionNumber: string,
  classId: string,
): StudentDetailRecord {
  return {
    id,
    admissionNumber,
    upi: `UPI-${id}`,
    firstName: 'Brian',
    middleName: null,
    lastName: 'Otieno',
    gender: 'MALE',
    dateOfBirth: new Date('2012-04-12T00:00:00.000Z'),
    birthCertificateNumber: null,
    knecIndexNumber: null,
    photoUrl: null,
    county: 'Nairobi',
    subCounty: 'Westlands',
    religion: null,
    specialNeeds: false,
    boardingStatus: 'DAY',
    classId,
    streamId: null,
    userId: null,
    isDeleted: false,
    createdAt: new Date('2026-01-05T00:00:00.000Z'),
    updatedAt: new Date('2026-01-05T00:00:00.000Z'),
    class: { id: classId, name: 'Form 3 South', level: 'FORM3' },
    stream: null,
    _count: { guardians: 0 },
    guardians: [],
  };
}

describe('StudentsService scoping', () => {
  let repository: FakeStudentRepository;
  let service: StudentsService;

  beforeEach(() => {
    repository = new FakeStudentRepository();
    const scoping = new ScopingService(new FakeScopingRepository());
    service = new StudentsService(
      repository,
      scoping,
      new StudentImportService(repository),
      new PhotoStorageService({ get: () => undefined } as unknown as ConfigService),
    );
  });

  it('denies a teacher reading a student outside their assigned classes', async () => {
    await expect(service.get(TEACHER, 's2')).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('allows a teacher to read a student in an assigned class', async () => {
    const student = await service.get(TEACHER, 's1');
    expect(student.id).toBe('s1');
  });

  it('denies a parent reading a child that is not linked to them', async () => {
    await expect(service.get(PARENT, 's2')).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('allows a parent to read their linked child', async () => {
    const student = await service.get(PARENT, 's1');
    expect(student.admissionNumber).toBe('ADM-001');
  });

  it('restricts list results to the caller scope', async () => {
    const list = await service.list(TEACHER, { page: 1, limit: 20, skip: 0, sortBy: 'lastName', sortOrder: 'asc' } as never);
    expect(list.data.map((student) => student.id)).toEqual(['s1']);
    expect(list.meta.total).toBe(1);
  });

  it('lets an admin read any student', async () => {
    await expect(service.get(ADMIN, 's2')).resolves.toMatchObject({ id: 's2' });
  });

  it('hides archived students behind a 404', async () => {
    await repository.softDelete('s1');
    await expect(service.get(ADMIN, 's1')).rejects.toBeInstanceOf(NotFoundException);
  });
});
