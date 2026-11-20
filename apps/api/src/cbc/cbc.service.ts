import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import type { AuthenticatedUser } from '../common/auth-user';
import { ScopingService } from '../scoping/scoping.service';
import { CbcRepositoryPort } from './cbc.repository';
import {
  CbcQueryDto,
  CreateCbcAssessmentDto,
  RegisterCbcDto,
  UpdateCbcAssessmentDto,
  toCbcDto,
} from './cbc.dto';
import type { CbcCreateData } from './cbc.repository';

@Injectable()
export class CbcService {
  constructor(
    private readonly cbc: CbcRepositoryPort,
    private readonly scoping: ScopingService,
  ) {}

  async list(user: AuthenticatedUser, query: CbcQueryDto) {
    const studentScope = await this.scoping.studentScope(user);
    const { rows, total } = await this.cbc.list({
      skip: query.skip,
      take: query.limit,
      studentId: query.studentId,
      termId: query.termId,
      learningOutcomeId: query.learningOutcomeId,
      classId: query.classId,
      subjectId: query.subjectId,
      studentIds: studentScope.unrestricted ? undefined : studentScope.ids,
    });
    return {
      data: rows.map(toCbcDto),
      meta: { page: query.page, limit: query.limit, total, totalPages: Math.ceil(total / query.limit) },
    };
  }

  async get(user: AuthenticatedUser, id: string) {
    const record = await this.require(id);
    await this.scoping.assertStudent(user, record.studentId);
    return toCbcDto(record);
  }

  async create(user: AuthenticatedUser, dto: CreateCbcAssessmentDto) {
    await this.scoping.assertStudent(user, dto.studentId);
    const data: CbcCreateData = {
      studentId: dto.studentId,
      learningOutcomeId: dto.learningOutcomeId,
      termId: dto.termId,
      performanceLevel: dto.performanceLevel,
      teacherComment: dto.teacherComment,
    };
    return toCbcDto(await this.cbc.upsert(data));
  }

  async register(user: AuthenticatedUser, dto: RegisterCbcDto) {
    // assert all students scoped
    const studentIds = [...new Set(dto.entries.map((e) => e.studentId))];
    for (const sid of studentIds) await this.scoping.assertStudent(user, sid);

    let count = 0;
    for (const entry of dto.entries) {
      await this.cbc.upsert({
        studentId: entry.studentId,
        learningOutcomeId: entry.learningOutcomeId,
        termId: dto.termId,
        performanceLevel: entry.performanceLevel,
        teacherComment: entry.teacherComment,
      });
      count++;
    }
    return { registered: count };
  }

  async update(user: AuthenticatedUser, id: string, dto: UpdateCbcAssessmentDto) {
    const record = await this.require(id);
    await this.scoping.assertStudent(user, record.studentId);
    return toCbcDto(await this.cbc.update(id, dto));
  }

  async remove(user: AuthenticatedUser, id: string) {
    const record = await this.require(id);
    await this.scoping.assertStudent(user, record.studentId);
    await this.cbc.remove(id);
    return { message: 'CBC assessment deleted' };
  }

  async listLearningOutcomes(subjectId?: string) {
    const rows = await this.cbc.listLearningOutcomes(subjectId);
    return rows;
  }

  private async require(id: string) {
    const record = await this.cbc.findById(id);
    if (!record) throw new NotFoundException('CBC assessment not found');
    return record;
  }
}
