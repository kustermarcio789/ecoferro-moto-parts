import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

export interface WholesaleCartItem {
  product_id: string;
  internal_code: string;
  name: string;
  unit_price: number;
  quantity: number;
  moq: number;
  image_url?: string | null;
}

interface WholesaleCartCtx {
  items: WholesaleCartItem[];
  setQuantity: (productId: string, qty: number) => void;
  add: (item: WholesaleCartItem) => void;
  remove: (productId: string) => void;
  clear: () => void;
  totalUnits: number;
  totalValue: number;
}

const Ctx = createContext<WholesaleCartCtx | undefined>(undefined);
const STORAGE_KEY = "ecoferro_wholesale_cart_v1";

export const WholesaleCartProvider = ({ children }: { children: React.ReactNode }) => {
  const [items, setItems] = useState<WholesaleCartItem[]>([]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setItems(JSON.parse(raw));
    } catch {}
  }, []);
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  }, [items]);

  const setQuantity = useCallback((productId: string, qty: number) => {
    setItems((prev) => {
      if (qty <= 0) return prev.filter((i) => i.product_id !== productId);
      const exists = prev.find((i) => i.product_id === productId);
      if (!exists) return prev;
      return prev.map((i) => (i.product_id === productId ? { ...i, quantity: qty } : i));
    });
  }, []);

  const add = useCallback((item: WholesaleCartItem) => {
    setItems((prev) => {
      const exists = prev.find((i) => i.product_id === item.product_id);
      if (exists) {
        return prev.map((i) =>
          i.product_id === item.product_id ? { ...i, quantity: i.quantity + item.quantity } : i,
        );
      }
      return [...prev, item];
    });
  }, []);

  const remove = useCallback((productId: string) => {
    setItems((prev) => prev.filter((i) => i.product_id !== productId));
  }, []);

  const clear = useCallback(() => setItems([]), []);

  const value = useMemo<WholesaleCartCtx>(
    () => ({
      items,
      setQuantity,
      add,
      remove,
      clear,
      totalUnits: items.reduce((s, i) => s + i.quantity, 0),
      totalValue: items.reduce((s, i) => s + i.quantity * i.unit_price, 0),
    }),
    [items, setQuantity, add, remove, clear],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
};

export const useWholesaleCart = () => {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useWholesaleCart must be inside WholesaleCartProvider");
  return ctx;
};
