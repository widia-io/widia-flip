# Resend Features Analysis

Análise de recursos disponíveis no Resend para expandir o sistema de Email Marketing do Widia Flip.

**Data:** 2025-01-30
**Status atual:** MVP implementado com envio batch manual

---

## Estado Atual (MVP)

O sistema atual possui:
- Listagem de destinatários elegíveis (opt-in + email verificado)
- Criação de campanhas (subject + HTML)
- Envio em batch via `POST /emails/batch`
- Controle de consent LGPD

**Limitações:**
- Sem métricas de entrega/abertura/cliques
- Sem segmentação de audiência
- Unsubscribe manual
- Sem templates reutilizáveis

---

## Recursos Disponíveis no Resend

### 1. Webhooks & Analytics

**Prioridade:** Alta
**Esforço:** Médio
**Impacto:** Alto

Receber eventos em tempo real sobre status dos emails:

| Evento | Descrição |
|--------|-----------|
| `email.sent` | Email enviado ao servidor Resend |
| `email.delivered` | Entregue ao servidor do destinatário |
| `email.opened` | Destinatário abriu o email |
| `email.clicked` | Destinatário clicou em link |
| `email.bounced` | Falha na entrega (email inválido, caixa cheia) |
| `email.complained` | Marcado como spam |

**Payload exemplo (email.opened):**
```json
{
  "type": "email.opened",
  "created_at": "2024-02-22T23:41:12.126Z",
  "data": {
    "email_id": "56761188-7520-42d8-8898-ff6fc54ce618",
    "from": "Acme <onboarding@resend.dev>",
    "to": ["delivered@resend.dev"],
    "subject": "Sending this example",
    "tags": {
      "category": "confirm_email"
    }
  }
}
```

**Implementação necessária:**
1. Criar endpoint `/api/v1/webhooks/resend` no Go
2. Configurar webhook no Resend dashboard
3. Tabela `email_events` para armazenar eventos
4. Dashboard com métricas agregadas

**Benefícios:**
- Taxa de abertura real
- Taxa de cliques
- Identificar emails com bounce para limpeza
- Detectar complaints para compliance

---

### 2. Audiences & Contacts

**Prioridade:** Média
**Esforço:** Alto
**Impacto:** Médio

Sistema nativo do Resend para gerenciar lista de contatos:

**Recursos:**
- **Audiences:** Listas de contatos (ex: "Newsletter", "Clientes Premium")
- **Contacts:** Contatos individuais com email + propriedades
- **Properties:** Campos customizados (empresa, plano, data_cadastro)
- **Segments:** Filtros dinâmicos baseados em properties

**API exemplo - Criar contato:**
```bash
POST /audiences/{audience_id}/contacts
{
  "email": "user@example.com",
  "first_name": "João",
  "last_name": "Silva",
  "properties": {
    "plano": "premium",
    "empresa": "Acme Corp"
  }
}
```

**API exemplo - Atualizar contato:**
```bash
PATCH /contacts/{email}
{
  "properties": {
    "plano": "enterprise"
  }
}
```

**Implementação necessária:**
1. Criar audience no Resend
2. Sync de usuários opt-in para Resend Contacts
3. Manter properties atualizadas
4. Usar segments para campanhas direcionadas

**Benefícios:**
- Segmentação avançada sem queries complexas
- Unsubscribe gerenciado pelo Resend
- Propriedades para personalização

---

### 3. Broadcasts

**Prioridade:** Média
**Esforço:** Médio
**Impacto:** Médio

Envio em massa nativo com personalização:

**API:**
```bash
POST /broadcasts
{
  "segment_id": "78261eea-8f8b-4381-83c6-79fa7120f1cf",
  "from": "Widia <noreply@widia.io>",
  "subject": "Novidades do mês",
  "html": "Olá {{{FIRST_NAME|there}}}, confira as novidades! <a href=\"{{{RESEND_UNSUBSCRIBE_URL}}}\">Cancelar inscrição</a>"
}
```

