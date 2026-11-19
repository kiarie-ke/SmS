import { SetMetadata } from '@nestjs/common';

export const CSRF_PROTECTED_KEY = 'csrfProtected';

/** Requires the x-csrf-token header to match the ss_csrf cookie. */
export const CsrfProtected = () => SetMetadata(CSRF_PROTECTED_KEY, true);
