import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import type { AuthenticatedUser } from '../common/auth-user';
import { ScopingRepositoryPort } from '../scoping/scoping.repository';
import { ScopingService } from '../scoping/scoping.service';
import { ExamRepositoryPort, type ExamCreateData, type ExamListParams, type ExamRecord, type MarkRecord, type MarkUpsertEntry } from './exam.repository';
import { ExamsService } from './exam.service';

const TEACHER: AuthenticatedUser = {
  id: 'user-teacher',
  email: 'teacher@mwangaza.ac.ke',
  phone: '+254720123458',
  role: 'TEACHER',
};

const ADMIN: AuthenticatedUser = {
  id: 'user-admin',
  email: 'admin@mwangaza.ac.ke',
  phone: '+254720123457',
  role: 'ADMIN',
};

class FakeScopingRepository extends ScopingRepositoryPort {
  async findTeacherIdByUserId() { return 'teacher-1'; }
  async findGuardianIdByUserId() { return null; }
  async findStudentIdByUserId() { return null; }
  async findStudentIdsForTeacher() { return ['s1', 's2']; }
  async findStudentIdsForGuardian() { return []; }
  async findClassIdsForTeacher() { return ['c1']; }
  async findClassIdsForStudents() { return ['c1']; }
}

class FakeExamRepository extends ExamRepositoryPort {
  public exams = new Map<string, ExamRecord>();
  public marks = new Map<string, MarkRecord>();

  async list(params: ExamListParams) {
    const all = Array.from(this.exams.values());
    return { rows: all, total: all.length };
  }

  async findById(id: string) {
    return this.exams.get(id) ?? null;
  }

  async create(data: ExamCreateData): Promise<ExamRecord> {
    const exam: ExamRecord = {
      id: `exam-${Date.now()}`,
      termId: data.termId,
      subjectId: data.subjectId,
      classId: data.classId,
      name: data.name,
      maxMarks: data.maxMarks,
      date: data.date,
      isPublished: false,
      publishedAt: null,
      lockedByUserId: null,
      lockedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.exams.set(exam.id, exam);
    return exam;
  }

  async update(id: string, data: any): Promise<ExamRecord> {
    const existing = this.exams.get(id)!;
    const updated = { ...existing, ...data };
    this.exams.set(id, updated);
    return updated;
  }

  async remove(id: string) {
    this.exams.delete(id);
  }

  async listMarks(examId: string) {
    return Array.from(this.marks.values()).filter((m) => m.examId === examId);
  }

  async upsertMarks(entries: MarkUpsertEntry[]) {
    for (const e of entries) {
      const key = `${e.examId}-${e.studentId}`;
      this.marks.set(key, {
        id: `mark-${key}`,
        examId: e.examId,
        studentId: e.studentId,
        score: e.score,
        grade: e.grade,
        points: e.points,
        teacherComment: e.teacherComment ?? null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    }
  }

  async publish(id: string): Promise<ExamRecord> {
    const existing = this.exams.get(id)!;
    existing.isPublished = true;
    existing.publishedAt = new Date();
    return existing;
  }

  async lock(id: string, userId: string): Promise<ExamRecord> {
    const existing = this.exams.get(id)!;
    existing.lockedByUserId = userId;
    existing.lockedAt = new Date();
    return existing;
  }

  async unlock(id: string): Promise<ExamRecord> {
    const existing = this.exams.get(id)!;
    existing.lockedByUserId = null;
    existing.lockedAt = null;
    return existing;
  }
}

describe('ExamsService', () => {
  let service: ExamsService;
  let repo: FakeExamRepository;
  let scoping: ScopingService;

  beforeEach(() => {
    repo = new FakeExamRepository();
    scoping = new ScopingService(new FakeScopingRepository());
    service = new ExamsService(repo, scoping);
  });

  it('allows teacher to create an exam for an assigned class', async () => {
    const exam = await service.create(TEACHER, {
      termId: 'term-1',
      subjectId: 'sub-1',
      classId: 'c1',
      name: 'MIDTERM',
      maxMarks: 100,
      date: '2026-06-15',
    });
    expect(exam).toBeDefined();
    expect(exam.classId).toBe('c1');
    expect(exam.maxMarks).toBe(100);
  });

  it('forbids teacher from creating an exam for an unassigned class', async () => {
    await expect(
      service.create(TEACHER, {
        termId: 'term-1',
        subjectId: 'sub-1',
        classId: 'c2-unassigned',
        name: 'MIDTERM',
        maxMarks: 100,
        date: '2026-06-15',
      }),
    ).rejects.toThrow(ForbiddenException);
  });

  it('computes 8-4-4 grades and points correctly on registerMarks', async () => {
    const exam = await service.create(ADMIN, {
      termId: 'term-1',
      subjectId: 'sub-1',
      classId: 'c1',
      name: 'ENDTERM',
      maxMarks: 100,
      date: '2026-06-15',
    });

    const res = await service.registerMarks(ADMIN, exam.id, {
      entries: [
        { studentId: 's1', score: 85 }, // A (12 points)
        { studentId: 's2', score: 52 }, // C (6 points)
      ],
    });

    expect(res.registered).toBe(2);
    const marks = await service.listMarks(ADMIN, exam.id);
    expect(marks).toHaveLength(2);

    const mark1 = marks.find((m: any) => m.studentId === 's1');
    expect(mark1?.grade).toBe('A');
    expect(mark1?.points).toBe(12);

    const mark2 = marks.find((m: any) => m.studentId === 's2');
    expect(mark2?.grade).toBe('C');
    expect(mark2?.points).toBe(6);
  });
});
