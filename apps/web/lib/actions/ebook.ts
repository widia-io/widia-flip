"use server";

const GO_API_BASE_URL = process.env.GO_API_BASE_URL ?? "http://localhost:8080";

export async function submitEbookLead(email: string, marketingConsent: boolean) {
  const res = await fetch(`${GO_API_BASE_URL}/api/v1/public/ebook-leads`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email,
      ebookSlug: "acabamento-que-vende",
      marketingConsent,
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    console.error("[ebook-lead] Go API error:", text);
    return { success: false, error: "Erro ao processar. Tente novamente." };
  }

  return { success: true };
}
