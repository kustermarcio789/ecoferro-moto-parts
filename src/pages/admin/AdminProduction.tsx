import { useEffect, useMemo, useState } from "react";
import { Activity, Calendar, Loader2, RefreshCcw, Save } from "lucide-react";
import AdminLayout from "@/components/admin/AdminLayout";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface OrderRow {
  id: string;
  order_number: number;
  status: string;
  total: number;
  units_total: number;
  items_count: number;
  overall_progress_percentage: number;
  estimated_delivery_at: string | null;
  created_at: string;
  requested_delivery_date: string | null;
  razao_social: string | null;
  cnpj: string | null;
  current_stage: { code: string; name: string } | null;
}

interface Stage {
  id: string;
  code: string;
  name: string;
  sort_order: number;
  default_duration_days: number;
  weight_percentage: number;
  color: string | null;
}

interface ProgressRow {
  id: string;
  stage_id: string;
  percentage: number;
  status: "pending" | "in_progress" | "paused" | "completed" | "skipped";
  started_at: string | null;
  completed_at: string | null;
  expected_start_at: string | null;
  expected_completion_at: string | null;
  operator_name: string | null;
  notes: string | null;
}

const STATUS_OPTIONS: ProgressRow["status"][] = [
  "pending",
  "in_progress",
  "paused",
  "completed",
  "skipped",
];

