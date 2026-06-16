export default function Header({ onOpenSettings }) {
  return (
    <header className="header">
      <div>
        <p className="eyebrow">Real-time salary dashboard</p>
        <h1>머니 타이머</h1>
      </div>
      <button className="icon-button" type="button" onClick={onOpenSettings} aria-label="설정 열기">
        <span aria-hidden="true">⚙</span>
      </button>
    </header>
  );
}
