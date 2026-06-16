import { calculateGoalProgress, formatKRW, formatProgress, formatRemainingTime } from "../utils/money";

const privateAmount = "₩••••••";

export default function GoalCards({ goals, earned, perSecond, privacyMode }) {
  const enabledGoals = goals.filter((goal) => goal.enabled);
  return (
    <section className="feature-card" aria-label="목표 금액">
      <div className="section-head"><span>Goals</span><h2>목표 금액</h2></div>
      <div className="goal-grid">
        {enabledGoals.map((goal) => {
          const result = calculateGoalProgress(goal, earned, perSecond);
          return (
            <article className="goal-card" key={goal.id}>
              <div><span>{goal.name}</span><strong>{privacyMode ? privateAmount : formatKRW(goal.amount)}</strong></div>
              <p>달성률 {formatProgress(result.progress)}</p>
              <p>남은 금액 {privacyMode ? privateAmount : formatKRW(result.remainingAmount)}</p>
              <p>남은 시간 {perSecond > 0 ? formatRemainingTime(result.remainingSeconds * 1000) : "근무시간 외"}</p>
            </article>
          );
        })}
      </div>
    </section>
  );
}
