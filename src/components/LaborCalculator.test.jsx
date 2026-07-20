import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import LaborCalculator, { formatLaborAmountInput } from "./LaborCalculator";

describe("LaborCalculator", () => {
  it("should_returnEmptyString_when_laborAmountIsEmpty", () => {
    expect(formatLaborAmountInput("")).toBe("");
  });

  it("should_formatAmount_when_laborAmountHasDigits", () => {
    expect(formatLaborAmountInput("12345")).toBe("12,345");
  });

  it("should_maskLaborAmountInput_when_privacyModeIsEnabled", () => {
    const markup = renderToStaticMarkup(<LaborCalculator currentPerSecond={1} averagePerSecond={1} privacyMode />);

    expect(markup).toContain('type="password"');
  });
});
