import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const TAG = 'eu_euromillions';
const BASE_URL = Deno.env.get('LOTTERY_API_URL') || 'https://api.lotteryresultsapi.com';

function parseDraw(apiDraw: { date: string; numbers: Array<{ special: boolean; value: number }> } | null) {
  if (!apiDraw?.date || !Array.isArray(apiDraw.numbers)) return null;
  const numbers = apiDraw.numbers.filter((n) => !n.special).map((n) => n.value).sort((a, b) => a - b);
  const stars = apiDraw.numbers.filter((n) => n.special).map((n) => n.value).sort((a, b) => a - b);
  if (numbers.length !== 5 || stars.length !== 2) return null;
  const [y, m, d] = apiDraw.date.split('-');
  const dateDDMMYYYY = `${d}/${m}/${y}`;
  return { date: dateDDMMYYYY, numbers, stars };
}

Deno.serve(async (req) => {
  const cronSecret = Deno.env.get('CRON_SECRET');
  if (cronSecret) {
    const provided = req.headers.get('x-cron-secret');
    if (provided !== cronSecret) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
    }
  }

  const apiKey = Deno.env.get('LOTTERY_API_KEY');
  if (!apiKey) {
    return new Response(JSON.stringify({ error: 'LOTTERY_API_KEY not configured' }), { status: 500 });
  }

  try {
    const res = await fetch(`${BASE_URL}/lottery/${TAG}/draw/latest/numbers`, {
      headers: { 'X-Api-Token': apiKey },
    });
    if (!res.ok) {
      return new Response(
        JSON.stringify({ error: `Lottery API error: ${res.status}` }),
        { status: 502 }
      );
    }
    const data = await res.json();
    const draw = parseDraw(data);
    if (!draw) {
      return new Response(JSON.stringify({ error: 'Invalid API response' }), { status: 502 });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { error } = await supabase.from('euromillions_draws').upsert(
      { date: draw.date, numbers: draw.numbers, stars: draw.stars },
      { onConflict: 'date,numbers', ignoreDuplicates: true }
    );

    if (error) {
      return new Response(JSON.stringify({ error: error.message }), { status: 500 });
    }

    return new Response(JSON.stringify({ ok: true, date: draw.date }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (e) {
    return new Response(
      JSON.stringify({ error: (e as Error).message }),
      { status: 500 }
    );
  }
});
