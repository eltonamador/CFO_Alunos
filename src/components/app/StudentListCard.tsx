import Link from "next/link";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";

interface Props {
  href: string;
  studentNumber: number | null;
  warName: string;
  fullName?: string;
  pelotao?: string | null;
  photoUrl?: string | null;
  badges?: { label: string; variant?: "default" | "primary" | "warning" | "success" | "destructive" }[];
}

export function StudentListCard({
  href,
  studentNumber,
  warName,
  fullName,
  pelotao,
  photoUrl,
  badges = [],
}: Props) {
  return (
    <Link href={href} className="block">
      <Card className="flex items-center gap-3 p-3 transition-colors hover:bg-accent/40">
        <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-full bg-muted">
          {photoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={photoUrl} alt={warName} className="h-full w-full object-cover" />
          ) : (
            <span className="text-lg font-bold text-muted-foreground">
              {studentNumber ? String(studentNumber).padStart(2, "0") : "?"}
            </span>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="flex items-center gap-2 text-sm font-semibold">
            <span className="tabular-nums text-muted-foreground">
              {studentNumber ? String(studentNumber).padStart(2, "0") : "—"}
            </span>
            <span className="truncate">{warName}</span>
          </p>
          {fullName && fullName !== warName && (
            <p className="truncate text-xs text-muted-foreground">{fullName}</p>
          )}
          <div className="mt-1 flex flex-wrap items-center gap-1.5">
            {pelotao && <Badge variant="outline">{pelotao}</Badge>}
            {badges.map((b) => (
              <Badge key={b.label} variant={b.variant ?? "default"}>
                {b.label}
              </Badge>
            ))}
          </div>
        </div>
      </Card>
    </Link>
  );
}
