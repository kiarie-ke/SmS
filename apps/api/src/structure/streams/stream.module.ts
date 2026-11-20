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
import { StreamRepository, StreamRepositoryPort } from './stream.repository';
import {
  CreateStreamDto,
  StreamDto,
  StreamListDto,
  StreamQueryDto,
  UpdateStreamDto,
  toStreamDto,
} from './stream.dto';
import type { StreamCreateData, StreamUpdateData } from './stream.repository';

@Injectable()
export class StreamsService {
  constructor(
    private readonly streams: StreamRepositoryPort,
    private readonly scoping: ScopingService,
  ) {}

  async list(
    user: AuthenticatedUser,
    query: StreamQueryDto,
  ): Promise<PaginatedResult<StreamDto>> {
    const scope = await this.scoping.classScope(user);
    const { rows, total } = await this.streams.list({
      skip: query.skip,
      take: query.limit,
      search: query.search,
      sortBy: query.sortBy,
      sortOrder: query.sortOrder,
      classId: query.classId,
      classIds: scope.unrestricted ? undefined : scope.ids,
    });
    return paginate(rows.map(toStreamDto), total, query);
  }

  async get(user: AuthenticatedUser, id: string): Promise<StreamDto> {
    const record = await this.requireStream(id);
    await this.scoping.assertClass(user, record.classId);
    return toStreamDto(record);
  }

  async create(dto: CreateStreamDto): Promise<StreamDto> {
    return toStreamDto(await this.streams.create(this.toCreateData(dto)));
  }

  async update(id: string, dto: UpdateStreamDto): Promise<StreamDto> {
    await this.requireStream(id);
    return toStreamDto(await this.streams.update(id, this.toUpdateData(dto)));
  }

  async remove(id: string): Promise<{ message: string }> {
    await this.requireStream(id);
    await this.streams.remove(id);
    return { message: 'Stream deleted' };
  }

  private async requireStream(id: string) {
    const record = await this.streams.findById(id);
    if (!record) throw new NotFoundException('Stream not found');
    return record;
  }

  private toCreateData(dto: CreateStreamDto): StreamCreateData {
    return { classId: dto.classId, name: dto.name.trim() };
  }

  private toUpdateData(dto: UpdateStreamDto): StreamUpdateData {
    const data: StreamUpdateData = {};
    if (dto.classId !== undefined) data.classId = dto.classId;
    if (dto.name !== undefined) data.name = dto.name.trim();
    return data;
  }
}

@ApiTags('streams')
@ApiBearerAuth()
@Controller('streams')
export class StreamsController {
  constructor(private readonly streams: StreamsService) {}

  @Get()
  @ApiOkResponse({ type: StreamListDto })
  @ApiOperation({ summary: 'List streams (admin: all; teacher: assigned classes)' })
  list(@CurrentUser() user: AuthenticatedUser, @Query() query: StreamQueryDto) {
    return this.streams.list(user, query);
  }

  @Get(':id')
  @ApiOkResponse({ type: StreamDto })
  @ApiOperation({ summary: 'Get a stream (scoped)' })
  get(@CurrentUser() user: AuthenticatedUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.streams.get(user, id);
  }

  @Post()
  @Roles('ADMIN')
  @ApiCreatedResponse({ type: StreamDto })
  @ApiOperation({ summary: 'Create a stream' })
  create(@Body() dto: CreateStreamDto) {
    return this.streams.create(dto);
  }

  @Patch(':id')
  @Roles('ADMIN')
  @ApiOkResponse({ type: StreamDto })
  @ApiOperation({ summary: 'Update a stream' })
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateStreamDto) {
    return this.streams.update(id, dto);
  }

  @Delete(':id')
  @Roles('ADMIN')
  @HttpCode(200)
  @ApiOkResponse({ type: MessageResponseDto })
  @ApiOperation({ summary: 'Delete a stream' })
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.streams.remove(id);
  }
}

@Module({
  imports: [ScopingModule],
  controllers: [StreamsController],
  providers: [
    StreamsService,
    { provide: StreamRepositoryPort, useClass: StreamRepository },
  ],
})
export class StreamsModule {}
