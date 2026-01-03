# Runbook: Migracao para Schema `flip`

## Contexto

Migration 0012 move todas as tabelas de `public` para schema `flip`.
Requer coordenacao manual para evitar downtime.

---

## Pre-Requisitos

- [ ] Acesso SSH ao servidor (VPS)
- [ ] Horario de baixo uso (recomendado: madrugada)
- [ ] Backup do banco feito

---

## Passos

### FASE 1: Preparar Servidor (ANTES do merge)

```bash
# 1. SSH no servidor
ssh user@vps

# 2. Ir para diretorio do projeto
cd /opt/stacks/meuflip

# 3. Backup do banco (OBRIGATORIO)
docker exec supabase-db pg_dump -U postgres postgres > backup_$(date +%Y%m%d_%H%M%S).sql

# 4. Editar .env - adicionar search_path
nano .env

# Alterar linha DATABASE_URL de:
DATABASE_URL=postgres://postgres:xxx@supabase-db:5432/postgres?sslmode=disable

# Para (com aspas por causa do &):
DATABASE_URL="postgres://postgres:xxx@supabase-db:5432/postgres?sslmode=disable&options=-c%20search_path%3Dflip"
```

### FASE 2: Deploy

```bash
# Opcao A: Trigger automatico
# Fazer merge da branch em main no GitHub

# Opcao B: Manual no servidor
git pull
source .env
docker run --rm \
  -v "$(pwd)/migrations:/migrations" \
  --network supabase_default \
  migrate/migrate:v4.17.1 \
  -path=/migrations \
  -database="$DATABASE_URL" \
  up

docker compose -f docker-compose.prod.yml pull
docker compose -f docker-compose.prod.yml up -d
```

### FASE 3: Validacao

```bash
# 1. Verificar containers rodando
docker ps --format "table {{.Names}}\t{{.Status}}" | grep meuflip

# 2. Verificar logs da API
docker logs meuflip-api --tail 50

# 3. Verificar logs do Web
docker logs meuflip-web --tail 50

# 4. Testar healthchecks
curl -s http://localhost:8080/api/v1/health
curl -s http://localhost:3000/api/health

# 5. Verificar tabelas no schema flip
docker exec supabase-db psql -U postgres -c "SELECT table_name FROM information_schema.tables WHERE table_schema = 'flip';"
```

---

## Rollback (Se Necessario)

```bash
# 1. SSH no servidor
cd /opt/stacks/meuflip

# 2. Reverter DATABASE_URL (remover search_path)
nano .env
# Voltar para: DATABASE_URL=postgres://...?sslmode=disable

# 3. Rodar down migration
source .env
docker run --rm \
  -v "$(pwd)/migrations:/migrations" \
  --network supabase_default \
  migrate/migrate:v4.17.1 \
  -path=/migrations \
  -database="postgres://postgres:xxx@supabase-db:5432/postgres?sslmode=disable" \
  down 1

# 4. Restart containers
docker compose -f docker-compose.prod.yml restart

# 5. Verificar tabelas voltaram para public
docker exec supabase-db psql -U postgres -c "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_type = 'BASE TABLE';"
```

---

## Troubleshooting

### API nao conecta apos deploy

```bash
# Verificar search_path esta correto
docker exec supabase-db psql -U postgres -c "SHOW search_path;"

# Verificar DATABASE_URL no container
docker exec meuflip-api printenv DATABASE_URL
```

### Better Auth nao encontra tabelas

```bash
# Verificar tabela user existe em flip
docker exec supabase-db psql -U postgres -c "SELECT * FROM flip.\"user\" LIMIT 1;"
```

### Migration falhou no meio

```bash
# Ver estado das migrations
docker run --rm \
  -v "$(pwd)/migrations:/migrations" \
  --network supabase_default \
  migrate/migrate:v4.17.1 \
  -path=/migrations \
  -database="$DATABASE_URL" \
  version

# Forcar versao especifica se necessario
docker run --rm \
  -v "$(pwd)/migrations:/migrations" \
  --network supabase_default \
  migrate/migrate:v4.17.1 \
  -path=/migrations \
  -database="$DATABASE_URL" \
  force 11
```

---

## Checklist Final

- [ ] Backup feito antes de iniciar
- [ ] `.env` do servidor atualizado com search_path
- [ ] Deploy executado (merge ou manual)
- [ ] Containers healthy
- [ ] Login funcionando (Better Auth)
- [ ] Listagem de workspaces funcionando
- [ ] Tabelas existem em schema `flip`
