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
  productId?: string;
  onImagesChange?: (images: { file?: File; url: string; is_primary: boolean; id?: string }[]) => void;
  initialImages?: { id?: string; url: string; is_primary: boolean }[];
}

const ProductImageUpload = ({ productId, onImagesChange, initialImages = [] }: Props) => {
  const [images, setImages] = useState<any[]>(initialImages.map((img, idx) => ({ ...img, sort_order: idx })));
  const [uploading, setUploading] = useState(false);
  const { toast } = useToast();

  const fetchImages = useCallback(async () => {
    if (!productId) return;
    const { data } = await supabase
      .from("product_images")
      .select("*")
      .eq("product_id", productId)
      .order("sort_order");
    const fetchedImages = (data as ProductImage[]) || [];
    setImages(fetchedImages);
    if (onImagesChange) onImagesChange(fetchedImages);
  }, [productId, onImagesChange]);

  useEffect(() => { 
    if (productId) {
      fetchImages(); 
    } else if (initialImages.length > 0 && images.length === 0) {
      setImages(initialImages.map((img, idx) => ({ ...img, sort_order: idx })));
    }
  }, [productId, fetchImages]);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    if (productId) {
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
    } else {
      // Local mode for new products
      const newImages = [...images];
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const url = URL.createObjectURL(file);
        newImages.push({
          file,
          url,
          is_primary: newImages.length === 0,
          sort_order: newImages.length
        });
      }
      setImages(newImages);
      if (onImagesChange) onImagesChange(newImages);
    }
    e.target.value = "";
  };

  const removeImage = async (img: any) => {
    if (productId && img.id) {
      const urlParts = img.url.split("/product-images/");
      if (urlParts[1]) {
        await supabase.storage.from("product-images").remove([urlParts[1]]);
      }
      await supabase.from("product_images").delete().eq("id", img.id);
      await fetchImages();
    } else {
      const newImages = images.filter(i => i !== img);
      // If we removed the primary, set the first one as primary
      if (img.is_primary && newImages.length > 0) {
        newImages[0].is_primary = true;
      }
      setImages(newImages);
      if (onImagesChange) onImagesChange(newImages);
    }
    toast({ title: "Imagem removida" });
  };

  const setPrimary = async (img: any) => {
    if (productId && img.id) {
      await supabase.from("product_images").update({ is_primary: false }).eq("product_id", productId);
      await supabase.from("product_images").update({ is_primary: true }).eq("id", img.id);
      await fetchImages();
    } else {
      const newImages = images.map(i => ({
        ...i,
        is_primary: i === img
      }));
      setImages(newImages);
      if (onImagesChange) onImagesChange(newImages);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <label className="text-xs font-body font-medium text-foreground uppercase tracking-wider">Imagens do Produto</label>
        <label className="cursor-pointer">
          <input type="file" accept="image/*" multiple onChange={handleUpload} className="hidden" />
          <Button variant="outline" size="sm" className="font-display uppercase tracking-wider text-[10px]" asChild disabled={uploading}>
            <span>
              {uploading ? <Loader2 className="mr-2 h-3 w-3 animate-spin" /> : <Upload className="mr-2 h-3 w-3" />}
              {uploading ? "Enviando..." : "Adicionar Imagens"}
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
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
          {images.map((img, idx) => (
            <div key={img.id || idx} className={`relative group rounded-lg overflow-hidden border-2 transition-all ${img.is_primary ? "border-primary ring-2 ring-primary/20" : "border-border hover:border-primary/50"}`}>
              <img src={img.url} alt="" className="w-full aspect-square object-cover" />
              <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                {!img.is_primary && (
                  <button onClick={() => setPrimary(img)} className="h-8 w-8 rounded-full bg-white/20 hover:bg-primary text-white flex items-center justify-center backdrop-blur-sm transition-colors" title="Definir como principal">
                    <Star className="h-4 w-4" />
                  </button>
                )}
                <button onClick={() => removeImage(img)} className="h-8 w-8 rounded-full bg-white/20 hover:bg-destructive text-white flex items-center justify-center backdrop-blur-sm transition-colors" title="Remover">
                  <X className="h-4 w-4" />
                </button>
              </div>
              {img.is_primary && (
                <div className="absolute top-1 left-1 bg-primary text-white text-[9px] px-2 py-0.5 rounded-full font-display font-bold uppercase shadow-sm">Principal</div>
              )}
            </div>
          ))}
          <label className="border-2 border-dashed border-border rounded-lg flex flex-col items-center justify-center aspect-square cursor-pointer hover:border-primary/50 transition-colors">
            <input type="file" accept="image/*" multiple onChange={handleUpload} className="hidden" />
            <Upload className="h-5 w-5 text-muted-foreground mb-1" />
            <span className="text-[10px] font-body text-muted-foreground font-medium uppercase">Mais</span>
          </label>
        </div>
      )}
    </div>
  );
};

export default ProductImageUpload;