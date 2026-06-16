import { formatKRW } from "../utils/money";

export default function MoneyDisplay({ amount, privacyMode }) {
  return (
    <section className="money-card">
      <span>현재까지 번 돈</span>
      <strong>{privacyMode ? "₩••••••" : formatKRW(amount)}</strong>
      <p>현재 설정된 급여 주기와 증가 방식 기준으로 실시간 계산됩니다.</p>
    </section>
  );
}
