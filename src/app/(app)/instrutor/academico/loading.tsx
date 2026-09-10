export default function Loading() {
  return (
    <div role="status" aria-live="polite" className="space-y-4">
      <p className="text-sm text-muted-foreground">Carregando gestão acadêmica…</p>
      <div className="h-24 animate-pulse rounded-lg bg-muted" />
      <div className="h-40 animate-pulse rounded-lg bg-muted" />
    </div>
  );
}
