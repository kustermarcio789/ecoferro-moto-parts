import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const appId = Deno.env.get('MERCADOLIVRE_APP_ID');
  const secretKey = Deno.env.get('MERCADOLIVRE_SECRET_KEY');
  const supabase = createClient(supabaseUrl, serviceRoleKey);

  if (!appId || !secretKey) {
    return new Response(
      JSON.stringify({ success: false, error: 'MERCADOLIVRE_APP_ID ou MERCADOLIVRE_SECRET_KEY não configurados' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  try {
    const { action, code, redirect_uri } = await req.json();

    if (action === 'exchange_code') {
      // Exchange authorization code for access token
      if (!code || !redirect_uri) {
        return new Response(
          JSON.stringify({ success: false, error: 'code e redirect_uri são obrigatórios' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      console.log('Exchanging code for token...');
      const tokenResp = await fetch('https://api.mercadolibre.com/oauth/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          grant_type: 'authorization_code',
          client_id: appId,
          client_secret: secretKey,
          code,
          redirect_uri,
        }),
      });

      const tokenData = await tokenResp.json();
      if (!tokenResp.ok) {
        console.error('Token exchange error:', JSON.stringify(tokenData));
        return new Response(
          JSON.stringify({ success: false, error: tokenData.message || 'Falha ao trocar código por token' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Store tokens in site_settings
      await supabase.from('site_settings').upsert({
        key: 'ml_oauth_tokens',
        value: {
          access_token: tokenData.access_token,
          refresh_token: tokenData.refresh_token,
          expires_in: tokenData.expires_in,
          user_id: tokenData.user_id,
          obtained_at: new Date().toISOString(),
        },
      }, { onConflict: 'key' });

      console.log('Tokens stored. ML User ID:', tokenData.user_id);

      return new Response(
        JSON.stringify({
          success: true,
          user_id: tokenData.user_id,
          expires_in: tokenData.expires_in,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );

    } else if (action === 'refresh') {
      // Refresh the access token
      const { data: setting } = await supabase
        .from('site_settings')
        .select('value')
        .eq('key', 'ml_oauth_tokens')
        .maybeSingle();

      if (!setting?.value?.refresh_token) {
        return new Response(
          JSON.stringify({ success: false, error: 'Nenhum refresh_token encontrado. Autorize novamente.' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const tokens = setting.value as any;
      console.log('Refreshing token...');

      const refreshResp = await fetch('https://api.mercadolibre.com/oauth/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          grant_type: 'refresh_token',
          client_id: appId,
          client_secret: secretKey,
          refresh_token: tokens.refresh_token,
        }),
      });

      const refreshData = await refreshResp.json();
      if (!refreshResp.ok) {
        console.error('Token refresh error:', JSON.stringify(refreshData));
        return new Response(
          JSON.stringify({ success: false, error: refreshData.message || 'Falha ao renovar token' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Update stored tokens
      await supabase.from('site_settings').upsert({
        key: 'ml_oauth_tokens',
        value: {
          access_token: refreshData.access_token,
          refresh_token: refreshData.refresh_token,
          expires_in: refreshData.expires_in,
          user_id: refreshData.user_id || tokens.user_id,
          obtained_at: new Date().toISOString(),
        },
      }, { onConflict: 'key' });

      console.log('Token refreshed successfully');

      return new Response(
        JSON.stringify({ success: true, expires_in: refreshData.expires_in }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );

    } else if (action === 'status') {
      // Check current token status
      const { data: setting } = await supabase
        .from('site_settings')
        .select('value')
        .eq('key', 'ml_oauth_tokens')
        .maybeSingle();

      if (!setting?.value?.access_token) {
        return new Response(
          JSON.stringify({ success: true, connected: false }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const tokens = setting.value as any;
      const obtainedAt = new Date(tokens.obtained_at).getTime();
      const expiresAt = obtainedAt + (tokens.expires_in || 21600) * 1000;
      const isExpired = Date.now() > expiresAt;

      return new Response(
        JSON.stringify({
          success: true,
          connected: true,
          user_id: tokens.user_id,
          is_expired: isExpired,
          obtained_at: tokens.obtained_at,
          expires_at: new Date(expiresAt).toISOString(),
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );

    } else {
      return new Response(
        JSON.stringify({ success: false, error: 'Action inválida. Use: exchange_code, refresh, status' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
  } catch (error) {
    console.error('OAuth error:', error);
    return new Response(
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
