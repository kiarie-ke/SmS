import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import type { AuthenticatedUser } from '../common/auth-user';
import { KENYAN_844_GRADE_BANDS, findGradeBand } from '@school-system/shared';
import { ScopingService } from '../scoping/scoping.service';
import { ExamRepositoryPort } from './exam.repository';
import {
  CreateExamDto,
  ExamQueryDto,
  RegisterMarksDto,
  UpdateExamDto,
  toExamDto,
  toMarkDto,
} from './exam.dto';
import type { ExamCreateData, ExamUpdateData, MarkUpsertEntry } from './exam.repository';

@Injectable()
export class ExamsService {
  constructor(
    private readonly exams: ExamRepositoryPort,
    private readonly scoping: ScopingService,
  ) {}

  async list(user: AuthenticatedUser, query: ExamQueryDto) {
    const scope = await this.scoping.classScope(user);
    const { rows, total } = await this.exams.list({
      skip: query.skip,
      take: query.limit,
      termId: query.termId,
      subjectId: query.subjectId,
      classId: query.classId,
      name: query.name,
      classIds: scope.unrestricted ? undefined : scope.ids,
    });
    return { data: rows.map(toExamDto), meta: { page: query.page, limit: query.limit, total, totalPages: Math.ceil(total / query.limit) } };
  }

  async get(user: AuthenticatedUser, id: string) {
    const exam = await this.requireExam(id);
    await this.scoping.assertClass(user, exam.classId);
    return toExamDto(exam);
  }

  async create(user: AuthenticatedUser, dto: CreateExamDto) {
    await this.scoping.assertClass(user, dto.classId);
    const data: ExamCreateData = {
      termId: dto.termId,
      subjectId: dto.subjectId,
      classId: dto.classId,
      name: dto.name,
      maxMarks: dto.maxMarks,
      date: new Date(`${dto.date}T00:00:00.000Z`),
    };
    return toExamDto(await this.exams.create(data));
  }

  async update(user: AuthenticatedUser, id: string, dto: UpdateExamDto) {
    const exam = await this.requireExam(id);
    await this.scoping.assertClass(user, exam.classId);
    if (exam.lockedAt) throw new BadRequestException('Exam is locked');
    const data: ExamUpdateData = {};
    if (dto.maxMarks !== undefined) data.maxMarks = dto.maxMarks;
    if (dto.date !== undefined) data.date = new Date(`${dto.date}T00:00:00.000Z`);
    return toExamDto(await this.exams.update(id, data));
  }

  async remove(user: AuthenticatedUser, id: string) {
    const exam = await this.requireExam(id);
    await this.scoping.assertClass(user, exam.classId);
    if (exam.isPublished) throw new BadRequestException('Cannot delete a published exam');
    await this.exams.remove(id);
    return { message: 'Exam deleted' };
  }

  async listMarks(user: AuthenticatedUser, examId: string) {
    const exam = await this.requireExam(examId);
    await this.scoping.assertClass(user, exam.classId);
    const rows = await this.exams.listMarks(examId);
    return rows.map(toMarkDto);
  }

  async registerMarks(user: AuthenticatedUser, examId: string, dto: RegisterMarksDto) {
    const exam = await this.requireExam(examId);
    await this.scoping.assertClass(user, exam.classId);
    if (exam.lockedAt) throw new BadRequestException('Exam is locked');
    if (exam.isPublished) throw new BadRequestException('Exam is published');

    const entries: MarkUpsertEntry[] = dto.entries.map((entry) => {
      if (entry.score > exam.maxMarks) {
        throw new BadRequestException(`Score ${entry.score} exceeds max marks ${exam.maxMarks}`);
      }
      const { grade, points } = this.computeGrade(entry.score, exam.maxMarks);
      return {
        examId,
        studentId: entry.studentId,
        score: entry.score,
        grade,
        points,
        teacherComment: entry.teacherComment,
      };
    });

    await this.exams.upsertMarks(entries);
    return { registered: entries.length };
  }

  async publish(user: AuthenticatedUser, examId: string) {
    const exam = await this.requireExam(examId);
    await this.scoping.assertClass(user, exam.classId);
    return toExamDto(await this.exams.publish(examId, user.id));
  }

  async lock(user: AuthenticatedUser, examId: string) {
    const exam = await this.requireExam(examId);
    await this.scoping.assertClass(user, exam.classId);
    return toExamDto(await this.exams.lock(examId, user.id));
  }

  async unlock(user: AuthenticatedUser, examId: string) {
    const exam = await this.requireExam(examId);
    await this.scoping.assertClass(user, exam.classId);
    return toExamDto(await this.exams.unlock(examId));
  }

  private async requireExam(id: string) {
    const exam = await this.exams.findById(id);
    if (!exam) throw new NotFoundException('Exam not found');
    return exam;
  }

  private computeGrade(score: number, maxMarks: number): { grade: string; points: number | null } {
    const pct = maxMarks > 0 ? (score / maxMarks) * 100 : 0;
    const band = findGradeBand(pct, KENYAN_844_GRADE_BANDS);
    if (!band) return { grade: 'E', points: 1 };
    return { grade: band.grade, points: band.points };
  }
}
