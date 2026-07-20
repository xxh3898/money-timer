import { describe, expect, it } from "vitest";
import { hasCompleteSettings, sanitizeGoals, sanitizeSettings } from "./storage";

const completeAlwaysSettings = {
  calculationType: "monthly",
  annualSalary: 0,
  monthlySalary: 3000000,
  hourlyWage: 0,
  taxMode: "net",
  payday: 25,
  paydayTime: "09:00",
  earningMode: "always",
  workDays: [],
  workStartTime: "",
  workEndTime: "",
  breaks: [],
  privacyMode: false,
  theme: "light",
};

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

  it("should_returnFalse_when_requiredSettingsAreMissing", () => {
    expect(hasCompleteSettings(undefined)).toBe(false);
  });

  it("should_returnFalse_when_selectedSalaryIsZero", () => {
    expect(hasCompleteSettings({ ...completeAlwaysSettings, monthlySalary: 0 })).toBe(false);
  });

  it("should_returnFalse_when_worktimeFieldsAreIncomplete", () => {
    expect(hasCompleteSettings({ ...completeAlwaysSettings, earningMode: "worktime" })).toBe(false);
  });

  it("should_returnTrue_when_alwaysSettingsAreComplete", () => {
    expect(hasCompleteSettings(completeAlwaysSettings)).toBe(true);
  });

  it("should_returnTrue_when_worktimeSettingsAreComplete", () => {
    expect(hasCompleteSettings({
      ...completeAlwaysSettings,
      earningMode: "worktime",
      workDays: [1, 2, 3, 4, 5],
      workStartTime: "09:00",
      workEndTime: "18:00",
    })).toBe(true);
  });
});
