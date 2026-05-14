import { useEffect, useState, useMemo, useCallback } from "react";
import { Plus, Search, Edit, Trash2, ChevronLeft, ChevronRight, ShoppingBag, Loader2, Check, Package, Image as ImageIcon, Settings, DollarSign, Barcode, X, ChevronRight as ChevronRightIcon, ChevronLeft as ChevronLeftIcon, FilterX, Eye, ImagePlus, AlertCircle, RefreshCw, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import AdminLayout from "@/components/admin/AdminLayout";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatCurrency } from "@/lib/tracking";
import ProductImageUpload from "@/components/admin/ProductImageUpload";
import { getProductionMapping, PRODUCTION_SOURCE_SYSTEM, upsertProductionMapping } from "@/services/inventoryService";
import { ProductImagePreview } from "@/components/shared/ProductImagePreview";

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
  const [brandFilter, setBrandFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [photoFilter, setPhotoFilter] = useState("all");
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
  const [syncingMl, setSyncingMl] = useState(false);
  const [lastSyncInfo, setLastSyncInfo] = useState<any>(null);

  const fetchSyncStatus = async () => {
    const { data: mlRun } = await supabase.from("site_settings").select("value").eq("key", "ml_auto_sync_last_run").maybeSingle();
    const { data: vpsRun } = await supabase.from("stock_sync_logs").select("*").order("started_at", { ascending: false }).limit(1).maybeSingle();
    
    setLastSyncInfo({
      ml: mlRun?.value,
      vps: vpsRun
    });
  };

  useEffect(() => {
    fetchSyncStatus();
  }, []);

  const handleManualSync = async () => {
    setSyncingMl(true);
    try {
      const { data, error } = await supabaseAny.functions.invoke("mercadolivre-auto-sync");
      if (error) throw error;
      toast({ 
        title: "Sincronização concluída", 
        description: `${data.created} criados, ${data.updated} atualizados.` 
      });
      fetchSyncStatus();
      fetchProducts();
    } catch (error: any) {
      toast({ title: "Erro na sincronização", description: error.message, variant: "destructive" });
    } finally {
      setSyncingMl(false);
    }
  };

  const generateSlug = (name: string) =>
    name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    let query = supabaseAny
      .from("products")
      .select("id, name, sku, internal_code, price, cost, stock, min_stock, is_active, wholesale_only, target_audience, categories(name), brands(name), product_images(url, is_primary)", { count: "exact" })
      .order("created_at", { ascending: false });

    if (search) query = query.or(`name.ilike.%${search}%,sku.ilike.%${search}%,internal_code.ilike.%${search}%`);
    if (categoryFilter !== "all") {
      if (categoryFilter === "none") query = query.is("category_id", null);
      else query = query.eq("category_id", categoryFilter);
    }
    if (brandFilter !== "all") query = query.eq("brand_id", brandFilter);
    if (statusFilter === "active") query = query.eq("is_active", true);
    if (statusFilter === "inactive") query = query.eq("is_active", false);
    if (statusFilter === "lowstock") query = query.or("stock.lte.5,available_stock.lte.5");
    
    if (typeFilter === "retail") query = query.or("target_audience.eq.retail,target_audience.eq.both");
    if (typeFilter === "wholesale") query = query.or("target_audience.eq.wholesale,target_audience.eq.both");

    const from = (page - 1) * ITEMS_PER_PAGE;
    const { data, count, error } = await query.range(from, from + ITEMS_PER_PAGE - 1);

    if (error) {
      toast({ title: "Erro ao carregar produtos", description: error.message, variant: "destructive" });
      setProducts([]);
      setTotal(0);
    } else {
      let filteredData = data || [];
      
      if (photoFilter === "with") {
        filteredData = filteredData.filter((p: any) => p.product_images && p.product_images.length > 0);
      } else if (photoFilter === "without") {
        filteredData = filteredData.filter((p: any) => !p.product_images || p.product_images.length === 0);
      }
      
      setProducts(filteredData);
      setTotal(count || 0);
    }
    setLoading(false);
  }, [search, categoryFilter, brandFilter, statusFilter, typeFilter, photoFilter, page, toast]);

  const checkSkuExists = async (sku: string, productId?: string) => {
    if (!sku) return false;
    let query = supabase.from("products").select("id").eq("sku", sku);
    if (productId) query = query.neq("id", productId);
    const { data } = await query.maybeSingle();
    return !!data;
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
  }, [fetchProducts]);

  const clearFilters = () => {
    setSearch("");
    setCategoryFilter("all");
    setBrandFilter("all");
    setStatusFilter("all");
    setTypeFilter("all");
    setPhotoFilter("all");
    setPage(1);
  };

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
      if (!formData.name) throw new Error("Nome é obrigatório");
      if (Number(formData.price) < 0) throw new Error("Preço não pode ser negativo");
      
      const skuExists = await checkSkuExists(formData.sku, editingProduct?.id);
      if (skuExists) throw new Error("SKU já cadastrado em outro produto");
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
            <SelectTrigger className="w-32 text-xs font-body"><SelectValue placeholder="Categoria" /></SelectTrigger>
            <SelectContent><SelectItem value="all">Categorias</SelectItem><SelectItem value="none">Sem Categoria</SelectItem>{categories.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
          </Select>
          <Select value={brandFilter} onValueChange={setBrandFilter}>
            <SelectTrigger className="w-32 text-xs font-body"><SelectValue placeholder="Marca" /></SelectTrigger>
            <SelectContent><SelectItem value="all">Marcas</SelectItem>{brands.map((b) => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}</SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-32 text-xs font-body"><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent><SelectItem value="all">Status</SelectItem><SelectItem value="active">Ativos</SelectItem><SelectItem value="inactive">Inativos</SelectItem><SelectItem value="lowstock">Estoque Baixo</SelectItem></SelectContent>
          </Select>
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-32 text-xs font-body"><SelectValue placeholder="Tipo" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tipos</SelectItem>
              <SelectItem value="retail">Varejo</SelectItem>
              <SelectItem value="wholesale">Atacado</SelectItem>
            </SelectContent>
          </Select>
          <Select value={photoFilter} onValueChange={setPhotoFilter}>
            <SelectTrigger className="w-32 text-xs font-body"><SelectValue placeholder="Fotos" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Fotos: Todas</SelectItem>
              <SelectItem value="with">Com foto</SelectItem>
              <SelectItem value="without">Sem foto</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="ghost" size="icon" onClick={clearFilters} title="Limpar Filtros" className="h-10 w-10 text-muted-foreground hover:text-foreground">
            <FilterX className="h-4 w-4" />
          </Button>
          <Button variant="outline" onClick={handleManualSync} disabled={syncingMl} className="text-xs font-display uppercase tracking-wider h-10 px-3">
            <RefreshCw className={`mr-2 h-4 w-4 ${syncingMl ? "animate-spin" : ""}`} />
            {syncingMl ? "Sincronizando..." : "Sincronizar ML"}
          </Button>
          <Button variant="outline" onClick={() => { setShowMlImport(true); fetchMlProducts(); }} className="text-xs font-display uppercase tracking-wider h-10 px-3"><ShoppingBag className="mr-2 h-4 w-4" />Importar</Button>
          <Button onClick={() => { setEditingProduct(null); setFormData(emptyForm); setShowForm(true); }} className="text-xs font-display uppercase tracking-wider h-10 px-3 bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm"><Plus className="mr-2 h-4 w-4" />Novo</Button>
        </div>
      </div>

      {lastSyncInfo && (
        <div className="mb-6 flex items-center gap-4 text-xs font-body text-muted-foreground bg-muted/30 p-3 rounded-lg border border-border">
          <div className="flex items-center gap-1.5">
            <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />
            <span>Última Sincronização ML: <strong>{new Date(lastSyncInfo.timestamp).toLocaleString("pt-BR")}</strong></span>
          </div>
          <div className="flex items-center gap-4 ml-auto">
            <span>Itens: <strong>{lastSyncInfo.total_ml_items}</strong></span>
            <span>Novos: <strong className="text-primary">{lastSyncInfo.created}</strong></span>
            <span>Atualizados: <strong className="text-foreground">{lastSyncInfo.updated}</strong></span>
          </div>
        </div>
      )}

      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
          <DialogHeader><DialogTitle className="font-display uppercase tracking-wider">{editingProduct ? "Editar Produto" : "Novo Produto"}</DialogTitle></DialogHeader>
          <div className="grid gap-4 py-4">
          <Tabs defaultValue="info" className="w-full">
            <TabsList className="grid w-full grid-cols-5 bg-muted/50 p-1">
              <TabsTrigger value="info" className="text-[10px] uppercase font-bold tracking-tight px-1"><Package className="h-3 w-3 mr-1" />Info</TabsTrigger>
              <TabsTrigger value="pricing" className="text-[10px] uppercase font-bold tracking-tight px-1"><DollarSign className="h-3 w-3 mr-1" />Preços</TabsTrigger>
              <TabsTrigger value="stock" className="text-[10px] uppercase font-bold tracking-tight px-1"><Settings className="h-3 w-3 mr-1" />Estoque</TabsTrigger>
              <TabsTrigger value="images" className="text-[10px] uppercase font-bold tracking-tight px-1"><ImageIcon className="h-3 w-3 mr-1" />Fotos</TabsTrigger>
              <TabsTrigger value="extra" className="text-[10px] uppercase font-bold tracking-tight px-1"><Barcode className="h-3 w-3 mr-1" />Extras</TabsTrigger>
            </TabsList>

            <div className="py-4 min-h-[400px]">
              <TabsContent value="info" className="space-y-4 mt-0">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div><label className="mb-1 block text-xs font-body font-medium text-foreground uppercase tracking-wider">Nome *</label><input value={formData.name} onChange={(event) => setFormData((current) => ({ ...current, name: event.target.value, slug: generateSlug(event.target.value) }))} className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm font-body focus:outline-none focus:ring-2 focus:ring-ring" /></div>
                  <div><label className="mb-1 block text-xs font-body font-medium text-foreground uppercase tracking-wider">Slug</label><input value={formData.slug} onChange={(event) => setFormData((current) => ({ ...current, slug: event.target.value }))} className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm font-body focus:outline-none focus:ring-2 focus:ring-ring" /></div>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div><label className="mb-1 block text-xs font-body font-medium text-foreground uppercase tracking-wider">Categoria</label><Select value={formData.category_id || "none"} onValueChange={(value) => setFormData((current) => ({ ...current, category_id: value === "none" ? "" : value }))}><SelectTrigger className="text-sm font-body"><SelectValue placeholder="Selecione" /></SelectTrigger><SelectContent><SelectItem value="none">Nenhuma</SelectItem>{categories.map((category) => <SelectItem key={category.id} value={category.id}>{category.name}</SelectItem>)}</SelectContent></Select></div>
                  <div><label className="mb-1 block text-xs font-body font-medium text-foreground uppercase tracking-wider">Marca</label><Select value={formData.brand_id || "none"} onValueChange={(value) => setFormData((current) => ({ ...current, brand_id: value === "none" ? "" : value }))}><SelectTrigger className="text-sm font-body"><SelectValue placeholder="Selecione" /></SelectTrigger><SelectContent><SelectItem value="none">Nenhuma</SelectItem>{brands.map((brand) => <SelectItem key={brand.id} value={brand.id}>{brand.name}</SelectItem>)}</SelectContent></Select></div>
                </div>
                <div><label className="mb-1 block text-xs font-body font-medium text-foreground uppercase tracking-wider">Audiência / Tipo</label><Select value={formData.target_audience} onValueChange={(value) => setFormData((current) => ({ ...current, target_audience: value }))}><SelectTrigger className="text-sm font-body"><SelectValue placeholder="Selecione" /></SelectTrigger><SelectContent><SelectItem value="retail">Somente Varejo</SelectItem><SelectItem value="wholesale">Somente Atacado</SelectItem><SelectItem value="both">Varejo e Atacado</SelectItem></SelectContent></Select></div>
                <div><label className="mb-1 block text-xs font-body font-medium text-foreground uppercase tracking-wider">Descrição Curta</label><input value={formData.short_description} onChange={(event) => setFormData((current) => ({ ...current, short_description: event.target.value }))} className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm font-body focus:outline-none focus:ring-2 focus:ring-ring" /></div>
                <div><label className="mb-1 block text-xs font-body font-medium text-foreground uppercase tracking-wider">Descrição Completa</label><textarea rows={3} value={formData.description} onChange={(event) => setFormData((current) => ({ ...current, description: event.target.value }))} className="w-full resize-none rounded-lg border border-border bg-background px-3 py-2 text-sm font-body focus:outline-none focus:ring-2 focus:ring-ring" /></div>
                <div className="flex gap-4">
                  <div className="flex items-center space-x-2"><input type="checkbox" id="is_active" checked={formData.is_active} onChange={(e) => setFormData(prev => ({ ...prev, is_active: e.target.checked }))} className="h-4 w-4 rounded border-gray-300 text-primary" /><label htmlFor="is_active" className="text-xs font-body font-medium uppercase tracking-wider">Ativo</label></div>
                  <div className="flex items-center space-x-2"><input type="checkbox" id="is_featured" checked={formData.is_featured} onChange={(e) => setFormData(prev => ({ ...prev, is_featured: e.target.checked }))} className="h-4 w-4 rounded border-gray-300 text-primary" /><label htmlFor="is_featured" className="text-xs font-body font-medium uppercase tracking-wider">Destaque</label></div>
                </div>
              </TabsContent>

              <TabsContent value="pricing" className="space-y-4 mt-0">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div><label className="mb-1 block text-xs font-body font-medium text-foreground uppercase tracking-wider">Preço de Custo</label><input type="number" step="0.01" value={formData.cost} onChange={(event) => setFormData((current) => ({ ...current, cost: event.target.value }))} className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm font-body focus:outline-none focus:ring-2 focus:ring-ring" /></div>
                  <div><label className="mb-1 block text-xs font-body font-medium text-foreground uppercase tracking-wider">Preço de Venda</label><input type="number" step="0.01" value={formData.price} onChange={(event) => setFormData((current) => ({ ...current, price: event.target.value }))} className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm font-body focus:outline-none focus:ring-2 focus:ring-ring" /></div>
                </div>
                <div className="bg-muted/30 p-3 rounded-lg border border-border">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-xs font-body font-medium uppercase tracking-wider">Margem de Lucro Automática</span>
                    <span className={`text-sm font-bold ${marginPercentage >= 30 ? "text-green-600" : marginPercentage > 0 ? "text-amber-600" : "text-destructive"}`}>
                      {marginPercentage.toFixed(2)}%
                    </span>
                  </div>
                  <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                    <div className={`h-full transition-all ${marginPercentage >= 30 ? "bg-green-500" : marginPercentage > 0 ? "bg-amber-500" : "bg-destructive"}`} style={{ width: `${Math.min(Math.max(marginPercentage, 0), 100)}%` }}></div>
                  </div>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div><label className="mb-1 block text-xs font-body font-medium text-foreground uppercase tracking-wider">Preço Atacado</label><input type="number" step="0.01" value={formData.wholesale_price} onChange={(event) => setFormData((current) => ({ ...current, wholesale_price: event.target.value }))} className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm font-body focus:outline-none focus:ring-2 focus:ring-ring" /></div>
                  <div><label className="mb-1 block text-xs font-body font-medium text-foreground uppercase tracking-wider">Preço Promocional</label><input type="number" step="0.01" value={formData.original_price} onChange={(event) => setFormData((current) => ({ ...current, original_price: event.target.value }))} className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm font-body focus:outline-none focus:ring-2 focus:ring-ring" /></div>
                </div>
              </TabsContent>

              <TabsContent value="stock" className="space-y-4 mt-0">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div><label className="mb-1 block text-xs font-body font-medium text-foreground uppercase tracking-wider">Saldo em Estoque</label><input type="number" value={formData.stock} disabled={!!editingProduct} onChange={(event) => setFormData((current) => ({ ...current, stock: event.target.value }))} className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm font-body focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-60" /></div>
                  <div><label className="mb-1 block text-xs font-body font-medium text-foreground uppercase tracking-wider">Estoque Mínimo</label><input type="number" value={formData.min_stock} onChange={(event) => setFormData((current) => ({ ...current, min_stock: event.target.value }))} className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm font-body focus:outline-none focus:ring-2 focus:ring-ring" /></div>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div><label className="mb-1 block text-xs font-body font-medium text-foreground uppercase tracking-wider">Unidade de Medida</label><Select value={formData.unit} onValueChange={(value) => setFormData((current) => ({ ...current, unit: value }))}><SelectTrigger className="text-sm font-body"><SelectValue placeholder="un" /></SelectTrigger><SelectContent><SelectItem value="un">Unidade (un)</SelectItem><SelectItem value="kg">Quilo (kg)</SelectItem><SelectItem value="meter">Metro (m)</SelectItem><SelectItem value="kit">Kit</SelectItem><SelectItem value="par">Par</SelectItem><SelectItem value="caixa">Caixa</SelectItem><SelectItem value="personalizado">Personalizado</SelectItem></SelectContent></Select></div>
                  <div className="flex flex-col justify-center gap-2">
                    <div className="flex items-center space-x-2"><input type="checkbox" id="allow_negative_stock" checked={formData.allow_negative_stock} onChange={(e) => setFormData(prev => ({ ...prev, allow_negative_stock: e.target.checked }))} className="h-4 w-4 rounded border-gray-300 text-primary" /><label htmlFor="allow_negative_stock" className="text-xs font-body font-medium uppercase tracking-wider">Permitir Estoque Negativo</label></div>
                    <div className="flex items-center space-x-2"><input type="checkbox" id="is_on_demand" checked={formData.is_on_demand} onChange={(e) => setFormData(prev => ({ ...prev, is_on_demand: e.target.checked }))} className="h-4 w-4 rounded border-gray-300 text-primary" /><label htmlFor="is_on_demand" className="text-xs font-body font-medium uppercase tracking-wider">Produto Sob Demanda</label></div>
                  </div>
                </div>
                <div className="bg-muted/30 p-3 rounded-lg border border-border space-y-3">
                  <h3 className="font-display text-xs font-bold uppercase tracking-wider text-foreground">Mapeamento Produção ({PRODUCTION_SOURCE_SYSTEM})</h3>
                  <div className="grid gap-3 sm:grid-cols-3">
                    <input value={formData.production_external_code} onChange={(event) => setFormData((current) => ({ ...current, production_external_code: event.target.value }))} placeholder="Código Controle" className="w-full rounded-lg border border-border bg-background px-3 py-2 text-xs font-body" />
                    <input value={formData.production_external_sku} onChange={(event) => setFormData((current) => ({ ...current, production_external_sku: event.target.value }))} placeholder="SKU Controle" className="w-full rounded-lg border border-border bg-background px-3 py-2 text-xs font-body" />
                    <input value={formData.production_external_product_id} onChange={(event) => setFormData((current) => ({ ...current, production_external_product_id: event.target.value }))} placeholder="ID Externo" className="w-full rounded-lg border border-border bg-background px-3 py-2 text-xs font-body" />
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="images" className="space-y-4 mt-0">
                {editingProduct ? (
                  <ProductImageUpload productId={editingProduct.id} />
                ) : (
                  <div className="text-center py-12 border-2 border-dashed border-border rounded-lg bg-muted/20">
                    <ImageIcon className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
                    <p className="font-body text-sm text-foreground font-medium">Cadastre o produto primeiro para enviar as imagens</p>
                    <p className="font-body text-xs text-muted-foreground mt-1">Após salvar, você poderá gerenciar as fotos na edição do item.</p>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="extra" className="space-y-4 mt-0">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div><label className="mb-1 block text-xs font-body font-medium text-foreground uppercase tracking-wider">SKU</label><input value={formData.sku} onChange={(event) => setFormData((current) => ({ ...current, sku: event.target.value }))} className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm font-body focus:outline-none focus:ring-2 focus:ring-ring" /></div>
                  <div><label className="mb-1 block text-xs font-body font-medium text-foreground uppercase tracking-wider">Código Interno</label><input value={formData.internal_code} onChange={(event) => setFormData((current) => ({ ...current, internal_code: event.target.value }))} className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm font-body focus:outline-none focus:ring-2 focus:ring-ring" /></div>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div><label className="mb-1 block text-xs font-body font-medium text-foreground uppercase tracking-wider">Código de Barras (EAN)</label><input value={formData.barcode} onChange={(event) => setFormData((current) => ({ ...current, barcode: event.target.value }))} className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm font-body focus:outline-none focus:ring-2 focus:ring-ring" /></div>
                  <div><label className="mb-1 block text-xs font-body font-medium text-foreground uppercase tracking-wider">Classe do Produto</label><input value={formData.product_class} onChange={(event) => setFormData((current) => ({ ...current, product_class: event.target.value }))} className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm font-body focus:outline-none focus:ring-2 focus:ring-ring" /></div>
                </div>
                <div className="p-3 border border-border rounded-lg space-y-3">
                  <div className="flex items-center space-x-2"><input type="checkbox" id="is_customized" checked={formData.is_customized} onChange={(e) => setFormData(prev => ({ ...prev, is_customized: e.target.checked }))} className="h-4 w-4 rounded border-gray-300 text-primary" /><label htmlFor="is_customized" className="text-xs font-body font-medium uppercase tracking-wider">Produto Personalizado / Sob Medida</label></div>
                  {formData.is_customized && (
                    <div className="grid gap-3 pt-2">
                      <div className="grid grid-cols-2 gap-3">
                        <input value={formData.color} onChange={(event) => setFormData((current) => ({ ...current, color: event.target.value }))} placeholder="Cor" className="w-full rounded-lg border border-border bg-background px-3 py-2 text-xs font-body" />
                        <input value={formData.finish} onChange={(event) => setFormData((current) => ({ ...current, finish: event.target.value }))} placeholder="Acabamento" className="w-full rounded-lg border border-border bg-background px-3 py-2 text-xs font-body" />
                      </div>
                      <input value={formData.lead_time} onChange={(event) => setFormData((current) => ({ ...current, lead_time: event.target.value }))} placeholder="Prazo de Fabricação (Ex: 10 dias)" className="w-full rounded-lg border border-border bg-background px-3 py-2 text-xs font-body" />
                      <textarea rows={2} value={formData.technical_specs} onChange={(event) => setFormData((current) => ({ ...current, technical_specs: event.target.value }))} placeholder="Observações Técnicas" className="w-full resize-none rounded-lg border border-border bg-background px-3 py-2 text-xs font-body" />
                    </div>
                  )}
                </div>
              </TabsContent>
            </div>
          </Tabs>
          <div className="flex justify-end gap-3 border-t border-border pt-4 mt-2">
            <Button variant="outline" className="font-display uppercase tracking-wider text-xs" onClick={() => setShowForm(false)}>Cancelar</Button>
            <Button className="font-display uppercase tracking-wider text-xs px-8" onClick={handleSave} disabled={saving}>
              {saving ? <><Loader2 className="mr-2 h-3 w-3 animate-spin" /> Salvando...</> : editingProduct ? "Atualizar Produto" : "Salvar Produto"}
            </Button>
          </div>
          </div>
        </DialogContent>
      </Dialog>

      <div className="overflow-hidden rounded-xl border border-border bg-card">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="border-b border-border bg-muted/50"><th className="p-4 text-left text-xs font-display uppercase tracking-wider text-muted-foreground">IMAGEM</th><th className="p-4 text-left text-xs font-display uppercase tracking-wider text-muted-foreground">Produto</th><th className="p-4 text-left text-xs font-display uppercase tracking-wider text-muted-foreground">TIPO</th><th className="p-4 text-left text-xs font-display uppercase tracking-wider text-muted-foreground">SKU / CAT</th><th className="p-4 text-right text-xs font-display uppercase tracking-wider text-muted-foreground">Preco</th><th className="p-4 text-right text-xs font-display uppercase tracking-wider text-muted-foreground">Margem</th><th className="p-4 text-center text-xs font-display uppercase tracking-wider text-muted-foreground">Disponivel</th><th className="p-4 text-center text-xs font-display uppercase tracking-wider text-muted-foreground">Status</th><th className="p-4 text-right text-xs font-display uppercase tracking-wider text-muted-foreground">Acoes</th></tr></thead>
            <tbody>
              {loading ? Array.from({ length: 5 }).map((_, index) => <tr key={index}><td colSpan={9} className="p-4"><div className="h-20 animate-pulse rounded-lg bg-muted/50" /></td></tr>) : products.length === 0 ? (
                <tr><td colSpan={9} className="p-12 text-center text-muted-foreground"><div className="flex flex-col items-center gap-2"><Package className="h-10 w-10 opacity-20" /><p className="font-body text-sm">Nenhum produto encontrado com os filtros selecionados.</p><Button variant="link" onClick={clearFilters} className="text-primary font-bold">Limpar filtros</Button></div></td></tr>
              ) : products.map((product) => (
                <tr key={product.id} className="border-b border-border transition-colors hover:bg-muted/30">
                  <td className="p-4">
                    <ProductImagePreview 
                      images={product.product_images || []} 
                      name={product.name} 
                      className="h-16 w-16"
                    />
                  </td>
                  <td className="p-4">
                    <div className="flex flex-col">
                      <div className="flex items-center gap-2">
                        <span className="font-body font-bold text-foreground line-clamp-1">{product.name}</span>
                        {!getImage(product) && (
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <AlertCircle className="h-3.5 w-3.5 text-destructive animate-pulse cursor-help" />
                              </TooltipTrigger>
                              <TooltipContent>Produto sem fotos cadastradas</TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        )}
                      </div>
                      <span className="text-[10px] font-body text-muted-foreground uppercase tracking-tighter">ID: {product.id.slice(0,8)}</span>
                    </div>
                  </td>
                  <td className="p-4 text-xs font-body">
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${product.target_audience === "wholesale" ? "bg-amber-100 text-amber-800" : product.target_audience === "retail" ? "bg-blue-100 text-blue-800" : "bg-purple-100 text-purple-800"}`}>
                      {product.target_audience === "wholesale" ? "Atacado" : product.target_audience === "retail" ? "Varejo" : "Ambos"}
                    </span>
                  </td>
                  <td className="p-4 text-xs font-body text-muted-foreground">
                    <div className="font-bold text-foreground/80">{product.sku || product.internal_code || "-"}</div>
                    <div className="text-[10px] uppercase truncate max-w-[120px]">{product.categories?.name || "Sem categoria"}</div>
                    <div className="text-[10px] uppercase truncate max-w-[120px] font-medium text-primary/70">{product.brands?.name || "Sem marca"}</div>
                  </td>
                  <td className="p-4 text-right font-body font-medium">{formatCurrency(Number(product.price))}</td>
                  <td className="p-4 text-right text-xs font-body font-bold text-green-600">{margin(product)}%</td>
                  <td className="p-4 text-center">
                    <div className="flex flex-col items-center">
                      <span className={`inline-block rounded px-2 py-0.5 text-[10px] font-bold uppercase ${product.stock <= (product.min_stock || 5) ? "bg-destructive/10 text-destructive" : "bg-primary/10 text-primary"}`}>
                        {product.stock} {product.unit || "un"}
                      </span>
                      {product.stock <= (product.min_stock || 5) && <span className="text-[9px] text-destructive font-bold uppercase mt-0.5">Baixo</span>}
                    </div>
                  </td>
                  <td className="p-4 text-center"><button onClick={() => supabase.from("products").update({ is_active: !product.is_active }).eq("id", product.id).then(fetchProducts)} className={`inline-block rounded px-2 py-0.5 text-xs font-body font-medium ${product.is_active ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"}`}>{product.is_active ? "Ativo" : "Inativo"}</button></td>
                  <td className="p-4 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-primary/10 hover:text-primary transition-colors" onClick={() => startEdit(product)} title="Editar">
                        <Edit className="h-3.5 w-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:bg-destructive/10 transition-colors" onClick={() => {
                        if (confirm("Tem certeza que deseja excluir este produto?")) {
                          supabase.from("products").delete().eq("id", product.id).then(fetchProducts);
                        }
                      }} title="Excluir">
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {totalPages > 1 && (
          <div className="flex flex-col items-center justify-center gap-6 border-t border-border px-4 py-10 pb-28 md:pb-10">
            <div className="flex items-center gap-4">
              <Button 
                variant="outline" 
                size="sm" 
                disabled={page <= 1} 
                onClick={() => setPage((current) => current - 1)}
                className="h-12 w-12 rounded-full border-primary/20 hover:bg-primary hover:text-white transition-all shadow-sm"
              >
                <ChevronLeft className="h-5 w-5" />
              </Button>
              
              <div className="flex items-center gap-4 bg-card px-8 py-3 rounded-full border border-border shadow-sm">
                <span className="text-lg font-display font-bold text-primary">{page}</span>
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-widest">de</span>
                <span className="text-lg font-display font-bold text-foreground">{totalPages}</span>
              </div>

              <Button 
                variant="outline" 
                size="sm" 
                disabled={page >= totalPages} 
                onClick={() => setPage((current) => current + 1)}
                className="h-12 w-12 rounded-full border-primary/20 hover:bg-primary hover:text-white transition-all shadow-sm"
              >
                <ChevronRight className="h-5 w-5" />
              </Button>
            </div>
            <span className="text-[10px] font-display uppercase tracking-widest text-muted-foreground bg-muted/30 px-3 py-1 rounded-full font-bold">
              Visualizando {(page - 1) * ITEMS_PER_PAGE + 1} - {Math.min(page * ITEMS_PER_PAGE, total)} de {total} produtos
            </span>
          </div>
        )}
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
