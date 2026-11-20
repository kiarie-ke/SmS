import {
  BadRequestException,
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
import { paginate } from '../../common/pagination';
import { Roles } from '../../common/decorators/roles.decorator';
import { MessageResponseDto } from '../../auth/dto/auth-response.dto';
import { TeacherRepository, TeacherRepositoryPort } from './teacher.repository';
import {
  AssignClassSubjectDto,
  CreateTeacherDto,
  TeacherDetailDto,
  TeacherDto,
  TeacherListDto,
  TeacherQueryDto,
  UpdateTeacherDto,
  toTeacherDetailDto,
  toTeacherDto,
} from './teacher.dto';
import type { TeacherCreateData, TeacherUpdateData } from './teacher.types';

@Injectable()
export class TeachersService {
  constructor(private readonly teachers: TeacherRepositoryPort) {}

  async list(query: TeacherQueryDto): Promise<PaginatedResult<TeacherDto>> {
    const { rows, total } = await this.teachers.list({
      skip: query.skip,
      take: query.limit,
      search: query.search,
      sortBy: query.sortBy,
      sortOrder: query.sortOrder,
      employmentType: query.employmentType,
    });
    return paginate(rows.map(toTeacherDto), total, query);
  }

  async get(id: string): Promise<TeacherDetailDto> {
    return toTeacherDetailDto(await this.requireTeacher(id));
  }

  async create(dto: CreateTeacherDto): Promise<TeacherDto> {
    await this.assertTeacherAccount(dto.userId);
    return toTeacherDto(await this.teachers.create(this.toCreateData(dto)));
  }

  async update(id: string, dto: UpdateTeacherDto): Promise<TeacherDto> {
    await this.requireTeacher(id);
    if (dto.userId !== undefined) await this.assertTeacherAccount(dto.userId);
    return toTeacherDto(await this.teachers.update(id, this.toUpdateData(dto)));
  }

  async remove(id: string): Promise<{ message: string }> {
    await this.requireTeacher(id);
    await this.teachers.softDelete(id);
    return { message: 'Teacher archived' };
  }

  async assignClassSubject(
    id: string,
    dto: AssignClassSubjectDto,
  ): Promise<TeacherDetailDto> {
    await this.requireTeacher(id);
    await this.teachers.assignClassSubject(id, dto.classId, dto.subjectId);
    return this.get(id);
  }

  private async assertTeacherAccount(userId: string): Promise<void> {
    const role = await this.teachers.findUserRole(userId);
    if (!role) {
      throw new BadRequestException('The linked user account does not exist');
    }
    if (role !== 'TEACHER') {
      throw new BadRequestException('The linked user account must have the TEACHER role');
    }
  }

  private async requireTeacher(id: string) {
    const record = await this.teachers.findById(id);
    if (!record || record.isDeleted) throw new NotFoundException('Teacher not found');
    return record;
  }

  private toCreateData(dto: CreateTeacherDto): TeacherCreateData {
    return {
      userId: dto.userId,
      tscNumber: dto.tscNumber.trim(),
      nationalId: dto.nationalId.trim(),
      firstName: dto.firstName.trim(),
      lastName: dto.lastName.trim(),
      phone: dto.phone,
      email: dto.email.trim().toLowerCase(),
      employmentType: dto.employmentType,
    };
  }

  private toUpdateData(dto: UpdateTeacherDto): TeacherUpdateData {
    const data: TeacherUpdateData = {};
    if (dto.userId !== undefined) data.userId = dto.userId;
    if (dto.tscNumber !== undefined) data.tscNumber = dto.tscNumber.trim();
    if (dto.nationalId !== undefined) data.nationalId = dto.nationalId.trim();
    if (dto.firstName !== undefined) data.firstName = dto.firstName.trim();
    if (dto.lastName !== undefined) data.lastName = dto.lastName.trim();
    if (dto.phone !== undefined) data.phone = dto.phone;
    if (dto.email !== undefined) data.email = dto.email.trim().toLowerCase();
    if (dto.employmentType !== undefined) data.employmentType = dto.employmentType;
    return data;
  }
}

@ApiTags('teachers')
@ApiBearerAuth()
@Roles('ADMIN')
@Controller('teachers')
export class TeachersController {
  constructor(private readonly teachers: TeachersService) {}

  @Get()
  @ApiOkResponse({ type: TeacherListDto })
  @ApiOperation({ summary: 'List teachers (admin only)' })
  list(@Query() query: TeacherQueryDto) {
    return this.teachers.list(query);
  }

  @Get(':id')
  @ApiOkResponse({ type: TeacherDetailDto })
  @ApiOperation({ summary: 'Get a teacher with class-subject assignments' })
  get(@Param('id', ParseUUIDPipe) id: string) {
    return this.teachers.get(id);
  }

  @Post()
  @ApiCreatedResponse({ type: TeacherDto })
  @ApiOperation({ summary: 'Create a teacher linked to a TEACHER user account' })
  create(@Body() dto: CreateTeacherDto) {
    return this.teachers.create(dto);
  }

  @Patch(':id')
  @ApiOkResponse({ type: TeacherDto })
  @ApiOperation({ summary: 'Update a teacher' })
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateTeacherDto) {
    return this.teachers.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(200)
  @ApiOkResponse({ type: MessageResponseDto })
  @ApiOperation({ summary: 'Archive a teacher (soft delete)' })
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.teachers.remove(id);
  }

  @Post(':id/class-subjects')
  @ApiOkResponse({ type: TeacherDetailDto })
  @ApiOperation({ summary: 'Assign a teacher to a class subject' })
  assignClassSubject(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AssignClassSubjectDto,
  ) {
    return this.teachers.assignClassSubject(id, dto);
  }
}

@Module({
  controllers: [TeachersController],
  providers: [
    TeachersService,
    { provide: TeacherRepositoryPort, useClass: TeacherRepository },
  ],
})
export class TeachersModule {}
