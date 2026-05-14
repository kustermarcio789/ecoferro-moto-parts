import { useEffect, useState, useMemo } from "react";
import { Plus, Search, Edit, Trash2, ChevronLeft, ChevronRight, ShoppingBag, Loader2, Check, Package, Image as ImageIcon, Settings, DollarSign, Barcode } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import AdminLayout from "@/components/admin/AdminLayout";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatCurrency } from "@/lib/tracking";
import ProductImageUpload from "@/components/admin/ProductImageUpload";
import { getProductionMapping, PRODUCTION_SOURCE_SYSTEM, upsertProductionMapping } from "@/services/inventoryService";

const ITEMS_PER_PAGE = 20;
const supabaseAny = supabase as any;

const emptyForm = {
  name: "",
  slug: "",
  sku: "",
  internal_code: "",
  price: "",
  cost: "",
  original_price: "",
  stock: "0",
  min_stock: "5",
  moq: "1",
  category_id: "",
  brand_id: "",
  short_description: "",
  description: "",
  is_active: true,
  is_featured: false,
  is_new: false,
  target_audience: "both",
  wholesale_price: "",
  production_external_code: "",
  production_external_sku: "",
  production_external_product_id: "",
  unit: "un",
  allow_negative_stock: false,
  is_on_demand: false,
  is_customized: false,
  technical_specs: "",
  dimensions_info: "",
  color: "",
  finish: "",
  lead_time: "",
  barcode: "",
  product_class: "",
};

