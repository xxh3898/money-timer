export function parseTimeToMinutes(timeString) {
  if (!isValidTimeString(timeString)) return null;
  const [hours, minutes] = timeString.split(":").map(Number);
  return hours * 60 + minutes;
}

export function isValidTimeString(timeString) {
  if (typeof timeString !== "string") return false;
  const match = /^(\d{2}):(\d{2})$/.exec(timeString);
  if (!match) return false;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  return hours >= 0 && hours <= 23 && minutes >= 0 && minutes <= 59;
}

export function getLastDayOfMonth(year, month) {
  return new Date(year, month + 1, 0).getDate();
}

export function getPayDateForMonth(year, month, payday, paydayTime) {
  const [hours, minutes] = isValidTimeString(paydayTime) ? paydayTime.split(":").map(Number) : [9, 0];
  const safePayday = clamp(Number(payday) || 25, 1, 31);
  const day = Math.min(safePayday, getLastDayOfMonth(year, month));
  return new Date(year, month, day, hours, minutes, 0, 0);
}

export function getCurrentCycle(now, settings) {
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

export function clamp(value, min, max) {
  return Math.min(Math.max(Number(value) || 0, min), max);
}
