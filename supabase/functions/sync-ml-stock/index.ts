import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  )

  const sourceUrl = Deno.env.get('VENDAS_ECOFERRO_URL')
  const token = Deno.env.get('VENDAS_ECOFERRO_TOKEN')

  if (!sourceUrl || !token) {
    return new Response(
      JSON.stringify({ error: 'Missing VENDAS_ECOFERRO_URL or VENDAS_ECOFERRO_TOKEN' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  // 4. Create log entry
  const { data: logEntry, error: logError } = await supabase
    .from('stock_sync_logs')
    .insert({ source_url: sourceUrl, status: 'running' })
    .select()
    .single()

  if (logError) {
    console.error('Error creating log:', logError)
  }

  try {
    // 2 & 3. Fetch stock from external system
    const response = await fetch(sourceUrl, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    })

    if (!response.ok) {
      throw new Error(`External API returned ${response.status}: ${await response.text()}`)
    }

    const stockData = await response.json() // Expected: [{ sku: string, stock: number }, ...]
    
    let updatedCount = 0
    let notFoundCount = 0

    // 5. Update products
    for (const item of stockData) {
      const { data, error } = await supabase
        .from('products')
        .update({ 
          available_stock: item.stock,
          last_stock_sync_at: new Date().toISOString()
        })
        .or(`sku.eq.${item.sku},internal_code.eq.${item.sku}`)
        .select('id')

      if (error) {
        console.error(`Error updating SKU ${item.sku}:`, error)
        continue
      }

      if (data && data.length > 0) {
        updatedCount++
      } else {
        notFoundCount++
      }
    }

    // 6. Update log success
    if (logEntry) {
      await supabase
        .from('stock_sync_logs')
        .update({
          status: 'success',
          total_skus_received: stockData.length,
          total_skus_updated: updatedCount,
          total_skus_not_found: notFoundCount,
          finished_at: new Date().toISOString()
        })
        .eq('id', logEntry.id)
    }

    return new Response(
      JSON.stringify({ 
        message: 'Sync completed', 
        received: stockData.length, 
        updated: updatedCount, 
        notFound: notFoundCount 
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (err) {
    console.error('Sync failed:', err)
    
    // 7. Update log failure
    if (logEntry) {
      await supabase
        .from('stock_sync_logs')
        .update({
          status: 'failed',
          error_message: err instanceof Error ? err.message : String(err),
          finished_at: new Date().toISOString()
        })
        .eq('id', logEntry.id)
    }

    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : String(err) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
