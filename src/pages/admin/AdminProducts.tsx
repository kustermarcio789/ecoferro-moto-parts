import { useEffect, useState } from "react";
import { Plus, Search, Edit, Trash2, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import AdminLayout from "@/components/admin/AdminLayout";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

const AdminProducts = () => {
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const { toast } = useToast();

  const fetchProducts = async () => {
    setLoading(true);
    let query = supabase.from("products").select("id, name, sku, price, cost, stock, min_stock, is_active, is_featured, categories(name), product_images(url, is_primary)").order("created_at", { ascending: false });
    if (search) query = query.ilike("name", `%${search}%`);
    const { data } = await query;
    setProducts(data || []);
    setLoading(false);
  };

  useEffect(() => { fetchProducts(); }, [search]);

  const toggleActive = async (id: string, current: boolean) => {
    await supabase.from("products").update({ is_active: !current }).eq("id", id);
    fetchProducts();
  };

  const deleteProduct = async (id: string) => {
    if (!confirm("Tem certeza que deseja excluir este produto?")) return;
    await supabase.from("products").delete().eq("id", id);
    toast({ title: "Produto excluído" });
    fetchProducts();
  };

  const getImage = (p: any) => p.product_images?.find((i: any) => i.is_primary)?.url || p.product_images?.[0]?.url;

  return (
    <AdminLayout title="Produtos">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <div className="relative flex-1 max-w-md">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar produtos..."
            className="w-full rounded-lg border border-border bg-background px-4 py-2.5 pr-10 font-body text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="font-display uppercase tracking-wider text-xs">
            <Upload className="mr-2 h-4 w-4" /> Importar CSV
          </Button>
          <Button className="font-display uppercase tracking-wider text-xs">
            <Plus className="mr-2 h-4 w-4" /> Novo Produto
          </Button>
        </div>
      </div>

      <div className="bg-card rounded-xl border border-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="text-left p-4 font-display uppercase tracking-wider text-xs text-muted-foreground">Produto</th>
                <th className="text-left p-4 font-display uppercase tracking-wider text-xs text-muted-foreground">SKU</th>
                <th className="text-left p-4 font-display uppercase tracking-wider text-xs text-muted-foreground">Categoria</th>
                <th className="text-right p-4 font-display uppercase tracking-wider text-xs text-muted-foreground">Preço</th>
                <th className="text-right p-4 font-display uppercase tracking-wider text-xs text-muted-foreground">Custo</th>
                <th className="text-center p-4 font-display uppercase tracking-wider text-xs text-muted-foreground">Estoque</th>
                <th className="text-center p-4 font-display uppercase tracking-wider text-xs text-muted-foreground">Status</th>
                <th className="text-right p-4 font-display uppercase tracking-wider text-xs text-muted-foreground">Ações</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}><td colSpan={8} className="p-4"><div className="h-12 bg-muted rounded animate-pulse" /></td></tr>
                ))
              ) : products.length === 0 ? (
                <tr><td colSpan={8} className="p-12 text-center text-muted-foreground font-body">Nenhum produto cadastrado</td></tr>
              ) : (
                products.map(p => (
                  <tr key={p.id} className="border-b border-border hover:bg-muted/30 transition-colors">
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        {getImage(p) && <img src={getImage(p)} alt="" className="h-10 w-10 rounded object-cover" />}
                        <span className="font-body font-medium text-foreground line-clamp-1">{p.name}</span>
                      </div>
                    </td>
                    <td className="p-4 text-muted-foreground font-body">{p.sku || "—"}</td>
                    <td className="p-4 text-muted-foreground font-body">{p.categories?.name || "—"}</td>
                    <td className="p-4 text-right font-body font-medium">R$ {Number(p.price).toFixed(2).replace(".", ",")}</td>
                    <td className="p-4 text-right font-body text-muted-foreground">{p.cost ? `R$ ${Number(p.cost).toFixed(2).replace(".", ",")}` : "—"}</td>
                    <td className="p-4 text-center">
                      <span className={`inline-block px-2 py-0.5 rounded text-xs font-body font-medium ${p.stock <= (p.min_stock || 5) ? "bg-destructive/10 text-destructive" : "bg-primary/10 text-primary"}`}>
                        {p.stock}
                      </span>
                    </td>
                    <td className="p-4 text-center">
                      <button onClick={() => toggleActive(p.id, p.is_active)} className={`inline-block px-2 py-0.5 rounded text-xs font-body font-medium cursor-pointer ${p.is_active ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"}`}>
                        {p.is_active ? "Ativo" : "Inativo"}
                      </button>
                    </td>
                    <td className="p-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button variant="ghost" size="icon" className="h-8 w-8"><Edit className="h-3.5 w-3.5" /></Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => deleteProduct(p.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                      </div>
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

export default AdminProducts;
