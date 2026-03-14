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
  const supabase = createClient(supabaseUrl, serviceRoleKey);

  try {
    const { nickname = 'ECOFERRO2059' } = await req.json().catch(() => ({}));

    // 1. Get all local products that have ml_id set
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

    // 2. Fetch all ML products (paginate up to 200)
    const mlItems: any[] = [];
    let offset = 0;
    const limit = 50;
    let totalMl = Infinity;

    while (offset < totalMl && offset < 200) {
      const mlUrl = `https://api.mercadolibre.com/sites/MLB/search?nickname=${encodeURIComponent(nickname)}&offset=${offset}&limit=${limit}`;
      const resp = await fetch(mlUrl);
      if (!resp.ok) {
        console.error(`ML API error at offset ${offset}: ${resp.status}`);
        break;
      }
      const data = await resp.json();
      totalMl = data.paging?.total || 0;
      mlItems.push(...(data.results || []));
      offset += limit;
    }

    console.log(`Fetched ${mlItems.length} items from ML (total: ${totalMl})`);

    // 3. Build ML lookup map by ml_id
    const mlMap = new Map<string, any>();
    for (const item of mlItems) {
      mlMap.set(item.id, item);
    }

    // 4. Sync each local product
    let synced = 0;
    let skipped = 0;
    const changes: any[] = [];

    for (const local of localProducts) {
      const mlItem = mlMap.get(local.ml_id);
      if (!mlItem) {
        skipped++;
        continue;
      }

      const newPrice = mlItem.price;
      const newStock = mlItem.available_quantity || 0;
      const priceChanged = Math.abs(newPrice - local.price) > 0.01;
      const stockChanged = newStock !== local.stock;

      if (!priceChanged && !stockChanged) {
        skipped++;
        continue;
      }

      const updatePayload: any = {};
      if (priceChanged) updatePayload.price = newPrice;
      if (stockChanged) updatePayload.stock = newStock;

      const { error: updateErr } = await supabase
        .from('products')
        .update(updatePayload)
        .eq('id', local.id);

      if (updateErr) {
        console.error(`Failed to update product ${local.id}:`, updateErr.message);
        continue;
      }

      // Record inventory movement if stock changed
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

    // 5. Log the sync result in site_settings
    await supabase.from('site_settings').upsert({
      key: 'ml_sync_last_run',
      value: {
        timestamp: new Date().toISOString(),
        synced,
        skipped,
        total_ml: mlItems.length,
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
