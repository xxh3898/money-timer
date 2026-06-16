import { useEffect, useMemo, useState } from "react";
import Header from "./components/Header";
import MoneyDisplay from "./components/MoneyDisplay";
import StatCard from "./components/StatCard";
import ProgressBar from "./components/ProgressBar";
import SettingsModal from "./components/SettingsModal";
import { calculateEarnings, formatKRW, formatKRWPerSecond } from "./utils/money";
import { loadSettings, saveSettings } from "./utils/storage";

export default function App() {
  const [settings, setSettings] = useState(loadSettings);
  const [now, setNow] = useState(() => Date.now());
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

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

  return (
    <div className="app-shell">
      <Header onOpenSettings={() => setIsSettingsOpen(true)} />
      <main>
        <MoneyDisplay amount={earnings.earned} />
        <section className="stats-grid" aria-label="머니 타이머 현황">
          <StatCard label="초당 버는 돈" value={formatKRWPerSecond(earnings.perSecond)} tone="blue" />
          <StatCard label="오늘 번 돈" value={formatKRW(earnings.todayEarned)} />
          <StatCard label="이번 급여 주기에서 번 돈" value={formatKRW(earnings.cycleEarned)} />
          <StatCard label="다음 급여일까지 남은 시간" value={earnings.remainingText} />
        </section>
        <ProgressBar value={earnings.progress} />
      </main>
      {isSettingsOpen && <SettingsModal settings={settings} onClose={() => setIsSettingsOpen(false)} onSave={handleSave} />}
    </div>
  );
}
