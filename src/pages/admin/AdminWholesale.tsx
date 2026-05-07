import { useEffect, useState } from "react";
import { CheckCircle2, Copy, KeyRound, Loader2, MessageSquare, RefreshCcw, Send, UserCheck, UserX } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import AdminLayout from "@/components/admin/AdminLayout";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

const statusLabels: Record<string, { label: string; color: string }> = {
  pending: { label: "Pendente", color: "bg-amber-100 text-amber-700" },
  analyzing: { label: "Em Análise", color: "bg-blue-100 text-blue-700" },
  approved: { label: "Aprovado", color: "bg-primary/10 text-primary" },
  rejected: { label: "Rejeitado", color: "bg-destructive/10 text-destructive" },
  blocked: { label: "Bloqueado", color: "bg-muted text-muted-foreground" },
};

interface WholesaleRow {
  id: string;
  status: string;
  razao_social: string;
  nome_fantasia: string | null;
  cnpj: string;
  contact_name: string;
  email: string;
  phone: string;
  customer_type: string;
  user_id: string | null;
  approved_at: string | null;
  access_credentials_sent_at: string | null;
  created_at: string;
}

interface CredentialPayload {
  login_cnpj: string;
  login_email: string;
  provisional_password: string;
  contact_name: string;
  razao_social: string;
  whatsapp?: string | null;
}

const formatPhoneToWhatsapp = (raw: string | null | undefined) => {
  if (!raw) return null;
  const digits = raw.replace(/[^0-9]/g, "");
  if (digits.length < 10) return null;
  return digits.startsWith("55") ? digits : `55${digits}`;
};

const buildWhatsAppMessage = (c: CredentialPayload) => {
  return [
    `Olá ${c.contact_name}, seu cadastro atacadista da *${c.razao_social}* foi aprovado! 🎉`,
    "",
    "Acesse seu portal em: https://www.ecoferro.com.br/atacado/login",
    "",
    `Usuário (CNPJ): *${c.login_cnpj}*`,
    `Senha provisória: *${c.provisional_password}*`,
    "",
    "Recomendamos trocar a senha após o primeiro acesso.",
  ].join("\n");
};

