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
import { Button } from "@/components/ui/button";
import { RefreshCw, CheckCircle2, XCircle, AlertCircle, Clock } from "lucide-react";
import { toast } from "sonner";

const supabaseAny = supabase as any;

const AdminIntegrations = () => {
  const [logs, setLogs] = useState<any[]>([]);
  const [stockLogs, setStockLogs] = useState<any[]>([]);
  const [lastStockSync, setLastStockSync] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [statusFilter, setStatusFilter] = useState("all");
  const [sourceFilter, setSourceFilter] = useState("all");

  const fetchStockLogs = async () => {
    const { data } = await supabase
      .from("stock_sync_logs" as any)
      .select("*")
      .order("started_at", { ascending: false })
      .limit(10);
    
    if (data) {
      setStockLogs(data);
      if (data.length > 0) {
        setLastStockSync(data[0]);
      }
    }
  };

  const handleManualSync = async () => {
    setSyncing(true);
    try {
      const { data, error } = await supabase.functions.invoke("sync-ml-stock");
      
      if (error) throw error;
      
      toast.success(`Sincronização concluída: ${data.updated} SKUs atualizados.`);
      fetchStockLogs();
    } catch (err: any) {
      console.error("Sync error:", err);
      toast.error(`Falha na sincronização: ${err.message || "Erro desconhecido"}`);
    } finally {
      setSyncing(false);
    }
  };

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
    fetchStockLogs();
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
      <div className="mb-8 rounded-xl border border-border bg-card p-6">
        <div className="mb-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h2 className="font-display text-lg font-bold uppercase tracking-wider text-foreground">Sincronização de Estoque ML</h2>
            <p className="text-sm text-muted-foreground font-body">Integração automática com vendas.ecoferro.com.br</p>
          </div>
          <Button 
            onClick={handleManualSync} 
            disabled={syncing}
            className="font-display uppercase tracking-wider text-xs"
          >
            <RefreshCw className={`mr-2 h-4 w-4 ${syncing ? "animate-spin" : ""}`} />
            {syncing ? "Sincronizando..." : "Sincronizar Agora"}
          </Button>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-6">
          <div className="rounded-lg bg-muted/30 p-4">
            <span className="text-xs font-body uppercase tracking-wider text-muted-foreground block mb-1">Status Atual</span>
            {lastStockSync ? (
              <div className="flex items-center gap-2">
                {lastStockSync.status === 'success' ? (
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                ) : lastStockSync.status === 'running' ? (
                  <RefreshCw className="h-4 w-4 text-blue-500 animate-spin" />
                ) : (
                  <XCircle className="h-4 w-4 text-destructive" />
                )}
                <span className="font-display font-bold uppercase text-sm">
                  {lastStockSync.status === 'success' ? 'Sucesso' : lastStockSync.status === 'running' ? 'Em andamento' : 'Falha'}
                </span>
              </div>
            ) : (
              <span className="text-sm font-body text-muted-foreground">Nenhuma execução</span>
            )}
          </div>
          
          <div className="rounded-lg bg-muted/30 p-4">
            <span className="text-xs font-body uppercase tracking-wider text-muted-foreground block mb-1">Última Sincronização</span>
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-body">
                {lastStockSync?.finished_at 
                  ? new Date(lastStockSync.finished_at).toLocaleString('pt-BR') 
                  : lastStockSync?.started_at
                  ? 'Em andamento...'
                  : 'N/A'}
              </span>
            </div>
          </div>

          <div className="rounded-lg bg-muted/30 p-4">
            <span className="text-xs font-body uppercase tracking-wider text-muted-foreground block mb-1">SKUs Recebidos</span>
            <span className="font-display font-bold text-lg">{lastStockSync?.total_skus_received || 0}</span>
          </div>

          <div className="rounded-lg bg-muted/30 p-4">
            <span className="text-xs font-body uppercase tracking-wider text-muted-foreground block mb-1">SKUs Atualizados</span>
            <span className="font-display font-bold text-lg text-primary">{lastStockSync?.total_skus_updated || 0}</span>
          </div>
        </div>

        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full text-xs font-body">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="p-3 text-left font-display uppercase tracking-wider text-muted-foreground">Início</th>
                <th className="p-3 text-center font-display uppercase tracking-wider text-muted-foreground">Duração</th>
                <th className="p-3 text-center font-display uppercase tracking-wider text-muted-foreground">Status</th>
                <th className="p-3 text-center font-display uppercase tracking-wider text-muted-foreground">Recebidos</th>
                <th className="p-3 text-center font-display uppercase tracking-wider text-muted-foreground">Atualizados</th>
                <th className="p-3 text-left font-display uppercase tracking-wider text-muted-foreground">Erro</th>
              </tr>
            </thead>
            <tbody>
              {stockLogs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-muted-foreground">Nenhum log de estoque disponível.</td>
                </tr>
              ) : (
                stockLogs.map((log) => (
                  <tr key={log.id} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
                    <td className="p-3 whitespace-nowrap">{new Date(log.started_at).toLocaleString('pt-BR')}</td>
                    <td className="p-3 text-center">
                      {log.finished_at 
                        ? `${Math.round((new Date(log.finished_at).getTime() - new Date(log.started_at).getTime()) / 1000)}s` 
                        : '-'}
                    </td>
                    <td className="p-3 text-center">
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] uppercase font-bold tracking-wider ${
                        log.status === 'success' ? 'bg-green-100 text-green-700' : 
                        log.status === 'running' ? 'bg-blue-100 text-blue-700' : 
                        'bg-red-100 text-red-700'
                      }`}>
                        {log.status}
                      </span>
                    </td>
                    <td className="p-3 text-center">{log.total_skus_received || 0}</td>
                    <td className="p-3 text-center font-bold text-primary">{log.total_skus_updated || 0}</td>
                    <td className="p-3 text-destructive max-w-xs truncate" title={log.error_message}>{log.error_message || '-'}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="mb-6">
        <h2 className="font-display text-lg font-bold uppercase tracking-wider text-foreground">Logs Gerais de Inventário</h2>
      </div>

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
