import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, ArrowRight, MapPin, CreditCard, Package, User, Check, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import StoreHeader from "@/components/store/StoreHeader";
import StoreFooter from "@/components/store/StoreFooter";
import { useCart } from "@/contexts/CartContext";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { formatCurrency } from "@/lib/tracking";

interface CustomerData {
  name: string; email: string; phone: string; cpf_cnpj: string;
}
interface AddressData {
  zip_code: string; street: string; number: string; complement: string;
  neighborhood: string; city: string; state: string;
}
interface ShippingOption {
  id: string; name: string; price: number; days: number;
}

const SHIPPING_OPTIONS: ShippingOption[] = [
  { id: "pac", name: "PAC - Correios", price: 24.90, days: 8 },
  { id: "sedex", name: "SEDEX - Correios", price: 39.90, days: 3 },
  { id: "transportadora", name: "Transportadora", price: 29.90, days: 6 },
];

const STEPS = [
  { label: "Dados", icon: User },
  { label: "Endereço", icon: MapPin },
  { label: "Envio", icon: Package },
  { label: "Pagamento", icon: CreditCard },
  { label: "Confirmação", icon: Check },
];

const CheckoutPage = () => {
  const { items, subtotal, clearCart } = useCart();
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [cepLoading, setCepLoading] = useState(false);

  const [customer, setCustomer] = useState<CustomerData>({
    name: "", email: user?.email || "", phone: "", cpf_cnpj: "",
  });
  const [address, setAddress] = useState<AddressData>({
    zip_code: "", street: "", number: "", complement: "",
    neighborhood: "", city: "", state: "",
  });
  const [selectedShipping, setSelectedShipping] = useState<string>("");
  const [paymentMethod, setPaymentMethod] = useState<string>("");
  const [customerNotes, setCustomerNotes] = useState("");
  const [couponCode, setCouponCode] = useState("");
  const [couponDiscount, setCouponDiscount] = useState(0);
  const [couponApplied, setCouponApplied] = useState<{ id: string; code: string; discount_type: string; discount_value: number } | null>(null);
  const [couponLoading, setCouponLoading] = useState(false);

  const shippingCost = SHIPPING_OPTIONS.find(s => s.id === selectedShipping)?.price || 0;
  const pixDiscount = paymentMethod === "pix" ? (subtotal - couponDiscount + shippingCost) * 0.05 : 0;
  const total = subtotal + shippingCost - couponDiscount - pixDiscount;

  if (items.length === 0) {
    navigate("/carrinho");
    return null;
  }

  const lookupCep = async (cep: string) => {
    const clean = cep.replace(/\D/g, "");
    if (clean.length !== 8) return;
    setCepLoading(true);
    try {
      const res = await fetch(`https://viacep.com.br/ws/${clean}/json/`);
      const data = await res.json();
      if (!data.erro) {
        setAddress(a => ({
          ...a, street: data.logradouro || "", neighborhood: data.bairro || "",
          city: data.localidade || "", state: data.uf || "",
        }));
      }
    } catch { /* ignore */ }
    setCepLoading(false);
  };

  const validateStep = (): boolean => {
    if (step === 0) {
      if (!customer.name || !customer.email || !customer.phone) {
        toast({ title: "Preencha todos os campos obrigatórios", variant: "destructive" });
        return false;
      }
    }
    if (step === 1) {
      if (!address.zip_code || !address.street || !address.number || !address.city || !address.state) {
        toast({ title: "Preencha o endereço completo", variant: "destructive" });
        return false;
      }
    }
    if (step === 2 && !selectedShipping) {
      toast({ title: "Selecione um método de envio", variant: "destructive" });
      return false;
    }
    if (step === 3 && !paymentMethod) {
      toast({ title: "Selecione um método de pagamento", variant: "destructive" });
      return false;
    }
    return true;
  };

  const nextStep = () => {
    if (validateStep()) setStep(s => Math.min(4, s + 1));
  };

  const applyCoupon = async () => {
    if (!couponCode.trim()) return;
    setCouponLoading(true);
    const { data, error } = await supabase
      .from("coupons")
      .select("*")
      .eq("code", couponCode.trim().toUpperCase())
      .eq("is_active", true)
      .maybeSingle();

    if (error || !data) {
      toast({ title: "Cupom inválido", variant: "destructive" });
      setCouponDiscount(0);
      setCouponApplied(null);
    } else {
      if (data.min_order_value && subtotal < Number(data.min_order_value)) {
        toast({ title: `Pedido mínimo de ${formatCurrency(Number(data.min_order_value))}`, variant: "destructive" });
      } else if (data.max_uses && Number(data.used_count) >= data.max_uses) {
        toast({ title: "Cupom esgotado", variant: "destructive" });
      } else {
        const discount = data.discount_type === "percentage"
          ? subtotal * (Number(data.discount_value) / 100)
          : Number(data.discount_value);
        setCouponDiscount(Math.min(discount, subtotal));
        setCouponApplied({ id: data.id, code: data.code, discount_type: data.discount_type, discount_value: Number(data.discount_value) });
        toast({ title: `Cupom ${data.code} aplicado!` });
      }
    }
    setCouponLoading(false);
  };

  const removeCoupon = () => {
    setCouponCode("");
    setCouponDiscount(0);
    setCouponApplied(null);
  };

  const placeOrder = async () => {
    setLoading(true);
    try {
      // 1. Validate stock
      for (const item of items) {
        const { data: product } = await supabase
          .from("products")
          .select("stock, name")
          .eq("id", item.id)
          .single();
        if (!product || product.stock < item.quantity) {
          toast({
            title: "Estoque insuficiente",
            description: `"${product?.name || item.name}" possui apenas ${product?.stock || 0} unidade(s) disponível(is).`,
            variant: "destructive",
          });
          setLoading(false);
          return;
        }
      }

      // 2. Create or find customer
      let customerId: string | null = null;
      const { data: existingCustomer } = await supabase
        .from("customers")
        .select("id")
        .eq("email", customer.email)
        .maybeSingle();

      if (existingCustomer) {
        customerId = existingCustomer.id;
      } else {
        const { data: newCustomer, error: custErr } = await supabase
          .from("customers")
          .insert({
            name: customer.name,
            email: customer.email,
            phone: customer.phone,
            cpf_cnpj: customer.cpf_cnpj || null,
            user_id: user?.id || null,
          })
          .select("id")
          .single();
        if (custErr) throw custErr;
        customerId = newCustomer.id;
      }

      // 3. Create address
      await supabase.from("addresses").insert({
        customer_id: customerId!,
        zip_code: address.zip_code,
        street: address.street,
        number: address.number,
        complement: address.complement || null,
        neighborhood: address.neighborhood || null,
        city: address.city,
        state: address.state,
        is_default: true,
      });

      // 4. Create order with real totals
      const shippingOption = SHIPPING_OPTIONS.find(s => s.id === selectedShipping);
      const { data: order, error: orderErr } = await supabase
        .from("orders")
        .insert({
          customer_id: customerId,
          subtotal,
          shipping_cost: shippingCost,
          discount: couponDiscount + pixDiscount,
          total,
          status: "pending",
          payment_status: "pending",
          payment_method: paymentMethod,
          shipping_carrier: shippingOption?.name || null,
          shipping_address: address as any,
          billing_address: address as any,
          customer_notes: customerNotes || null,
          coupon_id: couponApplied?.id || null,
          sales_channel: "retail",
        })
        .select("id, order_number")
        .single();
      if (orderErr) throw orderErr;

      // 5. Create order items
      const orderItems = items.map(item => ({
        order_id: order.id,
        product_id: item.id,
        product_name: item.name,
        quantity: item.quantity,
        unit_price: item.price,
        total: item.price * item.quantity,
        sku: item.sku || null,
      }));
      const { error: itemsErr } = await supabase.from("order_items").insert(orderItems);
      if (itemsErr) throw itemsErr;

      // 6. Create payment record
      await supabase.from("payments").insert({
        order_id: order.id,
        amount: total,
        method: paymentMethod,
        status: "pending",
      });

      // 7. Decrement stock & register inventory movements
      for (const item of items) {
        const { data: product } = await supabase
          .from("products")
          .select("stock")
          .eq("id", item.id)
          .single();
        const previousStock = product?.stock || 0;
        const newStock = previousStock - item.quantity;

        await supabase
          .from("products")
          .update({ stock: newStock })
          .eq("id", item.id);

        await supabase.from("inventory_movements").insert({
          product_id: item.id,
          type: "exit" as const,
          quantity: item.quantity,
          previous_stock: previousStock,
          new_stock: newStock,
          order_id: order.id,
          reason: `Venda - Pedido #${order.order_number}`,
        });
      }

      // 8. Increment coupon used_count
      if (couponApplied) {
        await supabase.rpc("has_role", { _user_id: "00000000-0000-0000-0000-000000000000", _role: "admin" }); // no-op placeholder
        // Update via direct query
        const { data: coupon } = await supabase
          .from("coupons")
          .select("used_count")
          .eq("id", couponApplied.id)
          .single();
        if (coupon) {
          await supabase
            .from("coupons")
            .update({ used_count: (coupon.used_count || 0) + 1 })
            .eq("id", couponApplied.id);
        }
      }

      clearCart();
      navigate(`/pedido-confirmado/${order.order_number}`);
    } catch (err: any) {
      console.error("Order error:", err);
      toast({ title: "Erro ao criar pedido", description: err.message, variant: "destructive" });
    }
    setLoading(false);
  };

  const inputClass = "w-full rounded-lg border border-border bg-background px-3 py-2.5 font-body text-sm focus:outline-none focus:ring-2 focus:ring-ring";
  const labelClass = "text-xs font-body font-medium text-foreground mb-1 block";

  return (
    <div className="min-h-screen bg-background">
      <StoreHeader />
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Steps */}
        <div className="flex items-center justify-between mb-8">
          {STEPS.map((s, i) => (
            <div key={i} className="flex items-center gap-2 flex-1">
              <div className={`h-9 w-9 rounded-full flex items-center justify-center shrink-0 text-sm font-display font-bold ${
                i < step ? "bg-primary text-primary-foreground" :
                i === step ? "bg-primary text-primary-foreground ring-4 ring-primary/20" :
                "bg-muted text-muted-foreground"
              }`}>
                {i < step ? <Check className="h-4 w-4" /> : <s.icon className="h-4 w-4" />}
              </div>
              <span className={`text-xs font-display uppercase tracking-wider hidden sm:block ${i <= step ? "text-foreground" : "text-muted-foreground"}`}>
                {s.label}
              </span>
              {i < STEPS.length - 1 && <div className={`flex-1 h-0.5 mx-2 ${i < step ? "bg-primary" : "bg-border"}`} />}
            </div>
          ))}
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            {/* Step 0: Customer data */}
            {step === 0 && (
              <div className="bg-card rounded-xl border border-border p-6 space-y-4">
                <h2 className="font-display text-xl font-bold uppercase tracking-wider">Seus Dados</h2>
                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label className={labelClass}>Nome completo *</label>
                    <input value={customer.name} onChange={e => setCustomer(c => ({ ...c, name: e.target.value }))} className={inputClass} />
                  </div>
                  <div>
                    <label className={labelClass}>E-mail *</label>
                    <input type="email" value={customer.email} onChange={e => setCustomer(c => ({ ...c, email: e.target.value }))} className={inputClass} />
                  </div>
                  <div>
                    <label className={labelClass}>Telefone *</label>
                    <input value={customer.phone} onChange={e => setCustomer(c => ({ ...c, phone: e.target.value }))} placeholder="(11) 99999-9999" className={inputClass} />
                  </div>
                  <div>
                    <label className={labelClass}>CPF / CNPJ</label>
                    <input value={customer.cpf_cnpj} onChange={e => setCustomer(c => ({ ...c, cpf_cnpj: e.target.value }))} className={inputClass} />
                  </div>
                </div>
              </div>
            )}

            {/* Step 1: Address */}
            {step === 1 && (
              <div className="bg-card rounded-xl border border-border p-6 space-y-4">
                <h2 className="font-display text-xl font-bold uppercase tracking-wider">Endereço de Entrega</h2>
                <div className="grid sm:grid-cols-3 gap-4">
                  <div>
                    <label className={labelClass}>CEP *</label>
                    <div className="relative">
                      <input value={address.zip_code} onChange={e => { const v = e.target.value; setAddress(a => ({ ...a, zip_code: v })); if (v.replace(/\D/g, "").length === 8) lookupCep(v); }}
                        placeholder="00000-000" className={inputClass} />
                      {cepLoading && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />}
                    </div>
                  </div>
                </div>
                <div className="grid sm:grid-cols-4 gap-4">
                  <div className="sm:col-span-3">
                    <label className={labelClass}>Rua *</label>
                    <input value={address.street} onChange={e => setAddress(a => ({ ...a, street: e.target.value }))} className={inputClass} />
                  </div>
                  <div>
                    <label className={labelClass}>Número *</label>
                    <input value={address.number} onChange={e => setAddress(a => ({ ...a, number: e.target.value }))} className={inputClass} />
                  </div>
                </div>
                <div className="grid sm:grid-cols-3 gap-4">
                  <div>
                    <label className={labelClass}>Complemento</label>
                    <input value={address.complement} onChange={e => setAddress(a => ({ ...a, complement: e.target.value }))} className={inputClass} />
                  </div>
                  <div>
                    <label className={labelClass}>Bairro</label>
                    <input value={address.neighborhood} onChange={e => setAddress(a => ({ ...a, neighborhood: e.target.value }))} className={inputClass} />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className={labelClass}>Cidade *</label>
                      <input value={address.city} onChange={e => setAddress(a => ({ ...a, city: e.target.value }))} className={inputClass} />
                    </div>
                    <div>
                      <label className={labelClass}>UF *</label>
                      <input value={address.state} onChange={e => setAddress(a => ({ ...a, state: e.target.value }))} maxLength={2} className={inputClass} />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Step 2: Shipping */}
            {step === 2 && (
              <div className="bg-card rounded-xl border border-border p-6 space-y-4">
                <h2 className="font-display text-xl font-bold uppercase tracking-wider">Método de Envio</h2>
                <p className="text-xs text-muted-foreground font-body">Entrega para {address.city}/{address.state} - CEP {address.zip_code}</p>
                <div className="space-y-3">
                  {SHIPPING_OPTIONS.map(opt => (
                    <label key={opt.id} className={`flex items-center justify-between p-4 rounded-lg border-2 cursor-pointer transition-colors ${
                      selectedShipping === opt.id ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"
                    }`}>
                      <div className="flex items-center gap-3">
                        <input type="radio" name="shipping" checked={selectedShipping === opt.id}
                          onChange={() => setSelectedShipping(opt.id)} className="accent-primary" />
                        <div>
                          <p className="font-display text-sm font-semibold">{opt.name}</p>
                          <p className="text-xs text-muted-foreground font-body">Entrega em até {opt.days} dias úteis</p>
                        </div>
                      </div>
                      <span className="font-display font-bold text-primary">{formatCurrency(opt.price)}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}

            {/* Step 3: Payment */}
            {step === 3 && (
              <div className="bg-card rounded-xl border border-border p-6 space-y-4">
                <h2 className="font-display text-xl font-bold uppercase tracking-wider">Pagamento</h2>
                <div className="space-y-3">
                  {[
                    { id: "pix", label: "Pix", desc: "Aprovação instantânea • 5% de desconto", discount: true },
                    { id: "credit_card", label: "Cartão de Crédito", desc: "Em até 12x sem juros", discount: false },
                    { id: "boleto", label: "Boleto Bancário", desc: "Aprovação em 1-2 dias úteis", discount: false },
                  ].map(pm => (
                    <label key={pm.id} className={`flex items-center justify-between p-4 rounded-lg border-2 cursor-pointer transition-colors ${
                      paymentMethod === pm.id ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"
                    }`}>
                      <div className="flex items-center gap-3">
                        <input type="radio" name="payment" checked={paymentMethod === pm.id}
                          onChange={() => setPaymentMethod(pm.id)} className="accent-primary" />
                        <div>
                          <p className="font-display text-sm font-semibold">{pm.label}</p>
                          <p className="text-xs text-muted-foreground font-body">{pm.desc}</p>
                        </div>
                      </div>
                      {pm.discount && (
                        <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded font-display font-bold">-5%</span>
                      )}
                    </label>
                  ))}
                </div>
                <div>
                  <label className={labelClass}>Observações do pedido (opcional)</label>
                  <textarea value={customerNotes} onChange={e => setCustomerNotes(e.target.value)}
                    rows={3} className={`${inputClass} resize-none`} placeholder="Alguma instrução especial?" />
                </div>
              </div>
            )}

            {/* Step 4: Review */}
            {step === 4 && (
              <div className="bg-card rounded-xl border border-border p-6 space-y-6">
                <h2 className="font-display text-xl font-bold uppercase tracking-wider">Revisar Pedido</h2>
                <div className="grid sm:grid-cols-2 gap-6">
                  <div>
                    <h3 className="text-xs font-display uppercase tracking-wider text-muted-foreground mb-2">Dados Pessoais</h3>
                    <p className="font-body text-sm">{customer.name}</p>
                    <p className="font-body text-sm text-muted-foreground">{customer.email}</p>
                    <p className="font-body text-sm text-muted-foreground">{customer.phone}</p>
                  </div>
                  <div>
                    <h3 className="text-xs font-display uppercase tracking-wider text-muted-foreground mb-2">Endereço</h3>
                    <p className="font-body text-sm">{address.street}, {address.number}</p>
                    <p className="font-body text-sm text-muted-foreground">{address.neighborhood} - {address.city}/{address.state}</p>
                    <p className="font-body text-sm text-muted-foreground">CEP: {address.zip_code}</p>
                  </div>
                </div>
                <div>
                  <h3 className="text-xs font-display uppercase tracking-wider text-muted-foreground mb-3">Itens</h3>
                  <div className="space-y-2">
                    {items.map(item => (
                      <div key={item.id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                        <div className="flex items-center gap-3">
                          {item.image && <img src={item.image} alt="" className="h-10 w-10 rounded object-cover" />}
                          <div>
                            <p className="font-body text-sm font-medium line-clamp-1">{item.name}</p>
                            <p className="font-body text-xs text-muted-foreground">Qtd: {item.quantity}</p>
                          </div>
                        </div>
                        <span className="font-display font-bold text-sm">{formatCurrency(item.price * item.quantity)}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="flex items-center gap-2 text-sm font-body">
                  <Package className="h-4 w-4 text-primary" />
                  <span>{SHIPPING_OPTIONS.find(s => s.id === selectedShipping)?.name} — {formatCurrency(shippingCost)}</span>
                </div>
                <div className="flex items-center gap-2 text-sm font-body">
                  <CreditCard className="h-4 w-4 text-primary" />
                  <span>{paymentMethod === "pix" ? "Pix" : paymentMethod === "credit_card" ? "Cartão de Crédito" : "Boleto"}</span>
                </div>
              </div>
            )}

            {/* Navigation */}
            <div className="flex justify-between mt-6">
              <Button variant="outline" disabled={step === 0} onClick={() => setStep(s => s - 1)}>
                <ArrowLeft className="mr-2 h-4 w-4" /> Voltar
              </Button>
              {step < 4 ? (
                <Button onClick={nextStep}>
                  Próximo <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              ) : (
                <Button onClick={placeOrder} disabled={loading} className="font-display uppercase tracking-wider">
                  {loading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Processando...</> : "Confirmar Pedido"}
                </Button>
              )}
            </div>
          </div>

          {/* Order summary sidebar */}
          <div className="bg-card rounded-xl border border-border p-6 h-fit sticky top-24">
            <h3 className="font-display text-sm font-bold uppercase tracking-wider mb-4">Resumo</h3>
            <div className="space-y-2 mb-4">
              {items.map(item => (
                <div key={item.id} className="flex justify-between text-xs font-body">
                  <span className="text-muted-foreground line-clamp-1 flex-1 mr-2">{item.quantity}x {item.name}</span>
                  <span>{formatCurrency(item.price * item.quantity)}</span>
                </div>
              ))}
            </div>
            <div className="border-t border-border pt-3 space-y-2">
              <div className="flex justify-between text-sm font-body">
                <span className="text-muted-foreground">Subtotal</span>
                <span>{formatCurrency(subtotal)}</span>
              </div>
              {shippingCost > 0 && (
                <div className="flex justify-between text-sm font-body">
                  <span className="text-muted-foreground">Frete</span>
                  <span>{formatCurrency(shippingCost)}</span>
                </div>
              )}
              {paymentMethod === "pix" && (
                <div className="flex justify-between text-sm font-body text-primary">
                  <span>Desconto Pix (5%)</span>
                  <span>-{formatCurrency(total * 0.05)}</span>
                </div>
              )}
              <div className="flex justify-between font-display text-lg font-bold pt-2 border-t border-border">
                <span>Total</span>
                <span className="text-primary">{formatCurrency(paymentMethod === "pix" ? total * 0.95 : total)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
      <StoreFooter />
    </div>
  );
};

export default CheckoutPage;
