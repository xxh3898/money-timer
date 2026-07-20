import { useEffect, useState } from "react";
import { Plus, Save, Trash2 } from "lucide-react";
import { calculateGoalProgress, formatKRW, formatProgress, formatRemainingTime } from "../utils/money";

const privateAmount = "₩••••••";
const emptyDraft = { name: "", amount: "" };
const digits = (value) => String(value).replace(/[^0-9]/g, "");

export const formatGoalAmountInput = (value) => {
  const sanitized = digits(value);
  return sanitized ? Number(sanitized).toLocaleString("ko-KR") : "";
};

export const parseGoalAmount = (value) => Number(digits(value));

export function validateGoalDraft(draft) {
  if (!draft.name.trim()) return "목표 이름을 입력해 주세요.";
  if (parseGoalAmount(draft.amount) <= 0) return "목표 금액은 0보다 커야 합니다.";
  return "";
}

function createDrafts(goals) {
  return Object.fromEntries(goals.map((goal) => [goal.id, { name: goal.name, amount: String(goal.amount || "") }]));
}

export default function GoalCards({ goals, earned, perSecond, privacyMode, onGoalsChange }) {
  const safeGoals = Array.isArray(goals) ? goals : [];
  const [newGoal, setNewGoal] = useState(emptyDraft);
  const [drafts, setDrafts] = useState(() => createDrafts(safeGoals));
  const [error, setError] = useState("");

  useEffect(() => {
    setDrafts(createDrafts(safeGoals));
  }, [goals]);

  const updateGoals = (nextGoals) => onGoalsChange?.(nextGoals);
  const updateNewGoal = (key, value) => {
    setError("");
    setNewGoal((prev) => ({ ...prev, [key]: value }));
  };
  const updateDraft = (id, key, value) => {
    setError("");
    setDrafts((prev) => ({ ...prev, [id]: { ...prev[id], [key]: value } }));
  };
  const addGoal = (event) => {
    event.preventDefault();
    const message = validateGoalDraft(newGoal);
    if (message) return setError(message);
    updateGoals([...safeGoals, { id: `goal-${Date.now()}`, name: newGoal.name.trim(), amount: parseGoalAmount(newGoal.amount), enabled: true }]);
    setNewGoal(emptyDraft);
    setError("");
  };
  const saveDraft = (id) => {
    const draft = drafts[id] || emptyDraft;
    const message = validateGoalDraft(draft);
    if (message) return setError(message);
    updateGoals(safeGoals.map((goal) => goal.id === id ? { ...goal, name: draft.name.trim(), amount: parseGoalAmount(draft.amount) } : goal));
    setError("");
  };
  const toggleGoal = (id) => updateGoals(safeGoals.map((goal) => goal.id === id ? { ...goal, enabled: !goal.enabled } : goal));
  const deleteGoal = (id) => updateGoals(safeGoals.filter((goal) => goal.id !== id));

  return (
    <section className="feature-card" aria-label="목표 금액">
      <div className="section-head"><span>Goals</span><h2>목표 금액</h2></div>
      <form className="goal-form" onSubmit={addGoal}>
        <label>목표 이름<input value={newGoal.name} onChange={(e) => updateNewGoal("name", e.target.value)} placeholder="예: 점심" /></label>
        <label>목표 금액<input type={privacyMode ? "password" : "text"} inputMode="numeric" value={formatGoalAmountInput(newGoal.amount)} onChange={(e) => updateNewGoal("amount", digits(e.target.value))} placeholder="예: 12000" /></label>
        <button type="submit" className="save-button inline-save"><Plus aria-hidden="true" size={18} />추가</button>
      </form>
      {error && <div className="error-box goal-error">{error}</div>}
      {!safeGoals.length && <p className="empty-goals">등록된 목표가 없습니다.</p>}
      <div className="goal-grid">
        {safeGoals.map((goal) => {
          const result = calculateGoalProgress(goal, earned, perSecond);
          const draft = drafts[goal.id] || { name: goal.name, amount: String(goal.amount || "") };
          return (
            <article className={goal.enabled ? "goal-card" : "goal-card goal-card-disabled"} key={goal.id}>
              <div className="goal-edit-grid">
                <label>이름<input value={draft.name} onChange={(e) => updateDraft(goal.id, "name", e.target.value)} /></label>
                <label>금액<input type={privacyMode ? "password" : "text"} inputMode="numeric" value={formatGoalAmountInput(draft.amount)} onChange={(e) => updateDraft(goal.id, "amount", digits(e.target.value))} /></label>
              </div>
              <div className="goal-card-actions">
                <label className="toggle-label"><input type="checkbox" checked={goal.enabled} onChange={() => toggleGoal(goal.id)} />표시</label>
                <button type="button" className="text-button" onClick={() => saveDraft(goal.id)}><Save aria-hidden="true" size={18} />저장</button>
                <button type="button" className="text-button danger-button" onClick={() => deleteGoal(goal.id)} aria-label={`${goal.name} 삭제`}><Trash2 aria-hidden="true" size={18} />삭제</button>
              </div>
              <div><span>{goal.enabled ? "진행 중" : "숨김"}</span><strong>{privacyMode ? privateAmount : formatKRW(goal.amount)}</strong></div>
              {goal.enabled ? (
                <>
                  <p>달성률 {formatProgress(result.progress)}</p>
                  <p>남은 금액 {privacyMode ? privateAmount : formatKRW(result.remainingAmount)}</p>
                  <p>남은 시간 {perSecond > 0 ? formatRemainingTime(result.remainingSeconds * 1000) : "근무시간 외"}</p>
                </>
              ) : <p>숨김 상태입니다.</p>}
            </article>
          );
        })}
      </div>
    </section>
  );
}
