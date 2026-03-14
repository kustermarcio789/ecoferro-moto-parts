import { useState, useEffect, useCallback } from "react";
import { Upload, X, Star, Loader2, GripVertical } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface ProductImage {
  id: string;
  url: string;
  is_primary: boolean;
  sort_order: number;
  alt_text: string | null;
}

interface Props {
  productId: string;
}

const ProductImageUpload = ({ productId }: Props) => {
  const [images, setImages] = useState<ProductImage[]>([]);
  const [uploading, setUploading] = useState(false);
  const { toast } = useToast();

  const fetchImages = useCallback(async () => {
    const { data } = await supabase
      .from("product_images")
      .select("*")
      .eq("product_id", productId)
      .order("sort_order");
    setImages((data as ProductImage[]) || []);
  }, [productId]);

  useEffect(() => { fetchImages(); }, [fetchImages]);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    setUploading(true);

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const ext = file.name.split(".").pop();
      const path = `${productId}/${Date.now()}-${i}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from("product-images")
        .upload(path, file, { upsert: true });

      if (uploadError) {
        toast({ title: "Erro no upload", description: uploadError.message, variant: "destructive" });
        continue;
      }

      const { data: urlData } = supabase.storage
        .from("product-images")
        .getPublicUrl(path);

      await supabase.from("product_images").insert({
        product_id: productId,
        url: urlData.publicUrl,
        is_primary: images.length === 0 && i === 0,
        sort_order: images.length + i,
      });
    }

    await fetchImages();
    setUploading(false);
    toast({ title: `${files.length} imagem(ns) enviada(s)` });
    e.target.value = "";
  };

  const removeImage = async (img: ProductImage) => {
    // Extract path from URL
    const urlParts = img.url.split("/product-images/");
    if (urlParts[1]) {
      await supabase.storage.from("product-images").remove([urlParts[1]]);
    }
    await supabase.from("product_images").delete().eq("id", img.id);
    await fetchImages();
    toast({ title: "Imagem removida" });
  };

  const setPrimary = async (img: ProductImage) => {
    // Reset all, then set primary
    await supabase.from("product_images").update({ is_primary: false }).eq("product_id", productId);
    await supabase.from("product_images").update({ is_primary: true }).eq("id", img.id);
    await fetchImages();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <label className="text-xs font-body font-medium text-foreground">Imagens do Produto</label>
        <label className="cursor-pointer">
          <input type="file" accept="image/*" multiple onChange={handleUpload} className="hidden" />
          <Button variant="outline" size="sm" className="font-display uppercase tracking-wider text-xs" asChild disabled={uploading}>
            <span>
              {uploading ? <Loader2 className="mr-2 h-3 w-3 animate-spin" /> : <Upload className="mr-2 h-3 w-3" />}
              {uploading ? "Enviando..." : "Upload"}
            </span>
          </Button>
        </label>
      </div>

      {images.length === 0 ? (
        <label className="border-2 border-dashed border-border rounded-lg p-8 text-center cursor-pointer hover:border-primary/50 transition-colors block">
          <input type="file" accept="image/*" multiple onChange={handleUpload} className="hidden" />
          <Upload className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
          <p className="font-body text-sm text-muted-foreground">Clique ou arraste imagens aqui</p>
          <p className="font-body text-xs text-muted-foreground mt-1">JPG, PNG, WebP • Máx 5MB</p>
        </label>
      ) : (
        <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
          {images.map(img => (
            <div key={img.id} className={`relative group rounded-lg overflow-hidden border-2 ${img.is_primary ? "border-primary" : "border-border"}`}>
              <img src={img.url} alt={img.alt_text || ""} className="w-full aspect-square object-cover" />
              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                {!img.is_primary && (
                  <button onClick={() => setPrimary(img)} className="h-7 w-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center" title="Definir como principal">
                    <Star className="h-3.5 w-3.5" />
                  </button>
                )}
                <button onClick={() => removeImage(img)} className="h-7 w-7 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center" title="Remover">
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
              {img.is_primary && (
                <span className="absolute top-1 left-1 bg-primary text-primary-foreground text-[9px] px-1.5 py-0.5 rounded font-display uppercase">Principal</span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ProductImageUpload;
