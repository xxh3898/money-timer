import { useEffect, useId, useState } from "react";
import { Plus, Save, Trash2, X } from "lucide-react";
import { isValidTimeString, parseTimeToMinutes } from "../utils/date";

const days = [
  [1, "월"], [2, "화"], [3, "수"], [4, "목"], [5, "금"], [6, "토"], [0, "일"],
];
const onlyDigits = (value) => String(value).replace(/[^0-9]/g, "");
const formatInputNumber = (value) => onlyDigits(value).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
const parseInputNumber = (value) => Number(onlyDigits(value));

export default function SettingsModal({ settings, onClose, onSave }) {
  const [form, setForm] = useState(settings);
  const [error, setError] = useState("");
  const titleId = useId();
  const update = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));
  const updateMoney = (key, value) => update(key, parseInputNumber(value));
  const toggleDay = (day) => setForm((prev) => ({
    ...prev,
    workDays: (Array.isArray(prev.workDays) ? prev.workDays : []).includes(day)
      ? prev.workDays.filter((item) => item !== day)
      : [...(Array.isArray(prev.workDays) ? prev.workDays : []), day],
  }));
  const updateBreak = (index, key, value) => setForm((prev) => ({
    ...prev,
    breaks: (Array.isArray(prev.breaks) ? prev.breaks : []).map((item, itemIndex) => itemIndex === index ? { ...item, [key]: value } : item),
  }));
  const addBreak = () => setForm((prev) => ({ ...prev, breaks: [...(Array.isArray(prev.breaks) ? prev.breaks : []), { startTime: "", endTime: "", enabled: false }] }));
  const removeBreak = (index) => setForm((prev) => ({ ...prev, breaks: (Array.isArray(prev.breaks) ? prev.breaks : []).filter((_, itemIndex) => itemIndex !== index) }));

  useEffect(() => {
    const closeOnEscape = (event) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [onClose]);

  const validate = () => {
    const amountKey = { annual: "annualSalary", monthly: "monthlySalary", hourly: "hourlyWage" }[form.calculationType];
    if (!["annual", "monthly", "hourly"].includes(form.calculationType)) return "계산 기준을 선택해 주세요.";
    if (!amountKey || Number(form[amountKey]) <= 0) return "선택된 계산 기준의 금액은 0보다 커야 합니다.";
    if (!["gross", "net"].includes(form.taxMode)) return "세전/세후 선택값이 올바르지 않습니다.";
    if (Number(form.payday) < 1 || Number(form.payday) > 31) return "급여일은 1~31 사이로 입력해 주세요.";
    if (!isValidTimeString(form.paydayTime)) return "급여 지급 기준 시간은 HH:mm 형식이어야 합니다.";
    if (!["always", "worktime"].includes(form.earningMode)) return "돈 증가 방식을 선택해 주세요.";
    if (!["light", "dark", "system"].includes(form.theme)) return "테마 선택값이 올바르지 않습니다.";
    for (const item of form.breaks || []) {
      if (item.enabled && (!isValidTimeString(item.startTime) || !isValidTimeString(item.endTime) || parseTimeToMinutes(item.startTime) >= parseTimeToMinutes(item.endTime))) {
        return "휴식 시작 시간은 종료 시간보다 빨라야 합니다.";
      }
    }
    if (form.earningMode === "worktime") {
      if (!Array.isArray(form.workDays) || !form.workDays.length) return "근무 요일을 하나 이상 선택해 주세요.";
      if (!isValidTimeString(form.workStartTime) || !isValidTimeString(form.workEndTime)) return "근무 시간은 HH:mm 형식이어야 합니다.";
      if (parseTimeToMinutes(form.workStartTime) >= parseTimeToMinutes(form.workEndTime)) return "근무 시작 시간은 종료 시간보다 빨라야 합니다.";
    }
    return "";
  };

  const submit = (event) => {
    event.preventDefault();
    const message = validate();
    if (message) return setError(message);
    onSave(form);
    onClose();
  };

  return (
    <div className="modal-backdrop" onMouseDown={onClose}>
      <form className="modal" role="dialog" aria-modal="true" aria-labelledby={titleId} onSubmit={submit} onMouseDown={(event) => event.stopPropagation()}>
        <div className="modal-header">
          <h2 id={titleId}>설정</h2>
          <button type="button" className="ghost-button" onClick={onClose} aria-label="닫기"><X aria-hidden="true" size={20} /></button>
        </div>
        {error && <div className="error-box" role="alert">{error}</div>}

        <fieldset><legend>계산 기준 선택</legend><div className="segmented">
          {[ ["annual", "연봉"], ["monthly", "월급"], ["hourly", "시급"] ].map(([value, label]) => (
            <label key={value}><input type="radio" name="calculationType" checked={form.calculationType === value} onChange={() => update("calculationType", value)} />{label}</label>
          ))}
        </div></fieldset>

        <div className="form-grid">
          <label>연봉<input inputMode="numeric" value={formatInputNumber(form.annualSalary)} onChange={(e) => updateMoney("annualSalary", e.target.value)} /></label>
          <label>월급<input inputMode="numeric" value={formatInputNumber(form.monthlySalary)} onChange={(e) => updateMoney("monthlySalary", e.target.value)} /></label>
          <label>시급<input inputMode="numeric" value={formatInputNumber(form.hourlyWage)} onChange={(e) => updateMoney("hourlyWage", e.target.value)} /></label>
        </div>

        <fieldset><legend>세전 / 세후</legend><div className="segmented">
          <label><input type="radio" name="taxMode" checked={form.taxMode === "net"} onChange={() => update("taxMode", "net")} />세후</label>
          <label><input type="radio" name="taxMode" checked={form.taxMode === "gross"} onChange={() => update("taxMode", "gross")} />세전</label>
        </div><p className="hint">세전 기준은 입력 금액의 90%를 세후 금액으로 간주합니다.</p></fieldset>

        <div className="form-grid two">
          <label>매월 급여일<input type="number" min="1" max="31" value={form.payday} onChange={(e) => update("payday", e.target.value)} /></label>
          <label>지급 기준 시간<input type="time" value={form.paydayTime} onChange={(e) => update("paydayTime", e.target.value)} /></label>
        </div>

        <fieldset><legend>돈 증가 방식</legend><div className="segmented vertical">
          <label><input type="radio" name="earningMode" checked={form.earningMode === "always"} onChange={() => update("earningMode", "always")} />24시간 기준</label>
          <label><input type="radio" name="earningMode" checked={form.earningMode === "worktime"} onChange={() => update("earningMode", "worktime")} />근무시간 기준</label>
        </div></fieldset>

        <fieldset><legend>화면 설정</legend><div className="segmented vertical">
          {[ ["light", "라이트"], ["dark", "다크"], ["system", "시스템"] ].map(([value, label]) => (
            <label key={value}><input type="radio" name="theme" checked={form.theme === value} onChange={() => update("theme", value)} />{label}</label>
          ))}
        </div></fieldset>

        <fieldset><legend>휴식시간 제외</legend>
          {(form.breaks || []).map((item, index) => (
            <div className="break-row" key={index}>
              <label className="toggle-label"><input type="checkbox" checked={item.enabled} onChange={(e) => updateBreak(index, "enabled", e.target.checked)} />제외</label>
              <label>시작<input type="time" value={item.startTime} onChange={(e) => updateBreak(index, "startTime", e.target.value)} /></label>
              <label>종료<input type="time" value={item.endTime} onChange={(e) => updateBreak(index, "endTime", e.target.value)} /></label>
              <button type="button" className="ghost-button" onClick={() => removeBreak(index)} aria-label="휴식시간 삭제"><Trash2 aria-hidden="true" size={18} /></button>
            </div>
          ))}
          <button type="button" className="text-button" onClick={addBreak}><Plus aria-hidden="true" size={18} />휴식시간 추가</button>
        </fieldset>

        <fieldset className={form.earningMode === "worktime" ? "" : "muted-section"}><legend>근무시간 설정</legend>
          <div className="day-row">{days.map(([value, label]) => <label key={value}><input type="checkbox" checked={(Array.isArray(form.workDays) ? form.workDays : []).includes(value)} onChange={() => toggleDay(value)} />{label}</label>)}</div>
          <div className="form-grid two">
            <label>근무 시작<input type="time" value={form.workStartTime} onChange={(e) => update("workStartTime", e.target.value)} /></label>
            <label>근무 종료<input type="time" value={form.workEndTime} onChange={(e) => update("workEndTime", e.target.value)} /></label>
          </div>
        </fieldset>
        <button className="save-button" type="submit"><Save aria-hidden="true" size={20} />저장하기</button>
      </form>
    </div>
  );
}
