import AdminLayout from "@/components/admin/AdminLayout";
import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Save, RefreshCw, Loader2, CheckCircle, AlertCircle, Link2, ExternalLink } from "lucide-react";

const ML_APP_ID = "5758280675014902";

const AdminSettings = () => {
  const { toast } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();
  const [settings, setSettings] = useState<Record<string, any>>({
    whatsapp_number: "5511999999999",
    meta_pixel_id: "",
    google_ads_id: "",
    free_shipping_min: "299",
    pix_discount: "5",
  });
  const [loading, setLoading] = useState(false);
  const [syncStatus, setSyncStatus] = useState<any>(null);
  const [syncing, setSyncing] = useState(false);
  const [mlStatus, setMlStatus] = useState<any>(null);
  const [mlLoading, setMlLoading] = useState(false);

  const redirectUri = `${window.location.origin}/admin/configuracoes`;

  // Handle ML OAuth callback
  useEffect(() => {
    const code = searchParams.get('code');
    if (code) {
      exchangeMlCode(code);
      // Clean URL
      searchParams.delete('code');
      setSearchParams(searchParams, { replace: true });
    }
  }, []);

  const exchangeMlCode = async (code: string) => {
    setMlLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('mercadolivre-oauth', {
        body: { action: 'exchange_code', code, redirect_uri: redirectUri },
      });
      if (error) throw error;
      if (data?.success) {
        toast({ title: "Mercado Livre conectado!", description: `Vendedor ID: ${data.user_id}` });
        checkMlStatus();
      } else {
        toast({ title: "Erro", description: data?.error, variant: "destructive" });
      }
    } catch (err: any) {
      toast({ title: "Erro na autorização", description: err.message, variant: "destructive" });
    } finally {
      setMlLoading(false);
    }
  };

  const checkMlStatus = async () => {
    try {
      const { data } = await supabase.functions.invoke('mercadolivre-oauth', {
        body: { action: 'status' },
      });
      setMlStatus(data);
    } catch { /* ignore */ }
  };

  const refreshMlToken = async () => {
    setMlLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('mercadolivre-oauth', {
        body: { action: 'refresh' },
      });
      if (error) throw error;
      if (data?.success) {
        toast({ title: "Token renovado com sucesso!" });
        checkMlStatus();
      } else {
        toast({ title: "Erro", description: data?.error, variant: "destructive" });
      }
    } catch (err: any) {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    } finally {
      setMlLoading(false);
    }
  };

  useEffect(() => {
    supabase.from("site_settings").select("key, value").then(({ data }) => {
      if (data) {
        const map: Record<string, any> = {};
        data.forEach(s => {
          if (s.key === 'ml_sync_last_run') {
            setSyncStatus(s.value);
          } else if (s.key !== 'ml_oauth_tokens') {
            map[s.key] = typeof s.value === "string" ? s.value : JSON.stringify(s.value);
          }
        });
        setSettings(prev => ({ ...prev, ...map }));
      }
    });
    checkMlStatus();
  }, []);

  const handleSave = async () => {
    setLoading(true);
    for (const [key, value] of Object.entries(settings)) {
      await supabase.from("site_settings").upsert({ key, value: value as any }, { onConflict: "key" });
    }
    toast({ title: "Configurações salvas" });
    setLoading(false);
  };

  const runManualSync = async () => {
    setSyncing(true);
    try {
      const { data, error } = await supabase.functions.invoke('mercadolivre-sync', {
        body: {},
      });
      if (error) throw error;
      if (data?.success) {
        toast({ title: `Sincronização concluída: ${data.synced} produto(s) atualizado(s)` });
        const { data: setting } = await supabase.from("site_settings").select("value").eq("key", "ml_sync_last_run").maybeSingle();
        if (setting) setSyncStatus(setting.value);
      } else {
        toast({ title: "Erro", description: data?.error, variant: "destructive" });
      }
    } catch (err: any) {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    } finally {
      setSyncing(false);
    }
  };

  const fields = [
    { key: "whatsapp_number", label: "WhatsApp (com DDI)", placeholder: "5511999999999" },
    { key: "meta_pixel_id", label: "Meta Pixel ID", placeholder: "123456789" },
    { key: "google_ads_id", label: "Google Ads ID", placeholder: "AW-123456789" },
    { key: "free_shipping_min", label: "Frete Grátis (valor mín.)", placeholder: "299" },
    { key: "pix_discount", label: "Desconto Pix (%)", placeholder: "5" },
  ];

  const formatDate = (iso: string) => {
    try { return new Date(iso).toLocaleString('pt-BR'); } catch { return iso; }
  };

  const mlAuthUrl = `https://auth.mercadolivre.com.br/authorization?response_type=code&client_id=${ML_APP_ID}&redirect_uri=${encodeURIComponent(redirectUri)}`;

  return (
    <AdminLayout title="Configurações">
      <div className="max-w-2xl space-y-6">
        {/* General Settings */}
        <div className="bg-card rounded-xl border border-border p-6">
          <h2 className="font-display text-lg font-bold text-foreground uppercase tracking-wider mb-6">Configurações Gerais</h2>
          <div className="space-y-4">
            {fields.map(f => (
              <div key={f.key}>
                <label className="text-xs font-body font-medium text-foreground mb-1 block">{f.label}</label>
                <input
                  value={settings[f.key] || ""}
                  onChange={e => setSettings(s => ({ ...s, [f.key]: e.target.value }))}
                  placeholder={f.placeholder}
                  className="w-full rounded-lg border border-border bg-background px-4 py-2.5 font-body text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
            ))}
          </div>
          <div className="mt-6">
            <Button onClick={handleSave} disabled={loading} className="font-display uppercase tracking-wider text-xs">
              <Save className="mr-2 h-4 w-4" /> {loading ? "Salvando..." : "Salvar"}
            </Button>
          </div>
        </div>

        {/* ML Connection */}
        <div className="bg-card rounded-xl border border-border p-6">
          <h2 className="font-display text-lg font-bold text-foreground uppercase tracking-wider mb-6">Mercado Livre — Conexão</h2>

          {mlLoading ? (
            <div className="flex items-center gap-3 py-4">
              <Loader2 className="h-5 w-5 animate-spin text-primary" />
              <span className="font-body text-sm text-muted-foreground">Processando...</span>
            </div>
          ) : mlStatus?.connected ? (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-sm font-body">
                <CheckCircle className="h-5 w-5 text-green-500" />
                <span className="text-foreground font-medium">Conectado</span>
                <span className="text-muted-foreground">• Vendedor ID: {mlStatus.user_id}</span>
              </div>

              {mlStatus.is_expired ? (
                <div className="flex items-center gap-2 text-sm font-body">
                  <AlertCircle className="h-4 w-4 text-destructive" />
                  <span className="text-destructive">Token expirado</span>
                </div>
              ) : (
                <p className="text-xs text-muted-foreground font-body">
                  Token válido até: {formatDate(mlStatus.expires_at)}
                </p>
              )}

              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={refreshMlToken} className="font-display uppercase tracking-wider text-xs">
                  <RefreshCw className="mr-2 h-3 w-3" /> Renovar Token
                </Button>
                <Button variant="outline" size="sm" asChild className="font-display uppercase tracking-wider text-xs">
                  <a href={mlAuthUrl}>
                    <Link2 className="mr-2 h-3 w-3" /> Re-autorizar
                  </a>
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-sm font-body">
                <AlertCircle className="h-5 w-5 text-muted-foreground" />
                <span className="text-muted-foreground">Não conectado</span>
              </div>
              <p className="text-xs text-muted-foreground font-body">
                Conecte sua conta do Mercado Livre para importar e sincronizar produtos automaticamente.
              </p>
              <Button asChild className="font-display uppercase tracking-wider text-xs">
                <a href={mlAuthUrl}>
                  <ExternalLink className="mr-2 h-4 w-4" /> Autorizar Mercado Livre
                </a>
              </Button>
            </div>
          )}
        </div>

        {/* ML Sync */}
        <div className="bg-card rounded-xl border border-border p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="font-display text-lg font-bold text-foreground uppercase tracking-wider">Sincronização ML</h2>
            <Button onClick={runManualSync} disabled={syncing || !mlStatus?.connected} variant="outline" className="font-display uppercase tracking-wider text-xs">
              {syncing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
              {syncing ? "Sincronizando..." : "Sincronizar Agora"}
            </Button>
          </div>

          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm font-body">
              <CheckCircle className="h-4 w-4 text-green-500" />
              <span className="text-muted-foreground">Job agendado: a cada 6 horas</span>
            </div>

            {syncStatus ? (
              <div className="bg-muted/50 rounded-lg p-4 space-y-2">
                <p className="text-xs font-body text-muted-foreground">
                  Última sincronização: <span className="text-foreground font-medium">{formatDate(syncStatus.timestamp)}</span>
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {[
                    { label: "Produtos ML", value: syncStatus.total_ml || 0 },
                    { label: "Produtos Locais", value: syncStatus.total_local || 0 },
                    { label: "Atualizados", value: syncStatus.synced || 0, color: "text-primary" },
                    { label: "Sem Alteração", value: syncStatus.skipped || 0 },
                  ].map((m, i) => (
                    <div key={i} className="text-center">
                      <p className={`font-display text-xl font-bold ${m.color || 'text-foreground'}`}>{m.value}</p>
                      <p className="text-xs text-muted-foreground font-body">{m.label}</p>
                    </div>
                  ))}
                </div>

                {syncStatus.changes?.length > 0 && (
                  <div className="mt-3 border-t border-border pt-3">
                    <p className="text-xs font-body font-medium text-foreground mb-2">Alterações recentes:</p>
                    <div className="space-y-1.5 max-h-40 overflow-y-auto">
                      {syncStatus.changes.map((c: any, i: number) => (
                        <div key={i} className="text-xs font-body text-muted-foreground flex flex-wrap gap-1">
                          <span className="text-foreground font-medium truncate max-w-[200px]">{c.name}</span>
                          {c.price && <span>• Preço: R$ {c.price.from?.toFixed(2).replace('.', ',')} → R$ {c.price.to?.toFixed(2).replace('.', ',')}</span>}
                          {c.stock && <span>• Estoque: {c.stock.from} → {c.stock.to}</span>}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-2 text-sm font-body text-muted-foreground">
                <AlertCircle className="h-4 w-4" />
                <span>Nenhuma sincronização realizada ainda.</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </AdminLayout>
  );
};

export default AdminSettings;
