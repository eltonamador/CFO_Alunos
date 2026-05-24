/* eslint-disable @typescript-eslint/no-explicit-any */
import Link from "next/link";
import { requireRole } from "@/components/app/RoleGuard";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { listPendingChanges } from "@/lib/supabase/queries/pending";
import { listDocumentsPendingValidation, signedDocumentUrl } from "@/lib/supabase/queries/documents";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { PendingChangeRow } from "./PendingChangeRow";
import { DocumentValidationCard } from "@/components/app/documents/DocumentValidationCard";
import { PendingEquipmentCard } from "./PendingEquipmentCard";
import { Filter, Search } from "lucide-react";

export const metadata = { title: "Pendências de Validação — Coordenação" };

interface PageProps {
  searchParams: { tab?: string; q?: string; sex?: string };
}

function TabLink({
  href,
  label,
  count,
  active,
}: {
  href: string;
  label: string;
  count: number;
  active: boolean;
}) {
  return (
    <Link
      href={href}
      className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-xs font-semibold uppercase tracking-wider transition-colors ${
        active
          ? "border-primary text-primary"
          : "border-transparent text-muted-foreground hover:text-foreground"
      }`}
    >
      <span>{label}</span>
      <span
        className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
          active ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
        }`}
      >
        {count}
      </span>
    </Link>
  );
}