**Variáveis disponíveis:**
- `{{{FIRST_NAME}}}` - Nome do contato
- `{{{LAST_NAME}}}` - Sobrenome
- `{{{EMAIL}}}` - Email
- `{{{RESEND_UNSUBSCRIBE_URL}}}` - Link de unsubscribe automático
- Qualquer property customizada

**Benefícios:**
- Personalização automática
- Unsubscribe flow gerenciado
- Envio otimizado pelo Resend
- Tracking automático

---

### 4. Templates

**Prioridade:** Baixa
**Esforço:** Baixo
**Impacto:** Baixo

Templates salvos no Resend para reutilização:

**API - Enviar com template:**
```bash
POST /emails
{
  "from": "Widia <noreply@widia.io>",
  "to": "user@example.com",
  "template": {
    "id": "order-confirmation",
    "variables": {
      "PRODUCT": "Curso de Flipping",
      "PRICE": 497
    }
  }
}
```

**Benefícios:**
- Designers podem editar via dashboard
- Versionamento de templates
- Consistência visual

---

### 5. Tags

**Prioridade:** Baixa
**Esforço:** Baixo
**Impacto:** Baixo

Categorização de emails para analytics:

```json
{
  "from": "Widia <noreply@widia.io>",
  "to": ["user@example.com"],
  "subject": "Black Friday",
  "html": "<h1>Oferta especial</h1>",
  "tags": [
    { "name": "campaign", "value": "black-friday-2025" },
    { "name": "type", "value": "promotional" }
  ]
}
```

**Benefícios:**
- Filtrar analytics por campanha
- Agrupar métricas por tipo de email
- Debugging facilitado

---

### 6. Agendamento

**Prioridade:** Nice to have
**Esforço:** Baixo
**Impacto:** Baixo

Enviar email em horário específico:

```json
{
  "from": "Widia <noreply@widia.io>",
  "to": "user@example.com",
  "subject": "Bom dia!",
  "html": "<p>Confira as novidades</p>",
  "scheduled_at": "2025-02-01T09:00:00Z"
}
```

**Benefícios:**
- Agendar campanhas para horário de pico
- Envio em timezone específico

---

## Roadmap Sugerido

### Fase 1: Analytics (Próximo passo)

| Item | Descrição |
|------|-----------|
| Webhook endpoint | `POST /api/v1/webhooks/resend` no Go |
| Tabela email_events | Armazenar eventos recebidos |
| Assinatura webhook | Validar `signing_secret` |
| Dashboard métricas | Opens, clicks, bounces por campanha |

**Estimativa:** 2-3 dias

### Fase 2: Melhorias de UX

| Item | Descrição |
|------|-----------|
| Tags por campanha | Adicionar tags automaticamente |
| Detalhes de campanha | Ver eventos individuais |
| Export de dados | CSV com métricas |

**Estimativa:** 1-2 dias

### Fase 3: Audiences (Opcional)

| Item | Descrição |
|------|-----------|
| Migrar para Resend Contacts | Sync de usuários opt-in |
| Usar Broadcasts | Substituir batch manual |
| Segmentação | Filtros por properties |

**Estimativa:** 3-5 dias

---

## Schema Proposto: email_events

```sql
CREATE TABLE email_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email_id TEXT NOT NULL,           -- ID do email no Resend
    campaign_id UUID REFERENCES email_campaigns(id),
    event_type TEXT NOT NULL,         -- sent, delivered, opened, clicked, bounced, complained
    recipient_email TEXT NOT NULL,
    payload JSONB,                     -- payload completo do webhook
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_email_events_campaign ON email_events(campaign_id);
CREATE INDEX idx_email_events_type ON email_events(event_type);
CREATE INDEX idx_email_events_email ON email_events(email_id);
```

---

## Referências

- [Resend API Docs](https://resend.com/docs/api-reference)
- [Webhooks Event Types](https://resend.com/docs/dashboard/webhooks/event-types)
- [Audiences Introduction](https://resend.com/docs/dashboard/audiences/introduction)
- [Broadcasts](https://resend.com/docs/dashboard/broadcasts/introduction)
