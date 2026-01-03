import type { UnifiedSnapshot, CashSnapshot, FinancingSnapshot } from "@widia/shared";

export function formatCurrencyExport(value: number | null | undefined): string {
  if (value === null || value === undefined) return "-";
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 0,
  }).format(value);
}

export function formatPercentExport(value: number | null | undefined): string {
  if (value === null || value === undefined) return "-";
  return `${(value * 100).toFixed(2)}%`;
}

export function formatDateExport(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function exportSnapshotsToCSV(snapshots: UnifiedSnapshot[], filename = "analises"): void {
  const headers = [
    "Imóvel",
    "Tipo",
    "Status",
    "Data",
    "Preço Compra",
    "Preço Venda",
    "Lucro Líquido",
    "ROI (%)",
  ];

  const rows = snapshots.map((s) => [
    s.property_name || "Sem nome",
    s.snapshot_type === "cash" ? "À Vista" : "Financiamento",
    getStatusLabel(s.status_pipeline),
    formatDateExport(s.created_at),
    s.purchase_price?.toString() || "",
    s.sale_price?.toString() || "",
    s.net_profit.toString(),
    s.roi.toFixed(2),
  ]);

  const csvContent = [
    headers.join(";"),
    ...rows.map((row) => row.map(escapeCSV).join(";")),
  ].join("\n");

  downloadFile(csvContent, `${filename}.csv`, "text/csv;charset=utf-8;");
}

function escapeCSV(value: string): string {
  if (value.includes(";") || value.includes('"') || value.includes("\n")) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

function getStatusLabel(status: string | null | undefined): string {
  const labels: Record<string, string> = {
    prospecting: "Prospecção",
    analyzing: "Analisando",
    bought: "Comprado",
    renovation: "Reforma",
    for_sale: "À Venda",
    sold: "Vendido",
    archived: "Arquivado",
  };
  return status ? labels[status] || status : "-";
}

function downloadFile(content: string, filename: string, mimeType: string): void {
  const blob = new Blob(["\ufeff" + content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function exportSnapshotToPDF(
  snapshot: CashSnapshot | FinancingSnapshot,
  type: "cash" | "financing",
  propertyName?: string
): void {
  const isCash = type === "cash";
  const title = isCash ? "Análise à Vista" : "Análise Financiada";

  const html = generateSnapshotHTML(snapshot, type, title, propertyName);

  const printWindow = window.open("", "_blank");
  if (!printWindow) {
    alert("Por favor, permita popups para exportar o PDF");
    return;
  }

  printWindow.document.write(html);
  printWindow.document.close();

  printWindow.onload = () => {
    printWindow.print();
  };
}

function generateSnapshotHTML(
  snapshot: CashSnapshot | FinancingSnapshot,
  type: "cash" | "financing",
  title: string,
  propertyName?: string
): string {
  const isCash = type === "cash";
  const cashSnapshot = snapshot as CashSnapshot;
  const financingSnapshot = snapshot as FinancingSnapshot;

  return `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <title>${title} - ${propertyName || "Imóvel"}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; padding: 40px; color: #1a1a1a; }
    .header { margin-bottom: 30px; border-bottom: 2px solid #2563eb; padding-bottom: 20px; }
    .header h1 { font-size: 24px; color: #2563eb; }
    .header .subtitle { color: #666; margin-top: 5px; }
    .header .date { color: #888; font-size: 12px; margin-top: 10px; }
    .section { margin-bottom: 25px; }
    .section h2 { font-size: 14px; color: #666; margin-bottom: 15px; text-transform: uppercase; letter-spacing: 0.5px; }
    .grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 15px; }
    .item { background: #f5f5f5; padding: 15px; border-radius: 8px; }
    .item .label { font-size: 11px; color: #666; text-transform: uppercase; }
    .item .value { font-size: 16px; font-weight: 600; margin-top: 5px; }
    .item.highlight { background: #2563eb; color: white; }
    .item.highlight .label { color: rgba(255,255,255,0.8); }
    .item.positive .value { color: #16a34a; }
    .item.negative .value { color: #dc2626; }
    .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #ddd; font-size: 11px; color: #888; text-align: center; }
    @media print {
      body { padding: 20px; }
      .item { break-inside: avoid; }
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>${title}</h1>
    <div class="subtitle">${propertyName || "Imóvel"}</div>
    <div class="date">Gerado em ${formatDateExport(snapshot.created_at)}</div>
  </div>

  <div class="section">
    <h2>Entradas</h2>
    <div class="grid">
      ${isCash ? `
        <div class="item"><div class="label">Preço de Compra</div><div class="value">${formatCurrencyExport(cashSnapshot.inputs.purchase_price)}</div></div>
        <div class="item"><div class="label">Custo de Reforma</div><div class="value">${formatCurrencyExport(cashSnapshot.inputs.renovation_cost)}</div></div>
        <div class="item"><div class="label">Outros Custos</div><div class="value">${formatCurrencyExport(cashSnapshot.inputs.other_costs)}</div></div>
        <div class="item"><div class="label">Preço de Venda</div><div class="value">${formatCurrencyExport(cashSnapshot.inputs.sale_price)}</div></div>
      ` : `
        <div class="item"><div class="label">Preço de Compra</div><div class="value">${formatCurrencyExport(financingSnapshot.inputs.purchase_price)}</div></div>
        <div class="item"><div class="label">Preço de Venda</div><div class="value">${formatCurrencyExport(financingSnapshot.inputs.sale_price)}</div></div>
        <div class="item"><div class="label">Entrada</div><div class="value">${formatPercentExport(financingSnapshot.inputs.down_payment_percent)}</div></div>
        <div class="item"><div class="label">Prazo</div><div class="value">${financingSnapshot.inputs.term_months || "-"} meses</div></div>
        <div class="item"><div class="label">CET</div><div class="value">${formatPercentExport(financingSnapshot.inputs.cet)}</div></div>
        <div class="item"><div class="label">Juros Nominal</div><div class="value">${formatPercentExport(financingSnapshot.inputs.interest_rate)}</div></div>
      `}
    </div>
  </div>

  <div class="section">
    <h2>Resultados</h2>
    <div class="grid">
      ${isCash ? `
        <div class="item"><div class="label">ITBI</div><div class="value">${formatCurrencyExport(cashSnapshot.outputs.itbi_value)}</div></div>
        <div class="item"><div class="label">Registro</div><div class="value">${formatCurrencyExport(cashSnapshot.outputs.registry_value)}</div></div>
        <div class="item"><div class="label">Custo Aquisição</div><div class="value">${formatCurrencyExport(cashSnapshot.outputs.acquisition_cost)}</div></div>
        <div class="item highlight"><div class="label">Investimento Total</div><div class="value">${formatCurrencyExport(cashSnapshot.outputs.investment_total)}</div></div>
        <div class="item"><div class="label">Corretagem</div><div class="value">${formatCurrencyExport(cashSnapshot.outputs.broker_fee)}</div></div>
        <div class="item ${cashSnapshot.outputs.gross_profit > 0 ? "positive" : cashSnapshot.outputs.gross_profit < 0 ? "negative" : ""}"><div class="label">Lucro Bruto</div><div class="value">${formatCurrencyExport(cashSnapshot.outputs.gross_profit)}</div></div>
        <div class="item"><div class="label">Imposto PJ</div><div class="value">${formatCurrencyExport(cashSnapshot.outputs.pj_tax_value)}</div></div>
        <div class="item highlight"><div class="label">Lucro Líquido</div><div class="value">${formatCurrencyExport(cashSnapshot.outputs.net_profit)}</div></div>
        <div class="item highlight"><div class="label">ROI</div><div class="value">${cashSnapshot.outputs.roi.toFixed(2)}%</div></div>
      ` : `
        <div class="item"><div class="label">Valor Entrada</div><div class="value">${formatCurrencyExport(financingSnapshot.outputs.down_payment_value)}</div></div>
        <div class="item"><div class="label">Valor Financiado</div><div class="value">${formatCurrencyExport(financingSnapshot.outputs.financed_value)}</div></div>
        <div class="item"><div class="label">Total Parcelas</div><div class="value">${formatCurrencyExport(financingSnapshot.outputs.payments_total)}</div></div>
        <div class="item"><div class="label">Taxas Bancárias</div><div class="value">${formatCurrencyExport(financingSnapshot.outputs.bank_fees_total)}</div></div>
        <div class="item highlight"><div class="label">Investimento Total</div><div class="value">${formatCurrencyExport(financingSnapshot.outputs.investment_total)}</div></div>
        <div class="item highlight"><div class="label">Lucro Líquido</div><div class="value">${formatCurrencyExport(financingSnapshot.outputs.net_profit)}</div></div>
        <div class="item highlight"><div class="label">ROI</div><div class="value">${financingSnapshot.outputs.roi.toFixed(2)}%</div></div>
      `}
    </div>
  </div>

  ${snapshot.effective_rates ? `
  <div class="section">
    <h2>Taxas Aplicadas</h2>
    <div class="grid">
      <div class="item"><div class="label">ITBI</div><div class="value">${(snapshot.effective_rates.itbi_rate * 100).toFixed(1)}%</div></div>
      <div class="item"><div class="label">Registro</div><div class="value">${(snapshot.effective_rates.registry_rate * 100).toFixed(1)}%</div></div>
      <div class="item"><div class="label">Corretagem</div><div class="value">${(snapshot.effective_rates.broker_rate * 100).toFixed(1)}%</div></div>
      <div class="item"><div class="label">Imposto PJ</div><div class="value">${(snapshot.effective_rates.pj_tax_rate * 100).toFixed(1)}%</div></div>
    </div>
  </div>
  ` : ""}

  <div class="footer">
    Gerado por Meu Flip - ${new Date().toLocaleDateString("pt-BR")}
  </div>
</body>
</html>`;
}
