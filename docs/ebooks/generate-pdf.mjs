import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { marked } from "marked";
import puppeteer from "puppeteer";

const __dirname = dirname(fileURLToPath(import.meta.url));
const SOURCE_DIR = resolve(__dirname, "source");
const LOGO_PATH = resolve(__dirname, "../../apps/web/public/logos/meuflip-arrow-logo-full-dark.svg");

// Brand
const NAVY = "#1E293B";
const TEAL = "#14B8A6";
const BODY_COLOR = "#334155";

// Image → chapter mapping
const CHAPTER_IMAGES = {
  0: [{ file: "IMG_3415.PNG", caption: "Before & After: mesma metragem, sensação completamente diferente" }],
  2: [
    { file: "F3507D75-A332-4624-BB43-8326C28C0FEF.png", caption: "Nível Básico — Apto compacto entregue pela construtora" },
    { file: "73A9BB81-B68F-4B2B-B613-EEB3036C8297.png", caption: "Nível Bom — Mesmo apto mobiliado no nível básico" },
    { file: "B2916EB5-E299-4FDD-BB1E-E1F94BF55A68.png", caption: "Nível Ótimo — Upgrade completo, sensação de R$ 100k a mais" },
  ],
  3: [
    { file: "21004E3B-6D90-4A97-90AB-0F21C9821CF6.png", caption: "Bom — Monocomando simples, funcional (~R$ 80-150)" },
    { file: "ED7DC0A1-77D1-4CB1-B15C-0A65B2AC5676.png", caption: "Ótimo — Torneira 3 furos, sofisticação na foto (~R$ 250-450)" },
  ],
  4: [
    { file: "AD491BE4-31E1-475F-B01C-D4F2AADDD151.png", caption: "Sala com staging completo — sensação de lar instantânea" },
    { file: "296C9A62-C201-4069-8B8C-B2129DEE2D4B.png", caption: "Cozinha — Torneira gourmet como protagonista do ambiente" },
    { file: "E1F4451E-681F-44F4-B242-18F938119BCB.png", caption: "Banheiro ótimo — box, nicho, espelho LED e gabinete suspenso" },
    { file: "1FD8C9D0-DA80-4D31-912A-C42907DE09A1.png", caption: "Área de serviço organizada — investimento baixo, percepção alta" },
    { file: "201F870E-E100-4B34-9623-77B83C98087D.png", caption: "Fachada farmhouse moderna — primeira impressão matadora" },
  ],
  5: [
    { file: "FE55F9DF-985C-4457-A1CD-A70815233C06.png", caption: "Apto médio acabado — clean e funcional, pronto pra vender" },
    { file: "6492B161-F066-431F-9942-C2DE63897D22.png", caption: "Alto padrão mobiliado — staging nível lifestyle" },
    { file: "9B8271E9-C9B6-48AC-9EC7-C4484648C1E9.png", caption: "Alto padrão vazio — o acabamento fala sozinho" },
    { file: "C1CBFD39-E45F-4718-8E51-580493C98358.png", caption: "Sala aspiracional com lareira — referência máxima" },
    { file: "B3A22BFD-719B-4F23-A96D-7F5C682658BD.png", caption: "Moodboard — paleta de acabamentos e materiais" },
  ],
  7: [
    { file: "37A20842-83F9-4E7F-8667-428F070A5D9B.png", caption: "Erro — Piso cerâmico soltando, argamassa exposta" },
    { file: "84A2FE19-38F3-47A1-9A60-11158D82C12C.png", caption: "Erro — Porcelanato madeirado levantando em bloco" },
    { file: "7C561169-931C-451A-8E43-655CAB048EA2.png", caption: "Erro — Rejunte deteriorado com mofo" },
  ],
};

function imgToDataUri(filePath) {
  const buf = readFileSync(filePath);
  const ext = filePath.toLowerCase().endsWith(".svg") ? "svg+xml" : "png";
  return `data:image/${ext};base64,${buf.toString("base64")}`;
}

function buildImageHtml(images) {
  return images
    .map((img) => {
      const uri = imgToDataUri(resolve(SOURCE_DIR, img.file));
      return `<figure class="chapter-img"><img src="${uri}" alt="${img.caption}"/><figcaption>${img.caption}</figcaption></figure>`;
    })
    .join("\n");
}