const formatBRL = (n: number) =>
  Number(n || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL", minimumFractionDigits: 2 });

const AdminProduction = () => {
  const { toast } = useToast();
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [stages, setStages] = useState<Stage[]>([]);
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [progress, setProgress] = useState<ProgressRow[]>([]);
  const [filter, setFilter] = useState<string>("active");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);

  const loadOrders = async () => {
    setLoading(true);
    let query = supabase
      .from("wholesale_orders_summary")
      .select("*")
      .order("created_at", { ascending: false });
    if (filter === "active") {
      query = query.in("status", ["pending", "paid", "processing"]);
    } else if (filter === "completed") {
      query = query.in("status", ["delivered", "shipped"]);
    } else if (filter === "cancelled") {
      query = query.in("status", ["cancelled", "refunded"]);
    }
    const { data } = await query;
    setOrders((data as unknown as OrderRow[]) || []);
    setLoading(false);
  };

  useEffect(() => {
    supabase
      .from("production_stages")
      .select("*")
      .eq("is_active", true)
      .order("sort_order")
      .then(({ data }) => setStages((data as Stage[]) || []));
  }, []);

  useEffect(() => {
    loadOrders();
  }, [filter]);

  useEffect(() => {
    if (!selectedOrderId) {
      setProgress([]);
      return;
    }
    supabase
      .from("order_production_progress")
      .select("*")
      .eq("order_id", selectedOrderId)
      .then(async ({ data }) => {
        let rows = (data as ProgressRow[]) || [];
        // if no rows yet, seed via RPC
        if (rows.length === 0) {
          await supabase.rpc("seed_order_production_progress", {
            p_order_id: selectedOrderId,
            p_start_at: new Date().toISOString(),
          });
          const { data: seeded } = await supabase
            .from("order_production_progress")
            .select("*")
            .eq("order_id", selectedOrderId);
          rows = (seeded as ProgressRow[]) || [];
        }
        setProgress(rows);
      });
  }, [selectedOrderId]);

  const stageById = useMemo(() => Object.fromEntries(stages.map((s) => [s.id, s])), [stages]);

  const updateRow = (rowId: string, patch: Partial<ProgressRow>) => {
    setProgress((rows) => rows.map((r) => (r.id === rowId ? { ...r, ...patch } : r)));
  };

  const saveRow = async (row: ProgressRow) => {
    setSaving(row.id);
    try {
      const { error } = await supabase
        .from("order_production_progress")
        .update({
          percentage: Math.max(0, Math.min(100, Number(row.percentage || 0))),
          status: row.status,
          started_at: row.started_at,
          completed_at: row.completed_at,
          expected_start_at: row.expected_start_at,
          expected_completion_at: row.expected_completion_at,
          operator_name: row.operator_name,
          notes: row.notes,
        })
        .eq("id", row.id);
      if (error) throw error;
      // refresh order overall %
      if (selectedOrderId) {
        await supabase.rpc("recalculate_order_progress", { p_order_id: selectedOrderId });
        await loadOrders();
      }
      toast({ title: "Etapa atualizada" });
    } catch (err: any) {
      toast({ title: "Erro ao salvar", description: err.message, variant: "destructive" });
    } finally {
      setSaving(null);
    }
  };

  const reseed = async () => {
    if (!selectedOrderId) return;
    setSaving("reseed");
    try {
      const { error } = await supabase.rpc("seed_order_production_progress", {
        p_order_id: selectedOrderId,
        p_start_at: new Date().toISOString(),
      });
      if (error) throw error;
      const { data } = await supabase
        .from("order_production_progress")
        .select("*")
        .eq("order_id", selectedOrderId);
      setProgress((data as ProgressRow[]) || []);
      toast({ title: "Etapas recriadas" });
    } catch (err: any) {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    } finally {
      setSaving(null);
    }
  };

  const selectedOrder = orders.find((o) => o.id === selectedOrderId);

  return (
    <AdminLayout title="Produção Atacado">
      <div className="grid grid-cols-1 lg:grid-cols-[420px_1fr] gap-6">
        <aside className="bg-card border border-border rounded-2xl">
          <div className="flex items-center justify-between px-4 py-3 border-b border-border">
            <h2 className="font-display uppercase tracking-wider text-sm font-bold">Pedidos B2B</h2>
            <Select value={filter} onValueChange={setFilter}>
              <SelectTrigger className="w-32 h-8 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Ativos</SelectItem>
                <SelectItem value="completed">Concluídos</SelectItem>
                <SelectItem value="cancelled">Cancelados</SelectItem>
                <SelectItem value="all">Todos</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="max-h-[70vh] overflow-y-auto">
            {loading ? (
              <div className="p-4 space-y-3">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="h-16 bg-muted rounded-xl animate-pulse" />
                ))}
              </div>
            ) : orders.length === 0 ? (
              <p className="p-8 text-center text-sm text-muted-foreground font-body">Nenhum pedido encontrado.</p>
            ) : (
              orders.map((o) => (
                <button
                  key={o.id}
                  onClick={() => setSelectedOrderId(o.id)}
                  className={`w-full text-left px-4 py-3 border-b border-border transition-colors ${
                    selectedOrderId === o.id ? "bg-primary/5" : "hover:bg-muted/40"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <div className="text-xs font-display uppercase tracking-wider text-muted-foreground">
                      #{o.order_number}
                    </div>
                    <span className="text-xs font-body text-foreground/60">
                      {new Date(o.created_at).toLocaleDateString("pt-BR")}
                    </span>
                  </div>
                  <div className="font-body text-sm text-foreground truncate">{o.razao_social ?? "—"}</div>
                  <div className="text-xs text-muted-foreground font-body">
                    {o.items_count} itens · {o.units_total} un · {formatBRL(Number(o.total))}
                  </div>
                  <div className="mt-2 flex items-center gap-2">
                    <Progress value={Number(o.overall_progress_percentage || 0)} className="h-1.5 flex-1" />
                    <span className="text-[10px] font-display font-bold text-primary w-8 text-right">
                      {Math.round(Number(o.overall_progress_percentage || 0))}%
                    </span>
                  </div>
                </button>
              ))
            )}
          </div>
        </aside>

        <section className="bg-card border border-border rounded-2xl p-5">
          {!selectedOrder ? (
            <div className="text-center py-20 text-muted-foreground font-body">
              <Activity className="h-10 w-10 mx-auto mb-3 opacity-40" />
              Selecione um pedido para gerenciar a produção.
            </div>
          ) : (
            <>
              <div className="flex flex-wrap items-start justify-between gap-3 mb-5">
                <div>
                  <div className="text-xs font-display uppercase tracking-wider text-muted-foreground">
                    Pedido #{selectedOrder.order_number}
                  </div>
                  <h2 className="font-display uppercase tracking-wider text-lg font-bold text-foreground">
                    {selectedOrder.razao_social ?? "Cliente"}
                  </h2>
                  <div className="text-xs text-muted-foreground font-body">
                    CNPJ: {selectedOrder.cnpj ?? "—"} · {selectedOrder.items_count} itens · {selectedOrder.units_total}{" "}
                    unidades · {formatBRL(Number(selectedOrder.total))}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" onClick={reseed} disabled={saving === "reseed"}>
                    {saving === "reseed" ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <RefreshCcw className="h-3.5 w-3.5" />
                    )}
                    {" "}Recriar etapas
                  </Button>
                </div>
              </div>

              <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 mb-5">
                <InfoTile
                  icon={Calendar}
                  label="Solicitado"
                  value={
                    selectedOrder.requested_delivery_date
                      ? new Date(selectedOrder.requested_delivery_date).toLocaleDateString("pt-BR")
                      : "—"
                  }
                />
                <InfoTile
                  icon={Calendar}
                  label="Previsão entrega"
                  value={
                    selectedOrder.estimated_delivery_at
                      ? new Date(selectedOrder.estimated_delivery_at).toLocaleDateString("pt-BR")
                      : "—"
                  }
                />
                <InfoTile
                  icon={Activity}
                  label="Progresso"
                  value={`${Math.round(Number(selectedOrder.overall_progress_percentage || 0))}%`}
                />
              </div>

              <div className="space-y-3">
                {progress
                  .slice()
                  .sort((a, b) => (stageById[a.stage_id]?.sort_order ?? 0) - (stageById[b.stage_id]?.sort_order ?? 0))
                  .map((row) => {
                    const stage = stageById[row.stage_id];
                    if (!stage) return null;
                    return (
                      <div key={row.id} className="border border-border rounded-xl p-4">
                        <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                          <div>
                            <div className="font-body font-medium text-foreground">{stage.name}</div>
                            <div className="text-xs text-muted-foreground font-body">
                              Peso: {stage.weight_percentage}% · Duração padrão: {stage.default_duration_days}d
                            </div>
                          </div>
                          <Select
                            value={row.status}
                            onValueChange={(v) => updateRow(row.id, { status: v as ProgressRow["status"] })}
                          >
                            <SelectTrigger className="w-36 h-8 text-xs"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              {STATUS_OPTIONS.map((s) => (
                                <SelectItem key={s} value={s} className="text-xs">
                                  {s}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-[1fr_120px_auto] gap-3 items-center mb-3">
                          <input
                            type="range"
                            min={0}
                            max={100}
                            value={row.percentage}
                            onChange={(e) => updateRow(row.id, { percentage: Number(e.target.value) })}
                            className="w-full"
                          />
                          <input
                            type="number"
                            min={0}
                            max={100}
                            value={row.percentage}
                            onChange={(e) => updateRow(row.id, { percentage: Number(e.target.value) })}
                            className="w-full rounded-md border border-border bg-background px-2 py-1.5 text-sm font-body"
                          />
                          <Button size="sm" onClick={() => saveRow(row)} disabled={saving === row.id}>
                            {saving === row.id ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <Save className="h-3.5 w-3.5" />
                            )}
                          </Button>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <DateInput
                            label="Início previsto"
                            value={row.expected_start_at}
                            onChange={(v) => updateRow(row.id, { expected_start_at: v })}
                          />
                          <DateInput
                            label="Conclusão prevista"
                            value={row.expected_completion_at}
                            onChange={(v) => updateRow(row.id, { expected_completion_at: v })}
                          />
                          <DateInput
                            label="Início real"
                            value={row.started_at}
                            onChange={(v) => updateRow(row.id, { started_at: v })}
                          />
                          <DateInput
                            label="Conclusão real"
                            value={row.completed_at}
                            onChange={(v) => updateRow(row.id, { completed_at: v })}
                          />
                        </div>

                        <input
                          type="text"
                          value={row.operator_name ?? ""}
                          onChange={(e) => updateRow(row.id, { operator_name: e.target.value })}
                          placeholder="Operador responsável"
                          className="mt-3 w-full rounded-md border border-border bg-background px-3 py-1.5 text-sm font-body"
                        />
                        <textarea
                          value={row.notes ?? ""}
                          onChange={(e) => updateRow(row.id, { notes: e.target.value })}
                          rows={2}
                          placeholder="Observações desta etapa"
                          className="mt-2 w-full rounded-md border border-border bg-background px-3 py-1.5 text-sm font-body resize-none"
                        />
                      </div>
                    );
                  })}
                {progress.length === 0 && (
                  <p className="text-sm text-muted-foreground font-body py-8 text-center">
                    Nenhuma etapa criada ainda.
                  </p>
                )}
              </div>
            </>
          )}
        </section>
      </div>
    </AdminLayout>
  );
};

const InfoTile = ({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
}) => (
  <div className="rounded-xl p-3 border border-border bg-muted/30">
    <div className="flex items-center gap-2 text-xs font-display uppercase tracking-wider text-muted-foreground mb-1">
      <Icon className="h-3.5 w-3.5" /> {label}
    </div>
    <div className="font-body text-sm text-foreground">{value}</div>
  </div>
);

const DateInput = ({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string | null;
  onChange: (v: string | null) => void;
}) => {
  const toLocal = (iso: string | null) => {
    if (!iso) return "";
    const d = new Date(iso);
    const offset = d.getTimezoneOffset();
    const adjusted = new Date(d.getTime() - offset * 60_000);
    return adjusted.toISOString().slice(0, 16);
  };
  return (
    <label className="block">
      <span className="text-xs font-body text-muted-foreground">{label}</span>
      <input
        type="datetime-local"
        value={toLocal(value)}
        onChange={(e) => onChange(e.target.value ? new Date(e.target.value).toISOString() : null)}
        className="w-full rounded-md border border-border bg-background px-2 py-1.5 text-sm font-body"
      />
    </label>
  );
};

export default AdminProduction;
