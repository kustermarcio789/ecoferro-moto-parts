const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const accessToken = Deno.env.get('MERCADOLIVRE_ACCESS_TOKEN');
    if (!accessToken) {
      return new Response(
        JSON.stringify({ success: false, error: 'MERCADOLIVRE_ACCESS_TOKEN não configurado' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { seller_id, offset = 0, limit = 50 } = await req.json().catch(() => ({}));

    // Step 1: If no seller_id, try to get it from the token (me endpoint)
    let sid = seller_id;
    if (!sid) {
      const meResp = await fetch('https://api.mercadolibre.com/users/me', {
        headers: { 'Authorization': `Bearer ${accessToken}` },
      });
      if (!meResp.ok) {
        const errText = await meResp.text();
        console.error('ML /users/me error:', errText);
        return new Response(
          JSON.stringify({ success: false, error: `Falha ao identificar vendedor (${meResp.status}). Verifique o Access Token.` }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      const meData = await meResp.json();
      sid = meData.id;
      console.log('Seller ID:', sid, 'Nickname:', meData.nickname);
    }

    // Step 2: Fetch items from seller
    const mlUrl = `https://api.mercadolibre.com/users/${sid}/items/search?offset=${offset}&limit=${limit}`;
    console.log('Fetching:', mlUrl);

    const searchResp = await fetch(mlUrl, {
      headers: { 'Authorization': `Bearer ${accessToken}` },
    });

    if (!searchResp.ok) {
      const errText = await searchResp.text();
      console.error('ML search error:', errText);
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

    // Step 3: Fetch item details in batches of 20
    const products: any[] = [];
    for (let i = 0; i < itemIds.length; i += 20) {
      const batch = itemIds.slice(i, i + 20);
      const idsParam = batch.join(',');
      const detailResp = await fetch(`https://api.mercadolibre.com/items?ids=${idsParam}`, {
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
      JSON.stringify({
        success: true,
        products,
        paging: {
          total: paging.total || 0,
          offset: paging.offset || 0,
          limit: paging.limit || 50,
        },
      }),
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
