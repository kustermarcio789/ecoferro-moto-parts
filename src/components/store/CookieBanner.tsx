import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";

const CookieBanner = () => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const consent = localStorage.getItem("ecoferro-cookies");
    if (!consent) setVisible(true);
  }, []);

  const accept = () => {
    localStorage.setItem("ecoferro-cookies", "accepted");
    setVisible(false);
  };

  const decline = () => {
    localStorage.setItem("ecoferro-cookies", "declined");
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-[60] bg-card border-t border-border p-4 shadow-lg">
      <div className="container mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
        <p className="text-sm text-muted-foreground font-body text-center sm:text-left">
          Utilizamos cookies para melhorar sua experiência. Ao continuar navegando, você concorda com nossa{" "}
          <a href="/politica-privacidade" className="text-primary underline">Política de Privacidade</a> e{" "}
          <a href="/politica-cookies" className="text-primary underline">Política de Cookies</a>.
        </p>
        <div className="flex items-center gap-2 shrink-0">
          <Button size="sm" onClick={accept} className="font-display uppercase tracking-wider text-xs">
            Aceitar
          </Button>
          <Button size="sm" variant="outline" onClick={decline} className="font-display uppercase tracking-wider text-xs">
            Recusar
          </Button>
        </div>
      </div>
    </div>
  );
};

export default CookieBanner;
