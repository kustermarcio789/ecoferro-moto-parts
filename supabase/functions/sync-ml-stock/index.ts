import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
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

  // Create log entry
  const { data: logEntry, error: logError } = await supabaseAdmin
    .from('stock_sync_logs')
    .insert({
      status: 'running',
      source_url: VENDAS_URL
    })
    .select()
    .single()

  if (logError) {
    console.error('Error creating log entry:', logError)
    return new Response(JSON.stringify({ error: 'Failed to create log' }), { status: 500 })
  }

  try {
    if (!VENDAS_TOKEN) {
      throw new Error('VENDAS_ECOFERRO_TOKEN not configured')
    }

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
    const items = data.items || []
    
    let totalUpdated = 0
    let totalNotFound = 0

    for (const item of items) {
      const { data: updateData, error: updateError } = await supabaseAdmin
        .from('products')
        .update({
          available_stock: item.stock,
          last_stock_sync_at: new Date().toISOString()
        })
        .or(`sku.eq.${item.sku},internal_code.eq.${item.sku}`)
        .select('id')

      if (updateError) {
        console.error(`Error updating SKU ${item.sku}:`, updateError)
      } else if (updateData && updateData.length > 0) {
        totalUpdated += updateData.length
      } else {
        totalNotFound++
      }
    }

    // Update log entry with success
    await supabaseAdmin
      .from('stock_sync_logs')
      .update({
        status: 'success',
        finished_at: new Date().toISOString(),
        total_received: items.length,
        total_updated: totalUpdated,
        total_not_found: totalNotFound
      })
      .eq('id', logEntry.id)

    return new Response(JSON.stringify({ 
      success: true, 
      received: items.length, 
      updated: totalUpdated, 
      notFound: totalNotFound 
    }), { 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    })

  } catch (error) {
    console.error('Sync failed:', error)
    
    await supabaseAdmin
      .from('stock_sync_logs')
      .update({
        status: 'failed',
        finished_at: new Date().toISOString(),
        error_message: error.message
      })
      .eq('id', logEntry.id)

    return new Response(JSON.stringify({ error: error.message }), { 
      status: 500, 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    })
  }
})
