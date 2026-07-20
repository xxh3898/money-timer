export const SETTINGS_SCHEMA_VERSION = 1;

export const DEFAULT_SETTINGS = {
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
};

const wonFormatter = new Intl.NumberFormat("ko-KR", { style: "currency", currency: "KRW", maximumFractionDigits: 0 });
export const DEFAULT_GOALS = [];
const AMOUNT_SETTING_KEYS = ["annualSalary", "monthlySalary", "hourlyWage"];

const safe = (value) => (Number.isFinite(value) ? Math.max(0, value) : 0);
const secondsBetween = (start, end) => safe((new Date(end).getTime() - new Date(start).getTime()) / 1000);

export function clamp(value, min, max) {
  return Math.min(Math.max(Number(value) || 0, min), max);
}

export function isValidTimeString(timeString) {
  if (typeof timeString !== "string") return false;
  const match = /^(\d{2}):(\d{2})$/.exec(timeString);
  if (!match) return false;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  return hours >= 0 && hours <= 23 && minutes >= 0 && minutes <= 59;
}

export function parseTimeToMinutes(timeString) {
  if (!isValidTimeString(timeString)) return null;
  const [hours, minutes] = timeString.split(":").map(Number);
  return hours * 60 + minutes;
}

export function getLastDayOfMonth(year, month) {
  return new Date(year, month + 1, 0).getDate();
}

export function getPayDateForMonth(year, month, payday, paydayTime) {
  const [hours, minutes] = isValidTimeString(paydayTime) ? paydayTime.split(":").map(Number) : [0, 0];
  const numericPayday = Number(payday);
  const safePayday = Number.isFinite(numericPayday) && numericPayday >= 1 ? clamp(Math.trunc(numericPayday), 1, 31) : 1;
  const day = Math.min(safePayday, getLastDayOfMonth(year, month));
  return new Date(year, month, day, hours, minutes, 0, 0);
}

export function getCurrentCycle(now, settings = DEFAULT_SETTINGS) {
  const current = new Date(now);
  const thisPayday = getPayDateForMonth(current.getFullYear(), current.getMonth(), settings.payday, settings.paydayTime);

  if (current.getTime() < thisPayday.getTime()) {
    return {
      cycleStart: getPayDateForMonth(current.getFullYear(), current.getMonth() - 1, settings.payday, settings.paydayTime),
      cycleEnd: thisPayday,
    };
  }

  return {
    cycleStart: thisPayday,
    cycleEnd: getPayDateForMonth(current.getFullYear(), current.getMonth() + 1, settings.payday, settings.paydayTime),
  };
}

export function formatRemainingTime(ms) {
  const totalSeconds = Math.max(0, Math.floor((Number(ms) || 0) / 1000));
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return `${days}일 ${String(hours).padStart(2, "0")}시간 ${String(minutes).padStart(2, "0")}분 ${String(seconds).padStart(2, "0")}초`;
}

export function formatKRW(amount) {
  return wonFormatter.format(Math.round(safe(amount)));
}

export function formatProgress(value) {
  return `${safe(value).toLocaleString("ko-KR", { minimumFractionDigits: 2, maximumFractionDigits: 4 })}%`;
}

