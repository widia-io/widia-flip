interface MeuFlipLogoProps {
  className?: string;
  size?: number;
}

export function MeuFlipLogo({ className = "", size = 32 }: MeuFlipLogoProps) {
  const strokes =
    size <= 12 ? { main: 6, secondary: 5 } : size <= 20 ? { main: 5, secondary: 4 } : size <= 28 ? { main: 4.5, secondary: 3.5 } : { main: 4, secondary: 3 };

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 40 40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <path
        d="M4 32V8L14 20L24 8L28 4"
        stroke="#1E293B"
        strokeWidth={strokes.main}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      <path
        d="M23 4H28V9"
        stroke="#1E293B"
        strokeWidth={strokes.secondary}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      <path
        d="M20 32V12H34"
        stroke="#14B8A6"
        strokeWidth={strokes.main}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M20 22H30"
        stroke="#14B8A6"
        strokeWidth={strokes.main}
        strokeLinecap="round"
      />
    </svg>
  );
}

export function MeuFlipLogoWithText({
  className = "",
  size = 32,
}: MeuFlipLogoProps) {
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <MeuFlipLogo size={size} />
      <span className="font-bold text-lg">meuflip</span>
    </div>
  );
}
