# Interface System — meuflip

## Direction And Feel
- Product world: flips imobiliários, obra, margem, risco, velocidade de decisão.
- Visual direction: navy técnico com acento teal operacional, contraste alto e estética de ferramenta profissional.
- Brand signature: monograma MF com seta integrada (movimento de crescimento + decisão rápida).

## Palette
- `--brand-navy`: `#1E293B`
- `--brand-teal`: `#14B8A6`
- `--brand-light`: `#F1F5F9`
- `--brand-muted`: `#475569`
- White on dark surfaces: `#FFFFFF`

## Depth Strategy
- Primary strategy: borders + subtle glow only for hero/logo moments.
- Avoid heavy shadows in app shell; keep separations quiet.

## Spacing
- Base unit: `4px`
- Common rhythm: `8 / 12 / 16 / 24 / 32`

## Typography
- Wordmark/headlines: `Manrope`
- UI/body: `Inter`

## Logo Patterns
- Canonical geometry (viewBox `0 0 40 40`):
  - `M`: `M4 32V8L14 20L24 8L28 4`
  - `Arrow`: `M23 4H28V9`
  - `F stem`: `M20 32V12H34`
  - `F bar`: `M20 22H30`
- Canonical stroke at regular sizes:
  - Main strokes: `4`
  - Arrow stroke: `3`
- Optical strokes for tiny icons/favicons:
  - `<= 12px`: main `6`, arrow `5`
  - `<= 20px`: main `5`, arrow `4`
  - `<= 28px`: main `4.5`, arrow `3.5`
  - `> 28px`: main `4`, arrow `3`

## Reusable Component Rules
- Never reintroduce the legacy house+hammer icon.
- Keep logo color mapping:
  - light: navy + teal
  - dark: white + teal
  - mono-light: navy
  - mono-dark: white
- For dark story/email contexts, use white (`#FFFFFF`) for M/arrow strokes.
