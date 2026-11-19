import type { Role } from '@school-system/shared';

export interface AuthenticatedUser {
  id: string;
  email: string;
  phone: string;
  role: Role;
}