const AdminWholesale = () => {
  const { toast } = useToast();
  const [customers, setCustomers] = useState<WholesaleRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("all");
  const [actingId, setActingId] = useState<string | null>(null);
  const [credentialsModal, setCredentialsModal] = useState<CredentialPayload | null>(null);

  const fetchCustomers = async () => {
    setLoading(true);
    let query = supabase
      .from("wholesale_customers")
      .select("*")
      .order("created_at", { ascending: false });
    if (statusFilter && statusFilter !== "all") query = query.eq("status", statusFilter);
    const { data } = await query;
    setCustomers((data as unknown as WholesaleRow[]) ?? []);
    setLoading(false);
  };

  useEffect(() => {
    fetchCustomers();
  }, [statusFilter]);

  const updateSimpleStatus = async (id: string, status: string) => {
    setActingId(id);
    try {
      const { error } = await supabase.from("wholesale_customers").update({ status }).eq("id", id);
      if (error) throw error;
      setCustomers((prev) => prev.map((c) => (c.id === id ? { ...c, status } : c)));
      toast({ title: "Status atualizado" });
    } catch (err: any) {
      toast({ title: "Erro", description: err?.message, variant: "destructive" });
    } finally {
      setActingId(null);
    }
  };

  const approveAndCreate = async (row: WholesaleRow, action: "approve" | "resend_password") => {
    setActingId(row.id);
    try {
      const { data, error } = await supabase.functions.invoke("smart-service", {
        body: { wholesale_customer_id: row.id, action, delivery: "manual" },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      setCustomers((prev) =>
        prev.map((c) =>
          c.id === row.id
            ? { ...c, status: "approved", user_id: data.user_id, approved_at: new Date().toISOString() }
            : c,
        ),
      );

      setCredentialsModal({
        login_cnpj: data.login_cnpj,
        login_email: data.login_email,
        provisional_password: data.provisional_password,
        contact_name: data.contact_name,
        razao_social: data.razao_social,
        whatsapp: row.phone,
      });

      toast({
        title: action === "resend_password" ? "Nova senha gerada" : "Atacadista aprovado",
        description: "Copie e envie as credenciais ao cliente.",
      });
    } catch (err: any) {
      toast({ title: "Erro", description: err?.message ?? "Falha ao aprovar.", variant: "destructive" });
    } finally {
      setActingId(null);
    }
  };

  const copyCredentials = async (c: CredentialPayload) => {
    const text = buildWhatsAppMessage(c);
    try {
      await navigator.clipboard.writeText(text);
      toast({ title: "Mensagem copiada!", description: "Cole no WhatsApp ou e-mail do cliente." });
    } catch {
      toast({ title: "Não foi possível copiar", variant: "destructive" });
    }
  };

  const openWhatsApp = (c: CredentialPayload) => {
    const phone = formatPhoneToWhatsapp(c.whatsapp);
    const text = encodeURIComponent(buildWhatsAppMessage(c));
    const url = phone ? `https://wa.me/${phone}?text=${text}` : `https://wa.me/?text=${text}`;
    window.open(url, "_blank", "noopener,noreferrer");
  };

  return (
    <AdminLayout title="Clientes Atacado">
      <div className="flex items-center gap-4 mb-6">
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40 text-xs font-body">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            {Object.entries(statusLabels).map(([k, v]) => (
              <SelectItem key={k} value={k}>
                {v.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button variant="ghost" size="sm" onClick={fetchCustomers}>
          <RefreshCcw className="h-3.5 w-3.5 mr-1" /> Atualizar
        </Button>
      </div>

      <div className="bg-card rounded-xl border border-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="text-left p-4 font-display uppercase tracking-wider text-xs text-muted-foreground">Empresa</th>
                <th className="text-left p-4 font-display uppercase tracking-wider text-xs text-muted-foreground">CNPJ</th>
                <th className="text-left p-4 font-display uppercase tracking-wider text-xs text-muted-foreground">Contato</th>
                <th className="text-center p-4 font-display uppercase tracking-wider text-xs text-muted-foreground">Status</th>
                <th className="text-right p-4 font-display uppercase tracking-wider text-xs text-muted-foreground">Acesso</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <tr key={i}>
                    <td colSpan={5} className="p-4">
                      <div className="h-10 bg-muted rounded animate-pulse" />
                    </td>
                  </tr>
                ))
              ) : customers.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-12 text-center text-muted-foreground font-body">
                    Nenhum cadastro atacadista
                  </td>
                </tr>
              ) : (
                customers.map((c) => {
                  const st = statusLabels[c.status] ?? { label: c.status, color: "bg-muted text-muted-foreground" };
                  const isApproved = c.status === "approved" && !!c.user_id;
                  return (
                    <tr key={c.id} className="border-b border-border hover:bg-muted/30 transition-colors">
                      <td className="p-4 font-body font-medium text-foreground align-top">
                        {c.razao_social}
                        <br />
                        <span className="text-xs text-muted-foreground">{c.nome_fantasia || ""}</span>
                      </td>
                      <td className="p-4 font-body text-xs text-muted-foreground align-top">{c.cnpj}</td>
                      <td className="p-4 font-body text-xs text-muted-foreground align-top">
                        {c.contact_name}
                        <br />
                        {c.email}
                        <br />
                        {c.phone}
                      </td>
                      <td className="p-4 text-center align-top">
                        <Select value={c.status} onValueChange={(v) => updateSimpleStatus(c.id, v)}>
                          <SelectTrigger className={`w-32 text-xs font-body ${st.color} border-0`}>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {Object.entries(statusLabels).map(([k, v]) => (
                              <SelectItem key={k} value={k}>
                                {v.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        {c.access_credentials_sent_at && (
                          <div className="text-[10px] text-muted-foreground font-body mt-1">
                            credenciais enviadas{" "}
                            {new Date(c.access_credentials_sent_at).toLocaleDateString("pt-BR")}
                          </div>
                        )}
                      </td>
                      <td className="p-4 text-right align-top">
                        {isApproved ? (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => approveAndCreate(c, "resend_password")}
                            disabled={actingId === c.id}
                          >
                            {actingId === c.id ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <KeyRound className="h-3.5 w-3.5 mr-1" />
                            )}
                            Nova senha
                          </Button>
                        ) : (
                          <Button
                            size="sm"
                            onClick={() => approveAndCreate(c, "approve")}
                            disabled={actingId === c.id}
                          >
                            {actingId === c.id ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <UserCheck className="h-3.5 w-3.5 mr-1" />
                            )}
                            Aprovar e gerar acesso
                          </Button>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Dialog open={!!credentialsModal} onOpenChange={(o) => !o && setCredentialsModal(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display uppercase tracking-wider text-base flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-primary" /> Credenciais geradas
            </DialogTitle>
            <DialogDescription className="font-body text-sm">
              A senha provisória só será exibida uma vez. Copie e envie ao cliente agora.
            </DialogDescription>
          </DialogHeader>

          {credentialsModal && (
            <div className="space-y-3">
              <CredField label="Empresa" value={credentialsModal.razao_social} />
              <CredField label="Login (CNPJ)" value={credentialsModal.login_cnpj} mono />
              <CredField label="E-mail vinculado" value={credentialsModal.login_email} mono />
              <CredField label="Senha provisória" value={credentialsModal.provisional_password} mono highlight />

              <div className="bg-muted/40 border border-border rounded-lg p-3 text-xs text-muted-foreground font-body">
                <strong className="text-foreground">Mensagem pronta:</strong>
                <pre className="whitespace-pre-wrap mt-1 text-foreground/80">
                  {buildWhatsAppMessage(credentialsModal)}
                </pre>
              </div>
            </div>
          )}

          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button
              variant="outline"
              onClick={() => credentialsModal && copyCredentials(credentialsModal)}
              className="w-full sm:w-auto"
            >
              <Copy className="h-3.5 w-3.5 mr-1" /> Copiar mensagem
            </Button>
            <Button
              onClick={() => credentialsModal && openWhatsApp(credentialsModal)}
              className="w-full sm:w-auto"
            >
              <MessageSquare className="h-3.5 w-3.5 mr-1" /> Enviar pelo WhatsApp
            </Button>
            <Button
              variant="ghost"
              onClick={() => setCredentialsModal(null)}
              className="w-full sm:w-auto"
            >
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
};

const CredField = ({
  label,
  value,
  mono,
  highlight,
}: {
  label: string;
  value: string;
  mono?: boolean;
  highlight?: boolean;
}) => {
  const { toast } = useToast();
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      toast({ title: `${label} copiado` });
    } catch {}
  };
  return (
    <div className={`rounded-lg border ${highlight ? "border-primary/30 bg-primary/5" : "border-border bg-muted/30"} p-3`}>
      <div className="flex items-center justify-between">
        <div className="text-[10px] font-display uppercase tracking-wider text-muted-foreground">{label}</div>
        <button onClick={copy} className="text-xs text-primary hover:underline flex items-center gap-1">
          <Copy className="h-3 w-3" /> copiar
        </button>
      </div>
      <div className={`text-sm ${mono ? "font-mono" : "font-body"} ${highlight ? "font-bold text-foreground" : "text-foreground"}`}>
        {value}
      </div>
    </div>
  );
};

export default AdminWholesale;
