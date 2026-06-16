import { DEFAULT_GOALS, DEFAULT_SETTINGS, isValidTimeString, parseTimeToMinutes } from "../core";

export const STORAGE_KEY = "moneyTimerSettings";
export const GOALS_STORAGE_KEY = "moneyTimerGoals";

const numberOrDefault = (value, fallback) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};
const sanitizeBreaks = (breaks) => {
  const items = Array.isArray(breaks) && breaks.length ? breaks : DEFAULT_SETTINGS.breaks;
  return items.map((item) => ({
    startTime: isValidTimeString(item?.startTime) ? item.startTime : "12:00",
    endTime: isValidTimeString(item?.endTime) && parseTimeToMinutes(item?.startTime) < parseTimeToMinutes(item?.endTime) ? item.endTime : "13:00",
    enabled: Boolean(item?.enabled),
  }));
};

export function mergeWithDefaultSettings(settings) {
  return { ...DEFAULT_SETTINGS, ...(settings && typeof settings === "object" ? settings : {}) };
}

export function sanitizeSettings(settings) {
  const merged = mergeWithDefaultSettings(settings);
  const calculationType = ["annual", "monthly", "hourly"].includes(merged.calculationType) ? merged.calculationType : DEFAULT_SETTINGS.calculationType;
  const taxMode = ["net", "gross"].includes(merged.taxMode) ? merged.taxMode : DEFAULT_SETTINGS.taxMode;
  const earningMode = ["always", "worktime"].includes(merged.earningMode) ? merged.earningMode : DEFAULT_SETTINGS.earningMode;
  const theme = ["light", "dark", "system"].includes(merged.theme) ? merged.theme : DEFAULT_SETTINGS.theme;
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
    workDays,
    workStartTime,
    workEndTime: parseTimeToMinutes(workStartTime) < parseTimeToMinutes(workEndTime) ? workEndTime : DEFAULT_SETTINGS.workEndTime,
    breaks: sanitizeBreaks(merged.breaks),
    privacyMode: Boolean(merged.privacyMode),
    theme,
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

export function sanitizeGoals(goals) {
  const items = Array.isArray(goals) && goals.length ? goals : DEFAULT_GOALS;
  return items.map((goal, index) => ({
    id: String(goal?.id || `goal-${index}-${Date.now()}`),
    name: String(goal?.name || "목표"),
    amount: Math.max(0, numberOrDefault(goal?.amount, 0)),
    enabled: goal?.enabled !== false,
  }));
}

export function loadGoals() {
  try {
    const raw = localStorage.getItem(GOALS_STORAGE_KEY);
    if (!raw) return DEFAULT_GOALS;
    return sanitizeGoals(JSON.parse(raw));
  } catch {
    return DEFAULT_GOALS;
  }
}

export function saveGoals(goals) {
  const sanitized = sanitizeGoals(goals);
  localStorage.setItem(GOALS_STORAGE_KEY, JSON.stringify(sanitized));
  return sanitized;
}
