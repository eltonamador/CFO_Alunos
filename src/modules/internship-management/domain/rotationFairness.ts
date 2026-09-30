/** Scheduling priorities, not medical thresholds or curricular hour multipliers. */
export const REST_PRIORITY_CEILING_MINUTES = 72 * 60;

export type ServiceInterval = { startsAt: string; endsAt: string };
export const MINIMUM_REST_WINDOW_DAYS = 28;
export const MAX_MINIMUM_REST_OCCURRENCES = 3;
const midnightCache = new Map<string, number>();

type Interval = { start: number; end: number };

/** Count overlapping/duplicated sources once, including two contiguous duty periods. */
function mergeIntervals(services: ServiceInterval[]): Interval[] {
  const sorted = services
    .map((s) => ({ start: Date.parse(s.startsAt), end: Date.parse(s.endsAt) }))
    .filter((s) => Number.isFinite(s.start) && Number.isFinite(s.end) && s.end > s.start)
    .sort((a, b) => a.start - b.start || a.end - b.end);
  const merged: Interval[] = [];
  for (const interval of sorted) {
    const previous = merged[merged.length - 1];
    if (previous && interval.start <= previous.end)
      previous.end = Math.max(previous.end, interval.end);
    else merged.push({ ...interval });
  }
  return merged;
}

function addDays(day: string, count: number) {
  return new Date(Date.parse(`${day}T12:00:00Z`) + count * 86_400_000).toISOString().slice(0, 10);
}

/** Split at local civil-day boundaries; Friday night counts only its Saturday portion. */
function calendarLoad(services: ServiceInterval[], timezone: string) {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const dayAt = (instant: number) => {
    const parts = formatter.formatToParts(new Date(instant));
    const part = (type: string) => parts.find((p) => p.type === type)!.value;
    return `${part("year")}-${part("month")}-${part("day")}`;
  };
  const weekends = new Set<string>();
  let weekendMinutes = 0;
  let weekdayMinutes = 0;
  for (const interval of mergeIntervals(services)) {
    let cursor = interval.start;
    while (cursor < interval.end) {
      const day = dayAt(cursor);
      // Find the next local midnight, including short/long days in a timezone with DST.
      const cacheKey = `${timezone}:${day}`;
      let low = cursor;
      let high = cursor + 30 * 60 * 60 * 1000;
      const cached = midnightCache.get(cacheKey);
      if (cached !== undefined) high = cached;
      while (cached === undefined && high - low > 1) {
        const middle = Math.floor((low + high) / 2);
        if (dayAt(middle) === day) low = middle;
        else high = middle;
      }
      if (midnightCache.size > 2000) midnightCache.clear();
      midnightCache.set(cacheKey, high);
      const end = Math.min(interval.end, high);
      const weekday = new Date(`${day}T12:00:00Z`).getUTCDay();
      const minutes = (end - cursor) / 60_000;
      if (weekday === 0 || weekday === 6) {
        weekends.add(weekday === 6 ? day : addDays(day, -1));
        weekendMinutes += minutes;
      } else weekdayMinutes += minutes;
      cursor = end;
    }
  }
  return { weekends, weekendMinutes, weekdayMinutes };
}

export function rotationCalendarLoad(
  services: ServiceInterval[],
  proposed: ServiceInterval,
  timezone: string,
) {
  const history = calendarLoad(services, timezone);
  const target = calendarLoad([proposed], timezone);
  const projected = new Set([...history.weekends, ...target.weekends]);
  let projectedWeekendStreak = 0;
  for (const weekend of target.weekends) {
    let streak = 1;
    for (let day = addDays(weekend, -7); projected.has(day); day = addDays(day, -7)) streak++;
    for (let day = addDays(weekend, 7); projected.has(day); day = addDays(day, 7)) streak++;
    projectedWeekendStreak = Math.max(projectedWeekendStreak, streak);
  }
  return {
    weekendCount: history.weekends.size,
    weekendMinutes: Math.round(history.weekendMinutes),
    weekdayMinutes: Math.round(history.weekdayMinutes),
    projectedWeekendCount: projected.size,
    projectedWeekendStreak,
    isWeekendService: target.weekends.size > 0,
  };
}

/** Occurrence is attributed to the start of the service after exactly 24h off.
 * Windows are (end - 28 days, end], so events exactly 28 days apart are separate.
 * Check future neighbours too: inserting a shift may introduce two occurrences.
 */
export function minimumRestLoad(services: ServiceInterval[], proposed: ServiceInterval) {
  const events = (rows: ServiceInterval[]) => {
    const intervals = mergeIntervals(rows);
    return intervals.flatMap((current, i) =>
      i > 0 && current.start - intervals[i - 1]!.end === 86_400_000 ? [current.start] : [],
    );
  };
  const existing = events(services);
  const projected = events([...services, proposed]);
  const target = Date.parse(proposed.startsAt);
  const window = MINIMUM_REST_WINDOW_DAYS * 86_400_000;
  let left = 0;
  let maximum = 0;
  for (let right = 0; right < projected.length; right++) {
    while (projected[left]! <= projected[right]! - window) left++;
    const affected = projected
      .slice(left, right + 1)
      .some((time) => time === target || time === Date.parse(proposed.endsAt) + 86_400_000);
    if (affected) maximum = Math.max(maximum, right - left + 1);
  }
  return {
    minimumRestOccurrences: existing.filter((time) => time > target - window && time <= target)
      .length,
    projectedMinimumRestMaximum: maximum,
    minimumRestLimitExceeded: maximum > MAX_MINIMUM_REST_OCCURRENCES,
  };
}
