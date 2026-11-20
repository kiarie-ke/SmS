import { ForbiddenException, NotFoundException } from '@nestjs/common';
import type { AuthenticatedUser } from '../common/auth-user';
import { ScopingRepositoryPort } from '../scoping/scoping.repository';
import { ScopingService } from '../scoping/scoping.service';
import { CbcRepositoryPort, type CbcAssessmentRecord, type CbcCreateData, type CbcListParams } from './cbc.repository';
import { CbcService } from './cbc.service';

const TEACHER: AuthenticatedUser = {
  id: 'user-teacher',
  email: 'teacher@mwangaza.ac.ke',
  phone: '+254720123458',
  role: 'TEACHER',
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

class FakeCbcRepository extends CbcRepositoryPort {
  public records = new Map<string, CbcAssessmentRecord>();

  async list(params: CbcListParams) {
    const all = Array.from(this.records.values());
    return { rows: all, total: all.length };
  }

  async findById(id: string) {
    return this.records.get(id) ?? null;
  }

  async upsert(data: CbcCreateData): Promise<CbcAssessmentRecord> {
    const key = `${data.studentId}-${data.learningOutcomeId}-${data.termId}`;
    const rec: CbcAssessmentRecord = {
      id: `cbc-${key}`,
      studentId: data.studentId,
      learningOutcomeId: data.learningOutcomeId,
      termId: data.termId,
      performanceLevel: data.performanceLevel,
      teacherComment: data.teacherComment ?? null,
      assessedAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.records.set(rec.id, rec);
    return rec;
  }

  async update(id: string, data: any): Promise<CbcAssessmentRecord> {
    const existing = this.records.get(id)!;
    const updated = { ...existing, ...data };
    this.records.set(id, updated);
    return updated;
  }

  async remove(id: string) {
    this.records.delete(id);
  }

  async listLearningOutcomes(subjectId?: string) {
    return [
      {
        id: 'lo-1',
        description: 'Demonstrates place values',
        strandName: 'Numbers',
        subStrandName: 'Whole Numbers',
        subjectId: 'sub-1',
      },
    ];
  }
}

describe('CbcService', () => {
  let service: CbcService;
  let repo: FakeCbcRepository;
  let scoping: ScopingService;

  beforeEach(() => {
    repo = new FakeCbcRepository();
    scoping = new ScopingService(new FakeScopingRepository());
    service = new CbcService(repo, scoping);
  });

  it('allows teacher to record CBC assessment for an assigned student', async () => {
    const rec = await service.create(TEACHER, {
      studentId: 's1',
      learningOutcomeId: 'lo-1',
      termId: 'term-1',
      performanceLevel: 'EE',
      teacherComment: 'Excellent mastery',
    });
    expect(rec).toBeDefined();
    expect(rec.performanceLevel).toBe('EE');
    expect(rec.teacherComment).toBe('Excellent mastery');
  });

  it('blocks teacher from assessing an out-of-scope student', async () => {
    await expect(
      service.create(TEACHER, {
        studentId: 's999-other',
        learningOutcomeId: 'lo-1',
        termId: 'term-1',
        performanceLevel: 'ME',
      }),
    ).rejects.toThrow(ForbiddenException);
  });

  it('bulk registers CBC assessments', async () => {
    const res = await service.register(TEACHER, {
      termId: 'term-1',
      entries: [
        { studentId: 's1', learningOutcomeId: 'lo-1', performanceLevel: 'EE' },
        { studentId: 's2', learningOutcomeId: 'lo-1', performanceLevel: 'ME' },
      ],
    });
    expect(res.registered).toBe(2);
  });
});
