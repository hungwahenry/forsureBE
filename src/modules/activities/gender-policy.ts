import { ActivityGenderPreference, Gender } from '@prisma/client';

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
