import { Sparkles } from "lucide-react";

export function FormField({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="space-y-2">
      <span className="text-sm font-medium">{label}</span>
      {children}
    </label>
  );
}

export function SummaryPill({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col justify-between bg-[#0f0f0f] px-5 py-4">
      <p className="text-[9px] uppercase tracking-[0.2em] text-[#444]">{label}</p>
      <p className="mt-3 font-display text-xl text-[#f0ede8]">{value}</p>
    </div>
  );
}

export function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="border border-[#1e1e1e] bg-[#0f0f0f] px-4 py-3">
      <p className="text-[9px] uppercase tracking-[0.2em] text-[#444]">{label}</p>
      <p className="mt-2 font-display text-lg text-[#f0ede8]">{value}</p>
    </div>
  );
}

export function EmptyState({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="border border-dashed border-[#1e1e1e] bg-[#0a0a0a] p-8 text-center">
      <Sparkles className="mx-auto h-4 w-4 text-[#444]" />
      <p className="mt-3 text-sm font-medium text-[#f0ede8]">{title}</p>
      <p className="mt-1.5 text-xs text-[#555]">{description}</p>
    </div>
  );
}

export function Segmented({
  value,
  onChange,
  items,
}: {
  value: string;
  onChange: (value: string) => void;
  items: { value: string; label: string }[];
}) {
  return (
    <div className="inline-flex border border-[#1e1e1e] bg-[#0a0a0a]">
      {items.map((item) => (
        <button
          key={item.value}
          type="button"
          onClick={() => onChange(item.value)}
          className={`cursor-pointer px-4 py-2 text-sm tracking-wide transition-colors duration-150 ${
            value === item.value
              ? "bg-[#111] text-[#c9a96e]"
              : "text-[#666] hover:text-[#f0ede8]"
          }`}
        >
          {item.label}
        </button>
      ))}
    </div>
  );
}
