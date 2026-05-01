import { ActivityGenderPreference, Gender } from '@prisma/client';

/**
 * Activity-domain gender visibility rules. Used by the feed (filter what a
 * viewer can see) and join (whether a viewer can join).
 *
 * MALE viewer → can see/join ALL + MALE-only.
 * FEMALE viewer → can see/join ALL + FEMALE-only.
 * NON_BINARY / PREFER_NOT_TO_SAY → only ALL.
 */

export function isGenderAllowedForActivity(
  viewerGender: Gender,
  pref: ActivityGenderPreference,
): boolean {
  if (pref === ActivityGenderPreference.ALL) return true;
  if (pref === ActivityGenderPreference.MALE)
    return viewerGender === Gender.MALE;
  if (pref === ActivityGenderPreference.FEMALE)
    return viewerGender === Gender.FEMALE;
  return false;
}

export function activityVisibleGenderPreferences(
  viewerGender: Gender,
): ActivityGenderPreference[] {
  switch (viewerGender) {
    case Gender.MALE:
      return [ActivityGenderPreference.ALL, ActivityGenderPreference.MALE];
    case Gender.FEMALE:
      return [ActivityGenderPreference.ALL, ActivityGenderPreference.FEMALE];
    default:
      return [ActivityGenderPreference.ALL];
  }
}
