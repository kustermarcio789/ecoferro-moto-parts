import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { CartProvider } from "@/contexts/CartContext";
import WhatsAppButton from "@/components/store/WhatsAppButton";
import CartDrawer from "@/components/store/CartDrawer";
import CookieBanner from "@/components/store/CookieBanner";

// Pages
import Index from "./pages/Index";
import CatalogPage from "./pages/CatalogPage";
import ProductPage from "./pages/ProductPage";
import CartPage from "./pages/CartPage";
import QuotePage from "./pages/QuotePage";
import AboutPage from "./pages/AboutPage";
import ContactPage from "./pages/ContactPage";
import NotFound from "./pages/NotFound";

// Admin
import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminProducts from "./pages/admin/AdminProducts";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <CartProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <CartDrawer />
          <WhatsAppButton />
          <CookieBanner />
          <Routes>
            {/* Store */}
            <Route path="/" element={<Index />} />
            <Route path="/produtos" element={<CatalogPage />} />
            <Route path="/produto/:slug" element={<ProductPage />} />
            <Route path="/carrinho" element={<CartPage />} />
            <Route path="/orcamento" element={<QuotePage />} />
            <Route path="/sobre" element={<AboutPage />} />
            <Route path="/contato" element={<ContactPage />} />

            {/* Admin */}
            <Route path="/admin" element={<AdminDashboard />} />
            <Route path="/admin/produtos" element={<AdminProducts />} />

            {/* Catch-all */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </CartProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
