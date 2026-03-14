import { useEffect, useState } from "react";
import { Plus, Search, Edit, Trash2, Upload, Download, ChevronLeft, ChevronRight, Filter, Image, ShoppingBag, Loader2, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import AdminLayout from "@/components/admin/AdminLayout";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { formatCurrency } from "@/lib/tracking";
import ProductImageUpload from "@/components/admin/ProductImageUpload";

const ITEMS_PER_PAGE = 20;

const AdminProducts = () => {
  const [products, setProducts] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [brands, setBrands] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [showForm, setShowForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState<any>(null);
  const [formData, setFormData] = useState({
    name: "", slug: "", sku: "", price: "", cost: "", original_price: "",
    stock: "0", min_stock: "5", moq: "1", category_id: "", brand_id: "",
    description: "", short_description: "", is_active: true, is_featured: false,
    is_new: false, wholesale_only: false, wholesale_price: "",
    weight: "", width: "", height: "", length: "",
    ncm: "", cfop: "", origin: "", meta_title: "", meta_description: "",
  });
  const [showMlImport, setShowMlImport] = useState(false);
  const [mlProducts, setMlProducts] = useState<any[]>([]);
  const [mlLoading, setMlLoading] = useState(false);
  const [mlSelected, setMlSelected] = useState<Set<string>>(new Set());
  const [mlImporting, setMlImporting] = useState(false);
  const { toast } = useToast();

  const fetchMlProducts = async () => {
    setMlLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('mercadolivre-import', {
        body: { nickname: 'ECOFERRO2059', offset: 0, limit: 50 },
      });
      if (error) throw error;
      if (data?.success) {
        setMlProducts(data.products || []);
        setMlSelected(new Set());
        toast({ title: `${data.products.length} produtos encontrados no Mercado Livre` });
      } else {
        toast({ title: "Erro", description: data?.error || "Falha ao buscar produtos", variant: "destructive" });
      }
    } catch (err: any) {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    } finally {
      setMlLoading(false);
    }
  };

  const importMlSelected = async () => {
    const toImport = mlProducts.filter(p => mlSelected.has(p.ml_id));
    if (!toImport.length) return;
    setMlImporting(true);
    let imported = 0;
    for (const p of toImport) {
      // Check if already exists by ml_id
      const { data: existing } = await supabase.from("products").select("id").eq("ml_id", p.ml_id).maybeSingle();
      if (existing) continue;

      const { error } = await supabase.from("products").insert({
        name: p.name,
        slug: p.slug,
        price: p.price,
        original_price: p.original_price || null,
        stock: p.stock,
        ml_id: p.ml_id,
        ml_permalink: p.ml_permalink,
        is_active: true,
        is_new: false,
        is_featured: false,
      });
      if (!error) {
        imported++;
        // Also add primary image if available
        if (p.image) {
          const { data: prod } = await supabase.from("products").select("id").eq("ml_id", p.ml_id).maybeSingle();
          if (prod) {
            await supabase.from("product_images").insert({
              product_id: prod.id,
              url: p.image,
              is_primary: true,
              alt_text: p.name,
            });
          }
        }
      }
    }
    toast({ title: `${imported} produto(s) importado(s) com sucesso` });
    setShowMlImport(false);
    setMlProducts([]);
    setMlSelected(new Set());
    setMlImporting(false);
    fetchProducts();
  };

  const toggleMlSelect = (mlId: string) => {
    setMlSelected(prev => {
      const next = new Set(prev);
      if (next.has(mlId)) next.delete(mlId); else next.add(mlId);
      return next;
    });
  };

  const toggleMlSelectAll = () => {
    if (mlSelected.size === mlProducts.length) {
      setMlSelected(new Set());
    } else {
      setMlSelected(new Set(mlProducts.map(p => p.ml_id)));
    }
  };

  const fetchProducts = async () => {
    setLoading(true);
    let query = supabase
      .from("products")
      .select("id, name, slug, sku, price, cost, stock, min_stock, is_active, is_featured, is_new, wholesale_price, moq, categories(name), product_images(url, is_primary), brand_id", { count: "exact" })
      .order("created_at", { ascending: false });

    if (search) query = query.ilike("name", `%${search}%`);
    if (categoryFilter && categoryFilter !== "all") query = query.eq("category_id", categoryFilter);
    if (statusFilter === "active") query = query.eq("is_active", true);
    else if (statusFilter === "inactive") query = query.eq("is_active", false);
    else if (statusFilter === "lowstock") query = query.lte("stock", 5);

    const from = (page - 1) * ITEMS_PER_PAGE;
    query = query.range(from, from + ITEMS_PER_PAGE - 1);

    const { data, count } = await query;
    setProducts(data || []);
    setTotal(count || 0);
    setLoading(false);
  };

  useEffect(() => {
    Promise.all([
      supabase.from("categories").select("id, name, parent_id").eq("is_active", true).order("sort_order").order("name"),
      supabase.from("brands").select("id, name").eq("is_active", true).order("name"),
    ]).then(([cats, brs]) => {
      setCategories(cats.data || []);
      setBrands(brs.data || []);
    });
  }, []);

  useEffect(() => { fetchProducts(); }, [search, categoryFilter, statusFilter, page]);

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

  const generateSlug = (name: string) => name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

  const handleSave = async () => {
    const slug = formData.slug || generateSlug(formData.name);
    const payload = {
      name: formData.name,
      slug,
      sku: formData.sku || null,
      price: Number(formData.price) || 0,
      cost: Number(formData.cost) || 0,
      original_price: Number(formData.original_price) || null,
      stock: Number(formData.stock) || 0,
      min_stock: Number(formData.min_stock) || 5,
      moq: Number(formData.moq) || 1,
      category_id: formData.category_id || null,
      brand_id: formData.brand_id || null,
      description: formData.description || null,
      short_description: formData.short_description || null,
      is_active: formData.is_active,
      is_featured: formData.is_featured,
      is_new: formData.is_new,
      wholesale_only: formData.wholesale_only,
      wholesale_price: Number(formData.wholesale_price) || null,
      weight: Number(formData.weight) || 0,
      width: Number(formData.width) || 0,
      height: Number(formData.height) || 0,
      length: Number(formData.length) || 0,
      ncm: formData.ncm || null,
      cfop: formData.cfop || null,
      origin: formData.origin || null,
      meta_title: formData.meta_title || null,
      meta_description: formData.meta_description || null,
    };

    let error;
    if (editingProduct) {
      ({ error } = await supabase.from("products").update(payload).eq("id", editingProduct.id));
    } else {
      ({ error } = await supabase.from("products").insert(payload));
    }

    if (error) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    } else {
      toast({ title: editingProduct ? "Produto atualizado" : "Produto criado" });
      setShowForm(false);
      setEditingProduct(null);
      resetForm();
      fetchProducts();
    }
  };

  const resetForm = () => {
    setFormData({
      name: "", slug: "", sku: "", price: "", cost: "", original_price: "",
      stock: "0", min_stock: "5", moq: "1", category_id: "", brand_id: "",
      description: "", short_description: "", is_active: true, is_featured: false,
      is_new: false, wholesale_only: false, wholesale_price: "",
      weight: "", width: "", height: "", length: "",
      ncm: "", cfop: "", origin: "", meta_title: "", meta_description: "",
    });
  };

  const startEdit = async (p: any) => {
    // Fetch full product data since list query only has partial fields
    const { data: full } = await supabase.from("products").select("*").eq("id", p.id).single();
    const prod = full || p;
    setEditingProduct(prod);
    setFormData({
      name: prod.name || "", slug: prod.slug || "", sku: prod.sku || "",
      price: String(prod.price || ""), cost: String(prod.cost || ""),
      original_price: String(prod.original_price || ""),
      stock: String(prod.stock || 0), min_stock: String(prod.min_stock || 5),
      moq: String(prod.moq || 1), category_id: prod.category_id || "",
      brand_id: prod.brand_id || "",
      description: prod.description || "", short_description: prod.short_description || "",
      is_active: prod.is_active ?? true, is_featured: prod.is_featured ?? false,
      is_new: prod.is_new ?? false, wholesale_only: prod.wholesale_only ?? false,
      wholesale_price: String(prod.wholesale_price || ""),
      weight: String(prod.weight || ""), width: String(prod.width || ""),
      height: String(prod.height || ""), length: String(prod.length || ""),
      ncm: prod.ncm || "", cfop: prod.cfop || "", origin: prod.origin || "",
      meta_title: prod.meta_title || "", meta_description: prod.meta_description || "",
    });
    setShowForm(true);
  };

  const totalPages = Math.ceil(total / ITEMS_PER_PAGE);
  const margin = (p: any) => p.cost > 0 ? (((p.price - p.cost) / p.price) * 100).toFixed(0) : "—";

  return (
    <AdminLayout title="Produtos">
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <div className="relative flex-1 max-w-md">
          <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar produtos..."
            className="w-full rounded-lg border border-border bg-background px-4 py-2.5 pr-10 font-body text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        </div>
        <div className="flex flex-wrap gap-2">
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-40 text-xs font-body"><SelectValue placeholder="Categoria" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas</SelectItem>
              {categories.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-36 text-xs font-body"><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="active">Ativos</SelectItem>
              <SelectItem value="inactive">Inativos</SelectItem>
              <SelectItem value="lowstock">Estoque Baixo</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={() => { resetForm(); setEditingProduct(null); setShowForm(true); }} className="font-display uppercase tracking-wider text-xs">
            <Plus className="mr-2 h-4 w-4" /> Novo Produto
          </Button>
        </div>
      </div>

      <p className="text-xs text-muted-foreground font-body mb-3">{total} produto(s)</p>

      {/* Product Form Dialog */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-display uppercase tracking-wider">
              {editingProduct ? "Editar Produto" : "Novo Produto"}
            </DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-body font-medium text-foreground mb-1 block">Nome *</label>
                <input value={formData.name} onChange={e => setFormData(f => ({ ...f, name: e.target.value, slug: generateSlug(e.target.value) }))}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 font-body text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
              </div>
              <div>
                <label className="text-xs font-body font-medium text-foreground mb-1 block">SKU</label>
                <input value={formData.sku} onChange={e => setFormData(f => ({ ...f, sku: e.target.value }))}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 font-body text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
              </div>
            </div>
            <div>
              <label className="text-xs font-body font-medium text-foreground mb-1 block">Slug</label>
              <input value={formData.slug} onChange={e => setFormData(f => ({ ...f, slug: e.target.value }))}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 font-body text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div>
                <label className="text-xs font-body font-medium text-foreground mb-1 block">Preço *</label>
                <input type="number" step="0.01" value={formData.price} onChange={e => setFormData(f => ({ ...f, price: e.target.value }))}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 font-body text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
              </div>
              <div>
                <label className="text-xs font-body font-medium text-foreground mb-1 block">Custo</label>
                <input type="number" step="0.01" value={formData.cost} onChange={e => setFormData(f => ({ ...f, cost: e.target.value }))}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 font-body text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
              </div>
              <div>
                <label className="text-xs font-body font-medium text-foreground mb-1 block">Preço Original</label>
                <input type="number" step="0.01" value={formData.original_price} onChange={e => setFormData(f => ({ ...f, original_price: e.target.value }))}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 font-body text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
              </div>
              <div>
                <label className="text-xs font-body font-medium text-foreground mb-1 block">Preço Atacado</label>
                <input type="number" step="0.01" value={formData.wholesale_price} onChange={e => setFormData(f => ({ ...f, wholesale_price: e.target.value }))}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 font-body text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="text-xs font-body font-medium text-foreground mb-1 block">Estoque</label>
                <input type="number" value={formData.stock} onChange={e => setFormData(f => ({ ...f, stock: e.target.value }))}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 font-body text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
              </div>
              <div>
                <label className="text-xs font-body font-medium text-foreground mb-1 block">Estoque Mínimo</label>
                <input type="number" value={formData.min_stock} onChange={e => setFormData(f => ({ ...f, min_stock: e.target.value }))}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 font-body text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
              </div>
              <div>
                <label className="text-xs font-body font-medium text-foreground mb-1 block">MOQ (lote mín.)</label>
                <input type="number" value={formData.moq} onChange={e => setFormData(f => ({ ...f, moq: e.target.value }))}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 font-body text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
              </div>
            </div>
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-body font-medium text-foreground mb-1 block">Classe / Subclasse</label>
                <Select value={formData.category_id || "none"} onValueChange={v => setFormData(f => ({ ...f, category_id: v === "none" ? "" : v }))}>
                  <SelectTrigger className="font-body text-sm"><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Nenhuma</SelectItem>
                    {categories.filter(c => !(c as any).parent_id).map(cls => {
                      const subs = categories.filter(s => (s as any).parent_id === cls.id);
                      return [
                        <SelectItem key={cls.id} value={cls.id} className="font-bold">{cls.name}</SelectItem>,
                        ...subs.map(sub => <SelectItem key={sub.id} value={sub.id} className="pl-6">↳ {sub.name}</SelectItem>),
                      ];
                    }).flat()}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs font-body font-medium text-foreground mb-1 block">Marca</label>
                <Select value={formData.brand_id || "none"} onValueChange={v => setFormData(f => ({ ...f, brand_id: v === "none" ? "" : v }))}>
                  <SelectTrigger className="font-body text-sm"><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Nenhuma</SelectItem>
                    {brands.map(b => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <label className="text-xs font-body font-medium text-foreground mb-1 block">Descrição Curta</label>
              <input value={formData.short_description} onChange={e => setFormData(f => ({ ...f, short_description: e.target.value }))}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 font-body text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
            </div>
            <div>
              <label className="text-xs font-body font-medium text-foreground mb-1 block">Descrição</label>
              <textarea rows={4} value={formData.description} onChange={e => setFormData(f => ({ ...f, description: e.target.value }))}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 font-body text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-none" />
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div>
                <label className="text-xs font-body font-medium text-foreground mb-1 block">Peso (kg)</label>
                <input type="number" step="0.001" value={formData.weight} onChange={e => setFormData(f => ({ ...f, weight: e.target.value }))}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 font-body text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
              </div>
              <div>
                <label className="text-xs font-body font-medium text-foreground mb-1 block">Largura (cm)</label>
                <input type="number" step="0.1" value={formData.width} onChange={e => setFormData(f => ({ ...f, width: e.target.value }))}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 font-body text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
              </div>
              <div>
                <label className="text-xs font-body font-medium text-foreground mb-1 block">Altura (cm)</label>
                <input type="number" step="0.1" value={formData.height} onChange={e => setFormData(f => ({ ...f, height: e.target.value }))}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 font-body text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
              </div>
              <div>
                <label className="text-xs font-body font-medium text-foreground mb-1 block">Comp. (cm)</label>
                <input type="number" step="0.1" value={formData.length} onChange={e => setFormData(f => ({ ...f, length: e.target.value }))}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 font-body text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="text-xs font-body font-medium text-foreground mb-1 block">NCM</label>
                <input value={formData.ncm} onChange={e => setFormData(f => ({ ...f, ncm: e.target.value }))}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 font-body text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
              </div>
              <div>
                <label className="text-xs font-body font-medium text-foreground mb-1 block">CFOP</label>
                <input value={formData.cfop} onChange={e => setFormData(f => ({ ...f, cfop: e.target.value }))}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 font-body text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
              </div>
              <div>
                <label className="text-xs font-body font-medium text-foreground mb-1 block">Origem</label>
                <input value={formData.origin} onChange={e => setFormData(f => ({ ...f, origin: e.target.value }))}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 font-body text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
              </div>
            </div>
            <div className="flex flex-wrap gap-6">
              {[
                { key: "is_active", label: "Ativo" },
                { key: "is_featured", label: "Destaque" },
                { key: "is_new", label: "Novo" },
                { key: "wholesale_only", label: "Somente Atacado" },
              ].map(opt => (
                <label key={opt.key} className="flex items-center gap-2 text-sm font-body text-foreground cursor-pointer">
                  <input type="checkbox" checked={(formData as any)[opt.key]} onChange={e => setFormData(f => ({ ...f, [opt.key]: e.target.checked }))} className="rounded" />
                  {opt.label}
                </label>
              ))}
            </div>
            {/* Image upload - only for existing products */}
            {editingProduct && (
              <div className="border-t border-border pt-4">
                <ProductImageUpload productId={editingProduct.id} />
              </div>
            )}
            <div className="flex justify-end gap-3 pt-4 border-t border-border">
              <Button variant="outline" onClick={() => setShowForm(false)}>Cancelar</Button>
              <Button onClick={handleSave} className="font-display uppercase tracking-wider text-xs">
                {editingProduct ? "Salvar Alterações" : "Criar Produto"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Table */}
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
                <th className="text-right p-4 font-display uppercase tracking-wider text-xs text-muted-foreground">Margem</th>
                <th className="text-center p-4 font-display uppercase tracking-wider text-xs text-muted-foreground">Estoque</th>
                <th className="text-center p-4 font-display uppercase tracking-wider text-xs text-muted-foreground">Status</th>
                <th className="text-right p-4 font-display uppercase tracking-wider text-xs text-muted-foreground">Ações</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}><td colSpan={9} className="p-4"><div className="h-12 bg-muted rounded animate-pulse" /></td></tr>
                ))
              ) : products.length === 0 ? (
                <tr><td colSpan={9} className="p-12 text-center text-muted-foreground font-body">Nenhum produto encontrado</td></tr>
              ) : (
                products.map(p => (
                  <tr key={p.id} className="border-b border-border hover:bg-muted/30 transition-colors">
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        {getImage(p) && <img src={getImage(p)} alt="" className="h-10 w-10 rounded object-cover" />}
                        <span className="font-body font-medium text-foreground line-clamp-1 max-w-[200px]">{p.name}</span>
                      </div>
                    </td>
                    <td className="p-4 text-muted-foreground font-body text-xs">{p.sku || "—"}</td>
                    <td className="p-4 text-muted-foreground font-body text-xs">{p.categories?.name || "—"}</td>
                    <td className="p-4 text-right font-body font-medium">{formatCurrency(Number(p.price))}</td>
                    <td className="p-4 text-right font-body text-muted-foreground text-xs">{p.cost ? formatCurrency(Number(p.cost)) : "—"}</td>
                    <td className="p-4 text-right font-body text-xs">
                      <span className={Number(margin(p)) > 30 ? "text-primary" : Number(margin(p)) > 0 ? "text-amber-500" : "text-muted-foreground"}>
                        {margin(p)}%
                      </span>
                    </td>
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
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => startEdit(p)}><Edit className="h-3.5 w-3.5" /></Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => deleteProduct(p.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-border">
            <span className="text-xs text-muted-foreground font-body">Página {page} de {totalPages}</span>
            <div className="flex gap-1">
              <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}><ChevronLeft className="h-4 w-4" /></Button>
              <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}><ChevronRight className="h-4 w-4" /></Button>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
};

export default AdminProducts;
