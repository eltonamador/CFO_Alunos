import { expect, it, vi } from "vitest";
import { revalidatePath } from "next/cache";
import { getSession } from "@/modules/identity/presentation/session";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { publishInternshipWeek } from "./weeklyActions";
vi.mock("next/cache",()=>({revalidatePath:vi.fn()}));
vi.mock("@/modules/identity/presentation/session",()=>({getSession:vi.fn()}));
vi.mock("@/lib/supabase/server",()=>({createSupabaseServerClient:vi.fn()}));
it("atualiza também as telas iniciais após publicar uma escala",async()=>{
  vi.mocked(getSession).mockResolvedValue({active:true,role:"coordenacao"} as Awaited<ReturnType<typeof getSession>>);
  const rpc=vi.fn().mockResolvedValue({data:["shift"],error:null});
  vi.mocked(createSupabaseServerClient).mockReturnValue({rpc} as unknown as ReturnType<typeof createSupabaseServerClient>);
  const uuid="11111111-1111-4111-8111-111111111111";
  expect(await publishInternshipWeek({programId:uuid,requestId:uuid,weekStart:"2026-09-21",lines:[{date:"2026-09-26",templateCode:"SAB-USB-M12",siteId:uuid,studentId:uuid,supervisorName:""}]})).toEqual({count:1});
  for(const path of ["/aluno","/coordenacao","/instrutor","/secretaria"]) expect(revalidatePath).toHaveBeenCalledWith(path);
});
