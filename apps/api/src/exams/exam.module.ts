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
import { ExamRepository, ExamRepositoryPort } from './exam.repository';
import {
  CreateExamDto,
  ExamDto,
  ExamQueryDto,
  MarkDto,
  RegisterMarksDto,
  UpdateExamDto,
  toMarkDto,
} from './exam.dto';
import { ExamsService } from './exam.service';

@ApiTags('exams')
@ApiBearerAuth()
@Controller('exams')
export class ExamsController {
  constructor(private readonly exams: ExamsService) {}

  @Get()
  @Roles('ADMIN', 'TEACHER')
  @ApiOkResponse({ type: ExamDto, isArray: true })
  @ApiOperation({ summary: 'List exams (scoped by class)' })
  list(@CurrentUser() user: AuthenticatedUser, @Query() query: ExamQueryDto) {
    return this.exams.list(user, query);
  }

  @Get(':id')
  @Roles('ADMIN', 'TEACHER')
  @ApiOkResponse({ type: ExamDto })
  @ApiOperation({ summary: 'Get an exam' })
  get(@CurrentUser() user: AuthenticatedUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.exams.get(user, id);
  }

  @Post()
  @Roles('ADMIN', 'TEACHER')
  @ApiCreatedResponse({ type: ExamDto })
  @ApiOperation({ summary: 'Create an exam' })
  create(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateExamDto) {
    return this.exams.create(user, dto);
  }

  @Patch(':id')
  @Roles('ADMIN', 'TEACHER')
  @ApiOkResponse({ type: ExamDto })
  @ApiOperation({ summary: 'Update an exam' })
  update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateExamDto,
  ) {
    return this.exams.update(user, id, dto);
  }

  @Delete(':id')
  @Roles('ADMIN', 'TEACHER')
  @HttpCode(200)
  @ApiOkResponse({ type: MessageResponseDto })
  @ApiOperation({ summary: 'Delete an exam' })
  remove(@CurrentUser() user: AuthenticatedUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.exams.remove(user, id);
  }

  @Get(':id/marks')
  @Roles('ADMIN', 'TEACHER')
  @ApiOkResponse({ type: MarkDto, isArray: true })
  @ApiOperation({ summary: 'List marks for an exam' })
  marks(@CurrentUser() user: AuthenticatedUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.exams.listMarks(user, id);
  }

  @Post(':id/marks')
  @Roles('ADMIN', 'TEACHER')
  @HttpCode(200)
  @ApiOkResponse({ description: 'Bulk marks result' })
  @ApiOperation({ summary: 'Bulk upsert marks for an exam (grades computed server-side)' })
  registerMarks(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: RegisterMarksDto,
  ) {
    return this.exams.registerMarks(user, id, dto);
  }

  @Post(':id/publish')
  @Roles('ADMIN', 'TEACHER')
  @HttpCode(200)
  @ApiOkResponse({ type: ExamDto })
  @ApiOperation({ summary: 'Publish an exam (locks it; results visible to students/parents)' })
  publish(@CurrentUser() user: AuthenticatedUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.exams.publish(user, id);
  }

  @Post(':id/lock')
  @Roles('ADMIN', 'TEACHER')
  @HttpCode(200)
  @ApiOkResponse({ type: ExamDto })
  @ApiOperation({ summary: 'Lock an exam for editing' })
  lock(@CurrentUser() user: AuthenticatedUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.exams.lock(user, id);
  }

  @Post(':id/unlock')
  @Roles('ADMIN')
  @HttpCode(200)
  @ApiOkResponse({ type: ExamDto })
  @ApiOperation({ summary: 'Unlock an exam' })
  unlock(@CurrentUser() user: AuthenticatedUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.exams.unlock(user, id);
  }
}

@Module({
  imports: [ScopingModule],
  controllers: [ExamsController],
  providers: [ExamsService, { provide: ExamRepositoryPort, useClass: ExamRepository }],
  exports: [ExamsService, ExamRepositoryPort],
})
export class ExamsModule {}
