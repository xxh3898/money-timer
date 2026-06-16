import { useEffect, useMemo, useState } from "react";
import Header from "./components/Header";
import MoneyDisplay from "./components/MoneyDisplay";
import StatCard from "./components/StatCard";
import ProgressBar from "./components/ProgressBar";
import SettingsModal from "./components/SettingsModal";
import GoalCards from "./components/GoalCards";
import LaborCalculator from "./components/LaborCalculator";
import { calculateEarnings, formatKRW, formatKRWPerSecond } from "./utils/money";
import { loadGoals, loadSettings, saveGoals, saveSettings } from "./utils/storage";

export default function App() {
  const [settings, setSettings] = useState(loadSettings);
  const [now, setNow] = useState(() => Date.now());
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [goals] = useState(() => saveGoals(loadGoals()));

  useEffect(() => {
    let frame;
    let last = 0;
    const tick = (time) => {
      if (time - last >= 250) {
        setNow(Date.now());
        last = time;
      }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, []);

  const earnings = useMemo(() => calculateEarnings(now, settings), [now, settings]);
  const handleSave = (nextSettings) => setSettings(saveSettings(nextSettings));
  const displayAmount = (amount) => settings.privacyMode ? "₩••••••" : formatKRW(amount);
  const togglePrivacy = () => setSettings((prev) => saveSettings({ ...prev, privacyMode: !prev.privacyMode }));

  useEffect(() => {
    const prefersDark = window.matchMedia?.("(prefers-color-scheme: dark)").matches;
    const theme = settings.theme === "system" ? (prefersDark ? "dark" : "light") : settings.theme;
    document.documentElement.dataset.theme = theme;
  }, [settings.theme]);

  return (
    <div className="app-shell">
      <Header onOpenSettings={() => setIsSettingsOpen(true)} privacyMode={settings.privacyMode} onTogglePrivacy={togglePrivacy} />
      <main>
        <MoneyDisplay amount={earnings.earned} privacyMode={settings.privacyMode} />
        <section className="stats-grid" aria-label="머니 타이머 현황">
          <StatCard label="초당 버는 돈" value={formatKRWPerSecond(earnings.perSecond)} tone="blue" />
          <StatCard label="오늘 번 돈" value={displayAmount(earnings.todayEarned)} />
          <StatCard label="이번 급여 주기에서 번 돈" value={displayAmount(earnings.cycleEarned)} />
          <StatCard label="다음 급여일까지 남은 시간" value={earnings.remainingText} />
        </section>
        <ProgressBar value={earnings.progress} />
        <GoalCards goals={goals} earned={earnings.earned} perSecond={earnings.perSecond} privacyMode={settings.privacyMode} />
        <LaborCalculator currentPerSecond={earnings.perSecond} averagePerSecond={earnings.averagePerSecond} privacyMode={settings.privacyMode} />
      </main>
      {isSettingsOpen && <SettingsModal settings={settings} onClose={() => setIsSettingsOpen(false)} onSave={handleSave} />}
    </div>
  );
}
