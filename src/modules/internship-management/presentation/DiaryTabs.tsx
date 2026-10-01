import Link from "next/link";
import { BOARD_ORDERS } from "../domain/occurrenceDiary";

export type DiaryViewSearchParams = {
  aba?: string;
  periodo?: string;
  ordem?: string;
  limite?: string;
};
type DiaryTab = "diario" | "mural" | "quadro";

export function diaryViewOptions(params?: DiaryViewSearchParams) {
  const tab: DiaryTab = params?.aba === "mural" || params?.aba === "quadro" ? params.aba : "diario";
  return {
    tab,
    order: BOARD_ORDERS.find((item) => item.value === params?.ordem)?.value ?? "registros",
    limit: Math.min(Math.max(Math.floor(Number(params?.limite)) || 60, 60), 300),
  };
}

export function DiaryTabs({
  basePath,
  active,
  firstLabel,
}: {
  basePath: string;
  active: DiaryTab;
  firstLabel: string;
}) {
  const tabs = [
    { value: "diario", label: firstLabel, href: basePath },
    { value: "mural", label: "Mural da turma", href: `${basePath}?aba=mural` },
    { value: "quadro", label: "Quadro da turma", href: `${basePath}?aba=quadro` },
  ];
  return (
    <nav aria-label="Diário, mural e quadro" className="flex gap-1 overflow-x-auto border-b">
      {tabs.map((tab) => (
        <Link
          key={tab.value}
          href={tab.href}
          aria-current={tab.value === active ? "page" : undefined}
          className={`-mb-px whitespace-nowrap border-b-[3px] px-3 py-3 font-display text-sm font-semibold uppercase tracking-[0.06em] ${
            tab.value === active
              ? "border-primary text-primary"
              : "border-transparent text-foreground/75"
          }`}
        >
          {tab.label}
        </Link>
      ))}
    </nav>
  );
}
