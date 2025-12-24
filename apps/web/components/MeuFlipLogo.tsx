interface MeuFlipLogoProps {
  className?: string;
  size?: number;
}

export function MeuFlipLogo({ className = "", size = 32 }: MeuFlipLogoProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 40 40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* Casa - corpo */}
      <path
        d="M6 18L18 8L30 18V32H6V18Z"
        fill="currentColor"
        className="text-primary"
      />
      {/* Casa - telhado */}
      <path
        d="M18 4L2 18H6L18 8L30 18H34L18 4Z"
        fill="currentColor"
        className="text-primary"
      />
      {/* Casa - porta */}
      <rect
        x="14"
        y="22"
        width="8"
        height="10"
        fill="currentColor"
        className="text-primary-foreground"
      />
      {/* Martelo - cabo */}
      <rect
        x="32"
        y="14"
        width="3"
        height="16"
        rx="1"
        fill="currentColor"
        className="text-primary"
      />
      {/* Martelo - cabeça */}
      <rect
        x="28"
        y="8"
        width="12"
        height="6"
        rx="1"
        fill="currentColor"
        className="text-primary"
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
      <span className="font-bold text-lg">Meu Flip</span>
    </div>
  );
}
