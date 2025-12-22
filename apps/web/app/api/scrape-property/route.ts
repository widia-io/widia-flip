import { NextResponse } from "next/server";

import {
  ScrapePropertyRequestSchema,
  ScrapedPropertySchema,
  type ScrapePropertyResponse,
} from "@widia/shared";

const FIRECRAWL_API_KEY = process.env.FIRECRAWL_API_KEY;
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;

const EXTRACTION_PROMPT = `Você é um extrator de dados de imóveis. Analise o texto abaixo de um anúncio imobiliário e extraia os dados em formato JSON.

REGRAS:
- Retorne APENAS o JSON, sem explicações ou comentários
- Use null para campos não encontrados
- Valores monetários devem ser números inteiros (sem R$, pontos ou vírgulas). Exemplo: 500000
- Área em metros quadrados (número). Exemplo: 80
- Números de quartos, banheiros, vagas, suítes e andar devem ser inteiros

SCHEMA EXATO (use estes nomes de campos):
{
  "neighborhood": "nome do bairro ou null",
  "address": "endereço ou rua ou null",
  "area_usable": número ou null,
  "bedrooms": número de quartos ou null,
  "suites": número de suítes ou null,
  "bathrooms": número de banheiros ou null,
  "parking": número de vagas ou null,
  "floor": andar ou null,
  "asking_price": valor pedido em reais (número) ou null,
  "condo_fee": valor do condomínio (número) ou null,
  "iptu": valor do IPTU anual (número) ou null,
  "agency": nome da imobiliária ou null,
  "broker_name": nome do corretor ou null
}

TEXTO DO ANÚNCIO:
`;

interface FirecrawlResponse {
  success: boolean;
  data?: {
    markdown?: string;
    metadata?: {
      title?: string;
    };
  };
  error?: string;
}

interface OpenRouterResponse {
  choices?: Array<{
    message?: {
      content?: string;
    };
  }>;
  error?: {
    message?: string;
  };
}

