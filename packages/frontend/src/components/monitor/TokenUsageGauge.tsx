interface TokenUsageGaugeProps {
  used: number;
  total?: number;
  label: string;
  color?: string;
}

function formatNumber(num: number): string {
  if (num >= 1000000) {
    return `${(num / 1000000).toFixed(1)}M`;
  }
  if (num >= 1000) {
    return `${(num / 1000).toFixed(1)}K`;
  }
  return num.toString();
}

export function TokenUsageGauge({
  used,
  total,
  label,
  color = 'hsl(var(--primary))',
}: TokenUsageGaugeProps) {
  // If no total is provided, just show the count
  const percentage = total ? Math.min((used / total) * 100, 100) : 0;
  const radius = 40;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = total ? circumference * (1 - percentage / 100) : circumference;

  return (
    <div className="relative flex flex-col items-center">
      <svg className="w-24 h-24 -rotate-90">
        {/* Background circle */}
        <circle
          cx="48"
          cy="48"
          r={radius}
          className="stroke-muted fill-none"
          strokeWidth="6"
        />
        {/* Progress circle */}
        {total && (
          <circle
            cx="48"
            cy="48"
            r={radius}
            className="fill-none"
            stroke={color}
            strokeWidth="6"
            strokeDasharray={circumference}
            strokeDashoffset={dashOffset}
            strokeLinecap="round"
            style={{ transition: 'stroke-dashoffset 0.5s ease' }}
          />
        )}
      </svg>

      {/* Center text */}
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-lg font-bold">{formatNumber(used)}</span>
        {total && (
          <span className="text-xs text-muted-foreground">
            / {formatNumber(total)}
          </span>
        )}
      </div>

      {/* Label */}
      <span className="text-xs text-muted-foreground mt-1">{label}</span>
    </div>
  );
}
