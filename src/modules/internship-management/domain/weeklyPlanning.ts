import {
  rankRotationCandidates,
  rotationRestAvailability,
  type RotationAssignment,
  type RotationCadet,
  type RotationCommitment,
  type RotationCandidate,
} from "./rotation";
import { minutesBetween } from "./workload";

export type WeeklySlot = {
  id: string;
  date: string;
  templateCode: string;
  siteId: string;
  siteName: string;
  startsAt: string;
  endsAt: string;
  blocked: Record<string, string[]>;
};
import type { RotationDuty } from "./permanence";
export type WeeklyContext = {
  recordedLifeguardDays?: { date: string; publishedCount: number; draftCount: number }[];
  duties?: RotationDuty[];
  cadets: RotationCadet[];
  assignments: RotationAssignment[];
  commitments: RotationCommitment[];
  timezone: string;
  slots: WeeklySlot[];
};
export type WeeklyChoice = {
  slot: WeeklySlot;
  studentId: string;
  candidates: RotationCandidate[];
  error: string | null;
};

export type WeeklyPlan = {
  choices: WeeklyChoice[];
  searchStatus: "not-needed" | "complete" | "exhausted" | "limited";
  recoveredSlots: number;
};
type Selections = Record<string, string>;
type SearchOptions = { maxNodes?: number; maxChecks?: number };
const activityCode = (slot: WeeklySlot) =>
  slot.templateCode === "GUARDA-VIDA"
    ? "guarda_vida"
    : slot.templateCode.includes("USB")
      ? "usb"
      : "ar";

/** Keep the fair greedy result when complete. Otherwise search alternatives without
 * changing explicit manual choices (including a deliberately empty selection).
 * The deterministic budget bounds work in the browser; exhaustion is never reported
 * as proof that no complete assignment exists.
 */
