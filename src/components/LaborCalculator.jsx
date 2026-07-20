import { useMemo, useState } from "react";
import { formatKRW, formatRemainingTime } from "../utils/money";

const digits = (value) => String(value).replace(/[^0-9]/g, "");

export const formatLaborAmountInput = (value) => {
  const sanitized = digits(value);
  return sanitized ? Number(sanitized).toLocaleString("ko-KR") : "";
};

export default function LaborCalculator({ currentPerSecond, averagePerSecond, privacyMode }) {
  const [amount, setAmount] = useState("");
  const numericAmount = Number(digits(amount));
  const currentText = useMemo(() => currentPerSecond > 0 ? formatRemainingTime((numericAmount / currentPerSecond) * 1000) : "근무시간 외", [numericAmount, currentPerSecond]);
  const averageText = useMemo(() => averagePerSecond > 0 ? formatRemainingTime((numericAmount / averagePerSecond) * 1000) : "계산 불가", [numericAmount, averagePerSecond]);
  return (
    <section className="feature-card labor-card" aria-label="소비 노동시간 계산기">
      <div className="section-head"><span>Calculator</span><h2>소비 노동시간 계산기</h2></div>
      <label>소비 금액<input type={privacyMode ? "password" : "text"} inputMode="numeric" value={formatLaborAmountInput(amount)} onChange={(e) => setAmount(digits(e.target.value))} /></label>
      <div className="labor-result">
        <p>{privacyMode ? "₩••••••" : formatKRW(numericAmount)} =</p>
        <strong>{currentText}</strong><span>현재 초당 수익 기준</span>
        <strong>{averageText}</strong><span>평균 초당 수익 기준</span>
      </div>
    </section>
  );
}
