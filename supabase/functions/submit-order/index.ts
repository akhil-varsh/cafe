import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'npm:@supabase/supabase-js@2.95.0';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'apikey, authorization, content-type, x-client-info',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } });
}

Deno.serve(async (request: Request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (request.method !== 'POST') return json({ message: 'Method not allowed' }, 405);
  const length = Number(request.headers.get('content-length') || '0');
  if (length > 16_384) return json({ message: 'Order is too large' }, 413);

  try {
    const body = await request.json();
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    if (!supabaseUrl || !serviceKey) return json({ message: 'Ordering is temporarily unavailable' }, 503);

    const database = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
    const { data, error } = await database.rpc('submit_order_internal', {
      p_cafe_slug: body?.cafe_slug,
      p_table_label: body?.table_label,
      p_guest_name: body?.guest_name,
      p_notes: body?.notes,
      p_items: body?.items,
      p_request_token: body?.request_token,
    });
    if (error) {
      console.error('submit-order rejected', { code: error.code, details: error.details });
      return json({ message: error.message || 'The cafe could not receive your order.' }, 400);
    }
    return json(Array.isArray(data) ? data[0] : data, 201);
  } catch (error) {
    console.error('submit-order failed', error);
    return json({ message: 'The cafe could not receive your order.' }, 400);
  }
});
