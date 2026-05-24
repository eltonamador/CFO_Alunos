export function PlaceholderTab({ title, phase }: { title: string; phase: string }) {
  return (
    <div className="rounded-lg border bg-card p-6 text-center">
      <h3 className="font-semibold">{title}</h3>
      <p className="mt-1 text-sm text-muted-foreground">Será entregue em: {phase}</p>
    </div>
  );
}
