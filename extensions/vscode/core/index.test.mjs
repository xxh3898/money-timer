import { describe, expect, it } from "vitest";
import { calculateEarnings, calculateGoalProgress, DEFAULT_GOALS, DEFAULT_SETTINGS, getEligibleSeconds } from "./index.mjs";

const worktimeSettings = {
  ...DEFAULT_SETTINGS,
  earningMode: "worktime",
  workDays: [1, 2, 3, 4, 5],
  workStartTime: "09:00",
  workEndTime: "18:00",
};

describe("vscode extension money timer core", () => {
  it("should_excludeBreakSeconds_when_breakIsEnabled", () => {
    const settings = { ...worktimeSettings, breaks: [{ startTime: "12:00", endTime: "13:00", enabled: true }] };
    const start = new Date(2026, 5, 15, 9);
    const end = new Date(2026, 5, 15, 18);

    expect(getEligibleSeconds(start, end, settings)).toBe(8 * 3600);
  });

  it("should_returnAveragePerSecond_when_hourlyWageIsConfigured", () => {
    const settings = { ...worktimeSettings, calculationType: "hourly", hourlyWage: 3600, taxMode: "net", payday: 1, paydayTime: "00:00" };
    const result = calculateEarnings(new Date(2026, 5, 15, 10), settings);

    expect(result.averagePerSecond).toBe(1);
    expect(result.totalEligibleSeconds).toBeGreaterThan(0);
  });

  it("should_calculateRemainingGoalTime_when_goalHasRemainingAmount", () => {
    const result = calculateGoalProgress({ amount: 12000 }, 2000, 100);

    expect(result.remainingAmount).toBe(10000);
    expect(result.remainingSeconds).toBe(100);
    expect(result.progress).toBeCloseTo(16.666, 2);
  });

  it("should_useEmptyGoals_when_defaultGoalsAreLoaded", () => {
    expect(DEFAULT_GOALS).toEqual([]);
  });
});
