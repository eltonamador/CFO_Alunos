export const metadata = {
  title: "Sem conexão",
};

export default function OfflinePage() {
  return (
    <main className="container flex min-h-screen flex-col items-center justify-center gap-4 py-16 text-center">
      <h1 className="text-2xl font-semibold">Sem conexão</h1>
      <p className="max-w-md text-muted-foreground">
        Sem conexão. Consulte as escalas e o QTS que já foram salvos neste aparelho.
        As demais consultas e o envio de alterações precisam de internet.
      </p>
      <a href="/escala-offline.html" className="underline">Escalas salvas</a>
      <a href="/qts-offline.html" className="underline">QTS salvo</a>
    </main>
  );
}
