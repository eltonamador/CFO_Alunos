export function AppLoading({ boot = false }: { boot?: boolean }) {
  return (
    <div
      role="status"
      aria-live="polite"
      aria-busy="true"
      className={boot ? "min-h-screen bg-background" : "space-y-4"}
    >
      {boot && (
        <header className="bg-primary px-4 py-5 font-display font-bold text-primary-foreground">
          CFO Alunos · CBMAP
        </header>
      )}
      <div className={boot ? "mx-auto max-w-4xl space-y-4 p-6" : "space-y-4"}>
        <p className="text-sm text-muted-foreground">Carregando consulta…</p>
        <div aria-hidden className="h-24 animate-pulse rounded-lg bg-muted" />
        <div aria-hidden className="h-40 animate-pulse rounded-lg bg-muted" />
      </div>
    </div>
  );
}
