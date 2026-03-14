import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

function slugify(text: string): string {
  return text.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

async function getAccessToken(supabase: any): Promise<string | null> {
  const appId = Deno.env.get('MERCADOLIVRE_APP_ID');
  const secretKey = Deno.env.get('MERCADOLIVRE_SECRET_KEY');

  const { data: setting } = await supabase
    .from('site_settings').select('value').eq('key', 'ml_oauth_tokens').maybeSingle();

  if (!setting?.value?.access_token) return null;

  const tokens = setting.value;
  const obtainedAt = new Date(tokens.obtained_at).getTime();
  const expiresAt = obtainedAt + (tokens.expires_in || 21600) * 1000;

  // If token expires in less than 10 min, refresh it
  if (Date.now() > expiresAt - 600000 && tokens.refresh_token && appId && secretKey) {
    console.log('Token expiring soon, refreshing...');
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
      console.log('Token refreshed successfully');
      return data.access_token;
    } else {
      console.error('Token refresh failed:', await resp.text());
    }
  }

  return tokens.access_token;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const accessToken = await getAccessToken(supabase);
    if (!accessToken) {
      return new Response(
        JSON.stringify({ success: false, error: 'Mercado Livre não conectado. Autorize sua conta em Configurações.' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { offset = 0, limit = 50 } = await req.json().catch(() => ({}));

    // Get seller ID
    const meResp = await fetch('https://api.mercadolibre.com/users/me', {
      headers: { 'Authorization': `Bearer ${accessToken}` },
    });
    if (!meResp.ok) {
      const err = await meResp.text();
      console.error('ML /users/me error:', err);
      return new Response(
        JSON.stringify({ success: false, error: `Token inválido (${meResp.status}). Re-autorize em Configurações.` }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    const meData = await meResp.json();
    const sellerId = meData.id;
    console.log('Seller:', sellerId, meData.nickname);

    // Fetch item IDs
    const searchResp = await fetch(
      `https://api.mercadolibre.com/users/${sellerId}/items/search?offset=${offset}&limit=${limit}`,
      { headers: { 'Authorization': `Bearer ${accessToken}` } }
    );
    if (!searchResp.ok) {
      return new Response(
        JSON.stringify({ success: false, error: `ML API retornou ${searchResp.status}` }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    const searchData = await searchResp.json();
    const itemIds = searchData.results || [];
    const paging = searchData.paging || {};

    if (!itemIds.length) {
      return new Response(
        JSON.stringify({ success: true, products: [], paging: { total: paging.total || 0, offset, limit } }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch item details in batches of 20
    const products: any[] = [];
    for (let i = 0; i < itemIds.length; i += 20) {
      const batch = itemIds.slice(i, i + 20);
      const detailResp = await fetch(`https://api.mercadolibre.com/items?ids=${batch.join(',')}`, {
        headers: { 'Authorization': `Bearer ${accessToken}` },
      });
      if (detailResp.ok) {
        const details = await detailResp.json();
        for (const item of details) {
          if (item.code !== 200 || !item.body) continue;
          const b = item.body;
          products.push({
            ml_id: b.id,
            name: b.title,
            price: b.price,
            original_price: b.original_price,
            slug: slugify(b.title),
            ml_permalink: b.permalink,
            image: b.thumbnail?.replace('http://', 'https://'),
            images: (b.pictures || []).map((p: any) => p.secure_url || p.url),
            stock: b.available_quantity || 0,
            condition: b.condition,
            category_ml: b.category_id,
            shipping_free: b.shipping?.free_shipping || false,
          });
        }
      }
    }

    return new Response(
      JSON.stringify({ success: true, products, paging: { total: paging.total || 0, offset: paging.offset || 0, limit: paging.limit || 50 } }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
