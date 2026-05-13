import React from "react";
import { createPortal } from "react-dom";
import { X, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/tracking";

interface OrderPrintViewProps {
  order: any;
  items: any[];
  onClose: () => void;
}

const OrderPrintView = ({ order, items, onClose }: OrderPrintViewProps) => {
  const [showPrices, setShowPrices] = React.useState(false);
  const [isPreparingPrint, setIsPreparingPrint] = React.useState(false);

  const itemsPerPage = 15;
  const pages = [];
  for (let i = 0; i < items.length; i += itemsPerPage) {
    pages.push(items.slice(i, i + itemsPerPage));
  }

  const getProductImage = (item: any) => {
    const images = item.product?.product_images;
    if (!images || images.length === 0) return null;
    const primary = images.find((img: any) => img.is_primary);
    return primary ? primary.url : images[0].url;
  };

  const waitForImages = async (rootElement: HTMLElement) => {
    const images = Array.from(rootElement.querySelectorAll("img"));
    await Promise.all(
      images.map((img) => {
        if (img.complete) return Promise.resolve();
        return new Promise((resolve) => {
          img.onload = resolve;
          img.onerror = resolve;
        });
      })
    );
  };

  const handlePrint = async () => {
    setIsPreparingPrint(true);
    
    // Give time for UI to reflect "preparing" if needed, 
    // and ensure the print root is fully rendered
    await new Promise((resolve) => requestAnimationFrame(resolve));
    await new Promise((resolve) => requestAnimationFrame(resolve));

    const printRoot = document.getElementById("order-print-root");
    if (printRoot) {
      await waitForImages(printRoot);
      window.print();
    } else {
      console.error("Print root not found");
      window.print(); // Fallback
    }
    
    setIsPreparingPrint(false);
  };

  const content = (
    <div className="fixed inset-0 z-[9999] bg-background flex flex-col overflow-hidden print:static print:bg-white print:block">
      <div className="p-2 border-b flex justify-between items-center print:hidden bg-muted/20">
        <h2 className="text-sm font-bold uppercase tracking-wider">Configuração de Impressão</h2>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 mr-2">
            <input 
              type="checkbox" 
              id="show-prices" 
              checked={showPrices} 
              onChange={(e) => setShowPrices(e.target.checked)}
              className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
            />
            <label htmlFor="show-prices" className="text-xs font-bold uppercase cursor-pointer">Mostrar Preços</label>
          </div>
          <Button onClick={handlePrint} disabled={isPreparingPrint} size="sm">
            {isPreparingPrint ? (
              <span className="flex items-center gap-2 text-xs font-bold">CARREGANDO...</span>
            ) : (
              <><Printer className="mr-2 h-4 w-4" /> IMPRIMIR PEDIDO</>
            )}
          </Button>
          <Button variant="outline" onClick={onClose} size="sm">
            <X className="mr-2 h-4 w-4" /> FECHAR
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-8 bg-muted/10 print:p-0 print:overflow-visible print:bg-white">
        <style dangerouslySetInnerHTML={{ __html: `
          @page {
            size: A4 portrait;
            margin: 0;
          }

          @media print {
            html, body {
              width: 210mm;
              height: auto;
              margin: 0 !important;
              padding: 0 !important;
              background: #ffffff !important;
              overflow: visible !important;
            }

            /* Esconder TUDO que não é o portal de impressão */
            #root, .admin-sidebar, .admin-header, header, nav, aside, button, .no-print, .lovable-badge {
              display: none !important;
            }

            #order-print-root {
              display: block !important;
              visibility: visible !important;
              position: static !important;
              width: 100% !important;
              height: auto !important;
              margin: 0 !important;
              padding: 0 !important;
              background: #ffffff !important;
            }

            .print-page {
              width: 210mm !important;
              height: 297mm !important;
              page-break-after: always !important;
              break-after: page !important;
              overflow: hidden !important;
              background: #ffffff !important;
              padding: 10mm !important;
              position: relative !important;
              box-sizing: border-box !important;
            }

            .print-page:last-child {
              page-break-after: auto !important;
              break-after: auto !important;
            }

            .print-item-row {
              page-break-inside: avoid !important;
              break-inside: avoid !important;
            }
          }
        ` }} />


        <div id="order-print-root" className="print:block">
          {pages.length > 0 ? pages.map((pageItems, pageIndex) => (
            <div 
              key={pageIndex} 
              className="print-page mx-auto bg-white shadow-lg w-[210mm] min-h-[297mm] p-[10mm] mb-8 print:shadow-none print:m-0 print:mb-0"
            >
              {/* Header */}
              <div className="border-b-2 border-black pb-2 mb-4 flex justify-between items-start">
                <div>
                  <h1 className="text-xl font-bold text-black leading-none mb-1">PEDIDO DE VENDA #{order.order_number}</h1>
                  <p className="text-[10px] font-bold">
                    DATA: {new Date(order.created_at).toLocaleDateString("pt-BR")} | HORA: {new Date(order.created_at).toLocaleTimeString("pt-BR", { hour: '2-digit', minute: '2-digit' })}
                  </p>
                  <div className="mt-3">
                    <p className="text-[11px] font-extrabold uppercase leading-tight">CLIENTE: {order.customers?.name || order.wholesale_customer?.razao_social || "NÃO IDENTIFICADO"}</p>
                    <p className="text-[10px] font-bold leading-tight">CNPJ/CPF: {order.customers?.cpf_cnpj || order.wholesale_customer?.cnpj || "—"}</p>
                    {order.customers?.email && <p className="text-[10px] leading-tight">EMAIL: {order.customers.email}</p>}
                  </div>
                </div>
                <div className="text-right flex flex-col items-end gap-1">
                  <div className="border-2 border-black px-2 py-1 text-[10px] font-black uppercase">
                    STATUS: {order.status || 'PENDENTE'}
                  </div>
                  <div className={`border-2 px-2 py-1 text-[10px] font-black uppercase ${
                    order.priority === 'critical' ? 'border-red-600 text-red-600 bg-red-50' : 
                    order.priority === 'urgent' ? 'border-orange-600 text-orange-600 bg-orange-50' : 
                    'border-gray-600 text-gray-600'
                  }`}>
                    PRIORIDADE: {order.priority === 'critical' ? 'CRÍTICA' : order.priority === 'urgent' ? 'URGENTE' : 'NORMAL'}
                  </div>
                  {showPrices && (
                    <p className="text-lg font-black text-black mt-1">TOTAL: {formatCurrency(Number(order.total))}</p>
                  )}
                </div>
              </div>

              {/* Table */}
              <table className="w-full border-collapse border border-black">
                <thead>
                  <tr className="bg-gray-100 border-b border-black">
                    <th className="text-center py-1 px-1 text-[10px] font-black uppercase border-r border-black w-[60px]">FOTO</th>
                    <th className="text-left py-1 px-1 text-[10px] font-black uppercase border-r border-black w-24">SKU / CÓDIGO</th>
                    <th className="text-left py-1 px-1 text-[10px] font-black uppercase border-r border-black">DESCRIÇÃO DO PRODUTO</th>
                    <th className="text-center py-1 px-1 text-[10px] font-black uppercase border-r border-black w-14">SOLIC.</th>
                    <th className="text-center py-1 px-1 text-[10px] font-black uppercase border-r border-black w-14">CONF.</th>
                    {items[0]?.delivered_quantity !== undefined && (
                      <th className="text-center py-1 px-1 text-[10px] font-black uppercase border-r border-black w-14">ENTR.</th>
                    )}
                    {showPrices && <th className="text-right py-1 px-1 text-[10px] font-black uppercase w-24">TOTAL</th>}
                  </tr>
                </thead>
                <tbody>
                  {pageItems.map((item: any) => {
                    const imageUrl = getProductImage(item);
                    return (
                      <tr key={item.id} className="border-b border-black print-item-row">
                        <td className="py-1 px-1 border-r border-black text-center">
                          <div className="w-[50px] h-[50px] mx-auto bg-white flex items-center justify-center">
                            {imageUrl ? (
                              <img src={imageUrl} alt="" className="max-w-full max-h-full object-contain" />
                            ) : (
                              <div className="text-[8px] text-gray-400 font-bold leading-tight">SEM<br/>FOTO</div>
                            )}
                          </div>
                        </td>
                        <td className="py-1 px-1 border-r border-black text-[10px] font-bold font-mono">{item.sku || "—"}</td>
                        <td className="py-1 px-1 border-r border-black text-[10px] leading-tight font-bold">{item.product_name}</td>
                        <td className="py-1 px-1 border-r border-black text-center text-[11px] font-bold">{item.quantity}</td>
                        <td className="py-1 px-1 border-r border-black text-center text-[11px] font-black bg-gray-50">{item.confirmed_quantity ?? "—"}</td>
                        {items[0]?.delivered_quantity !== undefined && (
                          <td className="py-1 px-1 border-r border-black text-center text-[11px] font-bold">{item.delivered_quantity || 0}</td>
                        )}
                        {showPrices && (
                          <td className="py-1 px-1 text-right text-[10px] font-bold">
                            {formatCurrency((item.confirmed_quantity ?? item.quantity) * Number(item.unit_price))}
                          </td>
                        )}
                      </tr>
                    );
                  })}
                  {/* Fill empty rows to maintain layout if needed, or just let it be */}
                </tbody>
              </table>

              {/* Footer on last page */}
              {pageIndex === pages.length - 1 && (
                <div className="mt-6">
                  <div className="grid grid-cols-1 gap-4">
                    <div className="border-2 border-black p-2">
                      <h3 className="text-[10px] font-black uppercase mb-1">OBSERVAÇÕES DO PEDIDO:</h3>
                      <div className="text-[10px] font-medium min-h-[40px]">
                        {order.customer_notes || order.atacadista_notes || order.internal_notes || "NENHUMA OBSERVAÇÃO REGISTRADA."}
                      </div>
                    </div>
                  </div>
                  
                  <div className="mt-8 flex justify-between items-end gap-10">
                    <div className="flex-1 border-t-2 border-black pt-1 text-center">
                      <p className="text-[10px] font-black uppercase tracking-tighter">ASSINATURA / CONFERÊNCIA DO OPERADOR</p>
                    </div>
                    {showPrices && (
                      <div className="w-64 space-y-1">
                        <div className="flex justify-between border-b border-black pb-0.5">
                          <span className="text-[10px] font-bold uppercase">SUBTOTAL:</span>
                          <span className="text-[10px] font-bold">{formatCurrency(Number(order.subtotal || 0))}</span>
                        </div>
                        <div className="flex justify-between bg-black text-white px-2 py-1">
                          <span className="text-[11px] font-black uppercase">TOTAL GERAL:</span>
                          <span className="text-[11px] font-black">{formatCurrency(Number(order.total || 0))}</span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
              
              {/* Page number */}
              <div className="absolute bottom-4 right-8 text-[10px] font-bold text-black">
                PÁGINA {pageIndex + 1} DE {pages.length}
              </div>
            </div>
          )) : (
            <div className="p-20 text-center font-bold">Nenhum item para exibir.</div>
          )}
        </div>
      </div>
    </div>
  );
  return createPortal(content, document.body);
};

export default OrderPrintView;
