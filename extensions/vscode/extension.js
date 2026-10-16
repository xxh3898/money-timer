const path = require("path");
const { pathToFileURL } = require("url");
const vscode = require("vscode");

const SETTINGS_KEY = "moneyTimerSettings";
const GOALS_KEY = "moneyTimerGoals";
const VISIBILITY_KEY = "moneyTimerVisible";
const PRIVATE_AMOUNT = "₩••••••";
const MAX_TOOLTIP_GOALS = 3;
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

function numberOrDefault(value, fallback) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function digits(value) {
  return String(value).replace(/[^0-9]/g, "");
}

function parseAmountInput(value) {
  const sanitized = digits(value);
  return sanitized ? Number(sanitized) : 0;
}

function sanitizeBreaks(breaks) {
  const items = Array.isArray(breaks) ? breaks : core.DEFAULT_SETTINGS.breaks;
  return items.map((item) => {
    const startTime = core.isValidTimeString(item?.startTime) ? item.startTime : "";
    const endTime = core.isValidTimeString(item?.endTime) && core.parseTimeToMinutes(startTime) !== null && core.parseTimeToMinutes(startTime) < core.parseTimeToMinutes(item?.endTime) ? item.endTime : "";
    return {
      startTime,
      endTime,
      enabled: Boolean(item?.enabled),
    };
  });
}

function sanitizeSettings(settings) {
  const defaults = core.DEFAULT_SETTINGS;
  const merged = { ...defaults, ...core.migrateSettings(settings) };
  const workDays = Array.isArray(merged.workDays)
    ? [...new Set(merged.workDays.map(Number).filter((day) => Number.isInteger(day) && day >= 0 && day <= 6))]
    : defaults.workDays;
  const workStartTime = core.isValidTimeString(merged.workStartTime) ? merged.workStartTime : defaults.workStartTime;
  const workEndTime = core.isValidTimeString(merged.workEndTime) ? merged.workEndTime : defaults.workEndTime;
  const workStartMinutes = core.parseTimeToMinutes(workStartTime);
  const workEndMinutes = core.parseTimeToMinutes(workEndTime);
  const numericPayday = Number(merged.payday);

  return {
    settingsVersion: core.SETTINGS_SCHEMA_VERSION,
    calculationType: ["annual", "monthly", "hourly"].includes(merged.calculationType) ? merged.calculationType : defaults.calculationType,
    annualSalary: isValidNumber(merged.annualSalary) ? Number(merged.annualSalary) : defaults.annualSalary,
    monthlySalary: isValidNumber(merged.monthlySalary) ? Number(merged.monthlySalary) : defaults.monthlySalary,
    hourlyWage: isValidNumber(merged.hourlyWage) ? Number(merged.hourlyWage) : defaults.hourlyWage,
    payday: Number.isFinite(numericPayday) ? Math.min(Math.max(Math.trunc(numericPayday), 0), 31) : defaults.payday,
    paydayTime: core.isValidTimeString(merged.paydayTime) ? merged.paydayTime : defaults.paydayTime,
    earningMode: ["always", "worktime"].includes(merged.earningMode) ? merged.earningMode : defaults.earningMode,
    workDays,
    workStartTime,
    workEndTime: workStartMinutes !== null && workEndMinutes !== null && workStartMinutes < workEndMinutes ? workEndTime : defaults.workEndTime,
    breaks: sanitizeBreaks(merged.breaks),
    privacyMode: Boolean(merged.privacyMode),
    theme: ["light", "dark", "system"].includes(merged.theme) ? merged.theme : defaults.theme,
  };
}

function sanitizeGoals(goals) {
  const items = Array.isArray(goals) ? goals : core.DEFAULT_GOALS;
  return items.map((goal, index) => ({
    id: String(goal?.id || `goal-${index}-${Date.now()}`),
    name: String(goal?.name || "목표"),
    amount: Math.max(0, numberOrDefault(goal?.amount, 0)),
    enabled: goal?.enabled !== false,
  }));
}