export function planWeekWithAlternatives(
  context: WeeklyContext,
  overrides: Selections = {},
  options: SearchOptions = {},
): WeeklyPlan {
  const slots = [...context.slots].sort(
    (a, b) => a.startsAt.localeCompare(b.startsAt) || a.id.localeCompare(b.id),
  );
  const fixed: Selections = Object.fromEntries(
    slots.filter((s) => Object.hasOwn(overrides, s.id)).map((s) => [s.id, overrides[s.id]!]),
  );
  const automatic = slots.filter((s) => !Object.hasOwn(fixed, s.id));
  const rank = (slot: WeeklySlot, choices: Selections) => {
    const drafts = slots
      .filter((other) => other.id !== slot.id && choices[other.id])
      .map((other) => ({
        studentId: choices[other.id]!,
        startsAt: other.startsAt,
        endsAt: other.endsAt,
        activityCode: activityCode(other),
        siteName: other.siteName,
        plannedMinutes: minutesBetween(other.startsAt, other.endsAt),
        approvedMinutes: null,
        active: true,
      }));
    return rankRotationCandidates({
      ...context,
      startsAt: slot.startsAt,
      endsAt: slot.endsAt,
      targetActivityCode: activityCode(slot),
      targetSiteName: slot.siteName,
      blocked: slot.blocked,
      assignments: [...context.assignments, ...drafts],
      commitments: [...context.commitments, ...drafts],
    });
  };
  const greedy: Selections = { ...fixed };
  for (const slot of automatic)
    greedy[slot.id] = rank(slot, greedy).find((c) => !c.reasons.length)?.id ?? "";
  const filled = (choices: Selections) => automatic.filter((s) => choices[s.id]).length;
  const initialCount = filled(greedy);
  let best = { ...greedy };
  let bestCount = initialCount;
  let searchStatus: WeeklyPlan["searchStatus"] = "not-needed";
  if (bestCount < automatic.length) {
    let nodes = 0;
    let checks = 0;
    let limited = false;
    const maxNodes = options.maxNodes ?? 1000;
    const maxChecks = options.maxChecks ?? 100_000;
    const staticDomains = new Map(
      automatic.map((s) => [
        s.id,
        rank(s, fixed)
          .filter((c) => !c.reasons.length)
          .map((c) => c.id),
      ]),
    );
    const baseServices = new Map(
      context.cadets.map((cadet) => [
        cadet.id,
        [
          ...context.commitments.filter((c) => c.studentId === cadet.id),
          ...(context.duties ?? [])
            .filter((d) => d.studentId === cadet.id && d.startsAt && d.endsAt)
            .map((d) => ({ startsAt: d.startsAt!, endsAt: d.endsAt! })),
        ],
      ]),
    );
    const search = (remaining: WeeklySlot[], choices: Selections, count: number): void => {
      if (bestCount === automatic.length || limited || count + remaining.length <= bestCount)
        return;
      if (++nodes > maxNodes) {
        limited = true;
        return;
      }
      if (count > bestCount) {
        best = { ...choices };
        bestCount = count;
      }
      if (bestCount === automatic.length) return;
      const domains = new Map<string, string[]>();
      for (const slot of remaining) {
        const available: string[] = [];
        for (const id of staticDomains.get(slot.id) ?? []) {
          if (++checks > maxChecks) {
            limited = true;
            return;
          }
          const services = [
            ...(baseServices.get(id) ?? []),
            ...slots.filter((other) => other.id !== slot.id && choices[other.id] === id),
          ];
          if (!rotationRestAvailability(services, slot).reasons.length) available.push(id);
        }
        domains.set(slot.id, available);
      }
      // Empty domains cannot be repaired by reserving more services; skip them.
      const possible = remaining.filter((s) => domains.get(s.id)!.length);
      // Bound each group of mutually incompatible slots by its distinct available cadets.
      // Groups can share cadets, so summing these bounds remains optimistic and safe.
      let bound = 0;
      let groupSize = 0;
      let earliestEnd = Infinity;
      let groupCadets = new Set<string>();
      for (const slot of possible) {
        if (groupSize && Date.parse(slot.startsAt) >= earliestEnd + 86_400_000) {
          bound += Math.min(groupSize, groupCadets.size);
          groupSize = 0;
          earliestEnd = Infinity;
          groupCadets = new Set();
        }
        groupSize++;
        earliestEnd = Math.min(earliestEnd, Date.parse(slot.endsAt));
        domains.get(slot.id)!.forEach((id) => groupCadets.add(id));
      }
      bound += Math.min(groupSize, groupCadets.size);
      if (count + bound <= bestCount) return;
      // Most constrained slot first; stable chronological tie-break.
      const slot = possible.reduce((a, b) =>
        domains.get(a.id)!.length <= domains.get(b.id)!.length ? a : b,
      );
      const next = possible.filter((s) => s.id !== slot.id);
      const eligible = new Set(domains.get(slot.id));
      // Branch order still follows the shared rest/weekend/workload ranking.
      for (const candidate of rank(slot, choices)) {
        if (!eligible.has(candidate.id)) continue;
        choices[slot.id] = candidate.id;
        search(next, choices, count + 1);
        delete choices[slot.id];
        if (bestCount === automatic.length || limited) return;
      }
      // A partial solution can be better than the initial plan even when no full one exists.
      search(next, choices, count);
    };
    search(automatic, { ...fixed }, 0);
    searchStatus = bestCount === automatic.length ? "complete" : limited ? "limited" : "exhausted";
  }
  return {
    searchStatus,
    recoveredSlots: bestCount - initialCount,
    choices: slots.map((slot) => {
      const candidates = rank(slot, best);
      const studentId = best[slot.id] ?? "";
      const candidate = candidates.find((c) => c.id === studentId);
      return {
        slot,
        studentId,
        candidates,
        error: !studentId
          ? "Escolha um cadete disponível."
          : !candidate
            ? "Cadete inválido."
            : candidate.reasons.join("; ") || null,
      };
    }),
  };
}

export function planWeek(context: WeeklyContext, overrides: Selections = {}): WeeklyChoice[] {
  return planWeekWithAlternatives(context, overrides).choices;
}
