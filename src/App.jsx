import { useEffect, useMemo, useState } from "react";
import { Settings } from "lucide-react";
import Header from "./components/Header";
import MoneyDisplay from "./components/MoneyDisplay";
import StatCard from "./components/StatCard";
import ProgressBar from "./components/ProgressBar";
import SettingsModal from "./components/SettingsModal";
import GoalCards from "./components/GoalCards";
import LaborCalculator from "./components/LaborCalculator";
import { calculateEarnings, formatKRW, formatKRWPerSecond } from "./utils/money";
import { hasCompleteSettings, loadGoals, loadSettings, saveGoals, saveSettings } from "./utils/storage";

export default function App() {
  const [settings, setSettings] = useState(loadSettings);
  const [now, setNow] = useState(() => Date.now());
  const [isSettingsOpen, setIsSettingsOpen] = useState(() => !hasCompleteSettings(loadSettings()));
  const [goals, setGoals] = useState(() => saveGoals(loadGoals()));

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
  const isConfigured = hasCompleteSettings(settings);
  const handleSave = (nextSettings) => setSettings(saveSettings(nextSettings));
  const handleGoalsChange = (nextGoals) => setGoals(saveGoals(nextGoals));
  const displayAmount = (amount) => settings.privacyMode ? "₩••••••" : formatKRW(amount);
  const displayPerSecond = (amount) => settings.privacyMode ? "초당 ₩••••••" : formatKRWPerSecond(amount);
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
        {isConfigured ? (
          <>
            <MoneyDisplay amount={earnings.earned} privacyMode={settings.privacyMode} />
            <section className="stats-grid" aria-label="머니 타이머 현황">
              <StatCard label="초당 버는 돈" value={displayPerSecond(earnings.perSecond)} tone="blue" />
              <StatCard label="오늘 번 돈" value={displayAmount(earnings.todayEarned)} />
              <StatCard label="이번 급여 주기에서 번 돈" value={displayAmount(earnings.cycleEarned)} />
              <StatCard label="다음 급여일까지 남은 시간" value={earnings.remainingText} />
            </section>
            <ProgressBar value={earnings.progress} />
            <GoalCards goals={goals} earned={earnings.earned} perSecond={earnings.perSecond} privacyMode={settings.privacyMode} onGoalsChange={handleGoalsChange} />
            <LaborCalculator currentPerSecond={earnings.perSecond} averagePerSecond={earnings.averagePerSecond} privacyMode={settings.privacyMode} />
          </>
        ) : (
          <section className="onboarding-card" aria-labelledby="onboarding-title">
            <span>시작하기</span>
            <h2 id="onboarding-title">급여 정보를 설정해 주세요</h2>
            <p>급여 기준과 지급일을 입력하면 현재까지 번 돈을 계산해 보여 드립니다.</p>
            <button type="button" className="onboarding-button" onClick={() => setIsSettingsOpen(true)}><Settings aria-hidden="true" size={20} />설정 시작하기</button>
          </section>
        )}
      </main>
      {isSettingsOpen && <SettingsModal settings={settings} onClose={() => setIsSettingsOpen(false)} onSave={handleSave} />}
    </div>
  );
}
