import { useState } from "react";
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
  const update = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));
  const updateMoney = (key, value) => update(key, parseInputNumber(value));
  const toggleDay = (day) => setForm((prev) => ({
    ...prev,
    workDays: prev.workDays.includes(day) ? prev.workDays.filter((item) => item !== day) : [...prev.workDays, day],
  }));

  const validate = () => {
    const amountKey = { annual: "annualSalary", monthly: "monthlySalary", hourly: "hourlyWage" }[form.calculationType];
    if (!["annual", "monthly", "hourly"].includes(form.calculationType)) return "계산 기준을 선택해 주세요.";
    if (!amountKey || Number(form[amountKey]) <= 0) return "선택된 계산 기준의 금액은 0보다 커야 합니다.";
    if (!["gross", "net"].includes(form.taxMode)) return "세전/세후 선택값이 올바르지 않습니다.";
    if (Number(form.payday) < 1 || Number(form.payday) > 31) return "급여일은 1~31 사이로 입력해 주세요.";
    if (!isValidTimeString(form.paydayTime)) return "급여 지급 기준 시간은 HH:mm 형식이어야 합니다.";
    if (!["always", "worktime"].includes(form.earningMode)) return "돈 증가 방식을 선택해 주세요.";
    if (form.earningMode === "worktime") {
      if (!form.workDays.length) return "근무 요일을 하나 이상 선택해 주세요.";
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
      <form className="modal" onSubmit={submit} onMouseDown={(event) => event.stopPropagation()}>
        <div className="modal-header">
          <h2>설정</h2>
          <button type="button" className="ghost-button" onClick={onClose} aria-label="닫기"><span aria-hidden="true">×</span></button>
        </div>
        {error && <div className="error-box">{error}</div>}

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
          <label>지급 기준 시간<input value={form.paydayTime} placeholder="09:00" onChange={(e) => update("paydayTime", e.target.value)} /></label>
        </div>

        <fieldset><legend>돈 증가 방식</legend><div className="segmented vertical">
          <label><input type="radio" name="earningMode" checked={form.earningMode === "always"} onChange={() => update("earningMode", "always")} />24시간 기준</label>
          <label><input type="radio" name="earningMode" checked={form.earningMode === "worktime"} onChange={() => update("earningMode", "worktime")} />근무시간 기준</label>
        </div></fieldset>

        <fieldset className={form.earningMode === "worktime" ? "" : "muted-section"}><legend>근무시간 설정</legend>
          <div className="day-row">{days.map(([value, label]) => <label key={value}><input type="checkbox" checked={form.workDays.includes(value)} onChange={() => toggleDay(value)} />{label}</label>)}</div>
          <div className="form-grid two">
            <label>근무 시작<input value={form.workStartTime} onChange={(e) => update("workStartTime", e.target.value)} /></label>
            <label>근무 종료<input value={form.workEndTime} onChange={(e) => update("workEndTime", e.target.value)} /></label>
          </div>
        </fieldset>
        <button className="save-button" type="submit">저장하기</button>
      </form>
    </div>
  );
}
