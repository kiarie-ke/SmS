import { Module } from '@nestjs/common';
import { ScopingRepository, ScopingRepositoryPort } from './scoping.repository';
import { ScopingService } from './scoping.service';

@Module({
  providers: [
    { provide: ScopingRepositoryPort, useClass: ScopingRepository },
    ScopingService,
  ],
  exports: [ScopingService],
})
export class ScopingModule {}
