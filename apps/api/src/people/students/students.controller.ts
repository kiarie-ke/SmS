import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { memoryStorage } from 'multer';
import type { AuthenticatedUser } from '../../common/auth-user';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { MessageResponseDto } from '../../auth/dto/auth-response.dto';
import { StudentsService } from './students.service';
import {
  CreateStudentDto,
  LinkGuardianDto,
  StudentQueryDto,
  UpdateStudentDto,
} from './dto/student-input.dto';
import {
  ImportStudentsResultDto,
  PhotoUploadResultDto,
  StudentDetailDto,
  StudentDto,
} from './dto/student-response.dto';
import { ALLOWED_PHOTO_MIME_TYPES, MAX_PHOTO_BYTES } from './photo-storage.service';

const csvUpload = FileInterceptor('file', {
  storage: memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
});

const photoUpload = FileInterceptor('file', {
  storage: memoryStorage(),
  limits: { fileSize: MAX_PHOTO_BYTES },
  fileFilter: (_request, file, callback) => {
    if (!ALLOWED_PHOTO_MIME_TYPES.includes(file.mimetype)) {
      callback(new BadRequestException('Photo must be a JPEG, PNG or WebP image'), false);
      return;
    }
    callback(null, true);
  },
});

@ApiTags('students')
@ApiBearerAuth()
@Controller('students')
export class StudentsController {
  constructor(private readonly students: StudentsService) {}

  @Get()
  @ApiOperation({
    summary:
      'List students (admin: all; teacher: assigned classes; parent: linked children; student: self)',
  })
  @ApiOkResponse({ type: StudentDto, isArray: true })
  list(@CurrentUser() user: AuthenticatedUser, @Query() query: StudentQueryDto) {
    return this.students.list(user, query);
  }

  @Post('import')
  @Roles('ADMIN')
  @UseInterceptors(csvUpload)
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: { file: { type: 'string', format: 'binary' } },
    },
  })
  @ApiCreatedResponse({ type: ImportStudentsResultDto })
  @ApiOperation({
    summary: 'Import students from CSV; every row is reported individually',
  })
  importCsv(@UploadedFile() file?: Express.Multer.File) {
    return this.students.importCsv(file);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a student with linked guardians (scoped)' })
  @ApiOkResponse({ type: StudentDetailDto })
  get(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.students.get(user, id);
  }

  @Post()
  @Roles('ADMIN')
  @ApiCreatedResponse({ type: StudentDto })
  @ApiOperation({ summary: 'Create a student' })
  create(@Body() dto: CreateStudentDto) {
    return this.students.create(dto);
  }

  @Patch(':id')
  @Roles('ADMIN')
  @ApiOkResponse({ type: StudentDto })
  @ApiOperation({ summary: 'Update a student' })
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateStudentDto) {
    return this.students.update(id, dto);
  }

  @Delete(':id')
  @Roles('ADMIN')
  @HttpCode(200)
  @ApiOkResponse({ type: MessageResponseDto })
  @ApiOperation({ summary: 'Archive a student (soft delete)' })
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.students.remove(id);
  }

  @Post(':id/guardians')
  @Roles('ADMIN')
  @ApiOkResponse({ type: StudentDetailDto })
  @ApiOperation({ summary: 'Link a guardian to a student' })
  linkGuardian(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: LinkGuardianDto,
  ) {
    return this.students.linkGuardian(user, id, dto);
  }

  @Post(':id/photo')
  @Roles('ADMIN')
  @UseInterceptors(photoUpload)
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: { file: { type: 'string', format: 'binary' } },
    },
  })
  @ApiOkResponse({ type: PhotoUploadResultDto })
  @ApiOperation({
    summary: 'Upload a student photo (2 MB max; EXIF stripped server-side)',
  })
  uploadPhoto(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    return this.students.uploadPhoto(user, id, file);
  }
}
