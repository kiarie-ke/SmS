import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import type { AuthenticatedUser } from '../common/auth-user';
import { KENYAN_844_GRADE_BANDS, findGradeBand } from '@school-system/shared';
import { ScopingService } from '../scoping/scoping.service';
import { StudentRepositoryPort } from '../people/students/student.repository';
import { ExamRepositoryPort } from '../exams/exam.repository';
import { CbcRepositoryPort } from '../cbc/cbc.repository';
import { ReportCardRepositoryPort } from './report-card.repository';
import {
  GenerateReportCardsDto,
  ReportCardDto,
  ReportCardMarkDto,
  ReportCardCbcDto,
  ReportCardQueryDto,
  toReportCardDto,
  UpdateReportCardDto,
} from './report-card.dto';
import type { ReportCardCreateData, ReportCardRecord } from './report-card.repository';
import type { ResourceScope } from '../scoping/scoping.service';

@Injectable()
export class ReportCardsService {
  constructor(
    private readonly cards: ReportCardRepositoryPort,
    private readonly students: StudentRepositoryPort,
    private readonly exams: ExamRepositoryPort,
    private readonly cbc: CbcRepositoryPort,
    private readonly scoping: ScopingService,
  ) {}

  async list(user: AuthenticatedUser, query: ReportCardQueryDto) {
    const scope = await this.scoping.studentScope(user);
    const { rows, total } = await this.cards.list({
      skip: query.skip,
      take: query.limit,
      studentId: query.studentId,
      termId: query.termId,
      classId: query.classId,
      isPublished: query.published,
      studentIds: scope.unrestricted ? undefined : scope.ids,
    });
    const dtos = rows.map(toReportCardDto);
    for (const dto of dtos) {
      const card = rows.find((r) => r.id === dto.id)!;
      await this.attachDetails(dto, card);
    }
    return {
      data: dtos,
      meta: { page: query.page, limit: query.limit, total, totalPages: Math.ceil(total / query.limit) },
    };
  }

  async get(user: AuthenticatedUser, id: string) {
    const card = await this.require(id);
    await this.scoping.assertStudent(user, card.studentId);
    // Hide unpublished from students/parents
    if (!card.publishedAt && (user.role === 'STUDENT' || user.role === 'PARENT')) {
      throw new NotFoundException('Report card not found');
    }
    const dto = toReportCardDto(card);
    await this.attachDetails(dto, card);
    return dto;
  }

  async generate(user: AuthenticatedUser, dto: GenerateReportCardsDto) {
    await this.scoping.assertClass(user, dto.classId);
    const scope: ResourceScope = { unrestricted: true, ids: [] };
    const { rows: students } = await this.students.list({
      scope,
      skip: 0,
      take: 1000,
      sortBy: 'lastName',
      sortOrder: 'asc',
      classId: dto.classId,
    });
    const active = students.filter((s) => !s.isDeleted);

    for (const student of active) {
      const data: ReportCardCreateData = {
        studentId: student.id,
        termId: dto.termId,
        classId: dto.classId,
        template: 'EIGHT_FOUR_FOUR',
        generatedByUserId: user.id,
      };
      await this.cards.upsert(data);
    }
    return { generated: active.length };
  }

  async update(user: AuthenticatedUser, id: string, dto: UpdateReportCardDto) {
    const card = await this.require(id);
    await this.scoping.assertClass(user, card.classId);
    return toReportCardDto(await this.cards.update(id, dto));
  }

  async publish(user: AuthenticatedUser, id: string) {
    const card = await this.require(id);
    await this.scoping.assertClass(user, card.classId);
    return toReportCardDto(await this.cards.update(id, { publishedAt: new Date() }));
  }

  async unpublish(user: AuthenticatedUser, id: string) {
    const card = await this.require(id);
    await this.scoping.assertClass(user, card.classId);
    return toReportCardDto(await this.cards.update(id, { publishedAt: null }));
  }

