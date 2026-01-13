export function formatCurrency(value: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 0,
  }).format(value);
}

export function formatNumber(value: number, decimals = 0): string {
  return new Intl.NumberFormat("pt-BR", {
    maximumFractionDigits: decimals,
    minimumFractionDigits: decimals,
  }).format(value);
}

export function parseFormattedNumber(value: string): number | null {
  if (!value || value.trim() === "") return null;
  // Remove prefix (R$), spaces, thousand separators (dots)
  // Replace decimal comma with dot for parsing
  const cleaned = value
    .replaceAll(/[R$\s]/g, "")
    .replaceAll(".", "")
    .replaceAll(",", ".");
  const num = Number.parseFloat(cleaned);
  return Number.isNaN(num) ? null : num;
}

export function formatPercent(value: number, decimals = 2): string {
  return `${value.toFixed(decimals)}%`;
}

export function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

export function formatDateTime(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
