import { useEffect, useMemo, useState } from "react";
import AdminLayout from "@/components/admin/AdminLayout";
import { supabase } from "@/integrations/supabase/client";
import { formatMovementType, formatSalesChannel, MOVEMENT_TYPE_OPTIONS } from "@/services/inventoryService";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const supabaseAny = supabase as any;

const AdminMovements = () => {
  const [movements, setMovements] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState("all");

  const fetchMovements = async () => {
    setLoading(true);

    let query = supabaseAny
      .from("inventory_movements")
      .select(`
        id,
        type,
        quantity,
        previous_stock,
        new_stock,
        previous_reserved,
        new_reserved,
        reason,
        channel,
        source_system,
        source_reference,
        created_at,
        products (
          name,
          sku,
          internal_code
        )
      `)
      .order("created_at", { ascending: false })
      .limit(150);

    if (typeFilter !== "all") query = query.eq("type", typeFilter);

    const { data } = await query;
    setMovements(data || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchMovements();
  }, [typeFilter]);

  const summary = useMemo(() => ({
    total: movements.length,
    entradas: movements.filter((movement) =>
      ["entry", "entry_from_production", "return", "cancellation_reversal"].includes(movement.type),
    ).length,
    saidas: movements.filter((movement) =>
      ["sale", "exit", "damaged_loss"].includes(movement.type),
    ).length,
    reservas: movements.filter((movement) =>
      ["reservation", "release_reservation"].includes(movement.type),
    ).length,
  }), [movements]);

  return (
    <AdminLayout title="Movimentacoes">
      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-xl border border-border bg-card p-5">
          <span className="text-xs font-body uppercase tracking-wider text-muted-foreground">Registros listados</span>
          <p className="mt-2 font-display text-3xl font-bold text-foreground">{summary.total}</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-5">
          <span className="text-xs font-body uppercase tracking-wider text-muted-foreground">Entradas</span>
          <p className="mt-2 font-display text-3xl font-bold text-primary">{summary.entradas}</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-5">
          <span className="text-xs font-body uppercase tracking-wider text-muted-foreground">Saidas</span>
          <p className="mt-2 font-display text-3xl font-bold text-destructive">{summary.saidas}</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-5">
          <span className="text-xs font-body uppercase tracking-wider text-muted-foreground">Reservas</span>
          <p className="mt-2 font-display text-3xl font-bold text-blue-700">{summary.reservas}</p>
        </div>
      </div>

      <div className="mb-6 flex justify-end">
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-64 text-xs font-body">
            <SelectValue placeholder="Filtrar por tipo" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os tipos</SelectItem>
            {MOVEMENT_TYPE_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="overflow-hidden rounded-xl border border-border bg-card">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="p-4 text-left text-xs font-display uppercase tracking-wider text-muted-foreground">Data</th>
                <th className="p-4 text-left text-xs font-display uppercase tracking-wider text-muted-foreground">Produto</th>
                <th className="p-4 text-left text-xs font-display uppercase tracking-wider text-muted-foreground">Tipo</th>
                <th className="p-4 text-center text-xs font-display uppercase tracking-wider text-muted-foreground">Qtd</th>
                <th className="p-4 text-center text-xs font-display uppercase tracking-wider text-muted-foreground">Saldo</th>
                <th className="p-4 text-left text-xs font-display uppercase tracking-wider text-muted-foreground">Canal / origem</th>
                <th className="p-4 text-left text-xs font-display uppercase tracking-wider text-muted-foreground">Motivo</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 6 }).map((_, index) => (
                  <tr key={index}>
                    <td colSpan={7} className="p-4">
                      <div className="h-12 animate-pulse rounded bg-muted" />
                    </td>
                  </tr>
                ))
              ) : movements.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-12 text-center font-body text-muted-foreground">
                    Nenhuma movimentacao encontrada.
                  </td>
                </tr>
              ) : (
                movements.map((movement) => (
                  <tr key={movement.id} className="border-b border-border transition-colors hover:bg-muted/30">
                    <td className="p-4 text-xs font-body text-muted-foreground">
                      {new Date(movement.created_at).toLocaleString("pt-BR")}
                    </td>
                    <td className="p-4 font-body text-foreground">
                      {movement.products?.name || "Produto removido"}
                      <div className="text-xs text-muted-foreground">
                        {movement.products?.internal_code || movement.products?.sku || "-"}
                      </div>
                    </td>
                    <td className="p-4 text-xs font-body text-foreground">
                      {formatMovementType(movement.type)}
                    </td>
                    <td className="p-4 text-center font-body font-medium text-foreground">{movement.quantity}</td>
                    <td className="p-4 text-center text-xs font-body text-muted-foreground">
                      {movement.previous_stock ?? "-"} {"->"} {movement.new_stock ?? "-"}
                      {movement.previous_reserved !== null || movement.new_reserved !== null ? (
                        <div>Res.: {movement.previous_reserved ?? 0} {"->"} {movement.new_reserved ?? 0}</div>
                      ) : null}
                    </td>
                    <td className="p-4 text-xs font-body text-muted-foreground">
                      <div>{formatSalesChannel(movement.channel)}</div>
                      <div>{movement.source_system || "ecoferro-admin"}</div>
                      <div>{movement.source_reference || "-"}</div>
                    </td>
                    <td className="p-4 text-xs font-body text-muted-foreground">{movement.reason || "-"}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </AdminLayout>
  );
};

export default AdminMovements;
