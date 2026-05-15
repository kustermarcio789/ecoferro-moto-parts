import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

function slugify(text: string): string {
  return text.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

serve(async (req) => {
  console.log(`[SYNC] Request received: ${req.method}`)
  
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const supabaseServiceRole = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  const VENDAS_TOKEN = Deno.env.get('VENDAS_ECOFERRO_TOKEN')

  console.log(`[SYNC] Environment check:`)
  console.log(`- SUPABASE_URL: ${supabaseUrl ? 'OK' : 'MISSING'}`)
  console.log(`- SUPABASE_SERVICE_ROLE_KEY: ${supabaseServiceRole ? 'OK' : 'MISSING'}`)
  console.log(`- VENDAS_ECOFERRO_TOKEN: ${VENDAS_TOKEN ? 'OK' : 'MISSING'}`)

  if (!supabaseUrl || !supabaseServiceRole) {
    console.error("[SYNC] Missing Supabase configuration")
    return new Response(JSON.stringify({ error: "Supabase configuration missing" }), { 
      status: 500, 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    })
  }

  const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRole)

  try {
    let items = []
    let source = 'pull'

    const body = await req.json().catch(() => null)
    if (body && (body.items || body.products)) {
      items = body.items || body.products
      source = 'push'
      console.log(`[SYNC] Received PUSH with ${items.length} items`)
    } else {
      if (!VENDAS_TOKEN) {
        console.error("[SYNC] VENDAS_ECOFERRO_TOKEN not configured for PULL")
        // Log the failure
        await supabaseAdmin.from('stock_sync_logs').insert({
          status: 'failed',
          source_url: 'pull-vps',
          error_message: 'VENDAS_ECOFERRO_TOKEN not configured'
        })
        throw new Error('VENDAS_ECOFERRO_TOKEN not configured')
      }

      const VENDAS_URL = Deno.env.get('VENDAS_ECOFERRO_URL') || 'https://vendas.ecoferro.com.br/api/public/stock-export'
      console.log(`[SYNC] Pulling data from ${VENDAS_URL}...`)
      
      const response = await fetch(VENDAS_URL, {
        headers: {
          'Authorization': `Bearer ${VENDAS_TOKEN}`,
          'Content-Type': 'application/json'
        }
      })

      if (!response.ok) {
        const errorText = await response.text()
        console.error(`[SYNC] External API error: ${response.status} - ${errorText}`)
        await supabaseAdmin.from('stock_sync_logs').insert({
          status: 'failed',
          source_url: VENDAS_URL,
          error_message: `API error ${response.status}: ${errorText}`
        })
        throw new Error(`External API returned status ${response.status}: ${errorText}`)
      }

      const data = await response.json()
      items = Array.isArray(data.items) ? data.items : []
      console.log(`[SYNC] VPS payload: generated_at=${data.generated_at}, total=${data.total}, items=${items.length}`)
    }

    // Create log entry
    const { data: logEntry, error: logError } = await supabaseAdmin
      .from('stock_sync_logs')
      .insert({
        status: 'running',
        source_url: source === 'pull' ? (Deno.env.get('VENDAS_ECOFERRO_URL') || 'pull-from-vps') : 'push-from-vps'
      })
      .select()
      .single()

    if (logError) {
      console.error("[SYNC] Error creating log entry:", logError)
    }

    let totalUpdated = 0
    let totalCreated = 0
    let totalErrors = 0

    console.log(`[SYNC] Starting processing of ${items.length} items...`)

    for (const item of items) {
      try {
        const sku = item.sku || item.internal_code || item.SKU || item.item_id
        if (!sku) {
          console.warn("[SYNC] Item skipped: No SKU found", item)
          continue
        }

        const itemStatus = String(item.status || 'active').toLowerCase()
        const isActive = itemStatus === 'active'

        const productData = {
          name: item.name || item.title || item.título,
          price: Number(item.price || item.preço || 0),
          original_price: item.original_price ? Number(item.original_price) : null,
          stock: Number(item.stock ?? item.estoque ?? 0),
          available_stock: Number(item.stock ?? item.estoque ?? 0),
          sku: String(sku),
          internal_code: String(sku),
          external_id: item.id || item.external_id || null,
          ml_permalink: item.permalink || null,
          is_active: isActive,
          wholesale_only: false,
          visible_site: isActive,
          visible_wholesale: false,
          visible_marketplace: isActive,
          source: 'mercadolivre',
          last_sync_at: new Date().toISOString(),
          last_stock_sync_at: new Date().toISOString(),
          sync_source: 'vendas-vps',
          raw_data: item
        }

        // Check if product exists
        const { data: existing, error: fetchError } = await supabaseAdmin
          .from('products')
          .select('id')
          .or(`sku.eq.${sku},internal_code.eq.${sku}`)
          .maybeSingle()

        if (fetchError) {
          console.error(`[SYNC] Error checking existence for SKU ${sku}:`, fetchError)
          throw fetchError
        }

        if (existing) {
          const { error: updateError } = await supabaseAdmin
            .from('products')
            .update(productData)
            .eq('id', existing.id)

          if (updateError) {
            console.error(`[SYNC] Error updating SKU ${sku}:`, updateError)
            throw updateError
          }
          totalUpdated++
        } else {
          const slug = slugify(productData.name || 'product') + '-' + Math.random().toString(36).substring(2, 7)
          const { error: insertError } = await supabaseAdmin
            .from('products')
            .insert({ ...productData, slug })

          if (insertError) {
            console.error(`[SYNC] Error inserting SKU ${sku}:`, insertError)
            throw insertError
          }
          totalCreated++
        }

        // Handle images
        const images = item.images || item.imagens || item.pictures
        if (images) {
          const imageList = Array.isArray(images) ? images : [images]
          const productId = existing?.id || (await supabaseAdmin.from('products').select('id').eq('sku', sku).single()).data?.id
          
          if (productId && imageList.length > 0) {
            const primaryImage = typeof imageList[0] === 'string' ? imageList[0] : (imageList[0].url || imageList[0].secure_url)
            if (primaryImage) {
              await supabaseAdmin.from('product_images').upsert({
                product_id: productId,
                url: primaryImage,
                is_primary: true
              }, { onConflict: 'product_id,url' })
            }
          }
        }
      } catch (err) {
        console.error(`[SYNC] Error processing item ${item.sku}:`, err)
        totalErrors++
      }
    }

    console.log(`[SYNC] Completed: ${totalCreated} created, ${totalUpdated} updated, ${totalErrors} errors`)

    if (logEntry) {
      await supabaseAdmin
        .from('stock_sync_logs')
        .update({
          status: 'success',
          finished_at: new Date().toISOString(),
          total_skus_received: items.length,
          total_skus_updated: totalUpdated + totalCreated,
          total_skus_not_found: totalErrors
        })
        .eq('id', logEntry.id)
    }

    return new Response(JSON.stringify({ 
      success: true, 
      received: items.length, 
      created: totalCreated,
      updated: totalUpdated, 
      errors: totalErrors 
    }), { 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    })

  } catch (error) {
    console.error('[SYNC] Critical error:', error)
    return new Response(JSON.stringify({ error: error.message }), { 
      status: 500, 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    })
  }
})
