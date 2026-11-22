import { BadRequestException } from '@nestjs/common';
import { SchoolSettingsService } from './school-settings.module';
import { SchoolSettingsRepositoryPort } from './school-settings.repository';

describe('SchoolSettingsService', () => {
  const repository = {
    findDefault: jest.fn(),
    update: jest.fn(),
    setAcademicPeriod: jest.fn(),
  };
  let service: SchoolSettingsService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new SchoolSettingsService(repository as unknown as SchoolSettingsRepositoryPort);
  });

  it('rejects an empty update rather than reporting a no-op as a save', async () => {
    await expect(service.update({})).rejects.toBeInstanceOf(BadRequestException);
    expect(repository.findDefault).not.toHaveBeenCalled();
  });

  it('rejects an academic term that cannot be made current', async () => {
    repository.setAcademicPeriod.mockResolvedValue(false);

    await expect(
      service.setAcademicPeriod({ academicYearId: 'year-id', termId: 'term-id' }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
