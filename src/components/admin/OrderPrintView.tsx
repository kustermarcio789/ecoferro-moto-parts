import React from "react";
import { X, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/tracking";

interface OrderPrintViewProps {
  order: any;
  items: any[];
  onClose: () => void;
}

const OrderPrintView = ({ order, items, onClose }: OrderPrintViewProps) => {
  const [showPrices, setShowPrices] = React.useState(true);
  const itemsPerPage = 15;
  const pages = Math.ceil(items.length / itemsPerPage);

  const handlePrint = () => {
    window.print();
  };

  const getProductImage = (item: any) => {
    const images = item.product?.product_images;
    if (!images || images.length === 0) return null;
    const primary = images.find((img: any) => img.is_primary);
    return primary ? primary.url : images[0].url;
  };

  return (
    <div className="fixed inset-0 z-50 bg-background flex flex-col overflow-hidden print:static print:bg-white print:block">
      <div className="p-4 border-b flex justify-between items-center print:hidden">
        <h2 className="text-lg font-bold">Visualização de Impressão</h2>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 mr-2">
            <input 
              type="checkbox" 
              id="show-prices" 
              checked={showPrices} 
              onChange={(e) => setShowPrices(e.target.checked)}
              className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
            />
            <label htmlFor="show-prices" className="text-sm font-medium">Mostrar Preços</label>
          </div>
          <Button onClick={handlePrint}>
            <Printer className="mr-2 h-4 w-4" /> Imprimir
          </Button>
          <Button variant="outline" onClick={onClose}>
            <X className="mr-2 h-4 w-4" /> Fechar
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-8 print:p-0 print:overflow-visible">
        <style dangerouslySetInnerHTML={{ __html: `
          @media print {
            @page {
              size: A4;
              margin: 15mm;
            }
            body {
              background: white;
            }
            .page-break {
              page-break-after: always;
            }
          }
        ` }} />

        {Array.from({ length: pages || 1 }).map((_, pageIndex) => (
          <div 
            key={pageIndex} 
            className={`mx-auto bg-white shadow-lg w-[210mm] min-h-[297mm] p-[15mm] mb-8 print:shadow-none print:m-0 print:mb-0 ${pageIndex < pages - 1 ? 'page-break' : ''}`}
          >
            {/* Header */}
            <div className="border-b border-primary pb-1 mb-2 flex justify-between items-start">
              <div>
                <h1 className="text-lg font-bold text-primary leading-tight">Pedido #{order.order_number}</h1>
                <p className="text-[9px] text-muted-foreground">
                  Data: {new Date(order.created_at).toLocaleDateString("pt-BR")}
                </p>
                <div className="mt-0.5 space-y-0">
                  <p className="text-[10px] font-bold leading-tight">{order.customers?.name || order.wholesale_customer?.name}</p>
                  <p className="text-[9px] text-muted-foreground">CNPJ/CPF: {order.customers?.cpf_cnpj || order.wholesale_customer?.cnpj || "—"}</p>
                </div>
              </div>
              <div className="text-right space-y-0.5">
                <div className="flex flex-col items-end gap-0.5">
                  <div className="inline-block px-1.5 py-0 rounded text-[8px] font-bold uppercase bg-muted border leading-tight">
                    Status: {order.status}
                  </div>
                  <div className="text-[8px] font-bold uppercase leading-tight">
                    <span className="mr-1">Prioridade:</span>
                    <span className={`${order.priority === 'critical' ? 'text-red-600' : order.priority === 'urgent' ? 'text-orange-600' : 'text-gray-600'}`}>
                      {order.priority || 'Normal'}
                    </span>
                  </div>
                </div>
                {showPrices && (
                  <p className="text-sm font-bold text-primary mt-0.5">Total: {formatCurrency(Number(order.total))}</p>
                )}
              </div>
            </div>

            {/* Table */}
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b-2 border-muted bg-muted/20">
                  <th className="text-left py-2 px-1 text-[10px] font-bold uppercase w-[60px]">Imagem</th>
                  <th className="text-left py-2 px-1 text-[10px] font-bold uppercase w-24">SKU</th>
                  <th className="text-left py-2 px-1 text-[10px] font-bold uppercase">Produto</th>
                  <th className="text-center py-2 px-1 text-[10px] font-bold uppercase w-12">Solic.</th>
                  <th className="text-center py-2 px-1 text-[10px] font-bold uppercase w-12">Conf.</th>
                  {order.delivered_quantity !== undefined && (
                    <th className="text-center py-2 px-1 text-[10px] font-bold uppercase w-12">Entr.</th>
                  )}
                  {showPrices && <th className="text-right py-2 px-1 text-[10px] font-bold uppercase w-20">Unit.</th>}
                  {showPrices && <th className="text-right py-2 px-1 text-[10px] font-bold uppercase w-20">Subtotal</th>}
                </tr>
              </thead>
              <tbody>
                {items.slice(pageIndex * itemsPerPage, (pageIndex + 1) * itemsPerPage).map((item) => {
                  const imageUrl = getProductImage(item);
                  return (
                    <tr key={item.id} className="border-b border-muted/50">
                      <td className="py-1 px-1">
                        <div className="w-[50px] h-[50px] bg-muted rounded overflow-hidden flex items-center justify-center border">
                          {imageUrl ? (
                            <img src={imageUrl} alt="" className="w-full h-full object-contain" />
                          ) : (
                            <span className="text-[8px] text-muted-foreground">Sem foto</span>
                          )}
                        </div>
                      </td>
                      <td className="py-2 px-1 text-[11px] font-mono">{item.sku || "—"}</td>
                      <td className="py-2 px-1 text-[11px] leading-tight font-medium">{item.product_name}</td>
                      <td className="py-2 px-1 text-center text-[11px]">{item.quantity}</td>
                      <td className="py-2 px-1 text-center text-[11px] font-bold">{item.confirmed_quantity ?? "—"}</td>
                      {order.delivered_quantity !== undefined && (
                        <td className="py-2 px-1 text-center text-[11px]">{item.delivered_quantity || 0}</td>
                      )}
                      {showPrices && <td className="py-2 px-1 text-right text-[11px]">{formatCurrency(Number(item.unit_price))}</td>}
                      {showPrices && (
                        <td className="py-2 px-1 text-right text-[11px] font-bold">
                          {formatCurrency((item.confirmed_quantity ?? item.quantity) * Number(item.unit_price))}
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {/* Footer on last page */}
            {pageIndex === pages - 1 && (
              <div className="mt-8 grid grid-cols-2 gap-8">
                <div className="space-y-4">
                  <div>
                    <h3 className="text-[10px] font-bold uppercase text-muted-foreground mb-1">Observações</h3>
                    <div className="border rounded p-2 min-h-[60px] text-xs italic text-muted-foreground">
                      {order.customer_notes || order.atacadista_notes || "Nenhuma observação."}
                    </div>
                  </div>
                </div>
                <div className="space-y-4">
                  {showPrices && (
                    <>
                      <div className="flex justify-between border-b pb-1">
                        <span className="text-xs font-bold uppercase">Subtotal:</span>
                        <span className="text-xs">{formatCurrency(Number(order.subtotal))}</span>
                      </div>
                      <div className="flex justify-between border-b pb-1 text-primary">
                        <span className="text-sm font-bold uppercase">Total do Pedido:</span>
                        <span className="text-sm font-bold">{formatCurrency(Number(order.total))}</span>
                      </div>
                    </>
                  )}
                  <div className={`${showPrices ? 'mt-8' : 'mt-4'} pt-4 border-t border-black text-center`}>
                    <p className="text-[10px] font-bold uppercase">Assinatura / Conferência do Operador</p>
                  </div>
                </div>
              </div>
            )}
            
            {/* Page number */}
            <div className="absolute bottom-8 right-8 text-[10px] text-muted-foreground print:bottom-4 print:right-4">
              Página {pageIndex + 1} de {pages}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default OrderPrintView;
