import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { CartProvider } from "@/contexts/CartContext";
import { AuthProvider } from "@/hooks/useAuth";
import WhatsAppButton from "@/components/store/WhatsAppButton";
import CartDrawer from "@/components/store/CartDrawer";
import CookieBanner from "@/components/store/CookieBanner";
import ProtectedRoute from "@/components/admin/ProtectedRoute";

// Pages
import Index from "./pages/Index";
import CatalogPage from "./pages/CatalogPage";
import ProductPage from "./pages/ProductPage";
import CartPage from "./pages/CartPage";
import QuotePage from "./pages/QuotePage";
import AboutPage from "./pages/AboutPage";
import ContactPage from "./pages/ContactPage";
import LoginPage from "./pages/LoginPage";
import PolicyPage from "./pages/PolicyPage";
import WholesalePage from "./pages/WholesalePage";
import NotFound from "./pages/NotFound";

// Admin
import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminProducts from "./pages/admin/AdminProducts";
import AdminOrders from "./pages/admin/AdminOrders";
import AdminCustomers from "./pages/admin/AdminCustomers";
import AdminLeads from "./pages/admin/AdminLeads";
import AdminQuotes from "./pages/admin/AdminQuotes";
import AdminInventory from "./pages/admin/AdminInventory";
import AdminPartners from "./pages/admin/AdminPartners";
import AdminWholesale from "./pages/admin/AdminWholesale";
import AdminReports from "./pages/admin/AdminReports";
import AdminSettings from "./pages/admin/AdminSettings";
import AdminCoupons from "./pages/admin/AdminCoupons";
import AdminBanners from "./pages/admin/AdminBanners";
import AdminReviews from "./pages/admin/AdminReviews";
import AdminAbandonedCarts from "./pages/admin/AdminAbandonedCarts";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <AuthProvider>
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
              <Route path="/login" element={<LoginPage />} />
              <Route path="/atacado" element={<WholesalePage />} />
              <Route path="/:slug" element={<PolicyPage />} />

              {/* Admin (Protected) */}
              <Route path="/admin" element={<ProtectedRoute><AdminDashboard /></ProtectedRoute>} />
              <Route path="/admin/produtos" element={<ProtectedRoute><AdminProducts /></ProtectedRoute>} />
              <Route path="/admin/pedidos" element={<ProtectedRoute><AdminOrders /></ProtectedRoute>} />
              <Route path="/admin/clientes" element={<ProtectedRoute><AdminCustomers /></ProtectedRoute>} />
              <Route path="/admin/leads" element={<ProtectedRoute><AdminLeads /></ProtectedRoute>} />
              <Route path="/admin/orcamentos" element={<ProtectedRoute><AdminQuotes /></ProtectedRoute>} />
              <Route path="/admin/estoque" element={<ProtectedRoute><AdminInventory /></ProtectedRoute>} />
              <Route path="/admin/parceiros" element={<ProtectedRoute><AdminPartners /></ProtectedRoute>} />
              <Route path="/admin/atacado" element={<ProtectedRoute><AdminWholesale /></ProtectedRoute>} />
              <Route path="/admin/relatorios" element={<ProtectedRoute><AdminReports /></ProtectedRoute>} />
              <Route path="/admin/configuracoes" element={<ProtectedRoute><AdminSettings /></ProtectedRoute>} />
              <Route path="/admin/cupons" element={<ProtectedRoute><AdminCoupons /></ProtectedRoute>} />
              <Route path="/admin/banners" element={<ProtectedRoute><AdminBanners /></ProtectedRoute>} />
              <Route path="/admin/avaliacoes" element={<ProtectedRoute><AdminReviews /></ProtectedRoute>} />
              <Route path="/admin/carrinhos-abandonados" element={<ProtectedRoute><AdminAbandonedCarts /></ProtectedRoute>} />

              {/* Catch-all */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </CartProvider>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
