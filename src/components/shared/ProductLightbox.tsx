import { Dialog, DialogContent } from "@/components/ui/dialog";
import { X, ChevronLeft, ChevronRight } from "lucide-react";
import { useState, useEffect } from "react";

interface ProductLightboxProps {
  isOpen: boolean;
  onClose: () => void;
  images: { url: string; is_primary?: boolean }[];
  initialIndex?: number;
}

export const ProductLightbox = ({ isOpen, onClose, images, initialIndex = 0 }: ProductLightboxProps) => {
  const [index, setIndex] = useState(initialIndex);

  useEffect(() => {
    if (isOpen) {
      setIndex(initialIndex);
    }
  }, [isOpen, initialIndex]);

  if (!images || images.length === 0) return null;

  const next = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    setIndex((prev) => (prev + 1) % images.length);
  };

  const prev = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    setIndex((prev) => (prev - 1 + images.length) % images.length);
  };

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === "ArrowRight") next();
    if (e.key === "ArrowLeft") prev();
    if (e.key === "Escape") onClose();
  };

  useEffect(() => {
    if (isOpen) {
      window.addEventListener("keydown", handleKeyDown);
    }
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen]);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-[95vw] sm:max-w-[80vw] h-[80vh] p-0 border-none bg-black/95 flex flex-col items-center justify-center outline-none">
        <button 
          className="absolute top-4 right-4 z-50 p-2 rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors"
          onClick={onClose}
        >
          <X className="h-6 w-6" />
        </button>
        
        <div className="relative w-full h-full flex items-center justify-center p-4 sm:p-8" onClick={onClose}>
          <div className="relative max-w-full max-h-full flex items-center justify-center" onClick={(e) => e.stopPropagation()}>
            {images.length > 1 && (
              <>
                <button 
                  className="absolute -left-4 sm:left-4 z-10 p-3 rounded-full bg-black/50 sm:bg-white/10 text-white hover:bg-white/20 transition-colors"
                  onClick={prev}
                >
                  <ChevronLeft className="h-6 w-6 sm:h-8 sm:w-8" />
                </button>
                <button 
                  className="absolute -right-4 sm:right-4 z-10 p-3 rounded-full bg-black/50 sm:bg-white/10 text-white hover:bg-white/20 transition-colors"
                  onClick={next}
                >
                  <ChevronRight className="h-6 w-6 sm:h-8 sm:w-8" />
                </button>
              </>
            )}
            
            <img 
              src={images[index]?.url} 
              alt="" 
              className="max-w-full max-h-[70vh] object-contain animate-in fade-in zoom-in-95 duration-300" 
            />
            
            {images.length > 1 && (
              <div className="absolute -bottom-10 flex gap-2">
                {images.map((_, i) => (
                  <button 
                    key={i} 
                    onClick={() => setIndex(i)}
                    className={`h-2 w-2 rounded-full transition-all ${index === i ? "bg-white w-6" : "bg-white/40"}`}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
