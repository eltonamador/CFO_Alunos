export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-muted/40 p-4">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <p className="text-xs font-semibold uppercase tracking-widest text-primary">
            Academia Bombeiro Militar — CBMAP
          </p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight">CFO Alunos</h1>
        </div>
        {children}
      </div>
    </div>
  );
}
