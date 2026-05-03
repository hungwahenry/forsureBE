/**
 * 12-hour clock with `am`/`pm` suffix. `0` minutes are dropped: `3pm`, `3:30pm`.
 */
export function formatTime(d: Date): string {
  const hours24 = d.getHours();
  const minutes = d.getMinutes();
  const ampm = hours24 >= 12 ? 'pm' : 'am';
  const hours = hours24 % 12 || 12;
  return minutes === 0
    ? `${hours}${ampm}`
    : `${hours}:${String(minutes).padStart(2, '0')}${ampm}`;
}
