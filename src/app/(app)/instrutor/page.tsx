import { requireRole } from "@/components/app/RoleGuard";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { searchInstructorCards, signedPhotoUrl } from "@/lib/supabase/queries/students";
import { SearchInput } from "@/components/ui/SearchInput";
import { StudentListCard } from "@/components/app/StudentListCard";

export const metadata = { title: "Instrutor" };

interface PageProps {
  searchParams: { q?: string };
}

export default async function InstrutorHome({ searchParams }: PageProps) {
  await requireRole("instrutor");

  const supabase = createSupabaseServerClient();
  const results = await searchInstructorCards(supabase, searchParams.q ?? "");

  const cardsWithPhotos = await Promise.all(
    results.map(async (r) => ({
      ...r,
      photoUrl: await signedPhotoUrl(supabase, r.photo_path),
    })),
  );

  return (
    <div className="space-y-4">
      <header>
        <h1 className="text-2xl font-bold">Buscar aluno</h1>
        <p className="text-sm text-muted-foreground">Por número ou nome de guerra</p>
      </header>

      <SearchInput placeholder="Ex.: 07 ou Águia" className="text-lg" />

      {cardsWithPhotos.length === 0 ? (
        <div className="rounded-lg border bg-card p-8 text-center text-sm text-muted-foreground">
          {searchParams.q ? "Nenhum resultado." : "Digite acima para buscar."}
        </div>
      ) : (
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {cardsWithPhotos.map((c) => (
            <StudentListCard
              key={c.id}
              href={`/instrutor/${c.id}`}
              studentNumber={c.student_number}
              warName={c.war_name}
              fullName={c.full_name}
              pelotao={c.pelotao}
              photoUrl={c.photoUrl}
              badges={c.has_restriction ? [{ label: "Restrição", variant: "warning" }] : []}
            />
          ))}
        </div>
      )}
    </div>
  );
}
