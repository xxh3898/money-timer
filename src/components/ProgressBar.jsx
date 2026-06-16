import { formatProgress } from "../utils/money";

export default function ProgressBar({ value }) {
  const percent = Math.max(0, Math.min(100, Number(value) || 0));
  return (
    <section className="progress-card">
      <div className="progress-head">
        <span>이번 급여 주기 진행률</span>
        <strong>{formatProgress(percent)}</strong>
      </div>
      <div className="progress-track" aria-label="급여 주기 진행률" aria-valuemin="0" aria-valuemax="100" aria-valuenow={percent} role="progressbar">
        <div className="progress-fill" style={{ width: `${percent}%` }} />
      </div>
    </section>
  );
}
