import { describe, expect, it } from "vitest";
import { formatLaborAmountInput } from "./LaborCalculator";

describe("LaborCalculator", () => {
  it("should_returnEmptyString_when_laborAmountIsEmpty", () => {
    expect(formatLaborAmountInput("")).toBe("");
  });

  it("should_formatAmount_when_laborAmountHasDigits", () => {
    expect(formatLaborAmountInput("12345")).toBe("12,345");
  });
});
