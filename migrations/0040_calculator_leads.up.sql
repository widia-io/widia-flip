CREATE TABLE flip.calculator_leads (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  whatsapp TEXT NOT NULL,
  purchase_price NUMERIC(14, 2),
  renovation_cost NUMERIC(14, 2),
  other_costs NUMERIC(14, 2),
  sale_price NUMERIC(14, 2),
  roi NUMERIC(10, 4) NOT NULL,
  net_profit NUMERIC(14, 2) NOT NULL,
  investment_total NUMERIC(14, 2) NOT NULL,
  is_partial BOOLEAN NOT NULL DEFAULT false,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX idx_calculator_leads_email ON flip.calculator_leads(email);
CREATE INDEX idx_calculator_leads_created_at ON flip.calculator_leads(created_at DESC);
CREATE INDEX idx_calculator_leads_roi ON flip.calculator_leads(roi DESC);
