import { useState, useEffect } from "react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useLocation } from "react-router-dom";

const WHATSAPP_NUMBER = "551420340647";

const WhatsAppButton = () => {
  const location = useLocation();
  const [isHovered, setIsHovered] = useState(false);
  const [isVisible, setIsVisible] = useState(false);

  // Don't show on specific pages if needed, but the user said "always visible"
  // and "above content". We keep it everywhere.
  
  useEffect(() => {
    // Small delay for entry animation
    const timer = setTimeout(() => setIsVisible(true), 1000);
    return () => clearTimeout(timer);
  }, []);

  const url = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent("Olá! Vim pelo site da EcoFerro e gostaria de informações.")}`;

  return (
    <div 
      className={`fixed bottom-6 right-6 z-40 transition-all duration-500 transform ${
        isVisible ? "translate-y-0 opacity-100" : "translate-y-10 opacity-0"
      }`}
    >
      <TooltipProvider delayDuration={0}>
        <Tooltip>
          <TooltipTrigger asChild>
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              onMouseEnter={() => setIsHovered(true)}
              onMouseLeave={() => setIsHovered(false)}
              className="relative flex items-center justify-center group"
              aria-label="Falar pelo WhatsApp"
            >
              {/* Background Glow Effect */}
              <div className={`absolute inset-0 rounded-full bg-[#25D366] blur-md transition-all duration-300 ${
                isHovered ? "opacity-40 scale-125" : "opacity-0 scale-100"
              }`} />
              
              {/* Pulse Animation Layer */}
              <div className="absolute inset-0 rounded-full bg-[#25D366] animate-ping opacity-20" />

              {/* Main Button */}
              <div
                className={`
                  relative h-14 w-14 md:h-16 md:w-16 rounded-full bg-[#25D366] 
                  flex items-center justify-center shadow-[0_4px_14px_0_rgba(37,211,102,0.39)]
                  transition-all duration-300 ease-out
                  hover:shadow-[0_6px_20px_rgba(37,211,102,0.5)]
                  hover:scale-110 active:scale-95
                `}
              >
                {/* Official WhatsApp SVG Icon */}
                <svg
                  viewBox="0 0 24 24"
                  className="w-8 h-8 md:w-9 md:h-9 text-white fill-current"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path d="M17.472 14.382c-.301-.15-1.767-.872-2.04-.971-.272-.1-.47-.15-.667.15-.197.3-.763.971-.934 1.171-.17.2-.34.225-.64.075-.301-.15-1.27-.467-2.42-1.496-.893-.796-1.495-1.78-1.67-2.081-.17-.301-.018-.464.132-.613.135-.134.301-.351.452-.526.15-.175.2-.3.301-.5.101-.2.051-.375-.025-.526-.075-.15-.667-1.609-.913-2.204-.24-.579-.48-.5-.667-.51-.172-.007-.37-.01-.57-.01-.197 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.767-.721 2.016-1.418.249-.696.249-1.295.174-1.418-.074-.123-.272-.198-.574-.347m-5.441 5.076h-.01c-1.55 0-3.07-.417-4.392-1.207l-.314-.186-3.268.857.872-3.186-.204-.326c-.868-1.385-1.326-2.986-1.326-4.633 0-4.757 3.87-8.628 8.632-8.628 2.305 0 4.473.898 6.101 2.527 1.628 1.629 2.524 3.797 2.524 6.101 0 4.759-3.87 8.63-8.628 8.63m0-17.612C6.417 1.846 1.84 6.423 1.84 12.083c0 1.812.475 3.58 1.378 5.148l-1.465 5.352 5.476-1.436c1.512.824 3.212 1.259 4.945 1.259h.01c5.662 0 10.24-4.576 10.24-10.237 0-2.742-1.068-5.32-3.007-7.259-1.94-1.939-4.516-3.006-7.258-3.006" />
                </svg>
              </div>
            </a>
          </TooltipTrigger>
          <TooltipContent side="left" className="bg-white text-gray-800 border-gray-200 shadow-lg mb-2">
            <p className="font-medium">Fale conosco no WhatsApp</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </div>
  );
};

export default WhatsAppButton;