export async function POST(request: Request) {
  try {
    // Check API keys
    if (!FIRECRAWL_API_KEY) {
      console.error("[scrape-property] FIRECRAWL_API_KEY not configured");
      return NextResponse.json(
        {
          error: {
            code: "CONFIG_ERROR",
            message: "Serviço de extração não configurado",
          },
        },
        { status: 500 },
      );
    }

    if (!OPENROUTER_API_KEY) {
      console.error("[scrape-property] OPENROUTER_API_KEY not configured");
      return NextResponse.json(
        {
          error: {
            code: "CONFIG_ERROR",
            message: "Serviço de extração não configurado",
          },
        },
        { status: 500 },
      );
    }

    // Parse and validate request
    const body = await request.json();
    const parsed = ScrapePropertyRequestSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          error: {
            code: "VALIDATION_ERROR",
            message: parsed.error.errors[0]?.message ?? "URL inválida",
          },
        },
        { status: 400 },
      );
    }

    const { url } = parsed.data;

    console.log("[scrape-property] Scraping URL:", url);

    // Step 1: Call Firecrawl to get markdown
    const firecrawlRes = await fetch("https://api.firecrawl.dev/v2/scrape", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${FIRECRAWL_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        url,
        formats: ["markdown"],
        waitFor: 3000, // Wait for JS to load
      }),
    });

    if (!firecrawlRes.ok) {
      const errorText = await firecrawlRes.text();
      console.error("[scrape-property] Firecrawl error:", errorText);

      if (firecrawlRes.status === 403) {
        return NextResponse.json(
          {
            error: {
              code: "BLOCKED",
              message: "Site bloqueou o acesso",
            },
          },
          { status: 403 },
        );
      }

      if (firecrawlRes.status === 408 || firecrawlRes.status === 504) {
        return NextResponse.json(
          {
            error: {
              code: "TIMEOUT",
              message: "Timeout ao acessar a página",
            },
          },
          { status: 504 },
        );
      }

      return NextResponse.json(
        {
          error: {
            code: "SCRAPE_ERROR",
            message: "Erro ao acessar a página",
          },
        },
        { status: 502 },
      );
    }

    const firecrawlData: FirecrawlResponse = await firecrawlRes.json();

    if (!firecrawlData.success || !firecrawlData.data?.markdown) {
      console.error("[scrape-property] Firecrawl no data:", firecrawlData);
      return NextResponse.json(
        {
          error: {
            code: "NO_CONTENT",
            message: "Não foi possível extrair conteúdo da página",
          },
        },
        { status: 422 },
      );
    }

    const markdown = firecrawlData.data.markdown;

    // Remove image references and clean up markdown for better extraction
    // Images add noise and consume tokens without useful data
    const cleanedMarkdown = markdown
      .replace(/!\[[^\]]*\]\([^)]+\)/g, "") // Remove ![alt](url)
      .replace(/\n{3,}/g, "\n\n") // Collapse multiple newlines
      .replace(/^Previous\n?$/gm, "") // Remove navigation text
      .replace(/^Next\n?$/gm, "")
      .trim();

    // Limit markdown size to avoid token limits (roughly 4 chars per token)
    const maxChars = 20000;
    const truncatedMarkdown =
      cleanedMarkdown.length > maxChars
        ? cleanedMarkdown.slice(0, maxChars)
        : cleanedMarkdown;

    console.log(
      "[scrape-property] Got markdown, original:",
      markdown.length,
      "cleaned:",
      truncatedMarkdown.length,
    );

    // Step 2: Call OpenRouter to extract structured data
    const openrouterRes = await fetch(
      "https://openrouter.ai/api/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${OPENROUTER_API_KEY}`,
          "Content-Type": "application/json",
          "HTTP-Referer": "https://widia-flip.com",
          "X-Title": "Widia Flip",
        },
        body: JSON.stringify({
          model: "anthropic/claude-3.5-haiku",
          messages: [
            {
              role: "user",
              content: EXTRACTION_PROMPT + truncatedMarkdown,
            },
          ],
          temperature: 0,
          max_tokens: 1000,
        }),
      },
    );

    if (!openrouterRes.ok) {
      const errorText = await openrouterRes.text();
      console.error("[scrape-property] OpenRouter error:", errorText);
      return NextResponse.json(
        {
          error: {
            code: "LLM_ERROR",
            message: "Erro ao processar dados",
          },
        },
        { status: 502 },
      );
    }

    const openrouterData: OpenRouterResponse = await openrouterRes.json();

    const content = openrouterData.choices?.[0]?.message?.content;

    if (!content) {
      console.error("[scrape-property] OpenRouter no content:", openrouterData);
      return NextResponse.json(
        {
          error: {
            code: "NO_EXTRACTION",
            message: "Não foi possível extrair dados do anúncio",
          },
        },
        { status: 422 },
      );
    }

    console.log("[scrape-property] LLM response:", content);

    // Step 3: Parse JSON from LLM response
    let extractedData: Record<string, unknown>;
    try {
      // Try to extract JSON from the response (LLM might include extra text)
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error("No JSON found in response");
      }
      extractedData = JSON.parse(jsonMatch[0]);
    } catch (parseError) {
      console.error("[scrape-property] JSON parse error:", parseError, content);
      return NextResponse.json(
        {
          error: {
            code: "PARSE_ERROR",
            message: "Erro ao interpretar dados extraídos",
          },
        },
        { status: 422 },
      );
    }

    // Step 4: Validate and clean extracted data
    const validatedData = ScrapedPropertySchema.safeParse(extractedData);

    if (!validatedData.success) {
      console.warn(
        "[scrape-property] Validation warning:",
        validatedData.error,
      );
      // Return partial data even if validation fails
      const cleanedData = {
        neighborhood:
          typeof extractedData.neighborhood === "string"
            ? extractedData.neighborhood
            : null,
        address:
          typeof extractedData.address === "string"
            ? extractedData.address
            : null,
        area_usable:
          typeof extractedData.area_usable === "number"
            ? extractedData.area_usable
            : null,
        bedrooms:
          typeof extractedData.bedrooms === "number"
            ? extractedData.bedrooms
            : null,
        suites:
          typeof extractedData.suites === "number"
            ? extractedData.suites
            : null,
        bathrooms:
          typeof extractedData.bathrooms === "number"
            ? extractedData.bathrooms
            : null,
        parking:
          typeof extractedData.parking === "number"
            ? extractedData.parking
            : null,
        floor:
          typeof extractedData.floor === "number" ? extractedData.floor : null,
        asking_price:
          typeof extractedData.asking_price === "number"
            ? extractedData.asking_price
            : null,
        condo_fee:
          typeof extractedData.condo_fee === "number"
            ? extractedData.condo_fee
            : null,
        iptu:
          typeof extractedData.iptu === "number"
            ? extractedData.iptu
            : null,
        agency:
          typeof extractedData.agency === "string"
            ? extractedData.agency
            : null,
        broker_name:
          typeof extractedData.broker_name === "string"
            ? extractedData.broker_name
            : null,
      };

      const response: ScrapePropertyResponse = {
        success: true,
        data: cleanedData,
        warning: "Alguns campos podem não ter sido extraídos corretamente",
      };

      return NextResponse.json(response);
    }

    const response: ScrapePropertyResponse = {
      success: true,
      data: validatedData.data,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("[scrape-property] Unexpected error:", error);
    return NextResponse.json(
      {
        error: {
          code: "INTERNAL_ERROR",
          message: "Erro interno do servidor",
        },
      },
      { status: 500 },
    );
  }
}

