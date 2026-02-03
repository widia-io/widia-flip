import { cn } from "@/lib/utils";

type LogoVariant = "light" | "dark" | "mono-light" | "mono-dark" | "auto";
type LogoSize = "icon" | "full";

interface LogoProps {
  variant?: LogoVariant;
  size?: LogoSize;
  className?: string;
  iconSize?: number;
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
        d="M4 32V8L14 20L24 8L28 4"
        stroke={colors.m}
        strokeWidth="4"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      <path
        d="M23 4H28V9"
        stroke={colors.m}
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      <path
        d="M20 32V12H34"
        stroke={colors.f}
        strokeWidth="4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M20 22H30"
        stroke={colors.f}
        strokeWidth="4"
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
