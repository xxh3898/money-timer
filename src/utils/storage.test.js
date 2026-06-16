import { describe, expect, it } from "vitest";
import { sanitizeGoals, sanitizeSettings } from "./storage";

describe("settings storage", () => {
  it("should_keepEmptyDefaultValues_when_settingsAreMissing", () => {
    expect(sanitizeSettings(undefined)).toMatchObject({
      calculationType: "",
      annualSalary: 0,
      monthlySalary: 0,
      hourlyWage: 0,
      taxMode: "",
      payday: 0,
      paydayTime: "",
      earningMode: "",
      workDays: [],
      workStartTime: "",
      workEndTime: "",
      breaks: [],
      privacyMode: false,
      theme: "light",
    });
  });

  it("should_keepEmptyArrays_when_breaksAndGoalsAreEmpty", () => {
    expect(sanitizeSettings({ breaks: [], workDays: [] })).toMatchObject({
      breaks: [],
      workDays: [],
    });
    expect(sanitizeGoals([])).toEqual([]);
  });

  it("should_keepZeroPayday_when_paydayIsEmptyDefault", () => {
    expect(sanitizeSettings({ payday: 0 }).payday).toBe(0);
  });
});
