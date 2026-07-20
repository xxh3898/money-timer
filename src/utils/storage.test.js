import { afterEach, describe, expect, it, vi } from "vitest";
import { hasCompleteSettings, loadSettings, sanitizeGoals, sanitizeSettings, STORAGE_KEY } from "./storage";

const completeAlwaysSettings = {
  settingsVersion: 1,
  calculationType: "monthly",
  annualSalary: 0,
  monthlySalary: 3000000,
  hourlyWage: 0,
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
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("should_keepEmptyDefaultValues_when_settingsAreMissing", () => {
    expect(sanitizeSettings(undefined)).toMatchObject({
      calculationType: "",
      annualSalary: 0,
      monthlySalary: 0,
      hourlyWage: 0,
      settingsVersion: 1,
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
    expect(sanitizeSettings(undefined)).not.toHaveProperty("taxMode");
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

  it("should_migrateLegacyGrossAmounts_when_settingsHaveNoVersion", () => {
    const migrated = sanitizeSettings({
      ...completeAlwaysSettings,
      settingsVersion: undefined,
      annualSalary: 36000000,
      monthlySalary: 3000000,
      hourlyWage: 10000,
      taxMode: "gross",
    });

    expect(migrated).toMatchObject({
      settingsVersion: 1,
      annualSalary: 32400000,
      monthlySalary: 2700000,
      hourlyWage: 9000,
    });
    expect(migrated).not.toHaveProperty("taxMode");
  });

  it("should_keepLegacyNetAmounts_when_settingsHaveNoVersion", () => {
    const migrated = sanitizeSettings({
      ...completeAlwaysSettings,
      settingsVersion: undefined,
      taxMode: "net",
    });

    expect(migrated.monthlySalary).toBe(3000000);
    expect(migrated).not.toHaveProperty("taxMode");
  });

  it("should_notMigrateAmountsAgain_when_settingsAreAlreadyVersioned", () => {
    const first = sanitizeSettings({
      ...completeAlwaysSettings,
      settingsVersion: undefined,
      monthlySalary: 3000000,
      taxMode: "gross",
    });

    expect(sanitizeSettings(first)).toEqual(first);
  });

  it("should_persistMigratedSettings_when_legacySettingsAreLoaded", () => {
    const setItem = vi.fn();
    vi.stubGlobal("localStorage", {
      getItem: vi.fn(() => JSON.stringify({
        ...completeAlwaysSettings,
        settingsVersion: undefined,
        monthlySalary: 3000000,
        taxMode: "gross",
      })),
      setItem,
    });

    const loaded = loadSettings();

    expect(loaded.monthlySalary).toBe(2700000);
    expect(setItem).toHaveBeenCalledWith(STORAGE_KEY, JSON.stringify(loaded));
  });
});
