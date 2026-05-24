import { describe, it, expect } from "vitest";
import { computePendingItems } from "./computePendingItems";
import { EquipmentRequirement } from "../entities/EquipmentRequirement";
import { StudentEquipmentStatus } from "../entities/StudentEquipmentStatus";
import { UniqueId } from "@/shared/domain";

function makeReq(
  overrides: Partial<ConstructorParameters<typeof EquipmentRequirement>[0]> & { id?: string } = {},
): EquipmentRequirement {
  const id = new UniqueId(overrides.id ?? "req-1");
  return EquipmentRequirement.create(
    {
      categoryId: "cat-1",
      name: "Item teste",
      quantity: 1,
      unit: "un",
      mandatory: overrides.mandatory ?? true,
      applicability: overrides.applicability ?? "todos",
      phase: "quarentena",
      active: overrides.active ?? true,
    },
    id,
  );
}

function makeStatus(
  reqId: string,
  status: StudentEquipmentStatus["status"],
  validationStatus: StudentEquipmentStatus["validationStatus"] = "nao_validado",
): StudentEquipmentStatus {
  return StudentEquipmentStatus.create({
    studentId: "student-1",
    requirementId: reqId,
    status,
    validationStatus,
  });
}

function buildMap(...statuses: StudentEquipmentStatus[]): Map<string, StudentEquipmentStatus> {
  return new Map(statuses.map((s) => [s.requirementId, s]));
}

describe("computePendingItems", () => {
  it("status ok → não pendente", () => {
    const req = makeReq({ id: "r1" });
    const result = computePendingItems({
      requirements: [req],
      statuses: buildMap(makeStatus("r1", "ok")),
      studentSex: "M",
    });
    expect(result).toHaveLength(0);
  });

  it("status nao_se_aplica → não pendente", () => {
    const req = makeReq({ id: "r1" });
    const result = computePendingItems({
      requirements: [req],
      statuses: buildMap(makeStatus("r1", "nao_se_aplica")),
      studentSex: "M",
    });
    expect(result).toHaveLength(0);
  });

  it("item opcional sem status → não pendente", () => {
    const req = makeReq({ id: "r1", mandatory: false });
    const result = computePendingItems({
      requirements: [req],
      statuses: new Map(),
      studentSex: "M",
    });
    expect(result).toHaveLength(0);
  });

  it("item obrigatório sem status → pendente", () => {
    const req = makeReq({ id: "r1", mandatory: true });
    const result = computePendingItems({
      requirements: [req],
      statuses: new Map(),
      studentSex: "M",
    });
    expect(result).toHaveLength(1);
  });

  it("status falta_comprar → pendente", () => {
    const req = makeReq({ id: "r1" });
    const result = computePendingItems({
      requirements: [req],
      statuses: buildMap(makeStatus("r1", "falta_comprar")),
      studentSex: "M",
    });
    expect(result).toHaveLength(1);
  });

  it("status em_duvida → pendente", () => {
    const req = makeReq({ id: "r1" });
    const result = computePendingItems({
      requirements: [req],
      statuses: buildMap(makeStatus("r1", "em_duvida")),
      studentSex: "M",
    });
    expect(result).toHaveLength(1);
  });

  it("status vai_chegar → pendente", () => {
    const req = makeReq({ id: "r1" });
    const result = computePendingItems({
      requirements: [req],
      statuses: buildMap(makeStatus("r1", "vai_chegar")),
      studentSex: "M",
    });
    expect(result).toHaveLength(1);
  });

  it("status comprado sem validação → pendente", () => {
    const req = makeReq({ id: "r1" });
    const result = computePendingItems({
      requirements: [req],
      statuses: buildMap(makeStatus("r1", "comprado", "nao_validado")),
      studentSex: "M",
    });
    expect(result).toHaveLength(1);
  });

  it("status comprado validado → não pendente", () => {
    const req = makeReq({ id: "r1" });
    const result = computePendingItems({
      requirements: [req],
      statuses: buildMap(makeStatus("r1", "comprado", "validado")),
      studentSex: "M",
    });
    expect(result).toHaveLength(0);
  });

  it("status inadequado → pendente", () => {
    const req = makeReq({ id: "r1" });
    const result = computePendingItems({
      requirements: [req],
      statuses: buildMap(makeStatus("r1", "inadequado")),
      studentSex: "M",
    });
    expect(result).toHaveLength(1);
  });

  it("aplicabilidade feminino para aluno M → não conta como pendência", () => {
    const req = makeReq({ id: "r1", mandatory: true, applicability: "feminino" });
    const result = computePendingItems({
      requirements: [req],
      statuses: new Map(),
      studentSex: "M",
    });
    expect(result).toHaveLength(0);
  });

  it("aplicabilidade masculino para aluna F → não conta como pendência", () => {
    const req = makeReq({ id: "r1", mandatory: true, applicability: "masculino" });
    const result = computePendingItems({
      requirements: [req],
      statuses: new Map(),
      studentSex: "F",
    });
    expect(result).toHaveLength(0);
  });

  it("múltiplos itens — conta corretamente", () => {
    const r1 = makeReq({ id: "r1" });
    const r2 = makeReq({ id: "r2" });
    const r3 = makeReq({ id: "r3" });
    const result = computePendingItems({
      requirements: [r1, r2, r3],
      statuses: buildMap(
        makeStatus("r1", "ok"),
        makeStatus("r2", "falta_comprar"),
        // r3 sem status — obrigatório → pendente
      ),
      studentSex: "M",
    });
    expect(result).toHaveLength(2);
    expect(result.map((p) => p.requirementId)).toContain("r2");
    expect(result.map((p) => p.requirementId)).toContain("r3");
  });
});
