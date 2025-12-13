# 📚 Plano de Organização da Documentação - MTW Promo

## 📋 Análise dos Documentos

### Documentos na Raiz (Total: 30+ arquivos .md)

#### ✅ Documentos Principais (Manter na raiz ou mover para docs/)
- `README.md` - **MANTER NA RAIZ** (ponto de entrada)
- `ARQUITETURA.md` - Mover para `docs/06-reference/`
- `INDICE_DOCUMENTACAO.md` - **ATUALIZAR** e mover para `docs/01-getting-started/`

#### 📖 Documentos de Início Rápido
- `GUIA_INSTALACAO.md` → `docs/02-setup-installation/`
- `CHECKLIST_SETUP.md` → `docs/02-setup-installation/`
- `GUIA_TESTE_RAPIDO.md` → `docs/02-setup-installation/`
- `COMANDOS_RAPIDOS.md` → `docs/02-setup-installation/`

#### 🎯 Documentos de Negócio
- `RESUMO_EXECUTIVO.md` → `docs/07-business/`
- `PROJETO_COMPLETO.md` → `docs/07-business/`
- `PROGRESSO.md` → `docs/07-business/`
- `SESSAO_RESUMO.md` → `docs/07-business/` (ou remover se desatualizado)

#### 📱 Documentos de Módulos
- `MOBILE_APP_COMPLETE.md` → `docs/03-modules/mobile-app/`
- `MOBILE_APP_PLAN.md` → `docs/03-modules/mobile-app/`
- `AUTO_SYNC_GUIDE.md` → `docs/03-modules/auto-sync/`
- `AUTO_FILL_GUIDE.md` → `docs/03-modules/auto-fill/`
- `AUTO_FILL_TROUBLESHOOTING.md` → `docs/05-troubleshooting/`

#### 🤖 Documentos de Bots
- `BOTS_DOCUMENTATION.md` → `docs/04-integrations/bots/`
- `BOTS_QUICK_START.md` → `docs/04-integrations/bots/`
- `BOTS_CHECKLIST.md` → `docs/04-integrations/bots/`
- `BOTS_INDEX.md` → `docs/04-integrations/bots/`
- `BOTS_README.md` → `docs/04-integrations/bots/`
- `BOTS_SUMMARY.md` → `docs/04-integrations/bots/`
- `BOTS_IMPLEMENTATION_COMPLETE.md` → `docs/04-integrations/bots/`
- `GUIA_CONFIGURACAO_WHATSAPP.md` → `docs/04-integrations/bots/` (NOVO)

#### 🛒 Documentos de Integrações (Mercado Livre)
- `MERCADOLIVRE_TOKEN_GUIDE.md` → `docs/04-integrations/mercadolivre/`
- `MELI_TOKEN_MANUAL.md` → `docs/04-integrations/mercadolivre/`
- `MELI_QUICK_START.md` → `docs/04-integrations/mercadolivre/`
- `MELI_FIX_HTTPS.md` → `docs/04-integrations/mercadolivre/`
- `MELI_SOLUCAO_SIMPLES.md` → `docs/04-integrations/mercadolivre/`
- `SOLUCAO_MELI_ALTERNATIVA.md` → `docs/04-integrations/mercadolivre/`
- `ATIVAR_MELI_AGORA.md` → `docs/04-integrations/mercadolivre/`
- `ATIVAR_MELI_CHECKLIST.md` → `docs/04-integrations/mercadolivre/`

#### 🎟️ Documentos de Cupons
- `MODULO_CAPTURA_CUPONS.md` → `docs/03-modules/coupons/`
- `MODULO_CAPTURA_CUPONS_RESUMO.md` → `docs/03-modules/coupons/`
- `SETUP_CAPTURA_CUPONS.md` → `docs/03-modules/coupons/`
- `ARQUIVOS_CRIADOS_CUPONS.md` → `docs/03-modules/coupons/` (ou remover se desatualizado)

#### 🔧 Documentos de Troubleshooting
- `EXECUTAR_MIGRATIONS.md` → `docs/05-troubleshooting/`

#### 📄 Documentos de Referência
- `ARQUITETURA.md` → `docs/06-reference/`

---

## 🗂️ Estrutura Final Proposta

