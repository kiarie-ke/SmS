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
import type { AuthenticatedUser } from '../../common/auth-user';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { paginate } from '../../common/pagination';
import { MessageResponseDto } from '../../auth/dto/auth-response.dto';
import { ScopingModule } from '../../scoping/scoping.module';
import { ScopingService } from '../../scoping/scoping.service';
import { ClassRepository, ClassRepositoryPort } from './class.repository';
import {
  ClassDto,
  ClassQueryDto,
  CreateClassDto,
  UpdateClassDto,
  toClassDto,
} from './class.dto';
import type { ClassCreateData, ClassUpdateData } from './class.repository';

@Injectable()
export class ClassesService {
  constructor(
    private readonly classes: ClassRepositoryPort,
    private readonly scoping: ScopingService,
  ) {}

  async list(
    user: AuthenticatedUser,
    query: ClassQueryDto,
  ): Promise<PaginatedResult<ClassDto>> {
    const scope = await this.scoping.classScope(user);
    const { rows, total } = await this.classes.list({
      skip: query.skip,
      take: query.limit,
      search: query.search,
      sortBy: query.sortBy,
      sortOrder: query.sortOrder,
      academicYearId: query.academicYearId,
      level: query.level,
      classIds: scope.unrestricted ? undefined : scope.ids,
    });
    return paginate(rows.map(toClassDto), total, query);
  }

  async get(user: AuthenticatedUser, id: string): Promise<ClassDto> {
    const record = await this.classes.findById(id);
    if (!record) throw new NotFoundException('Class not found');
    await this.scoping.assertClass(user, id);
    return toClassDto(record);
  }

  async create(dto: CreateClassDto): Promise<ClassDto> {
    return toClassDto(await this.classes.create(this.toCreateData(dto)));
  }

  async update(id: string, dto: UpdateClassDto): Promise<ClassDto> {
    await this.getClass(id);
    return toClassDto(await this.classes.update(id, this.toUpdateData(dto)));
  }

  async remove(id: string): Promise<{ message: string }> {
    await this.getClass(id);
    await this.classes.remove(id);
    return { message: 'Class deleted' };
  }

  private async getClass(id: string) {
    const record = await this.classes.findById(id);
    if (!record) throw new NotFoundException('Class not found');
    return record;
  }

  private toCreateData(dto: CreateClassDto): ClassCreateData {
    return {
      level: dto.level,
      name: dto.name.trim(),
      academicYearId: dto.academicYearId,
      classTeacherId: dto.classTeacherId ?? null,
    };
  }

  private toUpdateData(dto: UpdateClassDto): ClassUpdateData {
    const data: ClassUpdateData = {};
    if (dto.level !== undefined) data.level = dto.level;
    if (dto.name !== undefined) data.name = dto.name.trim();
    if (dto.academicYearId !== undefined) data.academicYearId = dto.academicYearId;
    if (dto.classTeacherId !== undefined) data.classTeacherId = dto.classTeacherId;
    return data;
  }
}

@ApiTags('classes')
@ApiBearerAuth()
@Controller('classes')
export class ClassesController {
  constructor(private readonly classes: ClassesService) {}

  @Get()
  @Roles('ADMIN', 'TEACHER', 'STUDENT', 'PARENT', 'BURSAR')
  @ApiOkResponse({ type: ClassDto, isArray: true })
  @ApiOperation({
    summary: 'List classes (admin: all; teacher: assigned or class-teacher classes)',
  })
  list(@CurrentUser() user: AuthenticatedUser, @Query() query: ClassQueryDto) {
    return this.classes.list(user, query);
  }

  @Get(':id')
  @Roles('ADMIN', 'TEACHER', 'STUDENT', 'PARENT', 'BURSAR')
  @ApiOkResponse({ type: ClassDto })
  @ApiOperation({ summary: 'Get a class (scoped)' })
  get(@CurrentUser() user: AuthenticatedUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.classes.get(user, id);
  }

  @Post()
  @Roles('ADMIN')
  @ApiCreatedResponse({ type: ClassDto })
  @ApiOperation({ summary: 'Create a class' })
  create(@Body() dto: CreateClassDto) {
    return this.classes.create(dto);
  }

  @Patch(':id')
  @Roles('ADMIN')
  @ApiOkResponse({ type: ClassDto })
  @ApiOperation({ summary: 'Update a class' })
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateClassDto) {
    return this.classes.update(id, dto);
  }

  @Delete(':id')
  @Roles('ADMIN')
  @HttpCode(200)
  @ApiOkResponse({ type: MessageResponseDto })
  @ApiOperation({ summary: 'Delete a class' })
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.classes.remove(id);
  }
}

@Module({
  imports: [ScopingModule],
  controllers: [ClassesController],
  providers: [ClassesService, { provide: ClassRepositoryPort, useClass: ClassRepository }],
})
export class ClassesModule {}
