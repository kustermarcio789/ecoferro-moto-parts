import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

function slugify(text: string): string {
  return text.toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceRole = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const VENDAS_TOKEN = "3W2k7bNT0bFYitDe7f6zKgHKYrcocTXRxZTkbt5rqpM="
    const VENDAS_URL = "https://vendas.ecoferro.com.br/api/public/products-export"

    const supabase = createClient(supabaseUrl, supabaseServiceRole)

    console.log("Fetching products from VPS...")
    const response = await fetch(VENDAS_URL, {
      headers: { 'Authorization': `Bearer ${VENDAS_TOKEN}` }
    })

    if (!response.ok) {
      throw new Error(`VPS error: ${response.status} ${await response.text()}`)
    }

    const data = await response.json()
    const items = data.items || []
    console.log(`Retrieved ${items.length} items from VPS.`)

    let updated = 0
    let created = 0
    let imagesSynced = 0
    
    // Process in batches
    const batchSize = 50
    for (let i = 0; i < items.length; i += batchSize) {
      const batch = items.slice(i, i + batchSize)
      console.log(`Processing batch ${Math.floor(i / batchSize) + 1} (${batch.length} items)...`)
      
      for (const item of batch) {
        const { item_id, title, price, thumbnail, permalink, status, stock } = item
        const isActive = status === 'active'

        // Check if product exists by ml_id
        const { data: existingProduct } = await supabase
          .from('products')
          .select('id, ml_id')
          .eq('ml_id', item_id)
          .maybeSingle()

        let productId: string

        if (existingProduct) {
          // UPDATE
          const { error: updateError } = await supabase
            .from('products')
            .update({
              price: Number(price),
              ml_permalink: permalink,
              is_active: isActive,
              visible_site: isActive,
              stock: Number(stock),
              available_stock: Number(stock),
              last_sync_at: new Date().toISOString()
            })
            .eq('id', existingProduct.id)
          
          if (updateError) console.error(`Error updating ${item_id}:`, updateError)
          productId = existingProduct.id
          updated++
        } else if (isActive) {
          // INSERT only if active
          const slug = `${item_id}-${slugify(title)}`
          const { data: newProduct, error: insertError } = await supabase
            .from('products')
            .insert({
              name: title,
              slug: slug,
              price: Number(price),
              ml_id: item_id,
              ml_permalink: permalink,
              is_active: true,
              visible_site: true,
              visible_marketplace: true,
              source: "mercadolivre",
              sync_source: "vendas-vps",
              stock: Number(stock),
              available_stock: Number(stock),
              last_sync_at: new Date().toISOString()
            })
            .select('id')
            .single()

          if (insertError) {
            console.error(`Error inserting ${item_id}:`, insertError)
            continue
          }
          productId = newProduct.id
          created++
        } else {
          // Not active and doesn't exist, skip
          continue
        }

        // Sync images if active and has thumbnail
        if (isActive && thumbnail && productId) {
          // In product_images table, column is sort_order not position (from DB check)
          const { error: imageError } = await supabase
            .from('product_images')
            .upsert({
              product_id: productId,
              url: thumbnail,
              sort_order: 0,
              is_primary: true
            }, { onConflict: 'product_id,url' })
          
          if (!imageError) imagesSynced++
          else console.error(`Error syncing image for ${item_id}:`, imageError)
        }
      }
    }

    return new Response(
      JSON.stringify({ success: true, updated, created, images: imagesSynced }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error("Critical error:", error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
