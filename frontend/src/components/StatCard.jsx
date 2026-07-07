export default function StatCard({ label, value, hint, hintColor = "text-neutral-400" }) {
  return (
    <div className="border border-neutral-200 rounded-xl p-5">
      <p className="text-xs font-medium tracking-wide text-neutral-400 uppercase">{label}</p>
      <p className="text-2xl font-semibold text-neutral-900 mt-2 font-num">{value}</p>
      {hint && <p className={`text-xs mt-1 ${hintColor}`}>{hint}</p>}
    </div>
  );
}
