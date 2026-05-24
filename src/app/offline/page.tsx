export const metadata = {
  title: "Sem conexão",
};

export default function OfflinePage() {
  return (
    <main className="container flex min-h-screen flex-col items-center justify-center gap-4 py-16 text-center">
      <h1 className="text-2xl font-semibold">Sem conexão</h1>
      <p className="max-w-md text-muted-foreground">
        Você está offline. Dados já abertos continuam disponíveis no cache. Conecte-se à internet
        para sincronizar e enviar alterações.
      </p>
    </main>
  );
}
