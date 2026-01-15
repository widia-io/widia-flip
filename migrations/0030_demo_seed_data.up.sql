-- Demo seed data for landing page screenshots
-- IMPORTANTE: Este seed usa um user_id placeholder que deve existir no banco
-- Para usar: crie uma conta, pegue o user_id da tabela flip.user, e atualize abaixo

DO $$
DECLARE
  demo_user_id text;
  demo_workspace_id uuid;
  prop1_id uuid;
  prop2_id uuid;
  prop3_id uuid;
  prop4_id uuid;
  prop5_id uuid;
BEGIN
  -- Pegar o primeiro user existente (ou criar um placeholder)
  SELECT id INTO demo_user_id FROM flip.user LIMIT 1;

  IF demo_user_id IS NULL THEN
    RAISE NOTICE 'Nenhum usuário encontrado. Crie uma conta primeiro.';
    RETURN;
  END IF;

  -- Verificar se já existe workspace demo
  SELECT id INTO demo_workspace_id FROM flip.workspaces WHERE name = 'Demo - Screenshots' LIMIT 1;

  IF demo_workspace_id IS NOT NULL THEN
    RAISE NOTICE 'Workspace demo já existe. Pulando seed.';
    RETURN;
  END IF;

  -- 1. Criar workspace demo
  INSERT INTO flip.workspaces (id, name, created_by_user_id)
  VALUES (gen_random_uuid(), 'Demo - Screenshots', demo_user_id)
  RETURNING id INTO demo_workspace_id;

  -- Membership
  INSERT INTO flip.workspace_memberships (workspace_id, user_id, role)
  VALUES (demo_workspace_id, demo_user_id, 'owner');

  -- Settings com taxas BR
  INSERT INTO flip.workspace_settings (workspace_id, pj_tax_rate, itbi_rate, registry_rate, broker_rate, default_renovation_cost)
  VALUES (demo_workspace_id, 0.0653, 0.03, 0.01, 0.06, 80000);

  -- 2. Criar 5 properties com diferentes status
  INSERT INTO flip.properties (id, workspace_id, status_pipeline, neighborhood, address, area_usable)
  VALUES
    (gen_random_uuid(), demo_workspace_id, 'analyzing', 'Pinheiros', 'Rua dos Pinheiros, 1200 - Apto 82', 85)
  RETURNING id INTO prop1_id;

  INSERT INTO flip.properties (id, workspace_id, status_pipeline, neighborhood, address, area_usable)
  VALUES
    (gen_random_uuid(), demo_workspace_id, 'negotiating', 'Vila Madalena', 'Rua Harmonia, 450 - Apto 34', 72)
  RETURNING id INTO prop2_id;

  INSERT INTO flip.properties (id, workspace_id, status_pipeline, neighborhood, address, area_usable)
  VALUES
    (gen_random_uuid(), demo_workspace_id, 'purchased', 'Itaim Bibi', 'Alameda Santos, 2000 - Apto 121', 95)
  RETURNING id INTO prop3_id;

  INSERT INTO flip.properties (id, workspace_id, status_pipeline, neighborhood, address, area_usable)
  VALUES
    (gen_random_uuid(), demo_workspace_id, 'renovating', 'Moema', 'Av. Ibirapuera, 3000 - Apto 65', 110)
  RETURNING id INTO prop4_id;

  INSERT INTO flip.properties (id, workspace_id, status_pipeline, neighborhood, address, area_usable)
  VALUES
    (gen_random_uuid(), demo_workspace_id, 'sold', 'Jardins', 'Rua Oscar Freire, 800 - Apto 42', 68)
  RETURNING id INTO prop5_id;

  -- 3. Analysis inputs para cada property
  INSERT INTO flip.analysis_cash_inputs (property_id, workspace_id, purchase_price, renovation_cost, other_costs, sale_price)
  VALUES
    (prop1_id, demo_workspace_id, 680000, 85000, 15000, 950000),
    (prop2_id, demo_workspace_id, 520000, 65000, 12000, 720000),
    (prop3_id, demo_workspace_id, 890000, 120000, 25000, 1250000),
    (prop4_id, demo_workspace_id, 750000, 95000, 18000, 1050000),
    (prop5_id, demo_workspace_id, 480000, 55000, 10000, 680000);

  -- 4. Snapshots com diferentes ROIs
  INSERT INTO flip.analysis_cash_snapshots (property_id, workspace_id, inputs, outputs, created_at)
  VALUES
    (prop1_id, demo_workspace_id,
     '{"purchase_price": 680000, "renovation_cost": 85000, "other_costs": 15000, "sale_price": 950000}'::jsonb,
     '{"net_profit": 112500, "roi": 14.4, "total_cost": 837500, "gross_profit": 170000}'::jsonb,
     now() - interval '2 days'),
    (prop1_id, demo_workspace_id,
     '{"purchase_price": 680000, "renovation_cost": 90000, "other_costs": 15000, "sale_price": 980000}'::jsonb,
     '{"net_profit": 138000, "roi": 17.6, "total_cost": 842000, "gross_profit": 205000}'::jsonb,
     now() - interval '1 day'),
    (prop2_id, demo_workspace_id,
     '{"purchase_price": 520000, "renovation_cost": 65000, "other_costs": 12000, "sale_price": 720000}'::jsonb,
     '{"net_profit": 85000, "roi": 14.2, "total_cost": 635000, "gross_profit": 123000}'::jsonb,
     now() - interval '5 days'),
    (prop3_id, demo_workspace_id,
     '{"purchase_price": 890000, "renovation_cost": 120000, "other_costs": 25000, "sale_price": 1250000}'::jsonb,
     '{"net_profit": 152000, "roi": 14.7, "total_cost": 1098000, "gross_profit": 215000}'::jsonb,
     now() - interval '3 days'),
    (prop4_id, demo_workspace_id,
     '{"purchase_price": 750000, "renovation_cost": 95000, "other_costs": 18000, "sale_price": 1050000}'::jsonb,
     '{"net_profit": 128000, "roi": 14.8, "total_cost": 922000, "gross_profit": 187000}'::jsonb,
     now() - interval '1 day'),
    (prop5_id, demo_workspace_id,
     '{"purchase_price": 480000, "renovation_cost": 55000, "other_costs": 10000, "sale_price": 680000}'::jsonb,
     '{"net_profit": 95000, "roi": 17.4, "total_cost": 585000, "gross_profit": 135000}'::jsonb,
     now() - interval '30 days'),
    -- Algumas análises com ROI negativo para variar
    (prop2_id, demo_workspace_id,
     '{"purchase_price": 520000, "renovation_cost": 85000, "other_costs": 12000, "sale_price": 650000}'::jsonb,
     '{"net_profit": -8000, "roi": -1.3, "total_cost": 658000, "gross_profit": 33000}'::jsonb,
     now() - interval '10 days'),
    (prop3_id, demo_workspace_id,
     '{"purchase_price": 890000, "renovation_cost": 150000, "other_costs": 30000, "sale_price": 1100000}'::jsonb,
     '{"net_profit": -35000, "roi": -3.3, "total_cost": 1135000, "gross_profit": 30000}'::jsonb,
     now() - interval '15 days');

  -- 5. Cost items (15 custos variados)
  INSERT INTO flip.cost_items (workspace_id, property_id, cost_type, category, status, amount, due_date, vendor, notes)
  VALUES
    -- Prop3 (em obra) - custos pagos
    (demo_workspace_id, prop3_id, 'renovation', 'Pintura', 'paid', 12000, now() - interval '10 days', 'João Pinturas', 'Pintura completa 3 demãos'),
    (demo_workspace_id, prop3_id, 'renovation', 'Elétrica', 'paid', 8500, now() - interval '8 days', 'Eletrika SP', 'Troca de fiação completa'),
    (demo_workspace_id, prop3_id, 'renovation', 'Hidráulica', 'paid', 6200, now() - interval '6 days', 'HidroFix', 'Troca registros e encanamento'),
    (demo_workspace_id, prop3_id, 'legal', 'ITBI', 'paid', 26700, now() - interval '20 days', 'Prefeitura SP', NULL),
    (demo_workspace_id, prop3_id, 'legal', 'Registro', 'paid', 8900, now() - interval '18 days', 'Cartório 15º RI', NULL),
    -- Prop4 (em renovação) - mix paid/planned
    (demo_workspace_id, prop4_id, 'renovation', 'Pintura', 'paid', 15000, now() - interval '5 days', 'Tintas Premium', 'Apartamento 110m2'),
    (demo_workspace_id, prop4_id, 'renovation', 'Piso', 'paid', 22000, now() - interval '3 days', 'Pisos & Cia', 'Porcelanato 80x80'),
    (demo_workspace_id, prop4_id, 'renovation', 'Marcenaria', 'planned', 35000, now() + interval '7 days', 'Móveis Planejados SP', 'Cozinha e closet'),
    (demo_workspace_id, prop4_id, 'renovation', 'Gesso', 'planned', 8000, now() + interval '3 days', 'Gesso Arte', 'Forro e sancas'),
    (demo_workspace_id, prop4_id, 'renovation', 'Serralheria', 'planned', 4500, now() + interval '10 days', 'Metal Design', 'Grades e portão'),
    -- Prop1 (analyzing) - custos estimados
    (demo_workspace_id, prop1_id, 'renovation', 'Pintura', 'planned', 10000, now() + interval '30 days', NULL, 'Estimativa'),
    (demo_workspace_id, prop1_id, 'renovation', 'Elétrica', 'planned', 7000, now() + interval '35 days', NULL, 'Estimativa'),
    (demo_workspace_id, prop1_id, 'legal', 'ITBI', 'planned', 20400, now() + interval '45 days', NULL, '3% sobre 680k'),
    -- Prop5 (vendido) - todos pagos
    (demo_workspace_id, prop5_id, 'tax', 'Corretagem Venda', 'paid', 40800, now() - interval '25 days', 'Imobiliária XYZ', '6% sobre 680k'),
    (demo_workspace_id, prop5_id, 'tax', 'Imposto PJ', 'paid', 31400, now() - interval '20 days', 'Contabilidade', '6.53% sobre lucro');

  -- 6. Suppliers (8 fornecedores)
  INSERT INTO flip.suppliers (workspace_id, name, phone, email, category, notes, rating, hourly_rate)
  VALUES
    (demo_workspace_id, 'João Pinturas', '11 98765-4321', 'joao@pinturas.com', 'pintura', 'Trabalho impecável, sempre no prazo', 5, 80),
    (demo_workspace_id, 'Eletrika SP', '11 97654-3210', 'contato@eletrikasp.com.br', 'eletrica', 'Certificado NR10, ótimo custo-benefício', 5, 120),
    (demo_workspace_id, 'HidroFix Encanamentos', '11 96543-2109', NULL, 'hidraulica', 'Atende emergências', 4, 90),
    (demo_workspace_id, 'Arq. Marina Silva', '11 95432-1098', 'marina@arquitetura.com', 'arquitetura', 'Projetos modernos, 3D incluso', 5, 200),
    (demo_workspace_id, 'Gesso Arte', '11 94321-0987', NULL, 'gesso', 'Especialista em sancas e iluminação', 4, 70),
    (demo_workspace_id, 'Pisos & Acabamentos', '11 93210-9876', 'vendas@pisos.com.br', 'piso', 'Porcelanatos importados', 4, NULL),
    (demo_workspace_id, 'Metal Design Serralheria', '11 92109-8765', NULL, 'serralheria', 'Trabalhos personalizados', 3, 100),
    (demo_workspace_id, 'Limpeza Total', '11 91098-7654', 'orcamento@limpezatotal.com', 'limpeza', 'Limpeza pós-obra completa', 5, 50);

  -- 7. Schedule items (cronograma prop4)
  INSERT INTO flip.schedule_items (property_id, workspace_id, title, planned_date, done_at, notes, order_index, category, estimated_cost)
  VALUES
    (prop4_id, demo_workspace_id, 'Demolição e preparação', now() - interval '15 days', now() - interval '14 days', 'Remoção de revestimentos antigos', 1, 'Preparação', 2000),
    (prop4_id, demo_workspace_id, 'Instalação elétrica', now() - interval '12 days', now() - interval '10 days', 'Nova fiação e quadro', 2, 'Elétrica', 8500),
    (prop4_id, demo_workspace_id, 'Instalação hidráulica', now() - interval '10 days', now() - interval '8 days', 'Pontos de água e esgoto', 3, 'Hidráulica', 6000),
    (prop4_id, demo_workspace_id, 'Forro de gesso', now() - interval '5 days', NULL, 'Aguardando material', 4, 'Gesso', 8000),
    (prop4_id, demo_workspace_id, 'Pintura 1ª demão', now(), NULL, NULL, 5, 'Pintura', 5000),
    (prop4_id, demo_workspace_id, 'Instalação de piso', now() + interval '3 days', NULL, 'Porcelanato 80x80', 6, 'Piso', 22000),
    (prop4_id, demo_workspace_id, 'Marcenaria - Cozinha', now() + interval '10 days', NULL, 'Móveis planejados', 7, 'Marcenaria', 20000),
    (prop4_id, demo_workspace_id, 'Marcenaria - Closet', now() + interval '12 days', NULL, NULL, 8, 'Marcenaria', 15000),
    (prop4_id, demo_workspace_id, 'Pintura final', now() + interval '15 days', NULL, '2ª e 3ª demão', 9, 'Pintura', 10000),
    (prop4_id, demo_workspace_id, 'Limpeza final', now() + interval '18 days', NULL, 'Pós-obra completa', 10, 'Limpeza', 1500);

  -- 8. Timeline events
  INSERT INTO flip.timeline_events (property_id, workspace_id, event_type, payload, actor_user_id, created_at)
  VALUES
    (prop3_id, demo_workspace_id, 'status_change', '{"from": "analyzing", "to": "negotiating"}'::jsonb, demo_user_id, now() - interval '25 days'),
    (prop3_id, demo_workspace_id, 'status_change', '{"from": "negotiating", "to": "purchased"}'::jsonb, demo_user_id, now() - interval '20 days'),
    (prop4_id, demo_workspace_id, 'status_change', '{"from": "analyzing", "to": "purchased"}'::jsonb, demo_user_id, now() - interval '18 days'),
    (prop4_id, demo_workspace_id, 'status_change', '{"from": "purchased", "to": "renovating"}'::jsonb, demo_user_id, now() - interval '15 days'),
    (prop5_id, demo_workspace_id, 'status_change', '{"from": "renovating", "to": "selling"}'::jsonb, demo_user_id, now() - interval '35 days'),
    (prop5_id, demo_workspace_id, 'status_change', '{"from": "selling", "to": "sold"}'::jsonb, demo_user_id, now() - interval '25 days'),
    (prop1_id, demo_workspace_id, 'snapshot_created', '{"roi": 14.4}'::jsonb, demo_user_id, now() - interval '2 days'),
    (prop1_id, demo_workspace_id, 'snapshot_created', '{"roi": 17.6}'::jsonb, demo_user_id, now() - interval '1 day');

  RAISE NOTICE 'Seed data criado com sucesso! Workspace ID: %', demo_workspace_id;
END $$;
