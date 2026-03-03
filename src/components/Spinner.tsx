import { cn } from "@/lib/utils";

interface SpinnerProps {
  className?: string;
  size?: number;
}

export default function Spinner({ className, size = 16 }: SpinnerProps) {
  const bars = Array.from({ length: 10 }, (_, i) => i);

  return (
    <svg
      className={cn("text-text-1 animate-spinner-circle", className)}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
    >
      {bars.map((i) => (
        <rect
          key={i}
          x="10.5"
          y="1"
          width="3"
          height="7"
          rx="1.5"
          fill="currentColor"
          opacity={0.15 + (i / 9) * 0.85}
          transform={`rotate(${i * 36} 12 12)`}
        />
      ))}
    </svg>
  );
}