function getSettings() {
  return sanitizeSettings(extensionContext.globalState.get(SETTINGS_KEY));
}

async function saveSettings(settings) {
  await extensionContext.globalState.update(SETTINGS_KEY, sanitizeSettings(settings));
}

function getGoals() {
  return sanitizeGoals(extensionContext.globalState.get(GOALS_KEY));
}

async function saveGoals(goals) {
  await extensionContext.globalState.update(GOALS_KEY, sanitizeGoals(goals));
}

function compactKRW(amount) {
  const value = Number.isFinite(amount) ? Math.max(0, amount) : 0;
  if (value < 100000) return core.formatKRW(value);
  return `₩${COMPACT_FORMATTER.format(Math.round(value))}`;
}

function displayKRW(amount, privacyMode) {
  return privacyMode ? PRIVATE_AMOUNT : core.formatKRW(amount);
}

function displayCompactKRW(amount, privacyMode) {
  return privacyMode ? PRIVATE_AMOUNT : compactKRW(amount);
}

function displayKRWPerSecond(amount, privacyMode) {
  return privacyMode ? "초당 ₩••••••" : core.formatKRWPerSecond(amount);
}

function formatGoalRemainingTime(result, perSecond) {
  if (result.remainingAmount <= 0) return core.formatRemainingTime(0);
  return perSecond > 0 ? core.formatRemainingTime(result.remainingSeconds * 1000) : "근무시간 외";
}

function buildGoalLines(result, goals, privacyMode, limit = MAX_TOOLTIP_GOALS) {
  const activeGoals = goals.filter((goal) => goal.enabled);
  if (!activeGoals.length) return [];

  const lines = ["", "목표 진행"];
  for (const goal of activeGoals.slice(0, limit)) {
    const progress = core.calculateGoalProgress(goal, result.earned, result.perSecond);
    lines.push(`${goal.name}: ${core.formatProgress(progress.progress)} / 남은 금액 ${displayKRW(progress.remainingAmount, privacyMode)} / 남은 시간 ${formatGoalRemainingTime(progress, result.perSecond)}`);
  }
  if (activeGoals.length > limit) {
    lines.push(`외 ${activeGoals.length - limit}개 목표는 상세 보기에서 확인`);
  }
  return lines;
}

