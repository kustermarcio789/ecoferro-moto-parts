import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, Boxes, ClipboardList, RefreshCw } from "lucide-react";
import AdminLayout from "@/components/admin/AdminLayout";
import InventoryMovementDialog from "@/components/admin/InventoryMovementDialog";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

type InventoryFilter = "all" | "low" | "out" | "reserved";

interface InventoryRow {
  id: string;
  name: string;
  sku: string | null;
  internal_code: string | null;
  available: number;
  reserved: number;
  damaged: number;
  threshold: number;
  lastMovementAt: string | null;
  status: "normal" | "low" | "out" | "reserved";
}

const supabaseAny = supabase as any;

const AdminInventory = () => {
  const { toast } = useToast();
  const [products, setProducts] = useState<InventoryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<InventoryFilter>("low");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);

  const fetchInventory = async () => {
    setLoading(true);

    const { data, error } = await supabaseAny
      .from("products")
      .select(`
        id,
        name,
        sku,
        internal_code,
        stock,
        min_stock,
        is_active,
        inventory_balances (
          available_quantity,
          reserved_quantity,
          damaged_quantity,
          low_stock_threshold,
          last_movement_at
        )
      `)
      .eq("is_active", true)
      .order("name");

    if (error) {
      toast({
        title: "Erro ao carregar estoque",
        description: error.message,
        variant: "destructive",
      });
      setProducts([]);
      setLoading(false);
      return;
    }

    const rows = (data || []).map((product: any) => {
      const balance = Array.isArray(product.inventory_balances)
        ? product.inventory_balances[0]
        : product.inventory_balances;

      const available = Number(balance?.available_quantity ?? product.stock ?? 0);
      const reserved = Number(balance?.reserved_quantity ?? 0);
      const damaged = Number(balance?.damaged_quantity ?? 0);
      const threshold = Number(balance?.low_stock_threshold ?? product.min_stock ?? 5);

      let status: InventoryRow["status"] = "normal";
      if (available <= 0) status = "out";
      else if (available <= threshold) status = "low";
      else if (reserved > 0) status = "reserved";

      return {
        id: product.id,
        name: product.name,
        sku: product.sku,
        internal_code: product.internal_code,
        available,
        reserved,
        damaged,
        threshold,
        lastMovementAt: balance?.last_movement_at ?? null,
        status,
      } satisfies InventoryRow;
    });

    setProducts(rows);
    setLoading(false);
  };

  useEffect(() => {
    fetchInventory();
  }, []);

  const filteredProducts = useMemo(() => {
    if (filter === "all") return products;
    if (filter === "low") return products.filter((product) => product.status === "low");
    if (filter === "out") return products.filter((product) => product.status === "out");
    return products.filter((product) => product.reserved > 0);
  }, [filter, products]);

  const metrics = useMemo(() => ({
    totalAvailable: products.reduce((sum, product) => sum + product.available, 0),
    reservedSkus: products.filter((product) => product.reserved > 0).length,
    lowStock: products.filter((product) => product.status === "low").length,
    rupture: products.filter((product) => product.status === "out").length,
  }), [products]);

  const productOptions = products.map((product) => ({
    id: product.id,
    name: product.name,
    sku: product.sku,
    internal_code: product.internal_code,
  }));

  const formatDate = (value: string | null) => {
    if (!value) return "Sem registro";
    return new Date(value).toLocaleString("pt-BR");
  };

  return (
    <AdminLayout title="Controle de Estoque">
      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-xl border border-border bg-card p-5">
          <span className="text-xs font-body uppercase tracking-wider text-muted-foreground">
            Disponivel para venda
          </span>
          <p className="mt-2 font-display text-3xl font-bold text-foreground">
            {metrics.totalAvailable}
          </p>
        </div>
        <div className="rounded-xl border border-border bg-card p-5">
          <span className="text-xs font-body uppercase tracking-wider text-muted-foreground">
            Itens com reserva
          </span>
          <p className="mt-2 font-display text-3xl font-bold text-blue-600">
            {metrics.reservedSkus}
          </p>
        </div>
        <div className="rounded-xl border border-border bg-card p-5">
          <span className="text-xs font-body uppercase tracking-wider text-muted-foreground">
            Estoque baixo
          </span>
          <p className="mt-2 font-display text-3xl font-bold text-amber-600">
            {metrics.lowStock}
          </p>
        </div>
        <div className="rounded-xl border border-border bg-card p-5">
          <span className="text-xs font-body uppercase tracking-wider text-muted-foreground">
            Ruptura
          </span>
          <p className="mt-2 font-display text-3xl font-bold text-destructive">
            {metrics.rupture}
          </p>
        </div>
      </div>

      <div className="mb-6 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap gap-2">
          {[
            { key: "low" as const, label: "Estoque baixo" },
            { key: "out" as const, label: "Ruptura" },
            { key: "reserved" as const, label: "Reservados" },
            { key: "all" as const, label: "Todos" },
          ].map((currentFilter) => (
            <button
              key={currentFilter.key}
              onClick={() => setFilter(currentFilter.key)}
              className={`rounded-lg px-4 py-2 text-xs font-display uppercase tracking-wider transition-colors ${
                filter === currentFilter.key
                  ? "bg-primary text-primary-foreground"
                  : "border border-border bg-card text-foreground hover:bg-muted"
              }`}
            >
              {currentFilter.label}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={fetchInventory}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Atualizar
          </Button>
          <Button
            onClick={() => {
              setSelectedProductId(null);
              setDialogOpen(true);
            }}
          >
            <ClipboardList className="mr-2 h-4 w-4" />
            Nova movimentacao
          </Button>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-border bg-card">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="p-4 text-left text-xs font-display uppercase tracking-wider text-muted-foreground">Produto</th>
                <th className="p-4 text-left text-xs font-display uppercase tracking-wider text-muted-foreground">Codigo</th>
                <th className="p-4 text-center text-xs font-display uppercase tracking-wider text-muted-foreground">Disponivel</th>
                <th className="p-4 text-center text-xs font-display uppercase tracking-wider text-muted-foreground">Reservado</th>
                <th className="p-4 text-center text-xs font-display uppercase tracking-wider text-muted-foreground">Minimo</th>
                <th className="p-4 text-center text-xs font-display uppercase tracking-wider text-muted-foreground">Status</th>
                <th className="p-4 text-left text-xs font-display uppercase tracking-wider text-muted-foreground">Ultima movimentacao</th>
                <th className="p-4 text-right text-xs font-display uppercase tracking-wider text-muted-foreground">Acoes</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 6 }).map((_, index) => (
                  <tr key={index}>
                    <td colSpan={8} className="p-4">
                      <div className="h-12 animate-pulse rounded bg-muted" />
                    </td>
                  </tr>
                ))
              ) : filteredProducts.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-12 text-center text-muted-foreground font-body">
                    Nenhum produto encontrado para o filtro atual.
                  </td>
                </tr>
              ) : (
                filteredProducts.map((product) => (
                  <tr key={product.id} className="border-b border-border transition-colors hover:bg-muted/30">
                    <td className="p-4 font-body font-medium text-foreground">{product.name}</td>
                    <td className="p-4 text-xs font-body text-muted-foreground">
                      {product.internal_code || product.sku || "-"}
                    </td>
                    <td className="p-4 text-center">
                      <span className={`inline-flex rounded px-3 py-1 text-xs font-body font-bold ${
                        product.available <= 0
                          ? "bg-destructive/10 text-destructive"
                          : product.available <= product.threshold
                            ? "bg-amber-100 text-amber-700"
                            : "bg-primary/10 text-primary"
                      }`}>
                        {product.available}
                      </span>
                    </td>
                    <td className="p-4 text-center text-xs font-body text-blue-700">{product.reserved}</td>
                    <td className="p-4 text-center text-xs font-body text-muted-foreground">{product.threshold}</td>
                    <td className="p-4 text-center">
                      {product.status === "out" ? (
                        <span className="inline-flex items-center gap-1 text-xs font-body text-destructive">
                          <AlertTriangle className="h-3.5 w-3.5" />
                          Ruptura
                        </span>
                      ) : product.status === "low" ? (
                        <span className="text-xs font-body text-amber-700">Estoque baixo</span>
                      ) : product.status === "reserved" ? (
                        <span className="text-xs font-body text-blue-700">Com reserva</span>
                      ) : (
                        <span className="text-xs font-body text-primary">Normal</span>
                      )}
                    </td>
                    <td className="p-4 text-xs font-body text-muted-foreground">{formatDate(product.lastMovementAt)}</td>
                    <td className="p-4 text-right">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSelectedProductId(product.id);
                          setDialogOpen(true);
                        }}
                      >
                        <Boxes className="mr-2 h-4 w-4" />
                        Movimentar
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <InventoryMovementDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        products={productOptions}
        defaultProductId={selectedProductId}
        onSaved={fetchInventory}
      />
    </AdminLayout>
  );
};

export default AdminInventory;