export function formatKRWPerSecond(amount) {
  return `초당 ₩${safe(amount).toLocaleString("ko-KR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function migrateSettings(settings) {
  const source = settings && typeof settings === "object" ? settings : {};
  const migrated = { ...source, settingsVersion: SETTINGS_SCHEMA_VERSION };
  const sourceVersion = Number(source.settingsVersion);

  if (!Number.isFinite(sourceVersion) || sourceVersion < SETTINGS_SCHEMA_VERSION) {
    const multiplier = source.taxMode === "gross" ? 0.9 : 1;
    for (const key of AMOUNT_SETTING_KEYS) {
      if (Object.hasOwn(source, key)) migrated[key] = (Number(source[key]) || 0) * multiplier;
    }
  }

  delete migrated.taxMode;
  return migrated;
}

export function getSelectedBaseAmount(settings) {
  if (settings.calculationType === "monthly") return safe(Number(settings.monthlySalary));
  if (settings.calculationType === "hourly") return safe(Number(settings.hourlyWage));
  return safe(Number(settings.annualSalary));
}

export function getCyclePay(settings) {
  if (settings.calculationType === "annual") return safe(Number(settings.annualSalary)) / 12;
  if (settings.calculationType === "monthly") return safe(Number(settings.monthlySalary));
  return 0;
}

export function isInWorkTime(date, settings) {
  if (settings.earningMode !== "worktime") return true;
  const target = new Date(date);
  if (!settings.workDays.includes(target.getDay())) return false;
  const start = parseTimeToMinutes(settings.workStartTime);
  const end = parseTimeToMinutes(settings.workEndTime);
  const current = target.getHours() * 60 + target.getMinutes() + target.getSeconds() / 60;
  if (!(start !== null && end !== null && start < end && current >= start && current < end)) return false;
  return !getEnabledBreaks(settings).some((item) => {
    const breakStart = parseTimeToMinutes(item.startTime);
    const breakEnd = parseTimeToMinutes(item.endTime);
    return breakStart !== null && breakEnd !== null && current >= breakStart && current < breakEnd;
  });
}

export function getEnabledBreaks(settings) {
  if (!Array.isArray(settings?.breaks)) return [];

  const normalized = settings.breaks
    .filter((item) => item?.enabled)
    .map((item) => ({
      startTime: item.startTime,
      endTime: item.endTime,
      startMinutes: parseTimeToMinutes(item.startTime),
      endMinutes: parseTimeToMinutes(item.endTime),
    }))
    .filter((item) => item.startMinutes !== null && item.endMinutes !== null && item.startMinutes < item.endMinutes)
    .sort((left, right) => left.startMinutes - right.startMinutes || left.endMinutes - right.endMinutes);

  const merged = [];
  for (const item of normalized) {
    const previous = merged.at(-1);
    if (!previous || item.startMinutes > previous.endMinutes) {
      merged.push({ ...item });
    } else if (item.endMinutes > previous.endMinutes) {
      previous.endMinutes = item.endMinutes;
      previous.endTime = item.endTime;
    }
  }

  return merged.map(({ startTime, endTime }) => ({ startTime, endTime, enabled: true }));
}

function getBreakSecondsForDay(segmentStart, segmentEnd, day, settings) {
  return getEnabledBreaks(settings).reduce((sum, item) => {
    const start = parseTimeToMinutes(item.startTime);
    const end = parseTimeToMinutes(item.endTime);
    const breakStart = new Date(day);
    breakStart.setMinutes(start, 0, 0);
    const breakEnd = new Date(day);
    breakEnd.setMinutes(end, 0, 0);
    const overlapStart = new Date(Math.max(segmentStart.getTime(), breakStart.getTime()));
    const overlapEnd = new Date(Math.min(segmentEnd.getTime(), breakEnd.getTime()));
    return sum + secondsBetween(overlapStart, overlapEnd);
  }, 0);
}

export function getEligibleSeconds(start, end, settings) {
  const from = new Date(start);
  const to = new Date(end);
  if (to <= from) return 0;
  if (settings.earningMode !== "worktime") {
    let total = secondsBetween(from, to);
    const cursor = new Date(from.getFullYear(), from.getMonth(), from.getDate());
    const finalDay = new Date(to.getFullYear(), to.getMonth(), to.getDate());
    while (cursor <= finalDay) {
      total -= getBreakSecondsForDay(from, to, cursor, settings);
      cursor.setDate(cursor.getDate() + 1);
    }
    return safe(total);
  }

  const workStart = parseTimeToMinutes(settings.workStartTime);
  const workEnd = parseTimeToMinutes(settings.workEndTime);
  if (workStart === null || workEnd === null || workStart >= workEnd || !settings.workDays?.length) return 0;

  let total = 0;
  const cursor = new Date(from.getFullYear(), from.getMonth(), from.getDate());
  const finalDay = new Date(to.getFullYear(), to.getMonth(), to.getDate());

  while (cursor <= finalDay) {
    if (settings.workDays.includes(cursor.getDay())) {
      const dayStart = new Date(cursor);
      dayStart.setMinutes(workStart, 0, 0);
      const dayEnd = new Date(cursor);
      dayEnd.setMinutes(workEnd, 0, 0);
      const segmentStart = new Date(Math.max(from.getTime(), dayStart.getTime()));
      const segmentEnd = new Date(Math.min(to.getTime(), dayEnd.getTime()));
      total += Math.max(0, secondsBetween(segmentStart, segmentEnd) - getBreakSecondsForDay(segmentStart, segmentEnd, cursor, settings));
    }
    cursor.setDate(cursor.getDate() + 1);
  }

  return safe(total);
}

export function calculateEarnings(now, settings = DEFAULT_SETTINGS) {
  const current = new Date(now);
  const { cycleStart, cycleEnd } = getCurrentCycle(current, settings);
  const todayStart = new Date(current.getFullYear(), current.getMonth(), current.getDate());
  const todayFrom = new Date(Math.max(todayStart.getTime(), cycleStart.getTime()));
  const totalEligibleSeconds = getEligibleSeconds(cycleStart, cycleEnd, settings);
  const elapsedEligibleSeconds = getEligibleSeconds(cycleStart, current, settings);
  const todayEligibleSeconds = getEligibleSeconds(todayFrom, current, settings);
  const totalCalendarSeconds = secondsBetween(cycleStart, cycleEnd);
  const elapsedCalendarSeconds = secondsBetween(cycleStart, current);
  const hourlyWage = safe(Number(settings.hourlyWage));
  const cyclePay = getCyclePay(settings);
  const activeNow = settings.earningMode === "always" || isInWorkTime(current, settings);

  let earned = 0;
  let perSecond = 0;
  let todayEarned = 0;

  if (settings.calculationType === "hourly") {
    earned = hourlyWage * elapsedEligibleSeconds / 3600;
    perSecond = activeNow ? hourlyWage / 3600 : 0;
    todayEarned = hourlyWage * todayEligibleSeconds / 3600;
  } else if (totalEligibleSeconds > 0) {
    earned = cyclePay * elapsedEligibleSeconds / totalEligibleSeconds;
    perSecond = activeNow ? cyclePay / totalEligibleSeconds : 0;
    todayEarned = cyclePay * todayEligibleSeconds / totalEligibleSeconds;
  }

  return {
    earned: safe(earned),
    perSecond: safe(perSecond),
    averagePerSecond: safe(settings.calculationType === "hourly" ? hourlyWage / 3600 : (totalEligibleSeconds > 0 ? cyclePay / totalEligibleSeconds : 0)),
    totalEligibleSeconds: safe(totalEligibleSeconds),
    todayEarned: safe(todayEarned),
    cycleEarned: safe(earned),
    remainingText: formatRemainingTime(cycleEnd.getTime() - current.getTime()),
    progress: totalCalendarSeconds > 0 ? clamp((elapsedCalendarSeconds / totalCalendarSeconds) * 100, 0, 100) : 0,
    cycleStart,
    cycleEnd,
  };
}

export function calculateGoalProgress(goal, earned, perSecond) {
  const amount = safe(Number(goal?.amount));
  const currentEarned = safe(Number(earned));
  const currentPerSecond = safe(Number(perSecond));
  const remainingAmount = safe(amount - currentEarned);
  return {
    progress: amount > 0 ? clamp((currentEarned / amount) * 100, 0, 100) : 0,
    remainingAmount,
    remainingSeconds: currentPerSecond > 0 ? safe(remainingAmount / currentPerSecond) : 0,
  };
}