function buildTooltip(result, settings, goals) {
  const privacyMode = settings.privacyMode;
  return [
    `현재까지 번 돈: ${displayKRW(result.earned, privacyMode)}`,
    `초당 버는 돈: ${displayKRWPerSecond(result.perSecond, privacyMode)}`,
    `오늘 번 돈: ${displayKRW(result.todayEarned, privacyMode)}`,
    `다음 급여일까지 남은 시간: ${result.remainingText}`,
    `급여 주기 진행률: ${core.formatProgress(result.progress)}`,
    ...buildGoalLines(result, goals, privacyMode),
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
  const goals = getGoals();
  const result = core.calculateEarnings(Date.now(), settings);
  statusItem.name = "Money Timer";
  statusItem.text = `$(watch) ${displayCompactKRW(result.earned, settings.privacyMode)}`;
  statusItem.tooltip = buildTooltip(result, settings, goals);
  statusItem.command = "moneyTimer.showDetails";
  statusItem.show();
}

function updatePosition() {
  const position = vscode.workspace.getConfiguration("moneyTimer").get("position", "right");
  const alignment = position === "left" ? vscode.StatusBarAlignment.Left : vscode.StatusBarAlignment.Right;
  if (!statusItem || statusItem.alignment !== alignment) {
    if (statusItem) statusItem.dispose();
    statusItem = vscode.window.createStatusBarItem(alignment, 100);
  }
  updateStatusBar();
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

async function promptBoolean(title, current) {
  const picked = await vscode.window.showQuickPick([
    { label: "켜기", value: true },
    { label: "끄기", value: false },
  ], { title, placeHolder: `현재: ${current ? "켜기" : "끄기"}` });
  return picked ? picked.value : current;
}

function formatBreaksInput(breaks) {
  return sanitizeBreaks(breaks)
    .filter((item) => item.enabled && item.startTime && item.endTime)
    .map((item) => `${item.startTime}-${item.endTime}`)
    .join(",");
}

function getBreaksInputError(input) {
  const trimmed = String(input).trim();
  if (!trimmed) return undefined;
  const ranges = trimmed.split(",");
  for (const range of ranges) {
    const [startTime, endTime, extra] = range.split("-").map((item) => item.trim());
    if (extra !== undefined || !core.isValidTimeString(startTime) || !core.isValidTimeString(endTime)) {
      return "HH:mm-HH:mm 형식으로 쉼표 구분해 입력하세요.";
    }
    if (core.parseTimeToMinutes(startTime) >= core.parseTimeToMinutes(endTime)) {
      return "휴식 시작 시간은 종료 시간보다 빨라야 합니다.";
    }
  }
  return undefined;
}

function parseBreaksInput(input) {
  const trimmed = String(input).trim();
  if (!trimmed) return [];
  return trimmed.split(",").map((range) => {
    const [startTime, endTime] = range.split("-").map((item) => item.trim());
    return { startTime, endTime, enabled: true };
  });
}

async function promptBreaks(current) {
  const value = await vscode.window.showInputBox({
    title: "휴식시간 제외",
    value: formatBreaksInput(current),
    prompt: "HH:mm-HH:mm 형식으로 입력하고 여러 개는 쉼표로 구분하세요. 예: 12:00-13:00,18:00-18:30",
    validateInput: getBreaksInputError,
  });
  return value === undefined ? current : parseBreaksInput(value);
}

async function promptGoalName(title, current = "") {
  const value = await vscode.window.showInputBox({
    title,
    value: current,
    validateInput: (input) => input.trim() ? undefined : "목표 이름을 입력하세요.",
  });
  return value === undefined ? undefined : value.trim();
}

async function promptGoalAmount(title, current = 0) {
  const value = await vscode.window.showInputBox({
    title,
    value: current ? String(current) : "",
    prompt: "숫자만 입력해도 되고 쉼표가 포함되어도 됩니다.",
    validateInput: (input) => parseAmountInput(input) > 0 ? undefined : "0보다 큰 금액을 입력하세요.",
  });
  return value === undefined ? undefined : parseAmountInput(value);
}

async function configure() {
  const next = { ...getSettings() };
  next.calculationType = await promptQuickPick("계산 방식", ["annual", "monthly", "hourly"], next.calculationType);
  next.annualSalary = await promptNumber("연 실수령액", next.annualSalary, (v) => Number.isFinite(v) && v >= 0);
  next.monthlySalary = await promptNumber("월 실수령액", next.monthlySalary, (v) => Number.isFinite(v) && v >= 0);
  next.hourlyWage = await promptNumber("실수령 시급", next.hourlyWage, (v) => Number.isFinite(v) && v >= 0);
  next.payday = await promptNumber("급여일", next.payday, (v) => Number.isInteger(v) && v >= 1 && v <= 31);
  next.paydayTime = await promptTime("급여 지급 시간", next.paydayTime);
  next.earningMode = await promptQuickPick("누적 모드", ["always", "worktime"], next.earningMode);
  next.privacyMode = await promptBoolean("프라이버시 모드", next.privacyMode);
  next.breaks = await promptBreaks(next.breaks);
  const workDays = await vscode.window.showInputBox({
    title: "근무 요일",
    value: next.workDays.join(","),
    prompt: "0(일)~6(토)을 쉼표로 입력하세요. 예: 1,2,3,4,5",
    validateInput: (input) => input.trim() === "" || input.split(",").every((day) => Number.isInteger(Number(day.trim())) && Number(day.trim()) >= 0 && Number(day.trim()) <= 6) ? undefined : "0~6 사이 숫자를 쉼표로 입력하세요.",
  });
  if (workDays !== undefined) next.workDays = workDays.trim() === "" ? [] : workDays.split(",").map((day) => Number(day.trim()));
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

async function addGoal() {
  const name = await promptGoalName("목표 이름");
  if (name === undefined) return;
  const amount = await promptGoalAmount("목표 금액");
  if (amount === undefined) return;

  await saveGoals([...getGoals(), { id: `goal-${Date.now()}`, name, amount, enabled: true }]);
  updateStatusBar();
  vscode.window.showInformationMessage("Money Timer 목표를 추가했습니다.");
}

async function editGoal(goal) {
  const settings = getSettings();
  const result = core.calculateEarnings(Date.now(), settings);
  const progress = core.calculateGoalProgress(goal, result.earned, result.perSecond);
  const picked = await vscode.window.showQuickPick([
    { label: "이름 수정", action: "rename" },
    { label: "금액 수정", action: "amount" },
    { label: goal.enabled ? "숨기기" : "표시하기", action: "toggle" },
    { label: "삭제", action: "delete" },
  ], {
    title: `목표: ${goal.name}`,
    placeHolder: `달성률 ${core.formatProgress(progress.progress)} / 남은 시간 ${formatGoalRemainingTime(progress, result.perSecond)}`,
  });
  if (!picked) return;

  if (picked.action === "rename") {
    const name = await promptGoalName("목표 이름 수정", goal.name);
    if (name === undefined) return;
    await saveGoals(getGoals().map((item) => item.id === goal.id ? { ...item, name } : item));
  }

  if (picked.action === "amount") {
    const amount = await promptGoalAmount("목표 금액 수정", goal.amount);
    if (amount === undefined) return;
    await saveGoals(getGoals().map((item) => item.id === goal.id ? { ...item, amount } : item));
  }

  if (picked.action === "toggle") {
    await saveGoals(getGoals().map((item) => item.id === goal.id ? { ...item, enabled: !item.enabled } : item));
  }

  if (picked.action === "delete") {
    const confirmed = await vscode.window.showWarningMessage(`"${goal.name}" 목표를 삭제할까요?`, { modal: true }, "삭제");
    if (confirmed !== "삭제") return;
    await saveGoals(getGoals().filter((item) => item.id !== goal.id));
  }

  updateStatusBar();
}

async function manageGoals() {
  const goals = getGoals();
  const picked = await vscode.window.showQuickPick([
    { label: "목표 추가", action: "add" },
    ...goals.map((goal) => ({
      label: goal.name,
      description: goal.enabled ? "표시 중" : "숨김",
      detail: core.formatKRW(goal.amount),
      action: "edit",
      goal,
    })),
  ], {
    title: "Money Timer Goals",
    placeHolder: goals.length ? "목표를 선택하거나 새 목표를 추가하세요." : "등록된 목표가 없습니다.",
  });

  if (!picked) return;
  if (picked.action === "add") {
    await addGoal();
    return;
  }
  await editGoal(picked.goal);
}

async function calculateLaborTime() {
  const amount = await promptGoalAmount("소비 금액");
  if (amount === undefined) return;

  const settings = getSettings();
  const result = core.calculateEarnings(Date.now(), settings);
  const currentText = result.perSecond > 0 ? core.formatRemainingTime((amount / result.perSecond) * 1000) : "근무시간 외";
  const averageText = result.averagePerSecond > 0 ? core.formatRemainingTime((amount / result.averagePerSecond) * 1000) : "계산 불가";

  await vscode.window.showQuickPick([
    `${displayKRW(amount, settings.privacyMode)} =`,
    `${currentText} / 현재 초당 수익 기준`,
    `${averageText} / 평균 초당 수익 기준`,
  ], { title: "Money Timer Labor Time" });
}

async function showDetails() {
  const settings = getSettings();
  const result = core.calculateEarnings(Date.now(), settings);
  const goals = getGoals();
  const goalItems = goals.map((goal) => {
    const progress = core.calculateGoalProgress(goal, result.earned, result.perSecond);
    return {
      label: `목표: ${goal.name}`,
      description: goal.enabled ? "표시 중" : "숨김",
      detail: `달성률 ${core.formatProgress(progress.progress)} / 남은 금액 ${displayKRW(progress.remainingAmount, settings.privacyMode)} / 남은 시간 ${formatGoalRemainingTime(progress, result.perSecond)}`,
    };
  });

  const picked = await vscode.window.showQuickPick([
    { label: `현재까지 번 돈: ${displayKRW(result.earned, settings.privacyMode)}` },
    { label: `초당 버는 돈: ${displayKRWPerSecond(result.perSecond, settings.privacyMode)}` },
    { label: `오늘 번 돈: ${displayKRW(result.todayEarned, settings.privacyMode)}` },
    { label: `이번 급여 주기에서 번 돈: ${displayKRW(result.cycleEarned, settings.privacyMode)}` },
    { label: `다음 급여일까지 남은 시간: ${result.remainingText}` },
    { label: `급여 주기 진행률: ${core.formatProgress(result.progress)}` },
    { label: `근무 요일: ${settings.workDays.map((day) => DAY_NAMES[day]).join(", ") || "없음"}` },
    ...goalItems,
    { label: "목표 관리", action: "manageGoals" },
    { label: "소비 노동시간 계산", action: "calculateLaborTime" },
  ], { title: "Money Timer Details" });

  if (picked?.action === "manageGoals") await manageGoals();
  if (picked?.action === "calculateLaborTime") await calculateLaborTime();
}

async function resetSettings() {
  await saveSettings(core.DEFAULT_SETTINGS);
  updateStatusBar();
  vscode.window.showInformationMessage("Money Timer 설정을 기본값으로 초기화했습니다.");
}

async function activate(context) {
  extensionContext = context;
  await loadCore(context);
  const storedSettings = context.globalState.get(SETTINGS_KEY);
  if (storedSettings !== undefined) {
    const migratedSettings = sanitizeSettings(storedSettings);
    if (JSON.stringify(storedSettings) !== JSON.stringify(migratedSettings)) {
      await context.globalState.update(SETTINGS_KEY, migratedSettings);
    }
  }
  updatePosition();
  context.subscriptions.push({ dispose: () => { if (statusItem) statusItem.dispose(); statusItem = undefined; } });
  context.subscriptions.push(vscode.workspace.onDidChangeConfiguration((event) => {
    if (event.affectsConfiguration("moneyTimer.position")) updatePosition();
  }));
  context.subscriptions.push(vscode.commands.registerCommand("moneyTimer.configure", configure));
  context.subscriptions.push(vscode.commands.registerCommand("moneyTimer.toggleVisibility", toggleVisibility));
  context.subscriptions.push(vscode.commands.registerCommand("moneyTimer.showDetails", showDetails));
  context.subscriptions.push(vscode.commands.registerCommand("moneyTimer.manageGoals", manageGoals));
  context.subscriptions.push(vscode.commands.registerCommand("moneyTimer.calculateLaborTime", calculateLaborTime));
  context.subscriptions.push(vscode.commands.registerCommand("moneyTimer.resetSettings", resetSettings));
  updateStatusBar();
  timer = setInterval(updateStatusBar, 1000);
  context.subscriptions.push({ dispose: () => clearInterval(timer) });
}

function deactivate() {
  if (timer) clearInterval(timer);
  if (statusItem) statusItem.dispose();
  statusItem = undefined;
}

module.exports = { activate, deactivate };
