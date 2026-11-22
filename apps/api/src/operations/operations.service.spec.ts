import { BadRequestException, ConflictException } from "@nestjs/common";
import type { AuthenticatedUser } from "../common/auth-user";
import { TimetableQueryDto } from "./operations.dto";
import type {
  LessonPlanRecord,
  PeriodRecord,
  TimetableConflictRecord,
} from "./operations.repository";
import { OperationsRepositoryPort } from "./operations.repository";
import { OperationsService } from "./operations.service";

const TEACHER: AuthenticatedUser = {
  id: "user-teacher-1",
  email: "teacher@example.ac.ke",
  phone: "+254700000001",
  role: "TEACHER",
};

function period(): PeriodRecord {
  const date = new Date("2026-01-01T00:00:00.000Z");
  return {
    id: "period-1",
    academicYearId: "year-1",
    periodNumber: 1,
    name: "Period 1",
    startTime: "08:00",
    endTime: "08:40",
    isBreak: false,
    createdAt: date,
    updatedAt: date,
    academicYear: {
      id: "year-1",
      name: "2026",
      isCurrent: true,
      startDate: new Date("2026-01-01T00:00:00.000Z"),
      endDate: new Date("2026-12-31T00:00:00.000Z"),
    },
  };
}

class FakeOperationsRepository extends OperationsRepositoryPort {
  currentPeriod: PeriodRecord | null = period();
  periodsForYear: Array<{
    id: string;
    periodNumber: number;
    startTime: string;
    endTime: string;
  }> = [];
  conflicts: TimetableConflictRecord[] = [];
  schoolClass: {
    id: string;
    academicYearId: string;
    classTeacherId: string | null;
  } | null = {
    id: "class-1",
    academicYearId: "year-1",
    classTeacherId: null,
  };
  term: {
    id: string;
    name: string;
    academicYearId: string;
    startDate: Date;
    endDate: Date;
  } | null = {
    id: "term-1",
    name: "Term 1",
    academicYearId: "year-1",
    startDate: new Date("2026-01-05T00:00:00.000Z"),
    endDate: new Date("2026-04-10T00:00:00.000Z"),
  };
  isTeacherActive = true;
  hasAssignment = true;
  usedPeriod = false;
  createdPeriod = false;
  createdEntry = false;
  createdLessonPlan = false;
  lastTimetableQuery: { teacherId?: string; classId?: string } | null = null;

  async listPeriods() {
    return [];
  }
  async findPeriod() {
    return this.currentPeriod;
  }
  async createPeriod() {
    this.createdPeriod = true;
    return this.currentPeriod!;
  }
  async updatePeriod() {
    return this.currentPeriod!;
  }
  async deletePeriod() {}
  async findAcademicYear() {
    return {
      id: "year-1",
      name: "2026",
      isCurrent: true,
      startDate: new Date("2026-01-01T00:00:00.000Z"),
      endDate: new Date("2026-12-31T00:00:00.000Z"),
    };
  }
  async listPeriodsForYear() {
    return this.periodsForYear;
  }
  async periodHasEntries() {
    return this.usedPeriod;
  }
  async listTimetableEntries(params: { teacherId?: string; classId?: string }) {
    this.lastTimetableQuery = params;
    return { rows: [], total: 0 };
  }
  async findTimetableEntry() {
    return null;
  }
  async entryHasSubstitutions() {
    return false;
  }
  async listEntryConflicts() {
    return this.conflicts;
  }
  async createTimetableEntry(): Promise<never> {
    this.createdEntry = true;
    throw new Error("not used by this test");
  }
  async deleteTimetableEntry() {}
  async findClass() {
    return this.schoolClass;
  }
  async findStreamClassId() {
    return null;
  }
  async findActiveTeacher() {
    return this.isTeacherActive;
  }
  async hasTeacherAssignment() {
    return this.hasAssignment;
  }
  async findTerm() {
    return this.term;
  }
  async findLearningOutcomeSubject() {
    return null;
  }
  async listLessonPlans() {
    return { rows: [], total: 0 };
  }
  async findLessonPlan(): Promise<LessonPlanRecord | null> {
    return null;
  }
  async createLessonPlan(): Promise<never> {
    this.createdLessonPlan = true;
    throw new Error("not used by this test");
  }
  async updateLessonPlan(): Promise<never> {
    throw new Error("not used by this test");
  }
  async submitLessonPlan(): Promise<never> {
    throw new Error("not used by this test");
  }
  async reviewLessonPlan(): Promise<never> {
    throw new Error("not used by this test");
  }
  async listCalendarEvents() {
    return { rows: [], total: 0 };
  }
  async findCalendarEvent() {
    return null;
  }
  async createCalendarEvent(): Promise<never> {
    throw new Error("not used by this test");
  }
  async updateCalendarEvent(): Promise<never> {
    throw new Error("not used by this test");
  }
  async deleteCalendarEvent() {}
  async listSubstitutions() {
    return { rows: [], total: 0 };
  }
  async findSubstitution(): Promise<null> {
    return null;
  }
  async findSubstitutionForEntryDate() {
    return false;
  }
  async teacherHasTimetableSlot() {
    return false;
  }
  async teacherHasSubstitutionAtSlot() {
    return false;
  }
  async createSubstitution(): Promise<never> {
    throw new Error("not used by this test");
  }
  async deleteSubstitution() {}
}

describe("OperationsService", () => {
  let repository: FakeOperationsRepository;
  let service: OperationsService;

  beforeEach(() => {
    repository = new FakeOperationsRepository();
    service = new OperationsService(repository, {
      teacherIdForUser: async () => "teacher-1",
    });
  });

  it("rejects overlapping period times", async () => {
    repository.periodsForYear = [
      { id: "existing", periodNumber: 1, startTime: "08:00", endTime: "08:40" },
    ];

    await expect(
      service.createPeriod({
        academicYearId: "year-1",
        periodNumber: 2,
        name: "Period 2",
        startTime: "08:30",
        endTime: "09:10",
      }),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(repository.createdPeriod).toBe(false);
  });

  it("rejects a timetable assignment when the teacher is already scheduled", async () => {
    repository.conflicts = [
      {
        classId: "class-2",
        streamId: null,
        teacherId: "teacher-1",
        venue: null,
      },
    ];

    await expect(
      service.createTimetableEntry({
        periodId: "period-1",
        classId: "class-1",
        subjectId: "subject-1",
        teacherId: "teacher-1",
        weekday: "MONDAY",
      }),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(repository.createdEntry).toBe(false);
  });

  it("shows teachers only their own timetable even when they request another class", async () => {
    const query = new TimetableQueryDto();
    query.classId = "other-class";
    await service.listTimetable(TEACHER, query);

    expect(repository.lastTimetableQuery).toMatchObject({
      classId: "other-class",
      teacherId: "teacher-1",
    });
  });

  it("requires lesson plans to start on Monday", async () => {
    await expect(
      service.createLessonPlan(TEACHER, {
        classId: "class-1",
        subjectId: "subject-1",
        termId: "term-1",
        weekStarting: "2026-02-03",
        topic: "Fractions",
        learningObjectives: "Compare fractions",
        activities: "Use fraction strips",
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(repository.createdLessonPlan).toBe(false);
  });
});
