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
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const supabaseAdmin = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  )

  const VENDAS_URL = Deno.env.get('VENDAS_ECOFERRO_URL') || 'https://vendas.ecoferro.com.br/api/public/stock-export'
  const VENDAS_TOKEN = Deno.env.get('VENDAS_ECOFERRO_TOKEN')

  try {
    let items = []
    let source = 'pull'

    // Check if this is a PUSH (data in body) or a PULL (fetch from VENDAS_URL)
    const body = await req.json().catch(() => null)
    if (body && (body.items || body.products)) {
      items = body.items || body.products
      source = 'push'
    } else {
      if (!VENDAS_TOKEN) {
        throw new Error('VENDAS_ECOFERRO_TOKEN not configured')
      }

      console.log(`[sync] Pulling data from ${VENDAS_URL}...`)
      const response = await fetch(VENDAS_URL, {
        headers: {
          'Authorization': `Bearer ${VENDAS_TOKEN}`,
          'Content-Type': 'application/json'
        }
      })

      if (!response.ok) {
        throw new Error(`External API returned status ${response.status}: ${await response.text()}`)
      }

      const data = await response.json()
      items = data.items || data.products || []
    }

    // Create log entry
    const { data: logEntry } = await supabaseAdmin
      .from('stock_sync_logs')
      .insert({
        status: 'running',
        source_url: source === 'pull' ? VENDAS_URL : 'push-from-vps'
      })
      .select()
      .single()

    let totalUpdated = 0
    let totalCreated = 0
    let totalErrors = 0

    for (const item of items) {
      try {
        const sku = item.sku || item.internal_code || item.SKU
        if (!sku) continue

        // Prepare product data from VPS format
        const productData = {
          name: item.name || item.title || item.título,
          price: item.price || item.preço || 0,
          original_price: item.original_price || null,
          stock: item.stock || item.estoque || 0,
          available_stock: item.stock || item.estoque || 0,
          sku: sku,
          internal_code: sku,
          external_id: item.id || item.external_id || null,
          ml_permalink: item.permalink || null,
          is_active: true, // If it comes from ml_stock, we assume it's active
          last_sync_at: new Date().toISOString(),
          sync_source: 'vendas-vps',
          raw_data: item
        }

        // Check if product exists by SKU
        const { data: existing } = await supabaseAdmin
          .from('products')
          .select('id, slug')
          .or(`sku.eq.${sku},internal_code.eq.${sku}`)
          .maybeSingle()

        if (existing) {
          // UPDATE
          const { error: updateError } = await supabaseAdmin
            .from('products')
            .update(productData)
            .eq('id', existing.id)

          if (updateError) throw updateError
          totalUpdated++
        } else {
          // INSERT
          const slug = slugify(productData.name || 'product') + '-' + Math.random().toString(36).substring(2, 7)
          const { error: insertError } = await supabaseAdmin
            .from('products')
            .insert({ ...productData, slug })

          if (insertError) throw insertError
          totalCreated++
        }

        // Handle images if provided
        if (item.images || item.imagens) {
          const images = Array.isArray(item.images || item.imagens) 
            ? (item.images || item.imagens) 
            : [(item.images || item.imagens)]
          
          // Clear old images or just add new ones? 
          // For simplicity, we'll just add the first one as primary if none exists
          const productId = existing?.id || (await supabaseAdmin.from('products').select('id').eq('sku', sku).single()).data?.id
          
          if (productId && images.length > 0) {
            const primaryImage = images[0]
            await supabaseAdmin.from('product_images').upsert({
              product_id: productId,
              url: primaryImage,
              is_primary: true
            }, { onConflict: 'product_id,url' })
          }
        }
      } catch (err) {
        console.error(`Error processing SKU ${item.sku}:`, err)
        totalErrors++
      }
    }

    // Update log entry with success
    await supabaseAdmin
      .from('stock_sync_logs')
      .update({
        status: 'success',
        finished_at: new Date().toISOString(),
        total_skus_received: items.length,
        total_skus_updated: totalUpdated,
        total_skus_not_found: totalErrors // Using this as error count for now
      })
      .eq('id', logEntry.id)

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
    console.error('Sync failed:', error)
    
    return new Response(JSON.stringify({ error: error.message }), { 
      status: 500, 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    })
  }
})
