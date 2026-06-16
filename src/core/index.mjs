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

const wonFormatter = new Intl.NumberFormat("ko-KR", { style: "currency", currency: "KRW", maximumFractionDigits: 0 });
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
  const [hours, minutes] = isValidTimeString(paydayTime) ? paydayTime.split(":").map(Number) : [9, 0];
  const safePayday = clamp(Number(payday) || DEFAULT_SETTINGS.payday, 1, 31);
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

export function formatKRWPerSecond(amount) {
  return `초당 ₩${safe(amount).toLocaleString("ko-KR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function getNetAmount(amount, taxMode) {
  const numericAmount = Number(amount) || 0;
  if (taxMode === "gross") return numericAmount * 0.9;
  return numericAmount;
}

export function getSelectedBaseAmount(settings) {
  if (settings.calculationType === "monthly") return getNetAmount(settings.monthlySalary, settings.taxMode);
  if (settings.calculationType === "hourly") return getNetAmount(settings.hourlyWage, settings.taxMode);
  return getNetAmount(settings.annualSalary, settings.taxMode);
}

export function getCyclePay(settings) {
  if (settings.calculationType === "annual") return getNetAmount(settings.annualSalary, settings.taxMode) / 12;
  if (settings.calculationType === "monthly") return getNetAmount(settings.monthlySalary, settings.taxMode);
  return 0;
}

export function isInWorkTime(date, settings) {
  if (settings.earningMode !== "worktime") return true;
  const target = new Date(date);
  if (!settings.workDays.includes(target.getDay())) return false;
  const start = parseTimeToMinutes(settings.workStartTime);
  const end = parseTimeToMinutes(settings.workEndTime);
  const current = target.getHours() * 60 + target.getMinutes() + target.getSeconds() / 60;
  return start !== null && end !== null && start < end && current >= start && current < end;
}

export function getEligibleSeconds(start, end, settings) {
  const from = new Date(start);
  const to = new Date(end);
  if (to <= from) return 0;
  if (settings.earningMode !== "worktime") return secondsBetween(from, to);

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
      total += secondsBetween(segmentStart, segmentEnd);
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
  const hourlyNetWage = getNetAmount(settings.hourlyWage, settings.taxMode);
  const cyclePay = getCyclePay(settings);
  const activeNow = settings.earningMode === "always" || isInWorkTime(current, settings);

  let earned = 0;
  let perSecond = 0;
  let todayEarned = 0;

  if (settings.calculationType === "hourly") {
    earned = hourlyNetWage * elapsedEligibleSeconds / 3600;
    perSecond = activeNow ? hourlyNetWage / 3600 : 0;
    todayEarned = hourlyNetWage * todayEligibleSeconds / 3600;
  } else if (totalEligibleSeconds > 0) {
    earned = cyclePay * elapsedEligibleSeconds / totalEligibleSeconds;
    perSecond = activeNow ? cyclePay / totalEligibleSeconds : 0;
    todayEarned = cyclePay * todayEligibleSeconds / totalEligibleSeconds;
  }

  return {
    earned: safe(earned),
    perSecond: safe(perSecond),
    todayEarned: safe(todayEarned),
    cycleEarned: safe(earned),
    remainingText: formatRemainingTime(cycleEnd.getTime() - current.getTime()),
    progress: totalCalendarSeconds > 0 ? clamp((elapsedCalendarSeconds / totalCalendarSeconds) * 100, 0, 100) : 0,
    cycleStart,
    cycleEnd,
  };
}
