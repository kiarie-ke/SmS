import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Injectable,
  Module,
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
import type { AuthenticatedUser } from '../common/auth-user';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { MessageResponseDto } from '../auth/dto/auth-response.dto';
import { ScopingModule } from '../scoping/scoping.module';
import { CbcRepository, CbcRepositoryPort } from './cbc.repository';
import {
  CbcAssessmentDto,
  CbcQueryDto,
  CreateCbcAssessmentDto,
  LearningOutcomeDto,
  RegisterCbcDto,
  UpdateCbcAssessmentDto,
} from './cbc.dto';
import { CbcService } from './cbc.service';

@ApiTags('cbc-assessments')
@ApiBearerAuth()
@Controller('cbc-assessments')
export class CbcController {
  constructor(private readonly cbc: CbcService) {}

  @Get('learning-outcomes')
  @Roles('ADMIN', 'TEACHER', 'STUDENT', 'PARENT')
  @ApiOkResponse({ type: LearningOutcomeDto, isArray: true })
  @ApiOperation({ summary: 'List CBC learning outcomes' })
  listLearningOutcomes(@Query('subjectId') subjectId?: string) {
    return this.cbc.listLearningOutcomes(subjectId);
  }

  @Get()
  @Roles('ADMIN', 'TEACHER', 'STUDENT', 'PARENT')
  @ApiOkResponse({ type: CbcAssessmentDto, isArray: true })
  @ApiOperation({ summary: 'List CBC assessments (scoped)' })
  list(@CurrentUser() user: AuthenticatedUser, @Query() query: CbcQueryDto) {
    return this.cbc.list(user, query);
  }

  @Get(':id')
  @Roles('ADMIN', 'TEACHER', 'STUDENT', 'PARENT')
  @ApiOkResponse({ type: CbcAssessmentDto })
  @ApiOperation({ summary: 'Get a CBC assessment' })
  get(@CurrentUser() user: AuthenticatedUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.cbc.get(user, id);
  }

  @Post()
  @Roles('ADMIN', 'TEACHER')
  @ApiCreatedResponse({ type: CbcAssessmentDto })
  @ApiOperation({ summary: 'Create/upsert a CBC assessment' })
  create(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateCbcAssessmentDto) {
    return this.cbc.create(user, dto);
  }

  @Post('register')
  @Roles('ADMIN', 'TEACHER')
  @HttpCode(200)
  @ApiOkResponse({ description: 'Bulk CBC register result' })
  @ApiOperation({ summary: 'Bulk upsert CBC assessments' })
  register(@CurrentUser() user: AuthenticatedUser, @Body() dto: RegisterCbcDto) {
    return this.cbc.register(user, dto);
  }

  @Patch(':id')
  @Roles('ADMIN', 'TEACHER')
  @ApiOkResponse({ type: CbcAssessmentDto })
  @ApiOperation({ summary: 'Update a CBC assessment' })
  update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateCbcAssessmentDto,
  ) {
    return this.cbc.update(user, id, dto);
  }

  @Delete(':id')
  @Roles('ADMIN', 'TEACHER')
  @HttpCode(200)
  @ApiOkResponse({ type: MessageResponseDto })
  @ApiOperation({ summary: 'Delete a CBC assessment' })
  remove(@CurrentUser() user: AuthenticatedUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.cbc.remove(user, id);
  }
}

@Module({
  imports: [ScopingModule],
  controllers: [CbcController],
  providers: [CbcService, { provide: CbcRepositoryPort, useClass: CbcRepository }],
  exports: [CbcService, CbcRepositoryPort],
})
export class CbcModule {}
