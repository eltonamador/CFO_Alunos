import { requireRole } from "@/components/app/RoleGuard";
import { DocumentsTab } from "@/components/app/documents/DocumentsTab";

export const metadata = { title: "Meus documentos" };

export default async function AlunoDocumentosPage() {
  const session = await requireRole("aluno");
  if (!session.studentId) {
    return (
      <div className="rounded-lg border bg-card p-6">
        <h1 className="text-lg font-semibold">Conta não vinculada</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Procure a Coordenação para vincular sua conta a um aluno.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <header>
        <h1 className="text-2xl font-bold">Meus documentos</h1>
        <p className="text-sm text-muted-foreground">
          Envie os documentos pessoais para validação. Os recusados podem ser reenviados.
        </p>
      </header>

      <DocumentsTab studentId={session.studentId} canReupload />
    </div>
  );
}
