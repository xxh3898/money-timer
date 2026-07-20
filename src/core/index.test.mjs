import { describe, expect, it } from "vitest";
import { calculateEarnings, calculateGoalProgress, DEFAULT_GOALS, DEFAULT_SETTINGS, getCurrentCycle, getEligibleSeconds, getSelectedBaseAmount } from "./index.mjs";

const settings = { ...DEFAULT_SETTINGS, earningMode: "worktime", workDays: [1,2,3,4,5], workStartTime: "09:00", workEndTime: "18:00" };

describe("money timer core", () => {
  it("should_useEnteredAmount_when_monthlySalaryIsConfigured", () => {
    expect(getSelectedBaseAmount({ ...DEFAULT_SETTINGS, calculationType: "monthly", monthlySalary: 30000000, taxMode: "gross" })).toBe(30000000);
  });

  it("should_returnPreviousPayCycle_when_currentDateIsBeforeThisMonthPayday", () => {
    const cycle = getCurrentCycle(new Date(2026, 5, 15, 12), { ...DEFAULT_SETTINGS, payday: 25, paydayTime: "09:00" });
    expect(cycle.cycleStart).toEqual(new Date(2026, 4, 25, 9));
    expect(cycle.cycleEnd).toEqual(new Date(2026, 5, 25, 9));
  });

  it("should_returnCurrentPayCycle_when_currentDateIsAfterThisMonthPayday", () => {
    const cycle = getCurrentCycle(new Date(2026, 5, 26, 12), { ...DEFAULT_SETTINGS, payday: 25, paydayTime: "09:00" });
    expect(cycle.cycleStart).toEqual(new Date(2026, 5, 25, 9));
    expect(cycle.cycleEnd).toEqual(new Date(2026, 6, 25, 9));
  });

  it("should_returnZeroPerSecond_when_currentTimeIsOutsideWorkTime", () => {
    const result = calculateEarnings(new Date(2026, 5, 15, 20), settings);
    expect(result.perSecond).toBe(0);
  });

  it("should_excludeBreakSeconds_when_breakIsEnabled", () => {
    const base = { ...settings, breaks: [{ startTime: "12:00", endTime: "13:00", enabled: false }] };
    const withBreak = { ...settings, breaks: [{ startTime: "12:00", endTime: "13:00", enabled: true }] };
    const start = new Date(2026, 5, 15, 9);
    const end = new Date(2026, 5, 15, 18);
    expect(getEligibleSeconds(start, end, base)).toBe(9 * 3600);
    expect(getEligibleSeconds(start, end, withBreak)).toBe(8 * 3600);
  });

  it("should_excludeDuplicateBreakOnce_when_breakRangesAreEqual", () => {
    const withDuplicateBreaks = {
      ...settings,
      breaks: [
        { startTime: "12:00", endTime: "13:00", enabled: true },
        { startTime: "12:00", endTime: "13:00", enabled: true },
      ],
    };
    const start = new Date(2026, 5, 15, 9);
    const end = new Date(2026, 5, 15, 18);

    expect(getEligibleSeconds(start, end, withDuplicateBreaks)).toBe(8 * 3600);
  });

  it("should_mergeOverlappingAndAdjacentBreaks_when_breakRangesTouch", () => {
    const withOverlappingBreaks = {
      ...settings,
      breaks: [
        { startTime: "12:00", endTime: "13:00", enabled: true },
        { startTime: "12:30", endTime: "13:30", enabled: true },
        { startTime: "13:30", endTime: "14:00", enabled: true },
      ],
    };
    const start = new Date(2026, 5, 15, 9);
    const end = new Date(2026, 5, 15, 18);

    expect(getEligibleSeconds(start, end, withOverlappingBreaks)).toBe(7 * 3600);
  });

  it("should_calculateRemainingGoalTime_when_perSecondIsPositive", () => {
    const result = calculateGoalProgress({ amount: 12000 }, 2000, 100);
    expect(result.remainingAmount).toBe(10000);
    expect(result.remainingSeconds).toBe(100);
    expect(result.progress).toBeCloseTo(16.666, 2);
  });

  it("should_useEmptyValues_when_defaultSettingsAreLoaded", () => {
    expect(DEFAULT_SETTINGS).toMatchObject({
      calculationType: "",
      annualSalary: 0,
      monthlySalary: 0,
      hourlyWage: 0,
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
    expect(DEFAULT_SETTINGS).not.toHaveProperty("taxMode");
    expect(DEFAULT_GOALS).toEqual([]);
  });

  it("should_calculateZeroAmounts_when_defaultSettingsAreEmpty", () => {
    const result = calculateEarnings(new Date(2026, 5, 15, 12), DEFAULT_SETTINGS);
    expect(result.earned).toBe(0);
    expect(result.perSecond).toBe(0);
    expect(result.todayEarned).toBe(0);
    expect(result.cycleEarned).toBe(0);
  });

  it("should_useFirstDayMidnightFallback_when_paydayAndPaydayTimeAreEmpty", () => {
    const cycle = getCurrentCycle(new Date(2026, 5, 15, 12), DEFAULT_SETTINGS);
    expect(cycle.cycleStart).toEqual(new Date(2026, 5, 1, 0));
    expect(cycle.cycleEnd).toEqual(new Date(2026, 6, 1, 0));
  });
});
