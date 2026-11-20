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
import { TermRepository, TermRepositoryPort } from './term.repository';
import {
  CreateTermDto,
  TermDto,
  TermListDto,
  TermQueryDto,
  UpdateTermDto,
  toTermDto,
} from './term.dto';
import type { TermCreateData, TermUpdateData } from './term.repository';

@Injectable()
export class TermsService {
  constructor(private readonly terms: TermRepositoryPort) {}

  async list(query: TermQueryDto): Promise<PaginatedResult<TermDto>> {
    const { rows, total } = await this.terms.list({
      skip: query.skip,
      take: query.limit,
      search: query.search,
      sortBy: query.sortBy,
      sortOrder: query.sortOrder,
      academicYearId: query.academicYearId,
      isCurrent: query.isCurrent,
    });
    return paginate(rows.map(toTermDto), total, query);
  }

  async get(id: string): Promise<TermDto> {
    const record = await this.terms.findById(id);
    if (!record) throw new NotFoundException('Term not found');
    return toTermDto(record);
  }

  async current(): Promise<TermDto | null> {
    const record = await this.terms.findCurrent();
    return record ? toTermDto(record) : null;
  }

  async create(dto: CreateTermDto): Promise<TermDto> {
    return toTermDto(await this.terms.create(this.toCreateData(dto)));
  }

  async update(id: string, dto: UpdateTermDto): Promise<TermDto> {
    await this.get(id);
    return toTermDto(await this.terms.update(id, this.toUpdateData(dto)));
  }

  async remove(id: string): Promise<{ message: string }> {
    await this.get(id);
    await this.terms.remove(id);
    return { message: 'Term deleted' };
  }

  private toCreateData(dto: CreateTermDto): TermCreateData {
    return {
      academicYearId: dto.academicYearId,
      termNumber: dto.termNumber,
      name: dto.name.trim(),
      startDate: new Date(dto.startDate),
      endDate: new Date(dto.endDate),
      isCurrent: dto.isCurrent ?? false,
    };
  }

  private toUpdateData(dto: UpdateTermDto): TermUpdateData {
    const data: TermUpdateData = {};
    if (dto.academicYearId !== undefined) data.academicYearId = dto.academicYearId;
    if (dto.termNumber !== undefined) data.termNumber = dto.termNumber;
    if (dto.name !== undefined) data.name = dto.name.trim();
    if (dto.startDate !== undefined) data.startDate = new Date(dto.startDate);
    if (dto.endDate !== undefined) data.endDate = new Date(dto.endDate);
    if (dto.isCurrent !== undefined) data.isCurrent = dto.isCurrent;
    return data;
  }
}

@ApiTags('terms')
@ApiBearerAuth()
@Controller('terms')
export class TermsController {
  constructor(private readonly terms: TermsService) {}

  @Get()
  @Roles('ADMIN', 'TEACHER')
  @ApiOkResponse({ type: TermListDto })
  @ApiOperation({ summary: 'List terms' })
  list(@Query() query: TermQueryDto) {
    return this.terms.list(query);
  }

  @Get('current')
  @Roles('ADMIN', 'TEACHER')
  @ApiOkResponse({ type: TermDto })
  @ApiOperation({ summary: 'Get the current term' })
  current() {
    return this.terms.current();
  }

  @Get(':id')
  @Roles('ADMIN', 'TEACHER')
  @ApiOkResponse({ type: TermDto })
  @ApiOperation({ summary: 'Get a term' })
  get(@Param('id', ParseUUIDPipe) id: string) {
    return this.terms.get(id);
  }

  @Post()
  @Roles('ADMIN')
  @ApiCreatedResponse({ type: TermDto })
  @ApiOperation({ summary: 'Create a term (only one may be current)' })
  create(@Body() dto: CreateTermDto) {
    return this.terms.create(dto);
  }

  @Patch(':id')
  @Roles('ADMIN')
  @ApiOkResponse({ type: TermDto })
  @ApiOperation({ summary: 'Update a term' })
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateTermDto) {
    return this.terms.update(id, dto);
  }

  @Delete(':id')
  @Roles('ADMIN')
  @HttpCode(200)
  @ApiOkResponse({ type: MessageResponseDto })
  @ApiOperation({ summary: 'Delete a term' })
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.terms.remove(id);
  }
}

@Module({
  controllers: [TermsController],
  providers: [{ provide: TermRepositoryPort, useClass: TermRepository }, TermsService],
})
export class TermsModule {}
