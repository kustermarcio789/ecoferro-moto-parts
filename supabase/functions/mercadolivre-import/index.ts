import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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
    const { nickname = 'ECOFERRO2059', offset = 0, limit = 50 } = await req.json();

    // Search ML public API by seller nickname
    const mlUrl = `https://api.mercadolibre.com/sites/MLB/search?nickname=${encodeURIComponent(nickname)}&offset=${offset}&limit=${limit}`;
    console.log('Fetching ML:', mlUrl);

    const mlResponse = await fetch(mlUrl);
    if (!mlResponse.ok) {
      const errText = await mlResponse.text();
      console.error('ML API error:', errText);
      return new Response(
        JSON.stringify({ success: false, error: `ML API returned ${mlResponse.status}` }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const mlData = await mlResponse.json();
    const results = mlData.results || [];
    const paging = mlData.paging || {};

    // Map ML items to a simplified format
    const products = results.map((item: any) => ({
      ml_id: item.id,
      name: item.title,
      price: item.price,
      original_price: item.original_price,
      slug: slugify(item.title),
      ml_permalink: item.permalink,
      image: item.thumbnail?.replace('http://', 'https://'),
      images: (item.thumbnail ? [item.thumbnail.replace('http://', 'https://')] : []),
      stock: item.available_quantity || 0,
      condition: item.condition,
      category_ml: item.category_id,
      shipping_free: item.shipping?.free_shipping || false,
    }));

    return new Response(
      JSON.stringify({
        success: true,
        products,
        paging: {
          total: paging.total || 0,
          offset: paging.offset || 0,
          limit: paging.limit || 50,
        },
        seller: mlData.seller || null,
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
