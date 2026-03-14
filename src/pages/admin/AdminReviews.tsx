import { useEffect, useState } from "react";
import { Star, Check, X, Trash2, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import AdminLayout from "@/components/admin/AdminLayout";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const AdminReviews = () => {
  const [reviews, setReviews] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const { toast } = useToast();

  const fetchReviews = async () => {
    setLoading(true);
    let query = supabase.from("reviews").select("*, products(name)").order("created_at", { ascending: false });
    if (filter === "pending") query = query.eq("is_approved", false);
    else if (filter === "approved") query = query.eq("is_approved", true);
    else if (filter === "featured") query = query.eq("is_featured", true);
    const { data } = await query;
    setReviews(data || []);
    setLoading(false);
  };

  useEffect(() => { fetchReviews(); }, [filter]);

  const approve = async (id: string) => {
    await supabase.from("reviews").update({ is_approved: true }).eq("id", id);
    toast({ title: "Avaliação aprovada" }); fetchReviews();
  };

  const reject = async (id: string) => {
    await supabase.from("reviews").update({ is_approved: false }).eq("id", id);
    toast({ title: "Avaliação reprovada" }); fetchReviews();
  };

  const toggleFeatured = async (id: string, current: boolean) => {
    await supabase.from("reviews").update({ is_featured: !current }).eq("id", id);
    toast({ title: current ? "Removido do destaque" : "Destacado na home" }); fetchReviews();
  };

  const deleteReview = async (id: string) => {
    if (!confirm("Excluir esta avaliação?")) return;
    await supabase.from("reviews").delete().eq("id", id);
    toast({ title: "Avaliação excluída" }); fetchReviews();
  };

  const renderStars = (rating: number) => (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map(s => (
        <Star key={s} className={`h-3.5 w-3.5 ${s <= rating ? "fill-amber-400 text-amber-400" : "text-muted-foreground/30"}`} />
      ))}
    </div>
  );

  return (
    <AdminLayout title="Avaliações">
      <div className="flex items-center justify-between mb-6">
        <p className="text-sm text-muted-foreground font-body">{reviews.length} avaliação(ões)</p>
        <Select value={filter} onValueChange={setFilter}>
          <SelectTrigger className="w-40 text-xs font-body"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas</SelectItem>
            <SelectItem value="pending">Pendentes</SelectItem>
            <SelectItem value="approved">Aprovadas</SelectItem>
            <SelectItem value="featured">Destacadas</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="bg-card rounded-xl border border-border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Produto</TableHead>
              <TableHead>Cliente</TableHead>
              <TableHead>Nota</TableHead>
              <TableHead>Comentário</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={6} className="text-center py-8"><div className="animate-spin h-6 w-6 border-2 border-primary border-t-transparent rounded-full mx-auto" /></TableCell></TableRow>
            ) : reviews.length === 0 ? (
              <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground font-body">Nenhuma avaliação encontrada</TableCell></TableRow>
            ) : reviews.map(r => (
              <TableRow key={r.id}>
                <TableCell className="font-body text-sm max-w-[150px] truncate">{(r.products as any)?.name || "—"}</TableCell>
                <TableCell className="font-body text-sm">{r.customer_name}</TableCell>
                <TableCell>{renderStars(r.rating)}</TableCell>
                <TableCell className="font-body text-sm max-w-[200px]">
                  {r.title && <p className="font-semibold text-xs">{r.title}</p>}
                  <p className="text-xs text-muted-foreground truncate">{r.comment || "—"}</p>
                </TableCell>
                <TableCell>
                  <div className="flex gap-1">
                    <Badge variant={r.is_approved ? "default" : "secondary"}>{r.is_approved ? "Aprovada" : "Pendente"}</Badge>
                    {r.is_featured && <Badge variant="outline" className="text-amber-500 border-amber-500">Destaque</Badge>}
                  </div>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-1">
                    {!r.is_approved && (
                      <Button variant="ghost" size="icon" onClick={() => approve(r.id)} title="Aprovar">
                        <Check className="h-4 w-4 text-primary" />
                      </Button>
                    )}
                    {r.is_approved && (
                      <Button variant="ghost" size="icon" onClick={() => reject(r.id)} title="Reprovar">
                        <X className="h-4 w-4 text-amber-500" />
                      </Button>
                    )}
                    <Button variant="ghost" size="icon" onClick={() => toggleFeatured(r.id, r.is_featured)} title="Destacar">
                      <Star className={`h-4 w-4 ${r.is_featured ? "fill-amber-400 text-amber-400" : "text-muted-foreground"}`} />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => deleteReview(r.id)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </AdminLayout>
  );
};

export default AdminReviews;
