import { describe, expect, it } from "vitest";
import { academicCommandSchema } from "./commands";
import { DEFAULT_POLICY_PARAMETERS } from "../domain/academic";

const id = "00000000-0000-4000-8000-000000000001";
const grade = {
  operation: "save_grade",
  offering_id: id,
  assessment_id: id,
  enrollment_id: id,
  score: "0",
  expected_revision: "0",
  reason: "",
};

describe("academic command boundary", () => {
  it("distinguishes missing grade from a valid zero and accepts Brazilian decimal input", () => {
    expect(academicCommandSchema.parse(grade)).toMatchObject({ score: 0 });
    expect(academicCommandSchema.parse({ ...grade, score: "" })).toMatchObject({ score: null });
    expect(academicCommandSchema.parse({ ...grade, score: "   " })).toMatchObject({ score: null });
    expect(academicCommandSchema.parse({ ...grade, score: "7,25" })).toMatchObject({ score: 7.25 });
  });
  it.each(["-1", "11", "NaN", "Infinity", "7.251", "abc"])("rejects invalid score %s", (score) => {
    expect(academicCommandSchema.safeParse({ ...grade, score }).success).toBe(false);
  });
  it("requires an explicit version for concurrent editing", () => {
    expect(academicCommandSchema.safeParse({ ...grade, expected_revision: "" }).success).toBe(
      false,
    );
    expect(academicCommandSchema.safeParse({ ...grade, expected_revision: "1.5" }).success).toBe(
      false,
    );
  });
  it("does not interpret an empty frequency as a confirmed zero", () => {
    const input = {
      operation: "save_attendance",
      offering_id: id,
      enrollment_id: id,
      justified_absences: "",
      unjustified_absences: "0",
      expected_revision: "1",
      reason: "Conferência do diário",
    };
    expect(academicCommandSchema.safeParse(input).success).toBe(false);
    expect(academicCommandSchema.safeParse({ ...input, justified_absences: "0" }).success).toBe(
      true,
    );
  });
  it("rejects incomplete rules and malformed decision data", () => {
    const input = {
      operation: "configure_policy",
      offering_id: id,
      name: "Regra piloto",
      decision_ref: "Ata teste 01",
      parameters: JSON.stringify(DEFAULT_POLICY_PARAMETERS),
    };
    expect(academicCommandSchema.safeParse(input).success).toBe(true);
    expect(academicCommandSchema.safeParse({ ...input, parameters: "{}" }).success).toBe(false);
    expect(academicCommandSchema.safeParse({ ...input, parameters: "{" }).success).toBe(false);
    expect(academicCommandSchema.safeParse({ ...input, decision_ref: "" }).success).toBe(false);
  });
  it("rejects dates that normalize to a different calendar date", () => {
    const input = {
      operation: "create_assessment",
      offering_id: id,
      kind: "VC",
      sequence: "1",
      title: "VC 1",
      held_on: "2026-02-31",
    };
    expect(academicCommandSchema.safeParse(input).success).toBe(false);
    expect(academicCommandSchema.safeParse({ ...input, held_on: "2026-02-28" }).success).toBe(true);
  });
});
