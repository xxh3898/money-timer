import { isValidTimeString, parseTimeToMinutes } from "./date";

export const STORAGE_KEY = "moneyTimerSettings";
export const DEFAULT_SETTINGS = {
  calculationType: "annual",
  annualSalary: 30000000,
  monthlySalary: 2500000,
  hourlyWage: 10000,
  taxMode: "net",
  payday: 25,
  paydayTime: "09:00",
  earningMode: "always",
  workDays: [1, 2, 3, 4, 5],
  workStartTime: "09:00",
  workEndTime: "18:00",
};

const numberOrDefault = (value, fallback) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

export function mergeWithDefaultSettings(settings) {
  return { ...DEFAULT_SETTINGS, ...(settings && typeof settings === "object" ? settings : {}) };
}

export function sanitizeSettings(settings) {
  const merged = mergeWithDefaultSettings(settings);
  const calculationType = ["annual", "monthly", "hourly"].includes(merged.calculationType) ? merged.calculationType : DEFAULT_SETTINGS.calculationType;
  const taxMode = ["net", "gross"].includes(merged.taxMode) ? merged.taxMode : DEFAULT_SETTINGS.taxMode;
  const earningMode = ["always", "worktime"].includes(merged.earningMode) ? merged.earningMode : DEFAULT_SETTINGS.earningMode;
  const workDays = Array.isArray(merged.workDays)
    ? [...new Set(merged.workDays.map(Number).filter((day) => Number.isInteger(day) && day >= 0 && day <= 6))]
    : DEFAULT_SETTINGS.workDays;
  const workStartTime = isValidTimeString(merged.workStartTime) ? merged.workStartTime : DEFAULT_SETTINGS.workStartTime;
  const workEndTime = isValidTimeString(merged.workEndTime) ? merged.workEndTime : DEFAULT_SETTINGS.workEndTime;

  return {
    calculationType,
    annualSalary: Math.max(0, numberOrDefault(merged.annualSalary, DEFAULT_SETTINGS.annualSalary)),
    monthlySalary: Math.max(0, numberOrDefault(merged.monthlySalary, DEFAULT_SETTINGS.monthlySalary)),
    hourlyWage: Math.max(0, numberOrDefault(merged.hourlyWage, DEFAULT_SETTINGS.hourlyWage)),
    taxMode,
    payday: Math.min(Math.max(Math.trunc(numberOrDefault(merged.payday, DEFAULT_SETTINGS.payday)), 1), 31),
    paydayTime: isValidTimeString(merged.paydayTime) ? merged.paydayTime : DEFAULT_SETTINGS.paydayTime,
    earningMode,
    workDays: workDays.length ? workDays : DEFAULT_SETTINGS.workDays,
    workStartTime,
    workEndTime: parseTimeToMinutes(workStartTime) < parseTimeToMinutes(workEndTime) ? workEndTime : DEFAULT_SETTINGS.workEndTime,
  };
}

export function loadSettings() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_SETTINGS;
    return sanitizeSettings(JSON.parse(raw));
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function saveSettings(settings) {
  const sanitized = sanitizeSettings(settings);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(sanitized));
  return sanitized;
}
