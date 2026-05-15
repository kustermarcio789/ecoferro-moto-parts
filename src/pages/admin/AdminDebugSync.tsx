import { useState, useEffect } from "react";
import AdminLayout from "@/components/admin/AdminLayout";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { RefreshCw, CheckCircle2, AlertCircle, Clock, Database, Globe } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const AdminDebugSync = () => {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [stats, setStats] = useState<any>(null);
  const { toast } = useToast();

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("stock_sync_logs")
        .select("*")
        .order("started_at", { ascending: false })
        .limit(20);

      if (error) throw error;
      setLogs(data || []);

      const { count: totalProducts } = await supabase
        .from("products")
        .select("*", { count: 'exact', head: true });

      const { count: activeProducts } = await supabase
        .from("products")
        .select("*", { count: 'exact', head: true })
        .eq("is_active", true)
        .eq("source", "mercadolivre");

      setStats({
        total: totalProducts,
        active: activeProducts
      });
    } catch (error: any) {
      toast({ title: "Erro ao carregar logs", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  const handleSync = async () => {
    setSyncing(true);
    try {
      const { data, error } = await (supabase as any).functions.invoke("sync-ml-stock");
      if (error) throw error;
      
      toast({ 
        title: "Sincronização concluída", 
        description: `${data.received} recebidos, ${data.created} criados, ${data.updated} atualizados.` 
      });
      fetchLogs();
    } catch (error: any) {
      toast({ title: "Erro na sincronização", description: error.message, variant: "destructive" });
    } finally {
      setSyncing(false);
    }
  };

  return (
    <AdminLayout title="Debug de Sincronização">
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Total de Produtos</CardTitle>
              <Database className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.total || 0}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Ativos no Site</CardTitle>
              <Globe className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{stats?.active || 0}</div>
              <p className="text-xs text-muted-foreground">source='mercadolivre' && is_active=true</p>
            </CardContent>
          </Card>
          <Card className="flex flex-col justify-center px-6">
            <Button onClick={handleSync} disabled={syncing} className="w-full">
              {syncing ? <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
              Puxar Produtos da VPS (PULL)
            </Button>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Histórico de Sincronização
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Início</TableHead>
                  <TableHead>Duração</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Origem</TableHead>
                  <TableHead className="text-right">Recebidos</TableHead>
                  <TableHead className="text-right">Sucesso</TableHead>
                  <TableHead className="text-right">Erros</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-10">Carregando logs...</TableCell>
                  </TableRow>
                ) : logs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-10">Nenhum log encontrado.</TableCell>
                  </TableRow>
                ) : (
                  logs.map((log) => {
                    const duration = log.finished_at 
                      ? `${Math.round((new Date(log.finished_at).getTime() - new Date(log.started_at).getTime()) / 1000)}s`
                      : "-";
                    
                    return (
                      <TableRow key={log.id}>
                        <TableCell className="font-mono text-xs">
                          {new Date(log.started_at).toLocaleString('pt-BR')}
                        </TableCell>
                        <TableCell>{duration}</TableCell>
                        <TableCell>
                          {log.status === 'success' ? (
                            <Badge className="bg-green-100 text-green-800 hover:bg-green-100 border-green-200">
                              <CheckCircle2 className="mr-1 h-3 w-3" /> Sucesso
                            </Badge>
                          ) : log.status === 'running' ? (
                            <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100 border-blue-200">
                              <RefreshCw className="mr-1 h-3 w-3 animate-spin" /> Rodando
                            </Badge>
                          ) : (
                            <Badge variant="destructive">
                              <AlertCircle className="mr-1 h-3 w-3" /> Falha
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="max-w-[200px] truncate text-xs" title={log.source_url}>
                          {log.source_url}
                        </TableCell>
                        <TableCell className="text-right">{log.total_skus_received || 0}</TableCell>
                        <TableCell className="text-right text-green-600">{log.total_skus_updated || 0}</TableCell>
                        <TableCell className="text-right text-red-600">{log.total_skus_not_found || 0}</TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {logs.some(l => l.error_message) && (
          <Card className="border-red-200 bg-red-50">
            <CardHeader>
              <CardTitle className="text-red-800 text-sm">Últimos Erros Detectados</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="list-disc pl-5 space-y-1 text-sm text-red-700">
                {logs.filter(l => l.error_message).slice(0, 5).map(l => (
                  <li key={l.id}>
                    <strong>{new Date(l.started_at).toLocaleTimeString()}:</strong> {l.error_message}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}
      </div>
    </AdminLayout>
  );
};

export default AdminDebugSync;
