import { Module } from '@nestjs/common';
import { ScopingModule } from '../../scoping/scoping.module';
import { StudentRepository, StudentRepositoryPort } from './student.repository';
import { StudentImportService } from './student-import.service';
import { PhotoStorageService } from './photo-storage.service';
import { StudentsService } from './students.service';
import { StudentsController } from './students.controller';

@Module({
  imports: [ScopingModule],
  controllers: [StudentsController],
  providers: [
    StudentsService,
    StudentImportService,
    PhotoStorageService,
    { provide: StudentRepositoryPort, useClass: StudentRepository },
  ],
  exports: [StudentsService, StudentRepositoryPort],
})
export class StudentsModule {}
