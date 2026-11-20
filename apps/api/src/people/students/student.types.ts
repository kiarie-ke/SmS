import type {
  BoardingStatus,
  ClassLevel,
  Gender,
  Relationship,
} from '@school-system/shared';
import type { ResourceScope } from '../../scoping/scoping.service';

export interface ClassRef {
  id: string;
  name: string;
  level: ClassLevel;
}

export interface StreamRef {
  id: string;
  name: string;
}

export interface GuardianRef {
  id: string;
  firstName: string;
  lastName: string;
  phone: string;
  email: string | null;
  relationship: Relationship;
}

/** Domain shape returned by the repository — never a raw Prisma model. */
export interface StudentRecord {
  id: string;
  admissionNumber: string;
  upi: string;
  firstName: string;
  middleName: string | null;
  lastName: string;
  gender: Gender;
  dateOfBirth: Date;
  birthCertificateNumber: string | null;
  knecIndexNumber: string | null;
  photoUrl: string | null;
  county: string;
  subCounty: string;
  religion: string | null;
  specialNeeds: boolean;
  boardingStatus: BoardingStatus;
  classId: string;
  streamId: string | null;
  userId: string | null;
  isDeleted: boolean;
  createdAt: Date;
  updatedAt: Date;
  class: ClassRef;
  stream: StreamRef | null;
  _count: { guardians: number };
}

export interface GuardianLinkRecord {
  id: string;
  guardianId: string;
  isPrimary: boolean;
  guardian: GuardianRef;
}

export interface StudentDetailRecord extends StudentRecord {
  guardians: GuardianLinkRecord[];
}

export type StudentSortField =
  | 'admissionNumber'
  | 'firstName'
  | 'lastName'
  | 'createdAt';

export interface StudentListParams {
  scope: ResourceScope;
  skip: number;
  take: number;
  search?: string;
  sortBy: StudentSortField;
  sortOrder: 'asc' | 'desc';
  classId?: string;
  streamId?: string;
  gender?: Gender;
}

export interface StudentCreateData {
  admissionNumber: string;
  upi: string;
  firstName: string;
  lastName: string;
  middleName?: string | null;
  gender: Gender;
  dateOfBirth: Date;
  birthCertificateNumber?: string | null;
  knecIndexNumber?: string | null;
  county: string;
  subCounty: string;
  religion?: string | null;
  specialNeeds?: boolean;
  boardingStatus?: BoardingStatus;
  classId: string;
  streamId?: string | null;
  photoUrl?: string | null;
}

export type StudentUpdateData = Partial<StudentCreateData>;
