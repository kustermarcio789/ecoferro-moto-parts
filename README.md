# Welcome to your Lovable project

## Project info

**URL**: https://lovable.dev/projects/REPLACE_WITH_PROJECT_ID

## Portal Atacadista B2B (07/05/2026)

Portal completo para clientes atacadistas: cadastro com aprovação manual, login, catálogo
B2B com preços diferenciados, solicitação de pedidos com prazo desejado e acompanhamento
da produção em tempo real (% por etapa + previsão de entrega).

### Páginas

| Rota | Descrição |
| --- | --- |
| `/atacado` | Landing pública: cadastro de empresa + criar conta + login |
| `/atacado/painel` | Dashboard do atacadista (KPIs, pedidos recentes) |
| `/atacado/catalogo` | Catálogo B2B com qty + carrinho e prazo desejado |
| `/atacado/pedidos` | Lista de pedidos com progresso e previsão |
| `/atacado/pedidos/:id` | Timeline de etapas, % por etapa, datas previstas/reais |
| `/admin/producao` | Admin: edita % de cada etapa em cada pedido B2B |

### Migration

`supabase/migrations/20260507120000_wholesale_b2b_production_tracking.sql` adiciona:

- `production_stages` (catálogo de etapas: corte → soldagem → pintura → expedição). Sementes
  já incluídas (9 etapas com pesos somando 100%).
- `order_production_progress` (uma linha por etapa por pedido, com % e datas).
- Colunas em `orders`: `wholesale_customer_id`, `requested_delivery_date`,
  `production_started_at`, `estimated_delivery_at`, `overall_progress_percentage`,
  `atacadista_notes`.
- RPCs `create_wholesale_order`, `seed_order_production_progress`,
  `recalculate_order_progress`, `advance_order_stage_by_code`,
  `link_wholesale_to_current_user`.
- Trigger `auto_link_wholesale_on_signup_trigger`: ao criar conta no `auth.users`,
  qualquer linha `wholesale_customers` com mesmo e-mail é automaticamente vinculada.
- View `wholesale_orders_summary` para listagens rápidas no portal.
- Políticas RLS para o atacadista enxergar apenas os próprios pedidos e progresso.

Aplicar com `supabase db push` (ou Studio).

> Após aplicar a migration, regere os tipos TypeScript:
> ```sh
> npx supabase gen types typescript --linked > src/integrations/supabase/types.ts
> ```

### Importar planilha de produtos atacado

Para subir a planilha `Peças Atacado Ecoferro - 01-2026.ods` (281 produtos com imagens
embutidas):

1. **Extrair dados e imagens (Python):**
   ```sh
   pip install pyexcel-ods3
   python scripts/extract-wholesale-spreadsheet.py "C:\caminho\Peças Atacado Ecoferro - 01-2026 (1).ods"
   ```
   Gera `scripts/extracted/products.json` + pastas `scripts/extracted/images/<código>/`.

2. **Subir produtos + imagens para o Supabase (Node):**
   ```sh
   export SUPABASE_URL=https://xxxx.supabase.co
   export SUPABASE_SERVICE_ROLE_KEY=eyJ...        # Service role key, não a anon
   node scripts/import-wholesale-products.mjs
   ```
   Cria/atualiza `products`, faz upload em `storage/product-images/wholesale/<código>/N.jpg`
   e cria entradas em `product_images`. Use `--no-images` para pular o upload.

### Fluxo de uso

1. Atacadista preenche cadastro em `/atacado` (status `pending`). O CNPJ informado
   será o login dele depois.
2. Admin abre `/admin/atacado`, clica em **"Aprovar e gerar acesso"**. A Edge Function
   `wholesale-approve` cria o usuário em `auth.users`, gera senha provisória e marca
   `status='approved'`. O admin vê uma modal com **CNPJ + senha provisória** já formatada
   em mensagem do WhatsApp para copiar/enviar ao cliente. (Pode reenviar nova senha a
   qualquer momento usando o botão "Nova senha".)
3. Atacadista entra em `/atacado/login` informando **CNPJ ou e-mail** + senha.
   Quando o input parece um CNPJ, o frontend chama o RPC
   `get_wholesale_email_by_cnpj` para resolver o e-mail e então autentica.
4. No portal `/atacado/painel`, ele navega ao catálogo, monta pedido com prazo
   desejado e clica "Solicitar Pedido". O RPC `create_wholesale_order` cria o pedido
   com `sales_channel='wholesale'` e semeia as 9 etapas de produção com datas previstas.
