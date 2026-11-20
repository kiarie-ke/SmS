import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Injectable,
  Module,
  NotFoundException,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import type { PaginatedResult } from '../../common/api-response';
import { Roles } from '../../common/decorators/roles.decorator';
import { paginate } from '../../common/pagination';
import { MessageResponseDto } from '../../auth/dto/auth-response.dto';
import { SubjectRepository, SubjectRepositoryPort } from './subject.repository';
import {
  CreateSubjectDto,
  SubjectDto,
  SubjectQueryDto,
  UpdateSubjectDto,
  toSubjectDto,
} from './subject.dto';
import type { SubjectCreateData, SubjectUpdateData } from './subject.repository';

@Injectable()
export class SubjectsService {
  constructor(private readonly subjects: SubjectRepositoryPort) {}

  async list(query: SubjectQueryDto): Promise<PaginatedResult<SubjectDto>> {
    const { rows, total } = await this.subjects.list({
      skip: query.skip,
      take: query.limit,
      search: query.search,
      sortBy: query.sortBy,
      sortOrder: query.sortOrder,
      level: query.level,
    });
    return paginate(rows.map(toSubjectDto), total, query);
  }

  async get(id: string): Promise<SubjectDto> {
    return toSubjectDto(await this.requireSubject(id));
  }

  async create(dto: CreateSubjectDto): Promise<SubjectDto> {
    return toSubjectDto(await this.subjects.create(this.toCreateData(dto)));
  }

  async update(id: string, dto: UpdateSubjectDto): Promise<SubjectDto> {
    await this.requireSubject(id);
    return toSubjectDto(await this.subjects.update(id, this.toUpdateData(dto)));
  }

  async remove(id: string): Promise<{ message: string }> {
    await this.requireSubject(id);
    await this.subjects.remove(id);
    return { message: 'Subject deleted' };
  }

  private async requireSubject(id: string) {
    const record = await this.subjects.findById(id);
    if (!record) throw new NotFoundException('Subject not found');
    return record;
  }

  private toCreateData(dto: CreateSubjectDto): SubjectCreateData {
    return {
      name: dto.name.trim(),
      code: dto.code.trim().toUpperCase(),
      level: dto.level,
      isCbc: dto.isCbc ?? false,
    };
  }

  private toUpdateData(dto: UpdateSubjectDto): SubjectUpdateData {
    const data: SubjectUpdateData = {};
    if (dto.name !== undefined) data.name = dto.name.trim();
    if (dto.code !== undefined) data.code = dto.code.trim().toUpperCase();
    if (dto.level !== undefined) data.level = dto.level;
    if (dto.isCbc !== undefined) data.isCbc = dto.isCbc;
    return data;
  }
}

@ApiTags('subjects')
@ApiBearerAuth()
@Controller('subjects')
export class SubjectsController {
  constructor(private readonly subjects: SubjectsService) {}

  @Get()
  @Roles('ADMIN', 'TEACHER')
  @ApiOkResponse({ type: SubjectDto, isArray: true })
  @ApiOperation({ summary: 'List subjects' })
  list(@Query() query: SubjectQueryDto) {
    return this.subjects.list(query);
  }

  @Get(':id')
  @Roles('ADMIN', 'TEACHER')
  @ApiOkResponse({ type: SubjectDto })
  @ApiOperation({ summary: 'Get a subject' })
  get(@Param('id', ParseUUIDPipe) id: string) {
    return this.subjects.get(id);
  }

  @Post()
  @Roles('ADMIN')
  @ApiCreatedResponse({ type: SubjectDto })
  @ApiOperation({ summary: 'Create a subject' })
  create(@Body() dto: CreateSubjectDto) {
    return this.subjects.create(dto);
  }

  @Patch(':id')
  @Roles('ADMIN')
  @ApiOkResponse({ type: SubjectDto })
  @ApiOperation({ summary: 'Update a subject' })
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateSubjectDto) {
    return this.subjects.update(id, dto);
  }

  @Delete(':id')
  @Roles('ADMIN')
  @HttpCode(200)
  @ApiOkResponse({ type: MessageResponseDto })
  @ApiOperation({ summary: 'Delete a subject' })
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.subjects.remove(id);
  }
}

@Module({
  controllers: [SubjectsController],
  providers: [
    SubjectsService,
    { provide: SubjectRepositoryPort, useClass: SubjectRepository },
  ],
})
export class SubjectsModule {}