```
MTW/
├── README.md (MANTER - atualizar links)
│
├── docs/
│   ├── 01-getting-started/
│   │   ├── INDICE_DOCUMENTACAO.md (ATUALIZADO)
│   │   └── README.md (novo - guia de navegação)
│   │
│   ├── 02-setup-installation/
│   │   ├── GUIA_INSTALACAO.md
│   │   ├── CHECKLIST_SETUP.md
│   │   ├── GUIA_TESTE_RAPIDO.md
│   │   ├── COMANDOS_RAPIDOS.md
│   │   └── EXECUTAR_MIGRATIONS.md
│   │
│   ├── 03-modules/
│   │   ├── mobile-app/
│   │   │   ├── MOBILE_APP_COMPLETE.md
│   │   │   └── MOBILE_APP_PLAN.md
│   │   ├── auto-sync/
│   │   │   └── AUTO_SYNC_GUIDE.md
│   │   ├── auto-fill/
│   │   │   └── AUTO_FILL_GUIDE.md
│   │   └── coupons/
│   │       ├── MODULO_CAPTURA_CUPONS.md
│   │       ├── MODULO_CAPTURA_CUPONS_RESUMO.md
│   │       └── SETUP_CAPTURA_CUPONS.md
│   │
│   ├── 04-integrations/
│   │   ├── bots/
│   │   │   ├── BOTS_DOCUMENTATION.md
│   │   │   ├── BOTS_QUICK_START.md
│   │   │   ├── BOTS_CHECKLIST.md
│   │   │   ├── BOTS_INDEX.md
│   │   │   ├── BOTS_README.md
│   │   │   ├── BOTS_SUMMARY.md
│   │   │   ├── BOTS_IMPLEMENTATION_COMPLETE.md
│   │   │   └── GUIA_CONFIGURACAO_WHATSAPP.md
│   │   └── mercadolivre/
│   │       ├── MERCADOLIVRE_TOKEN_GUIDE.md
│   │       ├── MELI_TOKEN_MANUAL.md
│   │       ├── MELI_QUICK_START.md
│   │       ├── MELI_FIX_HTTPS.md
│   │       ├── MELI_SOLUCAO_SIMPLES.md
│   │       ├── SOLUCAO_MELI_ALTERNATIVA.md
│   │       ├── ATIVAR_MELI_AGORA.md
│   │       └── ATIVAR_MELI_CHECKLIST.md
│   │
│   ├── 05-troubleshooting/
│   │   ├── AUTO_FILL_TROUBLESHOOTING.md
│   │   └── README.md (novo - índice de problemas)
│   │
│   ├── 06-reference/
│   │   ├── ARQUITETURA.md
│   │   └── README.md (novo - referência técnica)
│   │
│   └── 07-business/
│       ├── RESUMO_EXECUTIVO.md
│       ├── PROJETO_COMPLETO.md
│       ├── PROGRESSO.md
│       └── SESSAO_RESUMO.md (verificar se ainda relevante)
│
└── [outros arquivos do projeto]
```

---

## 🔍 Documentos para Revisar/Remover

### ⚠️ Possíveis Duplicatas ou Desatualizados
1. `SESSAO_RESUMO.md` - Verificar se ainda é relevante
2. `ARQUIVOS_CRIADOS_CUPONS.md` - Pode ser histórico, verificar
3. Múltiplos documentos sobre MELI - Consolidar se possível
4. `BOTS_INDEX.md` vs `BOTS_README.md` - Verificar se são diferentes

### 📝 Documentos que Precisam Atualização
1. `INDICE_DOCUMENTACAO.md` - Atualizar com nova estrutura
2. `README.md` - Atualizar links para nova estrutura
3. Documentos de MELI - Consolidar informações duplicadas

---

## ✅ Ações a Realizar

### Fase 1: Criar Estrutura ✅
- [x] Criar pastas docs/ com subpastas
- [ ] Criar README.md em cada pasta principal

### Fase 2: Mover Documentos
- [ ] Mover documentos para pastas apropriadas
- [ ] Atualizar links internos nos documentos

### Fase 3: Atualizar Referências
- [ ] Atualizar README.md principal
- [ ] Atualizar INDICE_DOCUMENTACAO.md
- [ ] Verificar e corrigir links quebrados

### Fase 4: Limpeza
- [ ] Revisar documentos duplicados
- [ ] Remover documentos desatualizados
- [ ] Consolidar informações similares

### Fase 5: Melhorias
- [ ] Criar README.md em cada pasta para navegação
- [ ] Adicionar sumários nos documentos longos
- [ ] Padronizar formatação

---

## 📊 Estatísticas

- **Total de documentos .md na raiz**: ~30
- **Documentos a mover**: ~28
- **Documentos a manter na raiz**: 1 (README.md)
- **Novos README.md a criar**: 7 (um por pasta principal)

---

**Status**: Estrutura criada, aguardando movimentação dos arquivos