5. Time admin abre `/admin/producao`, escolhe o pedido e ajusta % de cada etapa
   (slider, datas, operador, observações). O `overall_progress_percentage` e o
   `estimated_delivery_at` são recalculados automaticamente.
6. Atacadista vê a evolução em `/atacado/pedidos/:id` em tempo real.

### Edge Function: wholesale-approve

Aprovação do atacadista (gera credenciais). Deploy:

```sh
supabase functions deploy wholesale-approve
```

Variáveis de ambiente esperadas (já injetadas pelo Supabase):
`SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`.

A senha provisória é retornada apenas no JSON da resposta — não é persistida em texto
plano. O admin copia da modal e envia ao cliente. Para gerar nova senha, basta clicar
"Nova senha" na lista (chama a função com `action: "resend_password"`).

### Integração com `controle.ecoferro.com.br`

A função `process_production_sync` já existe. Para também atualizar o progresso do
pedido B2B vindo daquele sistema, use o RPC novo:

```sql
SELECT public.advance_order_stage_by_code(
  p_order_id        := '<order-uuid>',
  p_stage_code      := 'pintura',          -- código de production_stages
  p_percentage      := 75,
  p_status          := 'in_progress',
  p_operator_name   := 'Operador 1',
  p_notes           := 'Lote XPTO'
);
```

Códigos disponíveis: `recebimento`, `corte`, `dobra`, `soldagem`, `acabamento`,
`pintura`, `montagem`, `embalagem`, `expedicao`.

## Production inventory integration

The admin panel is now the source of truth for saleable stock after a product reaches the final production stage.

Key pieces added in this repo:

- Supabase migration `20260331170500_inventory_integration_hardening.sql`
- Edge Function `production-sync`
- Admin pages `/admin/estoque`, `/admin/movimentacoes`, `/admin/integracoes`

### Required secret

Set this secret for the receiving endpoint:

```env
PRODUCTION_SYNC_TOKEN=your-shared-secret
```

### Receiving endpoint

```text
POST {VITE_SUPABASE_URL}/functions/v1/production-sync
Authorization: Bearer {PRODUCTION_SYNC_TOKEN}
Content-Type: application/json
```

### Expected payload

```json
{
  "source_system": "controle.ecoferro.com.br",
  "event_id": "optional-idempotency-key",
  "source_reference": "box-1234",
  "product_code": "ECO-001",
  "sku": "ECO-001",
  "external_product_id": "optional-external-product-id",
  "quantity": 5,
  "stage": "final",
  "timestamp": "2026-03-31T17:00:00Z",
  "operator": {
    "name": "Operador 1"
  }
}
```

If product mapping fails, the event is logged in `integration_logs` with `failed` status and stock is not changed.

## How can I edit this code?

There are several ways of editing your application.

**Use Lovable**

Simply visit the [Lovable Project](https://lovable.dev/projects/REPLACE_WITH_PROJECT_ID) and start prompting.

Changes made via Lovable will be committed automatically to this repo.

**Use your preferred IDE**

If you want to work locally using your own IDE, you can clone this repo and push changes. Pushed changes will also be reflected in Lovable.

The only requirement is having Node.js & npm installed - [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating)

Follow these steps:

```sh
# Step 1: Clone the repository using the project's Git URL.
git clone <YOUR_GIT_URL>

# Step 2: Navigate to the project directory.
cd <YOUR_PROJECT_NAME>

# Step 3: Install the necessary dependencies.
npm i

# Step 4: Start the development server with auto-reloading and an instant preview.
npm run dev
```

**Edit a file directly in GitHub**

- Navigate to the desired file(s).
- Click the "Edit" button (pencil icon) at the top right of the file view.
- Make your changes and commit the changes.

**Use GitHub Codespaces**

- Navigate to the main page of your repository.
- Click on the "Code" button (green button) near the top right.
- Select the "Codespaces" tab.
- Click on "New codespace" to launch a new Codespace environment.
- Edit files directly within the Codespace and commit and push your changes once you're done.

## What technologies are used for this project?

This project is built with:

- Vite
- TypeScript
- React
- shadcn-ui
- Tailwind CSS

## How can I deploy this project?

Simply open [Lovable](https://lovable.dev/projects/REPLACE_WITH_PROJECT_ID) and click on Share -> Publish.

## Can I connect a custom domain to my Lovable project?

Yes, you can!

To connect a domain, navigate to Project > Settings > Domains and click Connect Domain.

Read more here: [Setting up a custom domain](https://docs.lovable.dev/features/custom-domain#custom-domain)