function parseMarkdown(md) {
  // Strip "Fotos de Referencia" section
  const fotosIdx = md.indexOf("# 📸 Fotos de Referência");
  if (fotosIdx !== -1) md = md.substring(0, fotosIdx).trimEnd();

  // Strip the first H1 (ebook title — used on cover instead)
  md = md.replace(/^# Ebook — Acabamento que Vende\s*/, "");

  // Split into chapters by H1
  const chapters = [];
  const h1Regex = /^# (.+)$/gm;
  let match;
  const splits = [];

  while ((match = h1Regex.exec(md)) !== null) {
    splits.push({ title: match[1], index: match.index });
  }

  // Content before first H1 (the aside intro)
  const preContent = md.substring(0, splits.length > 0 ? splits[0].index : md.length).trim();
  if (preContent) {
    chapters.push({ title: null, body: preContent, chapterNum: -1 });
  }

  for (let i = 0; i < splits.length; i++) {
    const start = splits[i].index;
    const end = i + 1 < splits.length ? splits[i + 1].index : md.length;
    const title = splits[i].title;
    const body = md.substring(start, end).trim();

    const numMatch = title.match(/Capítulo\s+(\d+)/);
    const chapterNum = numMatch ? parseInt(numMatch[1]) : -1;

    chapters.push({ title, body, chapterNum });
  }

  return chapters;
}

function buildToc(chapters) {
  const items = chapters
    .filter((c) => c.title && c.title.includes("Capítulo"))
    .map((c) => {
      const m = c.title.match(/Capítulo\s+\d+\s*—\s*(.+)/);
      const display = m ? m[1] : c.title;
      return `<li><a href="#ch-${c.chapterNum}">${display}</a></li>`;
    })
    .join("\n");

  return `
    <div class="toc">
      <h2>Sumário</h2>
      <ol>${items}</ol>
    </div>`;
}

function preprocessAsides(md) {
  // Extract <aside>...</aside> blocks, parse their inner markdown, wrap back
  return md.replace(/<aside>([\s\S]*?)<\/aside>/g, (_, inner) => {
    const parsed = marked.parse(inner.trim());
    return `<aside>${parsed}</aside>`;
  });
}

function buildChapterHtml(chapter) {
  let html = marked.parse(preprocessAsides(chapter.body));
  const images = CHAPTER_IMAGES[chapter.chapterNum];
  const imageBlock = images ? buildImageHtml(images) : "";
  const id = chapter.chapterNum >= 0 ? `id="ch-${chapter.chapterNum}"` : "";

  // Replace H1 with styled chapter banner
  if (chapter.chapterNum >= 0) {
    const titleMatch = chapter.title.match(/Capítulo\s+(\d+)\s*—\s*(.+)/);
    if (titleMatch) {
      const label = `CAPÍTULO ${titleMatch[1]}`;
      const subtitle = titleMatch[2];
      const banner = `<div class="chapter-banner">
        <span class="chapter-label">${label}</span>
        <h1>${subtitle}</h1>
      </div>`;
      // Remove the first <h1> from parsed HTML and prepend banner
      html = html.replace(/<h1>.*?<\/h1>/, "");
      return `<div class="chapter" ${id}>${banner}${imageBlock}${html}</div>`;
    }
  }

  return `<div class="chapter" ${id}>${imageBlock}${html}</div>`;
}

function buildFullHtml(chapters) {
  const logoUri = imgToDataUri(LOGO_PATH);
  const coverImgUri = imgToDataUri(resolve(SOURCE_DIR, "D26CDCEE-A4B4-4AE1-8A62-4F37A9C94EE9.png"));

  const toc = buildToc(chapters);
  const chaptersHtml = chapters.map(buildChapterHtml).join("\n");

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8"/>
<style>
@import url('https://fonts.googleapis.com/css2?family=Manrope:wght@400;600;700;800&family=Inter:wght@400;500;600&display=swap');

@page {
  size: A4;
  margin: 2cm 2.5cm;
}

* { box-sizing: border-box; margin: 0; padding: 0; }

body {
  font-family: 'Inter', sans-serif;
  font-size: 11pt;
  line-height: 1.7;
  color: ${BODY_COLOR};
}

/* ---- COVER ---- */
.cover {
  page-break-after: always;
  width: 210mm;
  height: 297mm;
  margin: -2cm -2.5cm;
  position: relative;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
  padding: 3cm;
}
.cover-bg {
  position: absolute; inset: 0;
  background: url('${coverImgUri}') center/cover no-repeat;
}
.cover-overlay {
  position: absolute; inset: 0;
  background: linear-gradient(180deg, rgba(30,41,59,0.55) 0%, rgba(30,41,59,0.92) 70%);
}
.cover-content {
  position: relative; z-index: 2;
  color: #fff;
}
.cover-logo {
  width: 160px;
  margin-bottom: 2cm;
}
.cover h1 {
  font-family: 'Manrope', sans-serif;
  font-weight: 800;
  font-size: 36pt;
  line-height: 1.15;
  color: #fff;
  margin-bottom: 0.6cm;
  page-break-before: avoid;
}
.cover h1 span { color: ${TEAL}; }
.cover p {
  font-size: 13pt;
  line-height: 1.5;
  color: #CBD5E1;
  max-width: 85%;
}

/* ---- TOC ---- */
.toc {
  page-break-after: always;
  padding-top: 1cm;
}
.toc h2 {
  font-family: 'Manrope', sans-serif;
  font-weight: 700;
  font-size: 22pt;
  color: ${NAVY};
  margin-bottom: 1cm;
  padding-bottom: 0.3cm;
  border-bottom: 3px solid ${TEAL};
}
.toc ol {
  list-style: none;
  counter-reset: toc-counter;
  padding: 0;
}
.toc li {
  counter-increment: toc-counter;
  padding: 0.4cm 0;
  border-bottom: 1px solid #E2E8F0;
  font-size: 12pt;
}
.toc li::before {
  content: counter(toc-counter, decimal-leading-zero);
  font-family: 'Manrope', sans-serif;
  font-weight: 700;
  color: ${TEAL};
  margin-right: 0.5cm;
  font-size: 14pt;
}
.toc a {
  color: ${NAVY};
  text-decoration: none;
  font-family: 'Manrope', sans-serif;
  font-weight: 600;
}

/* ---- CHAPTERS ---- */
.chapter { margin-bottom: 1cm; }

/* ---- CHAPTER BANNER ---- */
.chapter-banner {
  page-break-before: always;
  background: linear-gradient(135deg, ${NAVY} 0%, #0F172A 100%);
  margin: 0 0 0.8cm 0;
  padding: 0.8cm 1cm;
  border-radius: 10px;
}
.chapter-label {
  font-family: 'Manrope', sans-serif;
  font-weight: 700;
  font-size: 10pt;
  color: ${TEAL};
  letter-spacing: 0.25em;
  text-transform: uppercase;
  display: block;
  margin-bottom: 0.25cm;
}
.chapter-banner h1 {
  font-family: 'Manrope', sans-serif;
  font-weight: 800;
  font-size: 22pt;
  color: #fff;
  line-height: 1.25;
  margin: 0;
  padding: 0;
  border: none;
  page-break-before: avoid;
}

h1 {
  font-family: 'Manrope', sans-serif;
  font-weight: 700;
  font-size: 22pt;
  color: ${NAVY};
  page-break-before: always;
  margin-bottom: 0.6cm;
  padding-bottom: 0.3cm;
  border-bottom: 3px solid ${TEAL};
  line-height: 1.3;
}

h2 {
  font-family: 'Manrope', sans-serif;
  font-weight: 600;
  font-size: 15pt;
  color: ${NAVY};
  margin-top: 1.2cm;
  margin-bottom: 0.4cm;
}

h3 {
  font-family: 'Manrope', sans-serif;
  font-weight: 600;
  font-size: 12pt;
  color: ${NAVY};
  margin-top: 0.8cm;
  margin-bottom: 0.3cm;
}

p {
  margin-bottom: 0.4cm;
  text-align: justify;
  hyphens: auto;
}

em { color: #64748B; }

strong { color: ${NAVY}; font-weight: 600; }

ul, ol {
  margin: 0.3cm 0 0.5cm 1cm;
  padding-left: 0.5cm;
}
li { margin-bottom: 0.15cm; }

hr {
  border: none;
  border-top: 1px solid #E2E8F0;
  margin: 0.8cm 0;
}

/* ---- TABLES ---- */
table {
  width: 100%;
  border-collapse: collapse;
  margin: 0.5cm 0 0.8cm;
  font-size: 9.5pt;
}
thead th {
  background: ${NAVY};
  color: #fff;
  font-family: 'Manrope', sans-serif;
  font-weight: 600;
  padding: 0.25cm 0.3cm;
  text-align: left;
}
td {
  padding: 0.2cm 0.3cm;
  border-bottom: 1px solid #E2E8F0;
  vertical-align: top;
}
tr:nth-child(even) td { background: #F8FAFC; }

/* ---- BLOCKQUOTE ---- */
blockquote {
  border-left: 4px solid ${TEAL};
  background: #F8FAFC;
  padding: 0.4cm 0.6cm;
  margin: 0.5cm 0;
  border-radius: 0 6px 6px 0;
  font-style: italic;
  color: #475569;
}
blockquote p { margin-bottom: 0.15cm; }

/* ---- ASIDE ---- */
aside {
  border-left: 4px solid ${TEAL};
  background: #F0FDFA;
  padding: 0.5cm 0.7cm;
  margin: 0.5cm 0;
  border-radius: 0 8px 8px 0;
  font-size: 10.5pt;
}

/* ---- CODE (inline specs) ---- */
code {
  background: #F1F5F9;
  padding: 1px 4px;
  border-radius: 3px;
  font-size: 9.5pt;
  color: #475569;
}

/* ---- IMAGES ---- */
.chapter-img {
  margin: 0.5cm 0 0.7cm;
  text-align: center;
}
.chapter-img img {
  max-width: 100%;
  max-height: 10cm;
  border-radius: 8px;
  box-shadow: 0 2px 12px rgba(0,0,0,0.10);
  object-fit: cover;
}
.chapter-img figcaption {
  font-size: 9pt;
  color: #94A3B8;
  margin-top: 0.2cm;
  font-style: italic;
}

/* ---- CTA BOX ---- */
.cta-box {
  background: linear-gradient(135deg, ${NAVY} 0%, #0F172A 100%);
  color: #fff;
  padding: 1.2cm 1.5cm;
  border-radius: 12px;
  margin: 1cm 0;
  text-align: center;
  page-break-inside: avoid;
}
.cta-box p {
  color: #CBD5E1;
  text-align: center;
  margin-bottom: 0.3cm;
}
.cta-box strong {
  color: #fff;
}
.cta-box a {
  color: ${TEAL};
  font-family: 'Manrope', sans-serif;
  font-weight: 700;
  font-size: 16pt;
  text-decoration: none;
}

/* Avoid breaks inside important blocks */
aside, blockquote, table, figure, .cta-box, .chapter-banner { page-break-inside: avoid; }
h1, h2, h3 { page-break-after: avoid; }
</style>
</head>
<body>

<!-- COVER -->
<div class="cover">
  <div class="cover-bg"></div>
  <div class="cover-overlay"></div>
  <div class="cover-content">
    <img class="cover-logo" src="${logoUri}" alt="meuflip"/>
    <h1>Acabamento<br/>que <span>Vende</span></h1>
    <p>O guia do flipper pra não estourar orçamento e não perder margem. Como escolher piso, bancada, revestimento e metais sem cair no "ficou bonito" e sair no prejuízo.</p>
  </div>
</div>

<!-- TOC -->
${toc}

<!-- CHAPTERS -->
${chaptersHtml}

</body>
</html>`;
}

async function main() {
  console.log("Reading markdown...");
  const mdPath = resolve(SOURCE_DIR, "Ebook — Acabamento que Vende 2fc82b1dd9c081a495d9e11f2348dcae.md");
  const md = readFileSync(mdPath, "utf-8");

  console.log("Parsing chapters...");
  const chapters = parseMarkdown(md);
  console.log(`Found ${chapters.length} chapters`);

  console.log("Building HTML...");
  const html = buildFullHtml(chapters);

  console.log("Launching browser...");
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();

  await page.setContent(html, { waitUntil: "domcontentloaded", timeout: 30000 });
  // Wait for Google Fonts to load
  await page.evaluate(() => document.fonts.ready);
  await new Promise((r) => setTimeout(r, 2000));

  const outputPath = resolve(__dirname, "acabamento-que-vende.pdf");
  console.log("Generating PDF...");
  await page.pdf({
    path: outputPath,
    format: "A4",
    printBackground: true,
    margin: { top: "2cm", bottom: "2cm", left: "2.5cm", right: "2.5cm" },
    displayHeaderFooter: true,
    headerTemplate: "<span></span>",
    footerTemplate: `<div style="width:100%;text-align:center;font-size:9px;color:#94A3B8;font-family:Inter,sans-serif;"><span class="pageNumber"></span></div>`,
  });

  await browser.close();
  console.log(`PDF saved: ${outputPath}`);
}

main().catch((err) => {
  console.error("Error:", err);
  process.exit(1);
});
