import type { EmploymentType, Role } from '@school-system/shared';

export interface TeacherUserRef {
  email: string;
  role: Role;
}

export interface TeacherClassRef {
  id: string;
  name: string;
}

export interface TeacherSubjectRef {
  id: string;
  name: string;
  code: string;
}

export interface TeacherRecord {
  id: string;
  userId: string;
  tscNumber: string;
  nationalId: string;
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
  employmentType: EmploymentType;
  isDeleted: boolean;
  createdAt: Date;
  updatedAt: Date;
  user: TeacherUserRef;
  _count: { classSubjects: number };
}

export interface TeacherAssignmentRecord {
  id: string;
  classId: string;
  subjectId: string;
  class: TeacherClassRef;
  subject: TeacherSubjectRef;
}

export interface TeacherDetailRecord extends TeacherRecord {
  classSubjects: TeacherAssignmentRecord[];
}

export type TeacherSortField = 'firstName' | 'lastName' | 'tscNumber' | 'createdAt';

export interface TeacherListParams {
  skip: number;
  take: number;
  search?: string;
  sortBy: TeacherSortField;
  sortOrder: 'asc' | 'desc';
  employmentType?: EmploymentType;
}

export interface TeacherCreateData {
  userId: string;
  tscNumber: string;
  nationalId: string;
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
  employmentType: EmploymentType;
}

export type TeacherUpdateData = Partial<TeacherCreateData>;
