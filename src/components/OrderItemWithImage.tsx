import React from "react";
import { formatCurrency } from "@/lib/tracking";

interface OrderItem {
  id: string;
  product_name: string;
  sku: string | null;
  quantity: number;
  unit_price: number;
  total: number;
  confirmed_quantity: number | null;
  delivered_quantity?: number;
  product_id?: string;
  product?: {
    product_images?: {
      url: string;
      is_primary: boolean;
    }[];
  };
}

interface OrderItemsTableWithImagesProps {
  items: OrderItem[];
  isAdmin?: boolean;
  onUpdateQuantity?: (itemId: string, field: string, value: any) => void;
  showDelivered?: boolean;
  showUnitPrice?: boolean;
}

const OrderItemsTableWithImages = ({
  items,
  isAdmin = false,
  onUpdateQuantity,
  showDelivered = false,
  showUnitPrice = true,
}: OrderItemsTableWithImagesProps) => {
  const getProductImage = (item: OrderItem) => {
    const images = item.product?.product_images;
    if (!images || images.length === 0) return null;
    
    const primary = images.find(img => img.is_primary);
    return primary ? primary.url : images[0].url;
  };

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className={`border-b border-border ${isAdmin ? 'bg-muted/10' : 'text-xs font-display uppercase tracking-wider text-muted-foreground'}`}>
            <th className="text-left p-2 sm:p-4 w-16 sm:w-24">Imagem</th>
            <th className="text-left p-2 sm:p-4">Produto</th>
            <th className="text-center p-2 sm:p-4">Solicitada</th>
            <th className="text-center p-2 sm:p-4">Confirmada</th>
            {showDelivered && <th className="text-center p-2 sm:p-4">Entregue</th>}
            {showUnitPrice && <th className="text-right p-2 sm:p-4">Unitário</th>}
            <th className="text-right p-2 sm:p-4">Subtotal</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => {
            const imageUrl = getProductImage(item);
            return (
              <tr key={item.id} className="border-b border-border last:border-0 hover:bg-muted/10">
                <td className="p-2 sm:p-4">
                  <div className="w-12 h-12 sm:w-20 sm:h-20 bg-muted rounded-md overflow-hidden flex items-center justify-center border border-border">
                    {imageUrl ? (
                      <img 
                        src={imageUrl} 
                        alt={item.product_name} 
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                    ) : (
                      <span className="text-[10px] text-muted-foreground text-center px-1 font-body">Sem imagem</span>
                    )}
                  </div>
                </td>
                <td className="p-2 sm:p-4 font-body">
                  <div className={`font-medium ${isAdmin ? '' : 'text-foreground'}`}>{item.product_name}</div>
                  {item.sku && <div className="text-xs text-muted-foreground">SKU: {item.sku}</div>}
                </td>
                <td className="p-2 sm:p-4 text-center font-body">{item.quantity}</td>
                <td className="p-2 sm:p-4 text-center font-body">
                  {isAdmin && onUpdateQuantity ? (
                    <input 
                      type="number" 
                      className="w-16 sm:w-20 mx-auto text-center h-8 border border-input rounded-md bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring" 
                      value={item.confirmed_quantity ?? ""} 
                      onChange={(e) => onUpdateQuantity(item.id, 'confirmed_quantity', e.target.value === "" ? null : parseInt(e.target.value))}
                    />
                  ) : (
                    <div className="flex flex-col items-center">
                      {item.confirmed_quantity !== null ? (
                        <span className={!isAdmin && item.confirmed_quantity < item.quantity ? "text-amber-600 font-bold" : ""}>
                          {item.confirmed_quantity}
                          {!isAdmin && item.confirmed_quantity < item.quantity && (
                            <span className="block text-[10px] font-normal">Reduzido pelo admin</span>
                          )}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </div>
                  )}
                </td>
                {showDelivered && (
                  <td className="p-2 sm:p-4 text-center font-body">
                    {isAdmin && onUpdateQuantity ? (
                      <input 
                        type="number" 
                        className="w-16 sm:w-20 mx-auto text-center h-8 border border-input rounded-md bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring" 
                        value={item.delivered_quantity || 0} 
                        onChange={(e) => onUpdateQuantity(item.id, 'delivered_quantity', parseInt(e.target.value) || 0)}
                      />
                    ) : (
                      item.delivered_quantity || 0
                    )}
                  </td>
                )}
                {showUnitPrice && (
                  <td className="p-2 sm:p-4 text-right font-body">
                    {formatCurrency(Number(item.unit_price))}
                  </td>
                )}
                <td className="p-2 sm:p-4 text-right font-body font-medium">
                  {formatCurrency((item.confirmed_quantity ?? item.quantity) * Number(item.unit_price))}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

export default OrderItemsTableWithImages;
