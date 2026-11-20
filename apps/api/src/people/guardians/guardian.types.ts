import type { Relationship } from '@school-system/shared';

export interface GuardianRecord {
  id: string;
  firstName: string;
  lastName: string;
  phone: string;
  email: string | null;
  nationalId: string | null;
  relationship: Relationship;
  occupation: string | null;
  address: string | null;
  userId: string | null;
  createdAt: Date;
  updatedAt: Date;
  _count: { students: number };
}

export type GuardianSortField = 'firstName' | 'lastName' | 'createdAt';

export interface GuardianListParams {
  skip: number;
  take: number;
  search?: string;
  sortBy: GuardianSortField;
  sortOrder: 'asc' | 'desc';
  relationship?: Relationship;
}

export interface GuardianCreateData {
  firstName: string;
  lastName: string;
  phone: string;
  email?: string | null;
  nationalId?: string | null;
  relationship: Relationship;
  occupation?: string | null;
  address?: string | null;
  userId?: string | null;
}

export type GuardianUpdateData = Partial<GuardianCreateData>;
