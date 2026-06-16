import { describe, expect, it } from "vitest";
import { calculateEarnings, calculateGoalProgress, DEFAULT_SETTINGS, getCurrentCycle, getEligibleSeconds, getNetAmount } from "./index.mjs";

const settings = { ...DEFAULT_SETTINGS, earningMode: "worktime", workDays: [1,2,3,4,5], workStartTime: "09:00", workEndTime: "18:00" };

describe("money timer core", () => {
  it("세전 30000000원은 27000000원으로 계산", () => {
    expect(getNetAmount(30000000, "gross")).toBe(27000000);
  });

  it("급여일 25일 09:00 기준 현재가 6월 15일이면 5월 25일~6월 25일 주기", () => {
    const cycle = getCurrentCycle(new Date(2026, 5, 15, 12), { ...DEFAULT_SETTINGS, payday: 25, paydayTime: "09:00" });
    expect(cycle.cycleStart).toEqual(new Date(2026, 4, 25, 9));
    expect(cycle.cycleEnd).toEqual(new Date(2026, 5, 25, 9));
  });

  it("급여일 25일 09:00 기준 현재가 6월 26일이면 6월 25일~7월 25일 주기", () => {
    const cycle = getCurrentCycle(new Date(2026, 5, 26, 12), { ...DEFAULT_SETTINGS, payday: 25, paydayTime: "09:00" });
    expect(cycle.cycleStart).toEqual(new Date(2026, 5, 25, 9));
    expect(cycle.cycleEnd).toEqual(new Date(2026, 6, 25, 9));
  });

  it("근무시간 외에는 perSecond가 0", () => {
    const result = calculateEarnings(new Date(2026, 5, 15, 20), settings);
    expect(result.perSecond).toBe(0);
  });

  it("휴식시간 enabled=true이면 해당 시간이 eligibleSeconds에서 제외됨", () => {
    const base = { ...settings, breaks: [{ startTime: "12:00", endTime: "13:00", enabled: false }] };
    const withBreak = { ...settings, breaks: [{ startTime: "12:00", endTime: "13:00", enabled: true }] };
    const start = new Date(2026, 5, 15, 9);
    const end = new Date(2026, 5, 15, 18);
    expect(getEligibleSeconds(start, end, base)).toBe(9 * 3600);
    expect(getEligibleSeconds(start, end, withBreak)).toBe(8 * 3600);
  });

  it("목표 금액 남은 시간 계산", () => {
    const result = calculateGoalProgress({ amount: 12000 }, 2000, 100);
    expect(result.remainingAmount).toBe(10000);
    expect(result.remainingSeconds).toBe(100);
    expect(result.progress).toBeCloseTo(16.666, 2);
  });
});
