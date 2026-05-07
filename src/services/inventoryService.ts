import { supabase } from "@/integrations/supabase/client";

export const PRODUCTION_SOURCE_SYSTEM = "controle.ecoferro.com.br";

export const SALES_CHANNEL_OPTIONS = [
  { value: "website", label: "Website" },
  { value: "atacado", label: "Atacado" },
  { value: "mercado_livre", label: "Mercado Livre" },
  { value: "barracao", label: "Barracao / Loja local" },
  { value: "other", label: "Outro canal" },
] as const;

export const SALES_CHANNEL_LABELS: Record<string, string> = {
  website: "Website",
  atacado: "Atacado",
  mercado_livre: "Mercado Livre",
  barracao: "Barracao / Loja local",
  other: "Outro canal",
  retail: "Varejo",
  wholesale: "Atacado antigo",
  affiliate: "Afiliado",
  partner: "Parceiro",
};

export const MOVEMENT_TYPE_OPTIONS = [
  { value: "entry", label: "Entrada manual", signed: false },
  { value: "entry_from_production", label: "Entrada da producao", signed: false },
  { value: "sale", label: "Saida por venda", signed: false },
  { value: "reservation", label: "Reservar estoque", signed: false },
  { value: "release_reservation", label: "Liberar reserva", signed: false },
  { value: "return", label: "Devolucao", signed: false },
  { value: "damaged_loss", label: "Avaria / perda", signed: false },
  { value: "manual_adjustment", label: "Ajuste manual (+/-)", signed: true },
] as const;

export const MOVEMENT_TYPE_LABELS: Record<string, string> = {
  entry: "Entrada manual",
  entry_from_production: "Entrada da producao",
  exit: "Saida",
  sale: "Venda",
  reservation: "Reserva",
  release_reservation: "Liberacao de reserva",
  return: "Devolucao",
  adjustment: "Ajuste",
  manual_adjustment: "Ajuste manual",
  damaged_loss: "Avaria / perda",
  cancellation_reversal: "Reversao de cancelamento",
};

export const INTEGRATION_STATUS_LABELS: Record<string, string> = {
  pending: "Pendente",
  processed: "Processado",
  failed: "Falhou",
  ignored: "Ignorado",
  duplicate: "Duplicado",
};

export const INTEGRATION_STATUS_STYLES: Record<string, string> = {
  pending: "bg-amber-100 text-amber-700",
  processed: "bg-primary/10 text-primary",
  failed: "bg-destructive/10 text-destructive",
  ignored: "bg-muted text-muted-foreground",
  duplicate: "bg-blue-100 text-blue-700",
};

const supabaseAny = supabase as any;

export interface InventoryMovementInput {
  productId: string;
  type: string;
  quantity: number;
  reason?: string;
  channel?: string | null;
  sourceSystem?: string;
  sourceReference?: string | null;
  metadata?: Record<string, unknown>;
}

export async function recordInventoryMovement(input: InventoryMovementInput) {
  const { data, error } = await supabaseAny.rpc("record_inventory_movement", {
    p_product_id: input.productId,
    p_type: input.type,
    p_quantity: input.quantity,
    p_reason: input.reason ?? null,
    p_channel: input.channel ?? null,
    p_source_system: input.sourceSystem ?? "ecoferro-admin",
    p_source_reference: input.sourceReference ?? null,
    p_metadata: input.metadata ?? {},
  });

  if (error) throw error;
  return data;
}

export async function processOrderInventory(orderId: string) {
  const { data, error } = await supabaseAny.rpc("process_order_inventory", {
    p_order_id: orderId,
  });

  if (error) throw error;
  return data;
}

export async function updateOrderStatusWithInventory(orderId: string, status: string) {
  const { data, error } = await supabaseAny.rpc("update_order_status_with_inventory", {
    p_order_id: orderId,
    p_status: status,
  });

  if (error) throw error;
  return data;
}

export async function getProductionMapping(productId: string) {
  const { data, error } = await supabaseAny
    .from("product_external_mappings")
    .select("id, external_product_id, external_code, external_sku")
    .eq("product_id", productId)
    .eq("source_system", PRODUCTION_SOURCE_SYSTEM)
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function upsertProductionMapping(productId: string, mapping: {
  externalProductId?: string;
  externalCode?: string;
  externalSku?: string;
}) {
  const hasValues = [mapping.externalProductId, mapping.externalCode, mapping.externalSku].some(Boolean);

  if (!hasValues) {
    const { error } = await supabaseAny
      .from("product_external_mappings")
      .delete()
      .eq("product_id", productId)
      .eq("source_system", PRODUCTION_SOURCE_SYSTEM);

    if (error) throw error;
    return null;
  }

  const { data, error } = await supabaseAny
    .from("product_external_mappings")
    .upsert({
      product_id: productId,
      source_system: PRODUCTION_SOURCE_SYSTEM,
      external_product_id: mapping.externalProductId || null,
      external_code: mapping.externalCode || null,
      external_sku: mapping.externalSku || null,
      is_active: true,
      metadata: {
        updated_from: "admin_products_form",
      },
    }, { onConflict: "product_id,source_system" })
    .select("id")
    .single();

  if (error) throw error;
  return data;
}

export function normalizeManualMovementQuantity(type: string, rawQuantity: number) {
  if (type === "manual_adjustment") return rawQuantity;
  return Math.abs(rawQuantity);
}

export function formatSalesChannel(channel: string | null | undefined) {
  if (!channel) return "Sem canal";
  return SALES_CHANNEL_LABELS[channel] ?? channel;
}

export function formatMovementType(type: string | null | undefined) {
  if (!type) return "Sem tipo";
  return MOVEMENT_TYPE_LABELS[type] ?? type;
}

export function formatIntegrationStatus(status: string | null | undefined) {
  if (!status) return "Sem status";
  return INTEGRATION_STATUS_LABELS[status] ?? status;
}
