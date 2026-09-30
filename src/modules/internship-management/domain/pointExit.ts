/** Saída comum: perto do fim previsto e nunca imediatamente após a entrada. */
export const EXIT_BEFORE_END_MINUTES = 60;
export const EXIT_AFTER_ENTRY_MINUTES = 30;

export function pointExitReleaseAt(endsAt: string, enteredAt: string): number {
  return Math.max(
    Date.parse(endsAt) - EXIT_BEFORE_END_MINUTES * 60_000,
    Date.parse(enteredAt) + EXIT_AFTER_ENTRY_MINUTES * 60_000,
  );
}
