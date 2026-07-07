import { resolveMediaUrl } from "../utils/media";

const SIZES = {
  xs: "w-5 h-5 text-[10px]",
  sm: "w-6 h-6 text-xs",
  md: "w-8 h-8 text-xs",
  lg: "w-10 h-10 text-sm",
};

export default function Avatar({ url, initials, size = "sm" }) {
  const sizeClass = SIZES[size] || SIZES.sm;

  if (url) {
    return (
      <img
        src={resolveMediaUrl(url)}
        alt={initials || "avatar"}
        className={`${sizeClass} rounded-full object-cover border border-neutral-200 shrink-0`}
      />
    );
  }

  return (
    <div
      className={`${sizeClass} rounded-full bg-brand-light text-brand flex items-center justify-center font-medium shrink-0`}
    >
      {initials}
    </div>
  );
}
