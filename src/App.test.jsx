import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import App from "./App";
import { STORAGE_KEY } from "./utils/storage";

function createLocalStorage() {
  const values = new Map();
  return {
    getItem: vi.fn((key) => values.get(key) ?? null),
    setItem: vi.fn((key, value) => values.set(key, String(value))),
    removeItem: vi.fn((key) => values.delete(key)),
    clear: vi.fn(() => values.clear()),
  };
}

const completeSettings = {
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

describe("App", () => {
  beforeEach(() => {
    vi.stubGlobal("localStorage", createLocalStorage());
    vi.spyOn(Date, "now").mockReturnValue(new Date(2026, 6, 21, 12).getTime());
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("should_renderOnboardingAndSettingsDialog_when_settingsAreIncomplete", () => {
    const markup = renderToStaticMarkup(<App />);

    expect(markup).toContain("급여 정보를 설정해 주세요");
    expect(markup).toContain('role="dialog"');
    expect(markup).not.toContain("이번 급여 주기 진행률");
  });

  it("should_renderAccessibleSvgIcons_when_onboardingIsShown", () => {
    const markup = renderToStaticMarkup(<App />);

    expect((markup.match(/<svg/g) || []).length).toBeGreaterThanOrEqual(6);
    expect(markup).toContain('aria-label="금액 숨기기"');
    expect(markup).toContain('aria-pressed="false"');
    expect(markup).not.toMatch(/[🙈👁⚙×−]/);
  });

  it("should_renderDashboard_when_settingsAreComplete", () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(completeSettings));

    const markup = renderToStaticMarkup(<App />);

    expect(markup).toContain("이번 급여 주기 진행률");
    expect(markup).not.toContain("급여 정보를 설정해 주세요");
  });

  it("should_maskPerSecondAmount_when_privacyModeIsEnabled", () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...completeSettings, privacyMode: true }));

    const markup = renderToStaticMarkup(<App />);

    expect(markup).toContain("초당 ₩••••••");
    expect(markup).not.toContain("초당 ₩1.16");
  });

  it("should_describePrivacyToggleState_when_privacyModeIsEnabled", () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...completeSettings, privacyMode: true }));

    const markup = renderToStaticMarkup(<App />);

    expect(markup).toContain('aria-label="금액 표시"');
    expect(markup).toContain('aria-pressed="true"');
    expect(markup).not.toContain("🙈");
  });
});
