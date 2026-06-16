export default function StatCard({ label, value, tone }) {
  return (
    <article className={`stat-card ${tone === "blue" ? "stat-card-blue" : ""}`}>
      <span>{label}</span>
      <strong>{value}</strong>
    </article>
  );
}
