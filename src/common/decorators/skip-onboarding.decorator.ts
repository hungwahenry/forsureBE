import { SetMetadata } from '@nestjs/common';

export const SKIP_ONBOARDING_KEY = 'skipOnboarding';

/** Marks a route as accessible to authenticated users who haven't completed onboarding yet. */
export const SkipOnboarding = () => SetMetadata(SKIP_ONBOARDING_KEY, true);
