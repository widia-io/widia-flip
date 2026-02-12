import { cn } from "@/lib/utils";

type LogoVariant = "light" | "dark" | "mono-light" | "mono-dark" | "auto";
type LogoSize = "icon" | "full";

interface LogoProps {
  variant?: LogoVariant;
  size?: LogoSize;
  className?: string;
  iconSize?: number;
}

const LOGO_PATHS = {
  m: "M4 32V8L14 20L24 8L28 4",
  arrowHead: "M23 4H28V9",
  fStem: "M20 32V12H34",
  fBar: "M20 22H30",
} as const;

function getStrokeWidths(iconSize: number) {
  if (iconSize <= 12) {
    return { main: 6, secondary: 5 };
  }

  if (iconSize <= 20) {
    return { main: 5, secondary: 4 };
  }

  if (iconSize <= 28) {
    return { main: 4.5, secondary: 3.5 };
  }

  return { main: 4, secondary: 3 };
}

function LogoIcon({ variant = "auto", iconSize = 40, className }: Omit<LogoProps, "size">) {
  const colorMap = {
    light: { m: "#1E293B", f: "#14B8A6" },
    dark: { m: "#FFFFFF", f: "#14B8A6" },
    "mono-light": { m: "#1E293B", f: "#1E293B" },
    "mono-dark": { m: "#FFFFFF", f: "#FFFFFF" },
    auto: { m: "currentColor", f: "#14B8A6" },
  };

  const colors = colorMap[variant];
  const strokes = getStrokeWidths(iconSize);

  return (
    <svg
      width={iconSize}
      height={iconSize}
      viewBox="0 0 40 40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <path
        d={LOGO_PATHS.m}
        stroke={colors.m}
        strokeWidth={strokes.main}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      <path
        d={LOGO_PATHS.arrowHead}
        stroke={colors.m}
        strokeWidth={strokes.secondary}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      <path
        d={LOGO_PATHS.fStem}
        stroke={colors.f}
        strokeWidth={strokes.main}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d={LOGO_PATHS.fBar}
        stroke={colors.f}
        strokeWidth={strokes.main}
        strokeLinecap="round"
      />
    </svg>
  );
}

export function Logo({ variant = "auto", size = "icon", iconSize = 40, className }: LogoProps) {
  if (size === "icon") {
    return <LogoIcon variant={variant} iconSize={iconSize} className={className} />;
  }

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <LogoIcon variant={variant} iconSize={iconSize} />
      <span className="text-lg font-bold tracking-tight">meuflip</span>
    </div>
  );
}
