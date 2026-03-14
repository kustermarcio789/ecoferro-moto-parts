import AdminLayout from "@/components/admin/AdminLayout";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Save, RefreshCw, Loader2, CheckCircle, AlertCircle } from "lucide-react";

const AdminSettings = () => {
  const { toast } = useToast();
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

  useEffect(() => {
    supabase.from("site_settings").select("key, value").then(({ data }) => {
      if (data) {
        const map: Record<string, any> = {};
        data.forEach(s => {
          if (s.key === 'ml_sync_last_run') {
            setSyncStatus(s.value);
          } else {
            map[s.key] = typeof s.value === "string" ? s.value : JSON.stringify(s.value);
          }
        });
        setSettings(prev => ({ ...prev, ...map }));
      }
    });
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
        body: { nickname: 'ECOFERRO2059' },
      });
      if (error) throw error;
      if (data?.success) {
        toast({ title: `Sincronização concluída: ${data.synced} produto(s) atualizado(s)` });
        // Refresh sync status
        const { data: setting } = await supabase.from("site_settings").select("value").eq("key", "ml_sync_last_run").maybeSingle();
        if (setting) setSyncStatus(setting.value);
      } else {
        toast({ title: "Erro na sincronização", description: data?.error, variant: "destructive" });
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
    try {
      return new Date(iso).toLocaleString('pt-BR');
    } catch { return iso; }
  };

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

        {/* ML Sync */}
        <div className="bg-card rounded-xl border border-border p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="font-display text-lg font-bold text-foreground uppercase tracking-wider">Sincronização Mercado Livre</h2>
            <Button onClick={runManualSync} disabled={syncing} variant="outline" className="font-display uppercase tracking-wider text-xs">
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
                  <div className="text-center">
                    <p className="font-display text-xl font-bold text-foreground">{syncStatus.total_ml || 0}</p>
                    <p className="text-xs text-muted-foreground font-body">Produtos ML</p>
                  </div>
                  <div className="text-center">
                    <p className="font-display text-xl font-bold text-foreground">{syncStatus.total_local || 0}</p>
                    <p className="text-xs text-muted-foreground font-body">Produtos Locais</p>
                  </div>
                  <div className="text-center">
                    <p className="font-display text-xl font-bold text-primary">{syncStatus.synced || 0}</p>
                    <p className="text-xs text-muted-foreground font-body">Atualizados</p>
                  </div>
                  <div className="text-center">
                    <p className="font-display text-xl font-bold text-muted-foreground">{syncStatus.skipped || 0}</p>
                    <p className="text-xs text-muted-foreground font-body">Sem Alteração</p>
                  </div>
                </div>

                {syncStatus.changes?.length > 0 && (
                  <div className="mt-3 border-t border-border pt-3">
                    <p className="text-xs font-body font-medium text-foreground mb-2">Alterações recentes:</p>
                    <div className="space-y-1.5 max-h-40 overflow-y-auto">
                      {syncStatus.changes.map((c: any, i: number) => (
                        <div key={i} className="text-xs font-body text-muted-foreground flex flex-wrap gap-1">
                          <span className="text-foreground font-medium truncate max-w-[200px]">{c.name}</span>
                          {c.price && (
                            <span>• Preço: R$ {c.price.from?.toFixed(2).replace('.', ',')} → R$ {c.price.to?.toFixed(2).replace('.', ',')}</span>
                          )}
                          {c.stock && (
                            <span>• Estoque: {c.stock.from} → {c.stock.to}</span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-2 text-sm font-body text-muted-foreground">
                <AlertCircle className="h-4 w-4" />
                <span>Nenhuma sincronização realizada ainda. Clique em "Sincronizar Agora" para começar.</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </AdminLayout>
  );
};

export default AdminSettings;