  private async require(id: string) {
    const card = await this.cards.findById(id);
    if (!card) throw new NotFoundException('Report card not found');
    return card;
  }

  private async attachDetails(dto: ReportCardDto, card: ReportCardRecord) {
    // exams for class+term
    const { rows: exams } = await this.exams.list({
      skip: 0,
      take: 1000,
      classId: card.classId,
      termId: card.termId,
    });

    const marks: ReportCardMarkDto[] = [];
    let totalPct = 0;
    let totalPoints = 0;
    let pointsCount = 0;
    let count = 0;

    // rank computation: per-student average
    const scope: ResourceScope = { unrestricted: true, ids: [] };
    const { rows: classStudents } = await this.students.list({
      scope,
      skip: 0,
      take: 1000,
      sortBy: 'lastName',
      sortOrder: 'asc',
      classId: card.classId,
    });
    const activeStudents = classStudents.filter((s) => !s.isDeleted);

    // Compute one average per student across the exams in this term and class.
    const sums = new Map<string, { sum: number; n: number }>();
    for (const exam of exams) {
      const examMarks = await this.exams.listMarks(exam.id);
      for (const m of examMarks) {
        const pct = exam.maxMarks > 0 ? (Number(m.score) / exam.maxMarks) * 100 : 0;
        const acc = sums.get(m.studentId) ?? { sum: 0, n: 0 };
        acc.sum += pct;
        acc.n += 1;
        sums.set(m.studentId, acc);
      }
    }
    const avgs = new Map<string, number>();
    for (const [sid, acc] of sums) {
      avgs.set(sid, acc.n > 0 ? acc.sum / acc.n : 0);
    }
    // rank
    const sorted = [...activeStudents]
      .map((s) => ({ id: s.id, avg: avgs.get(s.id) ?? 0 }))
      .sort((a, b) => b.avg - a.avg);
    const rankIndex = sorted.findIndex((s) => s.id === card.studentId);
    const rank = rankIndex >= 0 ? rankIndex + 1 : undefined;

    // marks for this student
    for (const exam of exams) {
      const examMarks = await this.exams.listMarks(exam.id);
      const m = examMarks.find((x) => x.studentId === card.studentId);
      if (m) {
        marks.push({
          subjectName: exam.subject?.name ?? 'Subject',
          examName: exam.name,
          score: Number(m.score),
          maxMarks: exam.maxMarks,
          grade: m.grade,
          points: m.points,
          remarks: m.teacherComment,
        });
        totalPct += exam.maxMarks > 0 ? (Number(m.score) / exam.maxMarks) * 100 : 0;
        count++;
        if (m.points !== null) {
          totalPoints += m.points;
          pointsCount++;
        }
      }
    }

    // CBC assessments
    const { rows: cbcRows } = await this.cbc.list({
      skip: 0,
      take: 1000,
      studentId: card.studentId,
      termId: card.termId,
    });
    const cbcAssessments: ReportCardCbcDto[] = cbcRows.map((c) => ({
      subjectName: c.learningOutcome?.strand?.subject?.name ?? 'Subject',
      learningOutcomeDescription: c.learningOutcome?.description ?? '',
      performanceLevel: c.performanceLevel,
      teacherComment: c.teacherComment,
    }));

    const overallPercentage = count > 0 ? Math.round((totalPct / count) * 10) / 10 : 0;
    const band = findGradeBand(overallPercentage, KENYAN_844_GRADE_BANDS);
    const overallGrade = band?.grade ?? '—';

    dto.marks = marks;
    dto.cbcAssessments = cbcAssessments;
    dto.overallPercentage = overallPercentage;
    dto.overallGrade = overallGrade;
    dto.overallPoints = pointsCount > 0 ? totalPoints : null;
    dto.rank = rank;
    dto.totalStudents = activeStudents.length;
    dto.teacherRemarks = card.teacherComment;
  }
}
