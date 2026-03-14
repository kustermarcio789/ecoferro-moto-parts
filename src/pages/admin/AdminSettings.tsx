import AdminLayout from "@/components/admin/AdminLayout";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Save } from "lucide-react";

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

  useEffect(() => {
    supabase.from("site_settings").select("key, value").then(({ data }) => {
      if (data) {
        const map: Record<string, any> = {};
        data.forEach(s => { map[s.key] = typeof s.value === "string" ? s.value : JSON.stringify(s.value); });
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

  const fields = [
    { key: "whatsapp_number", label: "WhatsApp (com DDI)", placeholder: "5511999999999" },
    { key: "meta_pixel_id", label: "Meta Pixel ID", placeholder: "123456789" },
    { key: "google_ads_id", label: "Google Ads ID", placeholder: "AW-123456789" },
    { key: "free_shipping_min", label: "Frete Grátis (valor mín.)", placeholder: "299" },
    { key: "pix_discount", label: "Desconto Pix (%)", placeholder: "5" },
  ];

  return (
    <AdminLayout title="Configurações">
      <div className="max-w-2xl">
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
      </div>
    </AdminLayout>
  );
};

export default AdminSettings;
