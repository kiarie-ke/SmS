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
import { paginate } from '../../common/pagination';
import { Roles } from '../../common/decorators/roles.decorator';
import { MessageResponseDto } from '../../auth/dto/auth-response.dto';
import {
  AcademicYearRepository,
  AcademicYearRepositoryPort,
} from './academic-year.repository';
import {
  AcademicYearDto,
  AcademicYearListDto,
  AcademicYearQueryDto,
  CreateAcademicYearDto,
  UpdateAcademicYearDto,
  toAcademicYearDto,
} from './academic-year.dto';
import type {
  AcademicYearCreateData,
  AcademicYearUpdateData,
} from './academic-year.repository';

@Injectable()
export class AcademicYearsService {
  constructor(private readonly years: AcademicYearRepositoryPort) {}

  async list(query: AcademicYearQueryDto): Promise<PaginatedResult<AcademicYearDto>> {
    const { rows, total } = await this.years.list({
      skip: query.skip,
      take: query.limit,
      search: query.search,
      sortBy: query.sortBy,
      sortOrder: query.sortOrder,
      isCurrent: query.isCurrent,
    });
    return paginate(rows.map(toAcademicYearDto), total, query);
  }

  async get(id: string): Promise<AcademicYearDto> {
    const record = await this.years.findById(id);
    if (!record) throw new NotFoundException('Academic year not found');
    return toAcademicYearDto(record);
  }

  async create(dto: CreateAcademicYearDto): Promise<AcademicYearDto> {
    return toAcademicYearDto(await this.years.create(this.toCreateData(dto)));
  }

  async update(id: string, dto: UpdateAcademicYearDto): Promise<AcademicYearDto> {
    await this.get(id);
    return toAcademicYearDto(await this.years.update(id, this.toUpdateData(dto)));
  }

  async remove(id: string): Promise<{ message: string }> {
    await this.get(id);
    await this.years.remove(id);
    return { message: 'Academic year deleted' };
  }

  private toCreateData(dto: CreateAcademicYearDto): AcademicYearCreateData {
    return {
      name: dto.name.trim(),
      startDate: new Date(dto.startDate),
      endDate: new Date(dto.endDate),
      isCurrent: dto.isCurrent ?? false,
    };
  }

  private toUpdateData(dto: UpdateAcademicYearDto): AcademicYearUpdateData {
    const data: AcademicYearUpdateData = {};
    if (dto.name !== undefined) data.name = dto.name.trim();
    if (dto.startDate !== undefined) data.startDate = new Date(dto.startDate);
    if (dto.endDate !== undefined) data.endDate = new Date(dto.endDate);
    if (dto.isCurrent !== undefined) data.isCurrent = dto.isCurrent;
    return data;
  }
}

@ApiTags('academic-years')
@ApiBearerAuth()
@Controller('academic-years')
export class AcademicYearsController {
  constructor(private readonly years: AcademicYearsService) {}

  @Get()
  @Roles('ADMIN', 'TEACHER')
  @ApiOkResponse({ type: AcademicYearListDto })
  @ApiOperation({ summary: 'List academic years' })
  list(@Query() query: AcademicYearQueryDto) {
    return this.years.list(query);
  }

  @Get(':id')
  @Roles('ADMIN', 'TEACHER')
  @ApiOkResponse({ type: AcademicYearDto })
  @ApiOperation({ summary: 'Get an academic year' })
  get(@Param('id', ParseUUIDPipe) id: string) {
    return this.years.get(id);
  }

  @Post()
  @Roles('ADMIN')
  @ApiCreatedResponse({ type: AcademicYearDto })
  @ApiOperation({ summary: 'Create an academic year (only one may be current)' })
  create(@Body() dto: CreateAcademicYearDto) {
    return this.years.create(dto);
  }

  @Patch(':id')
  @Roles('ADMIN')
  @ApiOkResponse({ type: AcademicYearDto })
  @ApiOperation({ summary: 'Update an academic year' })
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateAcademicYearDto) {
    return this.years.update(id, dto);
  }

  @Delete(':id')
  @Roles('ADMIN')
  @HttpCode(200)
  @ApiOkResponse({ type: MessageResponseDto })
  @ApiOperation({ summary: 'Delete an academic year' })
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.years.remove(id);
  }
}

@Module({
  controllers: [AcademicYearsController],
  providers: [
    AcademicYearsService,
    { provide: AcademicYearRepositoryPort, useClass: AcademicYearRepository },
  ],
})
export class AcademicYearsModule {}
