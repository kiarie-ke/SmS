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
import { paginate } from '../../common/pagination';
import type { PaginatedResult } from '../../common/api-response';
import { Roles } from '../../common/decorators/roles.decorator';
import { MessageResponseDto } from '../../auth/dto/auth-response.dto';
import { GuardianRepository, GuardianRepositoryPort } from './guardian.repository';
import {
  CreateGuardianDto,
  GuardianDto,
  GuardianListDto,
  GuardianQueryDto,
  UpdateGuardianDto,
  toGuardianDto,
} from './guardian.dto';
import type { GuardianCreateData, GuardianUpdateData } from './guardian.types';

@Injectable()
export class GuardiansService {
  constructor(private readonly guardians: GuardianRepositoryPort) {}

  async list(query: GuardianQueryDto): Promise<PaginatedResult<GuardianDto>> {
    const { rows, total } = await this.guardians.list({
      skip: query.skip,
      take: query.limit,
      search: query.search,
      sortBy: query.sortBy,
      sortOrder: query.sortOrder,
      relationship: query.relationship,
    });
    return paginate(rows.map(toGuardianDto), total, query);
  }

  async get(id: string): Promise<GuardianDto> {
    return toGuardianDto(await this.requireGuardian(id));
  }

  async create(dto: CreateGuardianDto): Promise<GuardianDto> {
    return toGuardianDto(await this.guardians.create(this.toCreateData(dto)));
  }

  async update(id: string, dto: UpdateGuardianDto): Promise<GuardianDto> {
    await this.requireGuardian(id);
    return toGuardianDto(await this.guardians.update(id, this.toUpdateData(dto)));
  }

  async remove(id: string): Promise<{ message: string }> {
    await this.requireGuardian(id);
    await this.guardians.remove(id);
    return { message: 'Guardian deleted' };
  }

  private async requireGuardian(id: string) {
    const record = await this.guardians.findById(id);
    if (!record) throw new NotFoundException('Guardian not found');
    return record;
  }

  private toCreateData(dto: CreateGuardianDto): GuardianCreateData {
    return {
      firstName: dto.firstName.trim(),
      lastName: dto.lastName.trim(),
      phone: dto.phone,
      email: dto.email?.trim().toLowerCase() ?? null,
      nationalId: dto.nationalId?.trim() || null,
      relationship: dto.relationship,
      occupation: dto.occupation?.trim() || null,
      address: dto.address?.trim() || null,
      userId: dto.userId ?? null,
    };
  }

  private toUpdateData(dto: UpdateGuardianDto): GuardianUpdateData {
    const data: GuardianUpdateData = {};
    if (dto.firstName !== undefined) data.firstName = dto.firstName.trim();
    if (dto.lastName !== undefined) data.lastName = dto.lastName.trim();
    if (dto.phone !== undefined) data.phone = dto.phone;
    if (dto.email !== undefined) data.email = dto.email?.trim().toLowerCase() || null;
    if (dto.nationalId !== undefined) data.nationalId = dto.nationalId?.trim() || null;
    if (dto.relationship !== undefined) data.relationship = dto.relationship;
    if (dto.occupation !== undefined) data.occupation = dto.occupation?.trim() || null;
    if (dto.address !== undefined) data.address = dto.address?.trim() || null;
    if (dto.userId !== undefined) data.userId = dto.userId;
    return data;
  }
}

@ApiTags('guardians')
@ApiBearerAuth()
@Roles('ADMIN')
@Controller('guardians')
export class GuardiansController {
  constructor(private readonly guardians: GuardiansService) {}

  @Get()
  @ApiOkResponse({ type: GuardianListDto })
  @ApiOperation({ summary: 'List guardians (admin only)' })
  list(@Query() query: GuardianQueryDto) {
    return this.guardians.list(query);
  }

  @Get(':id')
  @ApiOkResponse({ type: GuardianDto })
  @ApiOperation({ summary: 'Get a guardian' })
  get(@Param('id', ParseUUIDPipe) id: string) {
    return this.guardians.get(id);
  }

  @Post()
  @ApiCreatedResponse({ type: GuardianDto })
  @ApiOperation({ summary: 'Create a guardian' })
  create(@Body() dto: CreateGuardianDto) {
    return this.guardians.create(dto);
  }

  @Patch(':id')
  @ApiOkResponse({ type: GuardianDto })
  @ApiOperation({ summary: 'Update a guardian' })
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateGuardianDto) {
    return this.guardians.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(200)
  @ApiOkResponse({ type: MessageResponseDto })
  @ApiOperation({ summary: 'Delete a guardian and their student links' })
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.guardians.remove(id);
  }
}

@Module({
  controllers: [GuardiansController],
  providers: [
    GuardiansService,
    { provide: GuardianRepositoryPort, useClass: GuardianRepository },
  ],
})
export class GuardiansModule {}
