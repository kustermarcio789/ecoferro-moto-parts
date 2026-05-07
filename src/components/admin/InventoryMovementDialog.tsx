import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import {
  MOVEMENT_TYPE_OPTIONS,
  PRODUCTION_SOURCE_SYSTEM,
  SALES_CHANNEL_OPTIONS,
  normalizeManualMovementQuantity,
  recordInventoryMovement,
} from "@/services/inventoryService";

interface ProductOption {
  id: string;
  name: string;
  sku?: string | null;
  internal_code?: string | null;
}

interface InventoryMovementDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  products: ProductOption[];
  defaultProductId?: string | null;
  onSaved?: () => void | Promise<void>;
}

const defaultType = "manual_adjustment";

const InventoryMovementDialog = ({
  open,
  onOpenChange,
  products,
  defaultProductId,
  onSaved,
}: InventoryMovementDialogProps) => {
  const { toast } = useToast();
  const [productId, setProductId] = useState(defaultProductId ?? "");
  const [type, setType] = useState<string>(defaultType);
  const [quantity, setQuantity] = useState<string>("0");
  const [channel, setChannel] = useState<string>("website");
  const [reason, setReason] = useState("");
  const [sourceReference, setSourceReference] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setProductId(defaultProductId ?? "");
      setType(defaultType);
      setQuantity("0");
      setChannel("website");
      setReason("");
      setSourceReference("");
    }
  }, [defaultProductId, open]);

  const selectedMovement = useMemo(
    () => MOVEMENT_TYPE_OPTIONS.find((option) => option.value === type),
    [type],
  );

  const isSale = type === "sale";
  const isProductionEntry = type === "entry_from_production";

  const handleSubmit = async () => {
    const parsedQuantity = Number(quantity);
    const normalizedQuantity = normalizeManualMovementQuantity(type, parsedQuantity);

    if (!productId) {
      toast({ title: "Selecione um produto", variant: "destructive" });
      return;
    }

    if (!Number.isFinite(parsedQuantity) || normalizedQuantity === 0) {
      toast({ title: "Informe uma quantidade valida", variant: "destructive" });
      return;
    }

    if (!selectedMovement) {
      toast({ title: "Selecione um tipo de movimentacao", variant: "destructive" });
      return;
    }

    setSaving(true);

    try {
      await recordInventoryMovement({
        productId,
        type,
        quantity: normalizedQuantity,
        channel: isSale ? channel : isProductionEntry ? "production" : null,
        reason: reason || selectedMovement.label,
        sourceSystem: isProductionEntry ? PRODUCTION_SOURCE_SYSTEM : "ecoferro-admin",
        sourceReference: sourceReference || null,
        metadata: {
          manually_triggered: true,
        },
      });

      toast({ title: "Movimentacao registrada" });
      onOpenChange(false);
      await onSaved?.();
    } catch (error: any) {
      toast({
        title: "Erro ao registrar movimentacao",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-display uppercase tracking-wider">
            Nova Movimentacao
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div>
            <label className="mb-1 block text-xs font-body font-medium text-foreground">Produto</label>
            <Select value={productId || "none"} onValueChange={(value) => setProductId(value === "none" ? "" : value)}>
              <SelectTrigger className="font-body text-sm">
                <SelectValue placeholder="Selecione um produto" />
              </SelectTrigger>
              <SelectContent className="max-h-80">
                <SelectItem value="none">Selecione</SelectItem>
                {products.map((product) => (
                  <SelectItem key={product.id} value={product.id}>
                    {product.name}
                    {product.internal_code ? ` - ${product.internal_code}` : product.sku ? ` - ${product.sku}` : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-body font-medium text-foreground">Tipo</label>
              <Select value={type} onValueChange={setType}>
                <SelectTrigger className="font-body text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {MOVEMENT_TYPE_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="mb-1 block text-xs font-body font-medium text-foreground">
                Quantidade
              </label>
              <Input
                type="number"
                step="1"
                min={selectedMovement?.signed ? undefined : 1}
                value={quantity}
                onChange={(event) => setQuantity(event.target.value)}
                placeholder={selectedMovement?.signed ? "Use valor positivo ou negativo" : "Ex: 5"}
              />
            </div>
          </div>

          {isSale && (
            <div>
              <label className="mb-1 block text-xs font-body font-medium text-foreground">Canal</label>
              <Select value={channel} onValueChange={setChannel}>
                <SelectTrigger className="font-body text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SALES_CHANNEL_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div>
            <label className="mb-1 block text-xs font-body font-medium text-foreground">
              Referencia de origem
            </label>
            <Input
              value={sourceReference}
              onChange={(event) => setSourceReference(event.target.value)}
              placeholder="Pedido, lote, caixa ou protocolo"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-body font-medium text-foreground">Motivo</label>
            <Input
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              placeholder="Descreva o motivo da movimentacao"
            />
          </div>

          <div className="rounded-lg border border-border bg-muted/40 p-3 text-xs font-body text-muted-foreground">
            Toda movimentacao gera trilha de auditoria com saldo anterior, saldo novo, canal, origem e horario.
          </div>

          <div className="flex justify-end gap-3 border-t border-border pt-4">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSubmit} disabled={saving}>
              {saving ? "Salvando..." : "Registrar"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default InventoryMovementDialog;
