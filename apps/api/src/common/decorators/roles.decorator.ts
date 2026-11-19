import { SetMetadata } from '@nestjs/common';
import type { Role } from '@school-system/shared';

export const ROLES_KEY = 'roles';

/** Restricts a route to the listed roles (enforced by RolesGuard). */
export const Roles = (...roles: Role[]) => SetMetadata(ROLES_KEY, roles);
