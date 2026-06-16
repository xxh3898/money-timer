export default function Header({ onOpenSettings, privacyMode, onTogglePrivacy }) {
  return (
    <header className="header">
      <div>
        <p className="eyebrow">Real-time salary dashboard</p>
        <h1>머니 타이머</h1>
      </div>
      <div className="header-actions">
        <button className="icon-button" type="button" onClick={onTogglePrivacy} aria-label="개인정보 보호 모드 전환">
          <span aria-hidden="true">{privacyMode ? "🙈" : "👁"}</span>
        </button>
        <button className="icon-button" type="button" onClick={onOpenSettings} aria-label="설정 열기">
          <span aria-hidden="true">⚙</span>
        </button>
      </div>
    </header>
  );
}
