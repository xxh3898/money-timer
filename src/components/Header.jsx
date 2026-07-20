import { Eye, EyeOff, Settings } from "lucide-react";

export default function Header({ onOpenSettings, privacyMode, onTogglePrivacy }) {
  return (
    <header className="header">
      <div>
        <p className="eyebrow">Real-time salary dashboard</p>
        <h1>머니 타이머</h1>
      </div>
      <div className="header-actions">
        <button className="icon-button" type="button" onClick={onTogglePrivacy} aria-label={privacyMode ? "금액 표시" : "금액 숨기기"} aria-pressed={privacyMode}>
          {privacyMode ? <EyeOff aria-hidden="true" size={22} /> : <Eye aria-hidden="true" size={22} />}
        </button>
        <button className="icon-button" type="button" onClick={onOpenSettings} aria-label="설정 열기">
          <Settings aria-hidden="true" size={22} />
        </button>
      </div>
    </header>
  );
}
