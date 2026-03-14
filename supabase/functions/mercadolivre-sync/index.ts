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
  const accessToken = Deno.env.get('MERCADOLIVRE_ACCESS_TOKEN');
  const supabase = createClient(supabaseUrl, serviceRoleKey);

  if (!accessToken) {
    return new Response(
      JSON.stringify({ success: false, error: 'MERCADOLIVRE_ACCESS_TOKEN não configurado' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  try {
    // 1. Get seller ID from token
    const meResp = await fetch('https://api.mercadolibre.com/users/me', {
      headers: { 'Authorization': `Bearer ${accessToken}` },
    });
    if (!meResp.ok) {
      const errText = await meResp.text();
      console.error('ML /users/me error:', errText);
      return new Response(
        JSON.stringify({ success: false, error: `Token inválido ou expirado (${meResp.status})` }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    const meData = await meResp.json();
    const sellerId = meData.id;
    console.log('Syncing seller:', sellerId, meData.nickname);

    // 2. Get all local products that have ml_id
    const { data: localProducts, error: fetchErr } = await supabase
      .from('products')
      .select('id, ml_id, price, stock, name')
      .not('ml_id', 'is', null);

    if (fetchErr) throw fetchErr;
    if (!localProducts?.length) {
      return new Response(
        JSON.stringify({ success: true, message: 'No products with ml_id to sync', synced: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 3. Fetch ML items using multiget
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
          if (item.code === 200 && item.body) {
            mlMap.set(item.body.id, item.body);
          }
        }
      }
    }

    console.log(`Fetched ${mlMap.size} items from ML for ${localProducts.length} local products`);

    // 4. Sync each local product
    let synced = 0;
    let skipped = 0;
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

      const { error: updateErr } = await supabase
        .from('products')
        .update(updatePayload)
        .eq('id', local.id);

      if (updateErr) {
        console.error(`Failed to update ${local.id}:`, updateErr.message);
        continue;
      }

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
        product_id: local.id,
        name: local.name,
        price: priceChanged ? { from: local.price, to: newPrice } : null,
        stock: stockChanged ? { from: local.stock, to: newStock } : null,
      });
      synced++;
    }

    // 5. Log sync result
    await supabase.from('site_settings').upsert({
      key: 'ml_sync_last_run',
      value: {
        timestamp: new Date().toISOString(),
        synced,
        skipped,
        total_ml: mlMap.size,
        total_local: localProducts.length,
        changes,
      },
    }, { onConflict: 'key' });

    console.log(`Sync complete: ${synced} updated, ${skipped} skipped`);

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
