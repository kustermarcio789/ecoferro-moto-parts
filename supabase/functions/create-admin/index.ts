import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

Deno.serve(async () => {
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // Create user
  const { data: userData, error: userError } = await supabase.auth.admin.createUser({
    email: "admin.ecoferro@ecoferro.com.br",
    password: "Ecoferro@2024",
    email_confirm: true,
    user_metadata: { full_name: "Admin EcoFerro" },
  });

  if (userError) return new Response(JSON.stringify({ error: userError.message }), { status: 400 });

  // Assign admin role
  const { error: roleError } = await supabase.from("user_roles").insert({
    user_id: userData.user.id,
    role: "admin",
  });

  return new Response(JSON.stringify({ 
    success: true, 
    user_id: userData.user.id,
    role_error: roleError?.message 
  }));
});
