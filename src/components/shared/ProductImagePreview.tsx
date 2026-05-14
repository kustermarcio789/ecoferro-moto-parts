import { useState } from "react";
import { ImageIcon } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { ProductLightbox } from "./ProductLightbox";
import { cn } from "@/lib/utils";

interface ProductImagePreviewProps {
  images: { url: string; is_primary?: boolean }[];
  name: string;
  className?: string;
  aspectRatio?: "square" | "video" | "auto";
}

export const ProductImagePreview = ({ 
  images, 
  name, 
  className,
  aspectRatio = "square"
}: ProductImagePreviewProps) => {
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
  const primaryImageIndex = images.findIndex(img => img.is_primary);
  const initialIndex = primaryImageIndex >= 0 ? primaryImageIndex : 0;
  const primaryImage = images[initialIndex]?.url;

  if (!primaryImage) {
    return (
      <div className={cn(
        "cursor-default rounded-lg overflow-hidden border-2 border-destructive/30 bg-destructive/5 flex items-center justify-center transition-all",
        aspectRatio === "square" ? "aspect-square" : "h-16 w-16",
        className
      )}>
        <div className="flex flex-col items-center gap-1">
          <ImageIcon className="h-6 w-6 text-destructive/40" />
          <span className="text-[8px] font-bold text-destructive uppercase tracking-tighter">Sem foto</span>
        </div>
      </div>
    );
  }

  return (
    <>
      <TooltipProvider delayDuration={200}>
        <Tooltip>
          <TooltipTrigger asChild>
            <div 
              className={cn(
                "cursor-pointer rounded-lg overflow-hidden border border-border bg-white flex items-center justify-center transition-all hover:scale-[1.02] active:scale-95 group relative",
                aspectRatio === "square" ? "aspect-square" : "",
                className
              )}
              onClick={(e) => {
                e.stopPropagation();
                setIsLightboxOpen(true);
              }}
            >
              <img 
                src={primaryImage} 
                alt={name} 
                className="w-full h-full object-contain p-1 transition-transform group-hover:scale-105"
                loading="lazy"
              />
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/5 transition-colors" />
            </div>
          </TooltipTrigger>
          
          {/* Desktop Hover Preview */}
          <TooltipContent 
            side="right" 
            align="center"
            sideOffset={15}
            className="p-0 border-none bg-transparent shadow-2xl hidden md:block z-[100]"
          >
            <div className="w-[350px] h-[350px] lg:w-[450px] lg:h-[450px] rounded-2xl overflow-hidden bg-white border border-border/50 shadow-2xl animate-in zoom-in-95 fade-in duration-200">
              <img 
                src={primaryImage} 
                alt={name} 
                className="w-full h-full object-contain p-4" 
              />
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/20 to-transparent p-4">
                <p className="text-white text-xs font-display font-bold uppercase tracking-wider drop-shadow-md">
                  {name}
                </p>
              </div>
            </div>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>

      <ProductLightbox 
        isOpen={isLightboxOpen}
        onClose={() => setIsLightboxOpen(false)}
        images={images}
        initialIndex={initialIndex}
      />
    </>
  );
};
