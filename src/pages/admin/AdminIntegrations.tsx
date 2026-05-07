import { useEffect, useMemo, useState } from "react";
import AdminLayout from "@/components/admin/AdminLayout";
import { supabase } from "@/integrations/supabase/client";
import {
  PRODUCTION_SOURCE_SYSTEM,
  formatIntegrationStatus,
  formatSalesChannel,
  INTEGRATION_STATUS_STYLES,
} from "@/services/inventoryService";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const supabaseAny = supabase as any;

const AdminIntegrations = () => {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("all");
  const [sourceFilter, setSourceFilter] = useState("all");

  const fetchLogs = async () => {
    setLoading(true);

    let query = supabaseAny
      .from("integration_logs")
      .select(`
        id,
        integration_key,
        source_system,
        event_type,
        status,
        external_event_id,
        source_reference,
        product_code,
        sku,
        quantity,
        stage,
        operator_name,
        error_message,
        response_payload,
        created_at,
        processed_at,
        products (
          name,
          sku,
          internal_code
        )
      `)
      .order("created_at", { ascending: false })
      .limit(150);

    if (statusFilter !== "all") query = query.eq("status", statusFilter);
    if (sourceFilter !== "all") query = query.eq("source_system", sourceFilter);

    const { data } = await query;
    setLogs(data || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchLogs();
  }, [statusFilter, sourceFilter]);

  const sources = useMemo(() => {
    const values = new Set<string>();
    logs.forEach((log) => {
      if (log.source_system) values.add(log.source_system);
    });
    values.add(PRODUCTION_SOURCE_SYSTEM);
    return Array.from(values).sort();
  }, [logs]);

  const summary = useMemo(() => ({
    processed: logs.filter((log) => log.status === "processed").length,
    failed: logs.filter((log) => log.status === "failed").length,
    pending: logs.filter((log) => log.status === "pending").length,
    productionEntries: logs.filter((log) => log.source_system === PRODUCTION_SOURCE_SYSTEM).length,
  }), [logs]);

  const getStatusClassName = (status: string) =>
    INTEGRATION_STATUS_STYLES[status] ?? "bg-muted text-muted-foreground";

  return (
    <AdminLayout title="Integracoes">
      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-xl border border-border bg-card p-5">
          <span className="text-xs font-body uppercase tracking-wider text-muted-foreground">Processados</span>
          <p className="mt-2 font-display text-3xl font-bold text-primary">{summary.processed}</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-5">
          <span className="text-xs font-body uppercase tracking-wider text-muted-foreground">Falhas</span>
          <p className="mt-2 font-display text-3xl font-bold text-destructive">{summary.failed}</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-5">
          <span className="text-xs font-body uppercase tracking-wider text-muted-foreground">Pendentes</span>
          <p className="mt-2 font-display text-3xl font-bold text-amber-600">{summary.pending}</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-5">
          <span className="text-xs font-body uppercase tracking-wider text-muted-foreground">Entradas da producao</span>
          <p className="mt-2 font-display text-3xl font-bold text-blue-700">{summary.productionEntries}</p>
        </div>
      </div>

      <div className="mb-6 flex flex-col gap-3 lg:flex-row lg:justify-end">
        <Select value={sourceFilter} onValueChange={setSourceFilter}>
          <SelectTrigger className="w-full text-xs font-body lg:w-64">
            <SelectValue placeholder="Origem" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas as origens</SelectItem>
            {sources.map((source) => (
              <SelectItem key={source} value={source}>
                {source}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full text-xs font-body lg:w-56">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os status</SelectItem>
            <SelectItem value="processed">Processados</SelectItem>
            <SelectItem value="failed">Falhas</SelectItem>
            <SelectItem value="pending">Pendentes</SelectItem>
            <SelectItem value="ignored">Ignorados</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="overflow-hidden rounded-xl border border-border bg-card">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="p-4 text-left text-xs font-display uppercase tracking-wider text-muted-foreground">Data</th>
                <th className="p-4 text-left text-xs font-display uppercase tracking-wider text-muted-foreground">Integracao</th>
                <th className="p-4 text-left text-xs font-display uppercase tracking-wider text-muted-foreground">Produto</th>
                <th className="p-4 text-center text-xs font-display uppercase tracking-wider text-muted-foreground">Qtd</th>
                <th className="p-4 text-center text-xs font-display uppercase tracking-wider text-muted-foreground">Status</th>
                <th className="p-4 text-left text-xs font-display uppercase tracking-wider text-muted-foreground">Origem</th>
                <th className="p-4 text-left text-xs font-display uppercase tracking-wider text-muted-foreground">Detalhes</th>
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
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-12 text-center font-body text-muted-foreground">
                    Nenhum log de integracao encontrado.
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr key={log.id} className="border-b border-border transition-colors hover:bg-muted/30">
                    <td className="p-4 text-xs font-body text-muted-foreground">
                      {new Date(log.created_at).toLocaleString("pt-BR")}
                    </td>
                    <td className="p-4 font-body text-foreground">
                      <div>{log.integration_key}</div>
                      <div className="text-xs text-muted-foreground">{log.event_type}</div>
                    </td>
                    <td className="p-4 text-xs font-body text-muted-foreground">
                      <div className="text-foreground">{log.products?.name || "Nao mapeado"}</div>
                      <div>{log.products?.internal_code || log.product_code || "-"}</div>
                      <div>{log.products?.sku || log.sku || "-"}</div>
                    </td>
                    <td className="p-4 text-center font-body font-medium text-foreground">{log.quantity || "-"}</td>
                    <td className="p-4 text-center">
                      <span className={`inline-flex rounded px-3 py-1 text-xs font-body font-medium ${getStatusClassName(log.status)}`}>
                        {formatIntegrationStatus(log.status)}
                      </span>
                    </td>
                    <td className="p-4 text-xs font-body text-muted-foreground">
                      <div>{log.source_system}</div>
                      <div>{log.source_reference || log.external_event_id || "-"}</div>
                      <div>{log.stage || formatSalesChannel(log.response_payload?.channel)}</div>
                    </td>
                    <td className="p-4 text-xs font-body text-muted-foreground">
                      {log.error_message ? (
                        <span className="text-destructive">{log.error_message}</span>
                      ) : (
                        <>
                          <div>Operador: {log.operator_name || "-"}</div>
                          <div>Processado: {log.processed_at ? new Date(log.processed_at).toLocaleString("pt-BR") : "-"}</div>
                        </>
                      )}
                    </td>
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

export default AdminIntegrations;