export default async function PendenciasPage({ searchParams }: PageProps) {
  await requireRole("coordenacao");

  const tab = searchParams.tab ?? "cadastro";
  const q = searchParams.q ?? "";
  const sex = searchParams.sex ?? "";

  const supabase = createSupabaseServerClient();

  // 1. Carrega todos os dados pendentes em paralelo
  const [pendingChanges, pendingDocs, pendingEquipData] = await Promise.all([
    listPendingChanges(supabase, { status: "pendente" }),
    listDocumentsPendingValidation(supabase),
    supabase
      .from("student_equipment_status")
      .select(`
        id,
        student_id,
        requirement_id,
        status,
        validation_status,
        student_notes,
        student:students(id, war_name, student_number, sex),
        requirement:equipment_requirements(id, name, quantity, unit, phase)
      `)
      .eq("status", "comprado")
      .eq("validation_status", "nao_validado"),
  ]);

  const pendingEquip = (pendingEquipData.data ?? []) as any[];

  // 2. Contagens brutas originais para os badges das abas (sempre exibe o total global)
  const totalCadastro = pendingChanges.length;
  const totalDocumentos = pendingDocs.length;
  const totalEnxoval = pendingEquip.length;

  // Filtro genérico em memória (muito leve para o grupo de 30 alunos)
  const filterByStudent = (student: any) => {
    if (!student) return false;
    if (sex && student.sex !== sex) return false;
    if (q) {
      const term = q.toLowerCase();
      const numLabel = student.student_number ? String(student.student_number).padStart(2, "0") : "";
      return (
        student.war_name.toLowerCase().includes(term) ||
        numLabel.includes(term)
      );
    }
    return true;
  };

  // 3. Aplica filtros
  const filteredChanges = pendingChanges.filter((item) => filterByStudent(item.student));
  const filteredDocs = pendingDocs.filter((item) => filterByStudent(item.student));
  const filteredEquip = pendingEquip.filter((item) => filterByStudent(item.student));

  // 4. Assinatura de URLs para os documentos que serão exibidos
  const filteredDocsWithUrls = await Promise.all(
    filteredDocs.map(async (d) => ({
      doc: d,
      url: await signedDocumentUrl(supabase, d.storage_path),
    })),
  );

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          Validações Operacionais
        </p>
        <h1 className="font-display text-3xl font-bold tracking-tight text-foreground">
          Central de Pendências
        </h1>
        <p className="text-sm text-muted-foreground">
          Homologue alterações cadastrais, valide documentos ou confirme o recebimento do enxoval.
        </p>
      </header>

      {/* Barra de Filtros */}
      <section className="rounded-xl border bg-card p-4 shadow-card-sm">
        <form method="GET" className="flex flex-wrap items-center gap-3">
          <input type="hidden" name="tab" value={tab} />
          
          <div className="relative flex-1 min-w-[240px]">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              name="q"
              defaultValue={q}
              placeholder="Buscar aluno por número ou nome de guerra..."
              className="w-full rounded-md border border-input bg-background pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
            />
          </div>

          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <select
              name="sex"
              defaultValue={sex}
              className="rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
            >
              <option value="">Todos os sexos</option>
              <option value="M">Masculino</option>
              <option value="F">Feminino</option>
            </select>
          </div>

          <button
            type="submit"
            className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/95 transition-colors"
          >
            Filtrar
          </button>

          {(q || sex) && (
            <Link
              href={`/coordenacao/pendencias?tab=${tab}`}
              className="text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors"
            >
              Limpar filtros
            </Link>
          )}
        </form>
      </section>

      {/* Navegação por Abas */}
      <div className="border-b border-border flex flex-wrap gap-1">
        <TabLink
          href={`/coordenacao/pendencias?tab=cadastro${q ? `&q=${q}` : ""}${sex ? `&sex=${sex}` : ""}`}
          label="Dados Cadastrais"
          count={totalCadastro}
          active={tab === "cadastro"}
        />
        <TabLink
          href={`/coordenacao/pendencias?tab=documentos${q ? `&q=${q}` : ""}${sex ? `&sex=${sex}` : ""}`}
          label="Documentos"
          count={totalDocumentos}
          active={tab === "documentos"}
        />
        <TabLink
          href={`/coordenacao/pendencias?tab=materiais${q ? `&q=${q}` : ""}${sex ? `&sex=${sex}` : ""}`}
          label="Enxoval / Materiais"
          count={totalEnxoval}
          active={tab === "materiais"}
        />
      </div>

      {/* Renderização das Abas */}
      <div className="pt-2">
        {/* ABA: CADASTRO */}
        {tab === "cadastro" && (
          <div className="space-y-4">
            {filteredChanges.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center text-sm text-muted-foreground">
                  Nenhuma pendência de alteração cadastral encontrada. 🎉
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4">
                {filteredChanges.map((p) => {
                  const numLabel = p.student?.student_number
                    ? String(p.student.student_number).padStart(2, "0")
                    : "—";
                  return (
                    <Card key={p.id} className="hover:border-primary/20 transition-all">
                      <CardHeader className="pb-3">
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div className="space-y-1">
                            <CardTitle className="text-base font-semibold">
                              {p.student ? (
                                <Link
                                  href={`/coordenacao/alunos/${p.student.id}`}
                                  className="hover:underline hover:text-primary transition-colors uppercase font-display"
                                >
                                  {p.student.war_name} — {numLabel}
                                </Link>
                              ) : (
                                "—"
                              )}
                            </CardTitle>
                            <CardDescription className="text-xs">
                              {p.context} → {p.entity} · {new Date(p.created_at).toLocaleString("pt-BR")}
                            </CardDescription>
                          </div>
                          <Badge variant="warning">Aguardando Homologação</Badge>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <PendingChangeRow pending={p} />
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ABA: DOCUMENTOS */}
        {tab === "documentos" && (
          <div className="space-y-4">
            {filteredDocsWithUrls.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center text-sm text-muted-foreground">
                  Nenhum documento aguardando validação encontrado. 🎉
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2">
                {filteredDocsWithUrls.map(({ doc, url }) => (
                  <DocumentValidationCard key={doc.id} doc={doc} fileUrl={url} />
                ))}
              </div>
            )}
          </div>
        )}

        {/* ABA: MATERIAIS */}
        {tab === "materiais" && (
          <div className="space-y-4">
            {filteredEquip.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center text-sm text-muted-foreground">
                  Nenhum material pendente de recebimento encontrado. 🎉
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2">
                {filteredEquip.map((item) => (
                  <PendingEquipmentCard key={item.id} item={item} />
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
