import { useEffect, useState } from "react";
import { AlertTriangle, Package, ArrowUpDown } from "lucide-react";
import AdminLayout from "@/components/admin/AdminLayout";
import { supabase } from "@/integrations/supabase/client";

const AdminInventory = () => {
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "low" | "out">("low");

  useEffect(() => {
    const fetch = async () => {
      setLoading(true);
      let query = supabase.from("products").select("id, name, sku, stock, min_stock, price, cost, is_active").eq("is_active", true).order("stock", { ascending: true });
      if (filter === "low") query = query.lte("stock", 10);
      if (filter === "out") query = query.lte("stock", 0);
      const { data } = await query.limit(100);
      setProducts(data || []);
      setLoading(false);
    };
    fetch();
  }, [filter]);

  return (
    <AdminLayout title="Controle de Estoque">
      <div className="flex gap-2 mb-6">
        {[
          { key: "low" as const, label: "Estoque Baixo" },
          { key: "out" as const, label: "Ruptura" },
          { key: "all" as const, label: "Todos" },
        ].map(f => (
          <button key={f.key} onClick={() => setFilter(f.key)}
            className={`px-4 py-2 rounded-lg text-xs font-display uppercase tracking-wider transition-colors ${filter === f.key ? "bg-primary text-primary-foreground" : "bg-card border border-border text-foreground hover:bg-muted"}`}>
            {f.label}
          </button>
        ))}
      </div>

      <div className="bg-card rounded-xl border border-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="text-left p-4 font-display uppercase tracking-wider text-xs text-muted-foreground">Produto</th>
                <th className="text-left p-4 font-display uppercase tracking-wider text-xs text-muted-foreground">SKU</th>
                <th className="text-center p-4 font-display uppercase tracking-wider text-xs text-muted-foreground">Estoque</th>
                <th className="text-center p-4 font-display uppercase tracking-wider text-xs text-muted-foreground">Mínimo</th>
                <th className="text-center p-4 font-display uppercase tracking-wider text-xs text-muted-foreground">Status</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}><td colSpan={5} className="p-4"><div className="h-10 bg-muted rounded animate-pulse" /></td></tr>
                ))
              ) : products.length === 0 ? (
                <tr><td colSpan={5} className="p-12 text-center text-muted-foreground font-body">Nenhum produto com estoque crítico</td></tr>
              ) : products.map(p => (
                <tr key={p.id} className="border-b border-border hover:bg-muted/30 transition-colors">
                  <td className="p-4 font-body font-medium text-foreground">{p.name}</td>
                  <td className="p-4 font-body text-muted-foreground text-xs">{p.sku || "—"}</td>
                  <td className="p-4 text-center">
                    <span className={`inline-block px-3 py-1 rounded text-xs font-body font-bold ${p.stock <= 0 ? "bg-destructive/10 text-destructive" : p.stock <= (p.min_stock || 5) ? "bg-amber-100 text-amber-700" : "bg-primary/10 text-primary"}`}>
                      {p.stock}
                    </span>
                  </td>
                  <td className="p-4 text-center font-body text-xs text-muted-foreground">{p.min_stock || 5}</td>
                  <td className="p-4 text-center">
                    {p.stock <= 0 ? (
                      <span className="flex items-center justify-center gap-1 text-xs font-body text-destructive"><AlertTriangle className="h-3 w-3" /> Ruptura</span>
                    ) : p.stock <= (p.min_stock || 5) ? (
                      <span className="text-xs font-body text-amber-600">Estoque Baixo</span>
                    ) : (
                      <span className="text-xs font-body text-primary">Normal</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </AdminLayout>
  );
};

export default AdminInventory;
