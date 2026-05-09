import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Clock, User, ChevronRight } from "lucide-react";

interface AdminLog {
  id: string;
  action: string;
  details: any;
  created_at: string;
  user_id: string;
}

export const OrderHistory = ({ orderId }: { orderId: string }) => {
  const [logs, setLogs] = useState<AdminLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLogs = async () => {
      const { data } = await supabase
        .from("admin_logs")
        .select("*")
        .eq("entity_type", "order")
        .eq("entity_id", orderId)
        .order("created_at", { ascending: false })
        .limit(5);
      
      setLogs(data || []);
      setLoading(false);
    };

    fetchLogs();
  }, [orderId]);

  if (loading) return <div className="h-20 bg-muted animate-pulse rounded-lg" />;
  if (logs.length === 0) return null;

  const actionLabels: Record<string, string> = {
    'order.item_added': 'Produto adicionado',
    'order.item_removed': 'Produto removido',
    'order.item_updated': 'Item atualizado',
    'order.priority_changed': 'Prioridade alterada',
    'order.notes_edited': 'Notas editadas',
    'order.status_changed': 'Status alterado',
    'order.requested_delivery_date_changed': 'Prazo alterado'
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Clock className="h-4 w-4 text-muted-foreground" />
        <h3 className="font-display text-xs font-bold uppercase tracking-wider">Histórico de Alterações (Admin)</h3>
      </div>
      <div className="space-y-2">
        {logs.map((log) => (
          <div key={log.id} className="bg-muted/30 p-2 rounded border border-border text-xs font-body">
            <div className="flex justify-between items-start mb-1">
              <span className="font-bold text-foreground">
                {actionLabels[log.action] || log.action}
              </span>
              <span className="text-[10px] text-muted-foreground italic">
                {new Date(log.created_at).toLocaleString("pt-BR")}
              </span>
            </div>
            {log.details && (
              <div className="text-muted-foreground">
                {log.action === 'order.item_added' && `${log.details.product_name} (${log.details.quantity}x)`}
                {log.action === 'order.item_removed' && `${log.details.product_name}`}
                {log.action === 'order.priority_changed' && `De ${log.details.before} para ${log.details.after}`}
                {log.action === 'order.item_updated' && `${log.details.product_name}: Qtd ${log.details.before.quantity} -> ${log.details.after.quantity}`}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};
