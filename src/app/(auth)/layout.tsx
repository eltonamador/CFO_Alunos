import Image from "next/image";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="flex min-h-screen flex-col items-center justify-center p-4"
      style={{ backgroundColor: "#16140f" }}
    >
      <div className="w-full max-w-md">
        {/* ─── Cabeçalho institucional ─── */}
        <div className="mb-8 flex flex-col items-center gap-4">
          {/* Par de brasões */}
          <div className="flex items-end justify-center gap-5">
            {/* Brasão ABM — coruja, circular, menor */}
            <div className="relative h-[64px] w-[64px] flex-shrink-0">
              <Image
                src="/brasao-abm.png"
                alt="Academia Bombeiro Militar — CBMAP"
                fill
                className="object-contain drop-shadow-lg"
                priority
                draggable={false}
              />
            </div>

            {/* Texto central */}
            <div className="flex flex-col items-center text-center">
              <p className="text-[9px] font-semibold uppercase tracking-[0.22em] text-white/50">
                Academia Bombeiro Militar
              </p>
              <p className="text-[9px] font-semibold uppercase tracking-[0.22em] text-white/50">
                CBMAP · ABM
              </p>
              <h1
                className="mt-1 font-display text-2xl font-bold uppercase tracking-[0.1em] text-white"
              >
                CFO Alunos
              </h1>
              <p className="mt-0.5 text-[8px] font-medium uppercase tracking-[0.18em] text-white/35">
                Escola de Formação de Oficiais
              </p>
            </div>

            {/* Brasão EFO — fênix, maior, protagonista */}
            <div className="relative h-[76px] w-[76px] flex-shrink-0">
              <Image
                src="/brasao-efo.png"
                alt="Escola de Formação de Oficiais — CFO / CBMAP"
                fill
                className="object-contain drop-shadow-lg"
                priority
                draggable={false}
              />
            </div>
          </div>

          {/* Divider dourado */}
          <div
            className="h-px w-24 rounded-full opacity-30"
            style={{ background: "linear-gradient(to right, transparent, #c9a84c, transparent)" }}
          />
        </div>

        {/* ─── Conteúdo da página (formulário) ─── */}
        <div className="overflow-hidden rounded-xl border border-white/10 bg-white/5 shadow-2xl backdrop-blur-sm">
          {children}
        </div>

        {/* ─── Rodapé discreto ─── */}
        <p className="mt-6 text-center text-[10px] uppercase tracking-[0.18em] text-white/25">
          Acesso restrito · CFO 2026.1
        </p>
      </div>
    </div>
  );
}
