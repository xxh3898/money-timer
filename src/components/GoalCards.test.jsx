import { describe, expect, it } from "vitest";
import { formatGoalAmountInput, parseGoalAmount, validateGoalDraft } from "./GoalCards";

describe("GoalCards", () => {
  it("should_formatAmount_when_goalAmountHasDigits", () => {
    expect(formatGoalAmountInput("12345")).toBe("12,345");
  });

  it("should_returnEmptyString_when_goalAmountIsEmpty", () => {
    expect(formatGoalAmountInput("")).toBe("");
  });

  it("should_parseAmount_when_goalAmountHasSeparators", () => {
    expect(parseGoalAmount("12,345")).toBe(12345);
  });

  it("should_returnError_when_goalNameIsEmpty", () => {
    expect(validateGoalDraft({ name: " ", amount: "1000" })).toBe("목표 이름을 입력해 주세요.");
  });

  it("should_returnError_when_goalAmountIsZero", () => {
    expect(validateGoalDraft({ name: "점심", amount: "0" })).toBe("목표 금액은 0보다 커야 합니다.");
  });

  it("should_returnEmptyError_when_goalDraftIsValid", () => {
    expect(validateGoalDraft({ name: "점심", amount: "12000" })).toBe("");
  });
});
