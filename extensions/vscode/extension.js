const path = require("path");
const { pathToFileURL } = require("url");
const vscode = require("vscode");

const SETTINGS_KEY = "moneyTimerSettings";
const VISIBILITY_KEY = "moneyTimerVisible";
const COMPACT_FORMATTER = new Intl.NumberFormat("ko-KR", { notation: "compact", maximumFractionDigits: 1 });
const DAY_NAMES = ["일", "월", "화", "수", "목", "금", "토"];

let core;
let statusItem;
let timer;
let extensionContext;

async function loadCore(context) {
  if (!core) {
    const corePath = path.join(context.extensionPath, "core", "index.mjs");
    core = await import(pathToFileURL(corePath).href);
  }
  return core;
}

function isValidNumber(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0;
}

function sanitizeSettings(settings) {
  const defaults = core.DEFAULT_SETTINGS;
  const merged = { ...defaults, ...(settings && typeof settings === "object" ? settings : {}) };
  const workDays = Array.isArray(merged.workDays)
    ? [...new Set(merged.workDays.map(Number).filter((day) => Number.isInteger(day) && day >= 0 && day <= 6))]
    : defaults.workDays;
  const workStartTime = core.isValidTimeString(merged.workStartTime) ? merged.workStartTime : defaults.workStartTime;
  const workEndTime = core.isValidTimeString(merged.workEndTime) ? merged.workEndTime : defaults.workEndTime;

  return {
    calculationType: ["annual", "monthly", "hourly"].includes(merged.calculationType) ? merged.calculationType : defaults.calculationType,
    annualSalary: isValidNumber(merged.annualSalary) ? Number(merged.annualSalary) : defaults.annualSalary,
    monthlySalary: isValidNumber(merged.monthlySalary) ? Number(merged.monthlySalary) : defaults.monthlySalary,
    hourlyWage: isValidNumber(merged.hourlyWage) ? Number(merged.hourlyWage) : defaults.hourlyWage,
    taxMode: ["net", "gross"].includes(merged.taxMode) ? merged.taxMode : defaults.taxMode,
    payday: Math.min(Math.max(Math.trunc(Number(merged.payday) || defaults.payday), 1), 31),
    paydayTime: core.isValidTimeString(merged.paydayTime) ? merged.paydayTime : defaults.paydayTime,
    earningMode: ["always", "worktime"].includes(merged.earningMode) ? merged.earningMode : defaults.earningMode,
    workDays: workDays.length ? workDays : defaults.workDays,
    workStartTime,
    workEndTime: core.parseTimeToMinutes(workStartTime) < core.parseTimeToMinutes(workEndTime) ? workEndTime : defaults.workEndTime,
  };
}

function getSettings() {
  return sanitizeSettings(extensionContext.globalState.get(SETTINGS_KEY));
}

async function saveSettings(settings) {
  await extensionContext.globalState.update(SETTINGS_KEY, sanitizeSettings(settings));
}

function compactKRW(amount) {
  const value = Number.isFinite(amount) ? Math.max(0, amount) : 0;
  if (value < 100000) return core.formatKRW(value);
  return `₩${COMPACT_FORMATTER.format(Math.round(value))}`;
}

function buildTooltip(result) {
  return [
    `현재까지 번 돈: ${core.formatKRW(result.earned)}`,
    `초당 버는 돈: ${core.formatKRWPerSecond(result.perSecond)}`,
    `오늘 번 돈: ${core.formatKRW(result.todayEarned)}`,
    `다음 급여일까지 남은 시간: ${result.remainingText}`,
    `급여 주기 진행률: ${core.formatProgress(result.progress)}`,
  ].join("\n");
}

function updateStatusBar() {
  if (!statusItem) return;
  const visible = extensionContext.globalState.get(VISIBILITY_KEY, true);
  if (!visible) {
    statusItem.hide();
    return;
  }

  const settings = getSettings();
  const result = core.calculateEarnings(Date.now(), settings);
  statusItem.name = "Money Timer";
  statusItem.text = `$(watch) ${compactKRW(result.earned)}`;
  statusItem.tooltip = buildTooltip(result);
  statusItem.command = "moneyTimer.showDetails";
  statusItem.show();
}

async function promptQuickPick(title, items, current) {
  const picked = await vscode.window.showQuickPick(items, { title, placeHolder: `현재: ${current}` });
  return picked || current;
}

