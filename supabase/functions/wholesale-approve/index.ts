// Aprova um cadastro atacadista, gera senha provisoria e cria/atualiza a conta auth.
// Apenas admins autenticados podem chamar.
//
// Body JSON:
//   { wholesale_customer_id: string, action?: "approve" | "resend_password",
//     delivery?: "manual" | "email" | "whatsapp" }
//
// Resposta:
//   { success: true, login_cnpj, login_email, provisional_password, user_id }
//
// O provisional_password é retornado uma única vez para o admin copiar e enviar
// ao atacadista. Não é persistido em texto plano.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function generatePassword(length = 12): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789abcdefghjkmnpqrstuvwxyz";
  const arr = new Uint32Array(length);
  crypto.getRandomValues(arr);
  let out = "";
  for (let i = 0; i < length; i++) out += chars[arr[i] % chars.length];
  return out;
}

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return jsonResponse({ error: "Method not allowed" }, 405);

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
    const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return jsonResponse({ error: "Missing Authorization header" }, 401);

    // client com o JWT do usuario para validar identidade/role
    const supabaseUser = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
      auth: { persistSession: false },
    });
    const { data: who } = await supabaseUser.auth.getUser();
    if (!who?.user) return jsonResponse({ error: "Not authenticated" }, 401);

    const { data: hasAdmin, error: roleErr } = await supabaseUser.rpc("has_role", {
      _user_id: who.user.id,
      _role: "admin",
    });
    if (roleErr) return jsonResponse({ error: roleErr.message }, 500);
    if (!hasAdmin) return jsonResponse({ error: "Not authorized (admin required)" }, 403);

    const supabaseAdmin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const body = await req.json().catch(() => ({}));
    const wholesaleId = body?.wholesale_customer_id as string | undefined;
    const action = (body?.action as string) || "approve";
    const delivery = (body?.delivery as string) || "manual";

    if (!wholesaleId) return jsonResponse({ error: "wholesale_customer_id is required" }, 400);

    const { data: wc, error: wcErr } = await supabaseAdmin
      .from("wholesale_customers")
      .select("*")
      .eq("id", wholesaleId)
      .single();
    if (wcErr || !wc) return jsonResponse({ error: "Wholesale customer not found" }, 404);
    if (!wc.email) return jsonResponse({ error: "Wholesale customer has no email" }, 400);

    const password = generatePassword(12);

    // Verifica se ja existe um auth.user com esse email
    let userId: string | null = null;
    const emailLower = String(wc.email).toLowerCase();

    // Paginar listUsers para encontrar o user (Supabase nao oferece busca direta por email)
    let page = 1;
    const perPage = 200;
    while (page <= 25) {
      const { data: list, error: listErr } = await supabaseAdmin.auth.admin.listUsers({
        page,
        perPage,
      });
      if (listErr) return jsonResponse({ error: `listUsers failed: ${listErr.message}` }, 500);
      const found = list.users.find((u) => (u.email ?? "").toLowerCase() === emailLower);
      if (found) {
        userId = found.id;
        break;
      }
      if (list.users.length < perPage) break;
      page++;
    }

    if (userId) {
      const { error: updErr } = await supabaseAdmin.auth.admin.updateUserById(userId, {
        password,
        email_confirm: true,
        user_metadata: {
          full_name: wc.contact_name,
          cnpj: wc.cnpj,
          razao_social: wc.razao_social,
          wholesale: true,
        },
      });
      if (updErr) return jsonResponse({ error: `updateUser failed: ${updErr.message}` }, 500);
    } else {
      const { data: created, error: createErr } = await supabaseAdmin.auth.admin.createUser({
        email: wc.email,
        password,
        email_confirm: true,
        user_metadata: {
          full_name: wc.contact_name,
          cnpj: wc.cnpj,
          razao_social: wc.razao_social,
          wholesale: true,
        },
      });
      if (createErr) return jsonResponse({ error: `createUser failed: ${createErr.message}` }, 500);
      userId = created.user.id;
    }

    // Aprova e linka
    const { error: linkErr } = await supabaseAdmin
      .from("wholesale_customers")
      .update({
        status: "approved",
        user_id: userId,
        approved_at: new Date().toISOString(),
        approved_by: who.user.id,
        access_credentials_sent_at: new Date().toISOString(),
        access_credentials_delivery: delivery,
      })
      .eq("id", wholesaleId);
    if (linkErr) return jsonResponse({ error: `link failed: ${linkErr.message}` }, 500);

    return jsonResponse({
      success: true,
      action,
      user_id: userId,
      login_cnpj: wc.cnpj,
      login_email: wc.email,
      provisional_password: password,
      contact_name: wc.contact_name,
      razao_social: wc.razao_social,
      message:
        "Atacadista aprovado. Copie ou compartilhe as credenciais com o cliente — a senha provisória só será exibida desta vez.",
    });
  } catch (err) {
    return jsonResponse({ error: err instanceof Error ? err.message : String(err) }, 500);
  }
});
