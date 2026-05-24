import { notFound } from "next/navigation";
import Link from "next/link";
import { requireRole } from "@/components/app/RoleGuard";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  fetchInstructorCard,
  fetchEmergencyContacts,
  signedPhotoUrl,
} from "@/lib/supabase/queries/students";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";

interface PageProps {
  params: { id: string };
}

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-wide text-muted-foreground">{label}</dt>
      <dd className="text-base">{value ?? "—"}</dd>
    </div>
  );
}

export default async function InstrutorCardPage({ params }: PageProps) {
  await requireRole("instrutor");

  const supabase = createSupabaseServerClient();
  const card = await fetchInstructorCard(supabase, params.id);
  if (!card) notFound();

  // Acesso aos contatos de emergência — registrado em audit_logs via RLS+trigger.
  // No MVP, apenas o contato prioridade 1 fica visível para "Emergência".
  const emergency = await fetchEmergencyContacts(supabase, params.id);
  const primaryEmergency = emergency.find((e) => e.priority === 1);
  const photoUrl = await signedPhotoUrl(supabase, card.photo_path);

  return (
    <div className="space-y-4">
      <Link href="/instrutor" className="text-sm text-muted-foreground hover:underline">
        ← Buscar outro aluno
      </Link>

      <Card>
        <CardHeader className="flex-row items-center gap-4">
          <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-full bg-muted">
            {photoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={photoUrl} alt={card.war_name} className="h-full w-full object-cover" />
            ) : (
              <span className="text-xl font-bold text-muted-foreground">
                {card.student_number ? String(card.student_number).padStart(2, "0") : "?"}
              </span>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="tabular-nums text-muted-foreground">
                {card.student_number ? String(card.student_number).padStart(2, "0") : "—"}
              </span>
              <CardTitle className="truncate">{card.war_name}</CardTitle>
            </div>
            <CardDescription className="truncate">{card.full_name}</CardDescription>
            <div className="mt-1 flex flex-wrap gap-1.5">
              {card.pelotao && <Badge variant="outline">{card.pelotao}</Badge>}
              {card.has_restriction && <Badge variant="warning">Restrição</Badge>}
              {card.origin_label === "outro_estado" && (
                <Badge variant="outline">Outro estado</Badge>
              )}
              {card.has_vehicle && <Badge variant="outline">Veículo</Badge>}
            </div>
          </div>
        </CardHeader>

        <CardContent>
          <dl className="grid gap-4 sm:grid-cols-2">
            <Field
              label="Canga"
              value={
                card.canga_war_name
                  ? `${String(card.canga_number ?? "").padStart(2, "0")} · ${card.canga_war_name}`
                  : "—"
              }
            />
            <Field
              label="WhatsApp"
              value={
                card.whatsapp ? (
                  <a
                    href={`https://wa.me/55${card.whatsapp.replace(/\D/g, "")}`}
                    className="text-primary underline"
                    target="_blank"
                    rel="noreferrer"
                  >
                    {card.whatsapp}
                  </a>
                ) : (
                  "—"
                )
              }
            />
            <Field label="E-mail institucional" value={card.email_institutional} />
            <Field label="Origem" value={card.origin_label === "outro_estado" ? "Outro estado" : "Amapá"} />
          </dl>

          {card.has_restriction && card.operational_summary && (
            <div className="mt-4 rounded-md border border-amber-500/40 bg-amber-500/10 p-3">
              <p className="text-xs font-medium uppercase text-amber-700 dark:text-amber-400">
                Resumo operacional
              </p>
              <p className="mt-1 text-sm">{card.operational_summary}</p>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Contato de emergência</CardTitle>
          <CardDescription>
            Acesso é registrado em auditoria (LGPD). Use somente em incidentes.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {primaryEmergency ? (
            <div className="space-y-2">
              <Field
                label={`${primaryEmergency.relationship ?? "Contato 1"}`}
                value={primaryEmergency.full_name}
              />
              <Field
                label="Telefone"
                value={
                  <a href={`tel:+55${primaryEmergency.phone.replace(/\D/g, "")}`} className="text-primary underline">
                    {primaryEmergency.phone}
                  </a>
                }
              />
              <div className="pt-2">
                <a
                  href={`https://wa.me/55${primaryEmergency.phone.replace(/\D/g, "")}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  <Button variant="outline" size="sm">
                    Abrir no WhatsApp
                  </Button>
                </a>
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Nenhum contato de emergência cadastrado.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
