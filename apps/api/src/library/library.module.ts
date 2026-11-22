import {
  BadRequestException,
  Body,
  Controller,
  Get,
  HttpCode,
  Injectable,
  Module,
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
import type { AuthenticatedUser } from '../common/auth-user';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { LibraryRepository, LibraryRepositoryPort } from './library.repository';
import { LibraryService } from './library.service';
import {
  BookLoanQueryDto,
  BookCopyQueryDto,
  BookQueryDto,
  CreateBookCopyDto,
  CreateBookDto,
  IssueBookDto,
  LibraryStudentQueryDto,
  UpdateBookDto,
} from './library.dto';
import {
  BookCatalogueDto,
  BookCopyCatalogueDto,
  BookImportResultDto,
  BookLoanDto,
  LibraryStudentDto,
} from './library.response.dto';

const csvUpload = FileInterceptor('file', {
  storage: memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_request, file, callback) => {
    if (
      !file.originalname.toLowerCase().endsWith('.csv') &&
      !['text/csv', 'application/vnd.ms-excel', 'text/plain'].includes(file.mimetype)
    ) {
      callback(new BadRequestException('Upload a CSV file'), false);
      return;
    }
    callback(null, true);
  },
});

@ApiTags('library')
@ApiBearerAuth()
@Roles('ADMIN', 'LIBRARIAN')
@Controller('library')
export class LibraryController {
  constructor(private readonly library: LibraryService) {}

  @Get('books')
  @ApiOkResponse({ type: BookCatalogueDto, isArray: true, description: 'List catalogue metadata and copy counts' })
  @ApiOperation({ summary: 'List library books' })
  listBooks(@Query() query: BookQueryDto) {
    return this.library.listBooks(query);
  }

  @Post('books')
  @ApiCreatedResponse({ type: BookCatalogueDto, description: 'Create a book catalogue record' })
  @ApiOperation({ summary: 'Create a book' })
  createBook(@Body() dto: CreateBookDto) {
    return this.library.createBook(dto);
  }

  @Patch('books/:id')
  @ApiOkResponse({ type: BookCatalogueDto, description: 'Update or archive a catalogue entry' })
  @ApiOperation({ summary: 'Update a book' })
  updateBook(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateBookDto,
  ) {
    return this.library.updateBook(id, dto);
  }

  @Post('books/import')
  @UseInterceptors(csvUpload)
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: { file: { type: 'string', format: 'binary' } },
    },
  })
  @ApiCreatedResponse({ type: BookImportResultDto, description: 'Per-row CSV import report' })
  @ApiOperation({ summary: 'Import book metadata from CSV (500-row limit)' })
  importCsv(@UploadedFile() file?: Express.Multer.File) {
    return this.library.importCsv(file);
  }

  @Post('books/:id/copies')
  @ApiCreatedResponse({ type: BookCopyCatalogueDto, description: 'Add a physical library copy' })
  @ApiOperation({ summary: 'Add a copy of a book' })
  createCopy(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreateBookCopyDto,
  ) {
    return this.library.createCopy(id, dto);
  }

  @Get('books/:id/copies')
  @ApiOkResponse({ type: BookCopyCatalogueDto, isArray: true })
  @ApiOperation({ summary: 'List inventory copies of a book' })
  listCopies(
    @Param('id', ParseUUIDPipe) id: string,
    @Query() query: BookCopyQueryDto,
  ) {
    return this.library.listCopies(id, query);
  }

  @Get('students')
  @ApiOkResponse({ type: LibraryStudentDto, isArray: true })
  @ApiOperation({ summary: 'Search student identities needed to issue books' })
  listStudents(@Query() query: LibraryStudentQueryDto) {
    return this.library.listStudents(query);
  }

  @Get('loans')
  @ApiOkResponse({ type: BookLoanDto, isArray: true, description: 'List book loans' })
  @ApiOperation({ summary: 'List active or returned loans' })
  listLoans(@Query() query: BookLoanQueryDto) {
    return this.library.listLoans(query);
  }

  @Post('loans')
  @ApiCreatedResponse({ type: BookLoanDto, description: 'Issue a book copy to a student' })
  @ApiOperation({ summary: 'Issue a book' })
  issue(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: IssueBookDto,
  ) {
    return this.library.issue(user, dto);
  }

  @Post('loans/:id/return')
  @HttpCode(200)
  @ApiOkResponse({ type: BookLoanDto, description: 'Mark a book as returned and make its copy available' })
  @ApiOperation({ summary: 'Return a book' })
  return(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.library.return(id, user);
  }

  @Get('my-loans')
  @Roles('STUDENT')
  @ApiOkResponse({ type: BookLoanDto, isArray: true, description: 'List only the signed-in student’s loans' })
  @ApiOperation({ summary: 'View my library loans' })
  myLoans(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: BookLoanQueryDto,
  ) {
    return this.library.myLoans(user, query);
  }
}

@Module({
  controllers: [LibraryController],
  providers: [
    LibraryService,
    { provide: LibraryRepositoryPort, useClass: LibraryRepository },
  ],
})
export class LibraryModule {}