async function promptNumber(title, current, validate) {
  const value = await vscode.window.showInputBox({
    title,
    value: String(current),
    validateInput: (input) => validate(Number(input)) ? undefined : "유효한 숫자를 입력하세요.",
  });
  return value === undefined ? current : Number(value);
}

async function promptTime(title, current) {
  const value = await vscode.window.showInputBox({
    title,
    value: current,
    prompt: "HH:mm 형식으로 입력하세요.",
    validateInput: (input) => core.isValidTimeString(input) ? undefined : "HH:mm 형식의 유효한 시간을 입력하세요.",
  });
  return value === undefined ? current : value;
}

async function configure() {
  const next = { ...getSettings() };
  next.calculationType = await promptQuickPick("계산 방식", ["annual", "monthly", "hourly"], next.calculationType);
  next.annualSalary = await promptNumber("연봉", next.annualSalary, (v) => Number.isFinite(v) && v >= 0);
  next.monthlySalary = await promptNumber("월급", next.monthlySalary, (v) => Number.isFinite(v) && v >= 0);
  next.hourlyWage = await promptNumber("시급", next.hourlyWage, (v) => Number.isFinite(v) && v >= 0);
  next.taxMode = await promptQuickPick("세금 모드", ["net", "gross"], next.taxMode);
  next.payday = await promptNumber("급여일", next.payday, (v) => Number.isInteger(v) && v >= 1 && v <= 31);
  next.paydayTime = await promptTime("급여 지급 시간", next.paydayTime);
  next.earningMode = await promptQuickPick("누적 모드", ["always", "worktime"], next.earningMode);
  const workDays = await vscode.window.showInputBox({
    title: "근무 요일",
    value: next.workDays.join(","),
    prompt: "0(일)~6(토)을 쉼표로 입력하세요. 예: 1,2,3,4,5",
    validateInput: (input) => input.split(",").every((day) => Number.isInteger(Number(day.trim())) && Number(day.trim()) >= 0 && Number(day.trim()) <= 6) ? undefined : "0~6 사이 숫자를 쉼표로 입력하세요.",
  });
  if (workDays !== undefined) next.workDays = workDays.split(",").map((day) => Number(day.trim()));
  next.workStartTime = await promptTime("근무 시작 시간", next.workStartTime);
  next.workEndTime = await promptTime("근무 종료 시간", next.workEndTime);
  await saveSettings(next);
  updateStatusBar();
  vscode.window.showInformationMessage("Money Timer 설정을 저장했습니다.");
}

async function toggleVisibility() {
  const next = !extensionContext.globalState.get(VISIBILITY_KEY, true);
  await extensionContext.globalState.update(VISIBILITY_KEY, next);
  updateStatusBar();
}

function showDetails() {
  const settings = getSettings();
  const result = core.calculateEarnings(Date.now(), settings);
  vscode.window.showQuickPick([
    `현재까지 번 돈: ${core.formatKRW(result.earned)}`,
    `초당 버는 돈: ${core.formatKRWPerSecond(result.perSecond)}`,
    `오늘 번 돈: ${core.formatKRW(result.todayEarned)}`,
    `다음 급여일까지 남은 시간: ${result.remainingText}`,
    `급여 주기 진행률: ${core.formatProgress(result.progress)}`,
    `근무 요일: ${settings.workDays.map((day) => DAY_NAMES[day]).join(", ")}`,
  ], { title: "Money Timer Details" });
}

async function resetSettings() {
  await saveSettings(core.DEFAULT_SETTINGS);
  updateStatusBar();
  vscode.window.showInformationMessage("Money Timer 설정을 기본값으로 초기화했습니다.");
}

async function activate(context) {
  extensionContext = context;
  await loadCore(context);
  statusItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
  context.subscriptions.push(statusItem);
  context.subscriptions.push(vscode.commands.registerCommand("moneyTimer.configure", configure));
  context.subscriptions.push(vscode.commands.registerCommand("moneyTimer.toggleVisibility", toggleVisibility));
  context.subscriptions.push(vscode.commands.registerCommand("moneyTimer.showDetails", showDetails));
  context.subscriptions.push(vscode.commands.registerCommand("moneyTimer.resetSettings", resetSettings));
  updateStatusBar();
  timer = setInterval(updateStatusBar, 1000);
  context.subscriptions.push({ dispose: () => clearInterval(timer) });
}

function deactivate() {
  if (timer) clearInterval(timer);
}

module.exports = { activate, deactivate };