const AdminProducts = () => {
  const { toast } = useToast();
  const [products, setProducts] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [brands, setBrands] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [showForm, setShowForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState<any>(null);
  const [formData, setFormData] = useState(emptyForm);
  const [showMlImport, setShowMlImport] = useState(false);
  const [mlProducts, setMlProducts] = useState<any[]>([]);
  const [mlLoading, setMlLoading] = useState(false);
  const [mlSelected, setMlSelected] = useState<Set<string>>(new Set());
  const [mlImporting, setMlImporting] = useState(false);
  const [saving, setSaving] = useState(false);

  const generateSlug = (name: string) =>
    name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

  const fetchProducts = async () => {
    setLoading(true);
    let query = supabaseAny
      .from("products")
      .select("id, name, sku, internal_code, price, cost, stock, min_stock, is_active, wholesale_only, categories(name), product_images(url, is_primary)", { count: "exact" })
      .order("created_at", { ascending: false });

    if (search) query = query.ilike("name", `%${search}%`);
    if (categoryFilter !== "all") query = query.eq("category_id", categoryFilter);
    if (statusFilter === "active") query = query.eq("is_active", true);
    if (statusFilter === "inactive") query = query.eq("is_active", false);
    if (statusFilter === "lowstock") query = query.lte("stock", 5);
    
    if (typeFilter === "retail") query = query.or("wholesale_only.eq.false,wholesale_only.is.null");
    if (typeFilter === "wholesale") query = query.eq("wholesale_only", true);

    const from = (page - 1) * ITEMS_PER_PAGE;
    const { data, count, error } = await query.range(from, from + ITEMS_PER_PAGE - 1);

    if (error) {
      toast({ title: "Erro ao carregar produtos", description: error.message, variant: "destructive" });
      setProducts([]);
      setTotal(0);
    } else {
      setProducts(data || []);
      setTotal(count || 0);
    }
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

  useEffect(() => {
    fetchProducts();
  }, [search, categoryFilter, statusFilter, typeFilter, page]);

  const fetchMlProducts = async () => {
    setMlLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("mercadolivre-import", {
        body: { nickname: "ECOFERRO2059", offset: 0, limit: 50 },
      });
      if (error) throw error;
      setMlProducts(data?.products || []);
      setMlSelected(new Set());
    } catch (error: any) {
      toast({ title: "Erro ao buscar produtos ML", description: error.message, variant: "destructive" });
    } finally {
      setMlLoading(false);
    }
  };

  const importMlSelected = async () => {
    const selected = mlProducts.filter((product) => mlSelected.has(product.ml_id));
    if (!selected.length) return;
    setMlImporting(true);

    for (const product of selected) {
      const { data: created } = await supabaseAny
        .from("products")
        .insert({
          name: product.name,
          slug: product.slug,
          price: product.price,
          original_price: product.original_price || null,
          stock: 0,
          ml_id: product.ml_id,
          ml_permalink: product.ml_permalink,
          is_active: true,
          wholesale_only: false,
        })
        .select("id")
        .single();

      if (!created) continue;
      await supabaseAny.from("product_external_mappings").upsert({
        product_id: created.id,
        source_system: "mercado_livre",
        external_product_id: product.ml_id,
        is_active: true,
        metadata: { imported_from_ml_catalog: true },
      }, { onConflict: "product_id,source_system" });
    }

    toast({
      title: "Importacao concluida",
      description: "Produtos do ML entram com estoque zero; a disponibilidade passa a ser controlada pelo admin/producao.",
    });
    setMlImporting(false);
    setShowMlImport(false);
    fetchProducts();
  };

  const startEdit = async (product: any) => {
    const { data: full } = await supabaseAny.from("products").select("*").eq("id", product.id).single();
    const mapping = await getProductionMapping(product.id).catch(() => null);
    const current = full || product;

    setEditingProduct(current);
    setFormData({
      name: current.name || "",
      slug: current.slug || "",
      sku: current.sku || "",
      internal_code: current.internal_code || "",
      price: String(current.price || ""),
      cost: String(current.cost || ""),
      original_price: String(current.original_price || ""),
      stock: String(current.stock || 0),
      min_stock: String(current.min_stock || 5),
      moq: String(current.moq || 1),
      category_id: current.category_id || "",
      brand_id: current.brand_id || "",
      short_description: current.short_description || "",
      description: current.description || "",
      is_active: current.is_active ?? true,
      is_featured: current.is_featured ?? false,
      is_new: current.is_new ?? false,
      target_audience: current.target_audience || (current.wholesale_only ? "wholesale" : "both"),
      wholesale_price: String(current.wholesale_price || ""),
      production_external_code: mapping?.external_code || "",
      production_external_sku: mapping?.external_sku || "",
      production_external_product_id: mapping?.external_product_id || "",
      unit: current.unit || "un",
      allow_negative_stock: current.allow_negative_stock ?? false,
      is_on_demand: current.is_on_demand ?? false,
      is_customized: current.is_customized ?? false,
      technical_specs: current.technical_specs || "",
      dimensions_info: current.dimensions_info || "",
      color: current.color || "",
      finish: current.finish || "",
      lead_time: current.lead_time || "",
      barcode: current.barcode || "",
      product_class: current.product_class || "",
    });
    setShowForm(true);
  };

  const marginPercentage = useMemo(() => {
    const price = Number(formData.price) || 0;
    const cost = Number(formData.cost) || 0;
    if (cost === 0) return 0;
    return ((price - cost) / cost) * 100;
  }, [formData.price, formData.cost]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload: any = {
        name: formData.name,
        slug: formData.slug || generateSlug(formData.name),
        sku: formData.sku || null,
        internal_code: formData.internal_code || null,
        price: Number(formData.price) || 0,
        cost: Number(formData.cost) || 0,
        original_price: Number(formData.original_price) || null,
        min_stock: Number(formData.min_stock) || 5,
        moq: Number(formData.moq) || 1,
        category_id: formData.category_id || null,
        brand_id: formData.brand_id || null,
        short_description: formData.short_description || null,
        description: formData.description || null,
        is_active: formData.is_active,
        is_featured: formData.is_featured,
        is_new: formData.is_new,
        target_audience: formData.target_audience,
        wholesale_only: formData.target_audience === "wholesale",
        wholesale_price: Number(formData.wholesale_price) || null,
        unit: formData.unit,
        allow_negative_stock: formData.allow_negative_stock,
        is_on_demand: formData.is_on_demand,
        is_customized: formData.is_customized,
        technical_specs: formData.technical_specs || null,
        dimensions_info: formData.dimensions_info || null,
        color: formData.color || null,
        finish: formData.finish || null,
        lead_time: formData.lead_time || null,
        barcode: formData.barcode || null,
        product_class: formData.product_class || null,
      };
      if (!editingProduct) payload.stock = Number(formData.stock) || 0;

      const query = editingProduct
        ? supabaseAny.from("products").update(payload).eq("id", editingProduct.id)
        : supabaseAny.from("products").insert(payload);

      const { data, error } = await query.select("id").single();
      if (error) throw error;

      await upsertProductionMapping(data.id, {
        externalCode: formData.production_external_code,
        externalSku: formData.production_external_sku,
        externalProductId: formData.production_external_product_id,
      });

      toast({ title: editingProduct ? "Produto atualizado" : "Produto criado" });
      setShowForm(false);
      setEditingProduct(null);
      setFormData(emptyForm);
      fetchProducts();
    } catch (error: any) {
      toast({ title: "Erro ao salvar produto", description: error.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const totalPages = Math.ceil(total / ITEMS_PER_PAGE);
  const getImage = (product: any) => product.product_images?.find((image: any) => image.is_primary)?.url || product.product_images?.[0]?.url;
  const margin = (product: any) => product.cost > 0 ? (((product.price - product.cost) / product.price) * 100).toFixed(0) : "0";

  return (
    <AdminLayout title="Produtos">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative max-w-md flex-1">
          <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar produtos..." className="w-full rounded-lg border border-border bg-background px-4 py-2.5 pr-10 text-sm font-body focus:outline-none focus:ring-2 focus:ring-ring" />
          <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        </div>
        <div className="flex flex-wrap gap-2">
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-40 text-xs font-body"><SelectValue placeholder="Categoria" /></SelectTrigger>
            <SelectContent><SelectItem value="all">Todas</SelectItem>{categories.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-36 text-xs font-body"><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent><SelectItem value="all">Todos</SelectItem><SelectItem value="active">Ativos</SelectItem><SelectItem value="inactive">Inativos</SelectItem><SelectItem value="lowstock">Estoque Baixo</SelectItem></SelectContent>
          </Select>
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-36 text-xs font-body"><SelectValue placeholder="Tipo" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos (Tipos)</SelectItem>
              <SelectItem value="retail">Somente varejo</SelectItem>
              <SelectItem value="wholesale">Somente atacado</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={() => { setShowMlImport(true); fetchMlProducts(); }} className="text-xs font-display uppercase tracking-wider"><ShoppingBag className="mr-2 h-4 w-4" />Importar do ML</Button>
          <Button onClick={() => { setEditingProduct(null); setFormData(emptyForm); setShowForm(true); }} className="text-xs font-display uppercase tracking-wider"><Plus className="mr-2 h-4 w-4" />Novo Produto</Button>
        </div>
      </div>

      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
          <DialogHeader><DialogTitle className="font-display uppercase tracking-wider">{editingProduct ? "Editar Produto" : "Novo Produto"}</DialogTitle></DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div><label className="mb-1 block text-xs font-body font-medium text-foreground">Nome *</label><input value={formData.name} onChange={(event) => setFormData((current) => ({ ...current, name: event.target.value, slug: generateSlug(event.target.value) }))} className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm font-body focus:outline-none focus:ring-2 focus:ring-ring" /></div>
              <div><label className="mb-1 block text-xs font-body font-medium text-foreground">Slug</label><input value={formData.slug} onChange={(event) => setFormData((current) => ({ ...current, slug: event.target.value }))} className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm font-body focus:outline-none focus:ring-2 focus:ring-ring" /></div>
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              <div><label className="mb-1 block text-xs font-body font-medium text-foreground">SKU</label><input value={formData.sku} onChange={(event) => setFormData((current) => ({ ...current, sku: event.target.value }))} className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm font-body focus:outline-none focus:ring-2 focus:ring-ring" /></div>
              <div><label className="mb-1 block text-xs font-body font-medium text-foreground">Codigo interno</label><input value={formData.internal_code} onChange={(event) => setFormData((current) => ({ ...current, internal_code: event.target.value }))} className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm font-body focus:outline-none focus:ring-2 focus:ring-ring" /></div>
              <div><label className="mb-1 block text-xs font-body font-medium text-foreground">Estoque minimo</label><input type="number" value={formData.min_stock} onChange={(event) => setFormData((current) => ({ ...current, min_stock: event.target.value }))} className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm font-body focus:outline-none focus:ring-2 focus:ring-ring" /></div>
            </div>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              <div><label className="mb-1 block text-xs font-body font-medium text-foreground">Preco</label><input type="number" step="0.01" value={formData.price} onChange={(event) => setFormData((current) => ({ ...current, price: event.target.value }))} className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm font-body focus:outline-none focus:ring-2 focus:ring-ring" /></div>
              <div><label className="mb-1 block text-xs font-body font-medium text-foreground">Custo</label><input type="number" step="0.01" value={formData.cost} onChange={(event) => setFormData((current) => ({ ...current, cost: event.target.value }))} className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm font-body focus:outline-none focus:ring-2 focus:ring-ring" /></div>
              <div><label className="mb-1 block text-xs font-body font-medium text-foreground">Preco original</label><input type="number" step="0.01" value={formData.original_price} onChange={(event) => setFormData((current) => ({ ...current, original_price: event.target.value }))} className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm font-body focus:outline-none focus:ring-2 focus:ring-ring" /></div>
              <div><label className="mb-1 block text-xs font-body font-medium text-foreground">Saldo inicial</label><input type="number" value={formData.stock} disabled={!!editingProduct} onChange={(event) => setFormData((current) => ({ ...current, stock: event.target.value }))} className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm font-body focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-60" /></div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div><label className="mb-1 block text-xs font-body font-medium text-foreground">Categoria</label><Select value={formData.category_id || "none"} onValueChange={(value) => setFormData((current) => ({ ...current, category_id: value === "none" ? "" : value }))}><SelectTrigger className="text-sm font-body"><SelectValue placeholder="Selecione" /></SelectTrigger><SelectContent><SelectItem value="none">Nenhuma</SelectItem>{categories.map((category) => <SelectItem key={category.id} value={category.id}>{category.name}</SelectItem>)}</SelectContent></Select></div>
              <div><label className="mb-1 block text-xs font-body font-medium text-foreground">Marca</label><Select value={formData.brand_id || "none"} onValueChange={(value) => setFormData((current) => ({ ...current, brand_id: value === "none" ? "" : value }))}><SelectTrigger className="text-sm font-body"><SelectValue placeholder="Selecione" /></SelectTrigger><SelectContent><SelectItem value="none">Nenhuma</SelectItem>{brands.map((brand) => <SelectItem key={brand.id} value={brand.id}>{brand.name}</SelectItem>)}</SelectContent></Select></div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="grid grid-cols-2 gap-4">
                <div><label className="mb-1 block text-xs font-body font-medium text-foreground">Audiência</label><Select value={formData.target_audience} onValueChange={(value) => setFormData((current) => ({ ...current, target_audience: value }))}><SelectTrigger className="text-sm font-body"><SelectValue placeholder="Selecione" /></SelectTrigger><SelectContent><SelectItem value="retail">Varejo</SelectItem><SelectItem value="wholesale">Atacado</SelectItem><SelectItem value="both">Ambos</SelectItem></SelectContent></Select></div>
                <div><label className="mb-1 block text-xs font-body font-medium text-foreground">Preço de Atacado</label><input type="number" step="0.01" value={formData.wholesale_price} onChange={(e) => setFormData(prev => ({ ...prev, wholesale_price: e.target.value }))} className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm font-body focus:outline-none focus:ring-2 focus:ring-ring" /></div>
              </div>
            </div>
            <div className="rounded-xl border border-border bg-muted/30 p-4">
              <h3 className="font-display text-sm font-bold uppercase tracking-wider text-foreground">Mapeamento com a producao</h3>
              <p className="mt-1 text-xs font-body text-muted-foreground">Origem esperada: {PRODUCTION_SOURCE_SYSTEM}. Estes campos permitem o match por codigo, SKU ou ID externo.</p>
              <div className="mt-3 grid gap-4 sm:grid-cols-3">
                <input value={formData.production_external_code} onChange={(event) => setFormData((current) => ({ ...current, production_external_code: event.target.value }))} placeholder="Codigo no controle" className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm font-body focus:outline-none focus:ring-2 focus:ring-ring" />
                <input value={formData.production_external_sku} onChange={(event) => setFormData((current) => ({ ...current, production_external_sku: event.target.value }))} placeholder="SKU no controle" className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm font-body focus:outline-none focus:ring-2 focus:ring-ring" />
                <input value={formData.production_external_product_id} onChange={(event) => setFormData((current) => ({ ...current, production_external_product_id: event.target.value }))} placeholder="ID externo do produto" className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm font-body focus:outline-none focus:ring-2 focus:ring-ring" />
              </div>
            </div>
            <div><label className="mb-1 block text-xs font-body font-medium text-foreground">Descricao curta</label><input value={formData.short_description} onChange={(event) => setFormData((current) => ({ ...current, short_description: event.target.value }))} className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm font-body focus:outline-none focus:ring-2 focus:ring-ring" /></div>
            <div><label className="mb-1 block text-xs font-body font-medium text-foreground">Descricao</label><textarea rows={4} value={formData.description} onChange={(event) => setFormData((current) => ({ ...current, description: event.target.value }))} className="w-full resize-none rounded-lg border border-border bg-background px-3 py-2 text-sm font-body focus:outline-none focus:ring-2 focus:ring-ring" /></div>
            {editingProduct && <div className="border-t border-border pt-4"><ProductImageUpload productId={editingProduct.id} /></div>}
            <div className="flex justify-end gap-3 border-t border-border pt-4"><Button variant="outline" onClick={() => setShowForm(false)}>Cancelar</Button><Button onClick={handleSave} disabled={saving}>{saving ? "Salvando..." : "Salvar"}</Button></div>
          </div>
        </DialogContent>
      </Dialog>

      <div className="overflow-hidden rounded-xl border border-border bg-card">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="border-b border-border bg-muted/50"><th className="p-4 text-left text-xs font-display uppercase tracking-wider text-muted-foreground">Produto</th><th className="p-4 text-left text-xs font-display uppercase tracking-wider text-muted-foreground">TIPO</th><th className="p-4 text-left text-xs font-display uppercase tracking-wider text-muted-foreground">Codigo / SKU</th><th className="p-4 text-left text-xs font-display uppercase tracking-wider text-muted-foreground">Categoria</th><th className="p-4 text-right text-xs font-display uppercase tracking-wider text-muted-foreground">Preco</th><th className="p-4 text-right text-xs font-display uppercase tracking-wider text-muted-foreground">Margem</th><th className="p-4 text-center text-xs font-display uppercase tracking-wider text-muted-foreground">Disponivel</th><th className="p-4 text-center text-xs font-display uppercase tracking-wider text-muted-foreground">Status</th><th className="p-4 text-right text-xs font-display uppercase tracking-wider text-muted-foreground">Acoes</th></tr></thead>
            <tbody>
              {loading ? Array.from({ length: 5 }).map((_, index) => <tr key={index}><td colSpan={9} className="p-4"><div className="h-12 animate-pulse rounded bg-muted" /></td></tr>) : products.map((product) => (
                <tr key={product.id} className="border-b border-border transition-colors hover:bg-muted/30">
                  <td className="p-4">{getImage(product) && <img src={getImage(product)} alt="" className="mr-3 inline h-10 w-10 rounded object-cover" />}<span className="font-body font-medium text-foreground">{product.name}</span></td>
                  <td className="p-4 text-xs font-body">
                    <span className={`rounded-full px-2 py-1 ${product.wholesale_only ? "bg-amber-100 text-amber-800" : "bg-blue-100 text-blue-800"}`}>
                      {product.wholesale_only ? "Atacado" : "Varejo"}
                    </span>
                  </td>
                  <td className="p-4 text-xs font-body text-muted-foreground"><div>{product.internal_code || "-"}</div><div>{product.sku || "-"}</div></td>
                  <td className="p-4 text-xs font-body text-muted-foreground">{product.categories?.name || "-"}</td>
                  <td className="p-4 text-right font-body font-medium">{formatCurrency(Number(product.price))}</td>
                  <td className="p-4 text-right text-xs font-body">{margin(product)}%</td>
                  <td className="p-4 text-center"><span className={`inline-block rounded px-2 py-0.5 text-xs font-body font-medium ${product.stock <= (product.min_stock || 5) ? "bg-destructive/10 text-destructive" : "bg-primary/10 text-primary"}`}>{product.stock}</span></td>
                  <td className="p-4 text-center"><button onClick={() => supabase.from("products").update({ is_active: !product.is_active }).eq("id", product.id).then(fetchProducts)} className={`inline-block rounded px-2 py-0.5 text-xs font-body font-medium ${product.is_active ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"}`}>{product.is_active ? "Ativo" : "Inativo"}</button></td>
                  <td className="p-4 text-right"><div className="flex items-center justify-end gap-1"><Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => startEdit(product)}><Edit className="h-3.5 w-3.5" /></Button><Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => supabase.from("products").delete().eq("id", product.id).then(fetchProducts)}><Trash2 className="h-3.5 w-3.5" /></Button></div></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {totalPages > 1 && <div className="flex items-center justify-between border-t border-border px-4 py-3"><span className="text-xs font-body text-muted-foreground">Pagina {page} de {totalPages}</span><div className="flex gap-1"><Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((current) => current - 1)}><ChevronLeft className="h-4 w-4" /></Button><Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage((current) => current + 1)}><ChevronRight className="h-4 w-4" /></Button></div></div>}
      </div>

      <Dialog open={showMlImport} onOpenChange={setShowMlImport}>
        <DialogContent className="max-h-[90vh] max-w-4xl overflow-y-auto">
          <DialogHeader><DialogTitle className="font-display uppercase tracking-wider">Importar Produtos do Mercado Livre</DialogTitle></DialogHeader>
          {mlLoading ? <div className="flex items-center justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div> : (
            <>
              <div className="mb-4 flex items-center justify-between"><button onClick={() => setMlSelected(mlSelected.size === mlProducts.length ? new Set() : new Set(mlProducts.map((product) => product.ml_id)))} className="text-sm font-body text-primary hover:underline">{mlSelected.size === mlProducts.length ? "Desmarcar todos" : "Selecionar todos"}</button><Button onClick={importMlSelected} disabled={mlSelected.size === 0 || mlImporting}>{mlImporting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}Importar</Button></div>
              <div className="grid max-h-[60vh] gap-3 overflow-y-auto">{mlProducts.map((product) => <div key={product.ml_id} onClick={() => setMlSelected((current) => { const next = new Set(current); if (next.has(product.ml_id)) next.delete(product.ml_id); else next.add(product.ml_id); return next; })} className={`flex cursor-pointer items-center gap-4 rounded-lg border p-3 ${mlSelected.has(product.ml_id) ? "border-primary bg-primary/5" : "border-border"}`}><div className={`flex h-5 w-5 items-center justify-center rounded border-2 ${mlSelected.has(product.ml_id) ? "border-primary bg-primary" : "border-muted-foreground/30"}`}>{mlSelected.has(product.ml_id) && <Check className="h-3 w-3 text-primary-foreground" />}</div><div className="min-w-0 flex-1"><p className="line-clamp-1 font-display text-sm font-semibold text-foreground">{product.name}</p><p className="mt-0.5 text-xs font-body text-muted-foreground">ML ID: {product.ml_id} • Estoque no ML: {product.stock}</p></div></div>)}</div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
};

export default AdminProducts;
