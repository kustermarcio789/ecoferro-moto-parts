import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

async function getAccessToken(supabase: any): Promise<string | null> {
  const appId = Deno.env.get('MERCADOLIVRE_APP_ID');
  const secretKey = Deno.env.get('MERCADOLIVRE_SECRET_KEY');

  const { data: setting } = await supabase
    .from('site_settings').select('value').eq('key', 'ml_oauth_tokens').maybeSingle();

  if (!setting?.value?.access_token) return null;

  const tokens = setting.value;
  const obtainedAt = new Date(tokens.obtained_at).getTime();
  const expiresAt = obtainedAt + (tokens.expires_in || 21600) * 1000;

  if (Date.now() > expiresAt - 600000 && tokens.refresh_token && appId && secretKey) {
    console.log('Token expiring, refreshing...');
    const resp = await fetch('https://api.mercadolibre.com/oauth/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        grant_type: 'refresh_token',
        client_id: appId,
        client_secret: secretKey,
        refresh_token: tokens.refresh_token,
      }),
    });
    if (resp.ok) {
      const data = await resp.json();
      await supabase.from('site_settings').upsert({
        key: 'ml_oauth_tokens',
        value: {
          access_token: data.access_token,
          refresh_token: data.refresh_token,
          expires_in: data.expires_in,
          user_id: data.user_id || tokens.user_id,
          obtained_at: new Date().toISOString(),
        },
      }, { onConflict: 'key' });
      return data.access_token;
    }
  }

  return tokens.access_token;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, serviceRoleKey);

  try {
    const accessToken = await getAccessToken(supabase);
    if (!accessToken) {
      return new Response(
        JSON.stringify({ success: false, error: 'ML não conectado. Autorize em Configurações.' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get local products with ml_id
    const { data: localProducts, error: fetchErr } = await supabase
      .from('products').select('id, ml_id, price, stock, name').not('ml_id', 'is', null);

    if (fetchErr) throw fetchErr;
    if (!localProducts?.length) {
      return new Response(
        JSON.stringify({ success: true, message: 'Nenhum produto com ml_id para sincronizar', synced: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch ML items via multiget
    const mlIds = localProducts.map(p => p.ml_id).filter(Boolean);
    const mlMap = new Map<string, any>();

    for (let i = 0; i < mlIds.length; i += 20) {
      const batch = mlIds.slice(i, i + 20);
      const resp = await fetch(`https://api.mercadolibre.com/items?ids=${batch.join(',')}`, {
        headers: { 'Authorization': `Bearer ${accessToken}` },
      });
      if (resp.ok) {
        const items = await resp.json();
        for (const item of items) {
          if (item.code === 200 && item.body) mlMap.set(item.body.id, item.body);
        }
      }
    }

    console.log(`Fetched ${mlMap.size} ML items for ${localProducts.length} local products`);

    let synced = 0, skipped = 0;
    const changes: any[] = [];

    for (const local of localProducts) {
      const mlItem = mlMap.get(local.ml_id);
      if (!mlItem) { skipped++; continue; }

      const newPrice = mlItem.price;
      const newStock = mlItem.available_quantity || 0;
      const priceChanged = Math.abs(newPrice - local.price) > 0.01;
      const stockChanged = newStock !== local.stock;

      if (!priceChanged && !stockChanged) { skipped++; continue; }

      const updatePayload: any = {};
      if (priceChanged) updatePayload.price = newPrice;
      if (stockChanged) updatePayload.stock = newStock;

      const { error } = await supabase.from('products').update(updatePayload).eq('id', local.id);
      if (error) { console.error(`Update failed ${local.id}:`, error.message); continue; }

      if (stockChanged) {
        const diff = newStock - local.stock;
        await supabase.from('inventory_movements').insert({
          product_id: local.id,
          type: diff > 0 ? 'entry' : 'exit',
          quantity: Math.abs(diff),
          previous_stock: local.stock,
          new_stock: newStock,
          reason: 'Sincronização automática Mercado Livre',
        });
      }

      changes.push({
        product_id: local.id, name: local.name,
        price: priceChanged ? { from: local.price, to: newPrice } : null,
        stock: stockChanged ? { from: local.stock, to: newStock } : null,
      });
      synced++;
    }

    await supabase.from('site_settings').upsert({
      key: 'ml_sync_last_run',
      value: { timestamp: new Date().toISOString(), synced, skipped, total_ml: mlMap.size, total_local: localProducts.length, changes },
    }, { onConflict: 'key' });

    return new Response(
      JSON.stringify({ success: true, synced, skipped, changes }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Sync error:', error);
    return new Response(
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
