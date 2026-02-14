/**
 * Client Lottery Results API (alpha / v1)
 * EuroMillions : dernier tirage, prochains tirages (calendrier calculé si API ne les fournit pas)
 */

const TAG = 'eu_euromillions';
const BASE_URL = import.meta.env.VITE_LOTTERY_API_URL || 'https://api.lotteryresultsapi.com';

function getHeaders() {
  const token = import.meta.env.VITE_LOTTERY_API_KEY;
  if (!token) return null;
  return { 'X-Api-Token': token };
}

/**
 * Convertit la réponse API { date: YYYY-MM-DD, numbers: [{special, value}] } en format interne
 */
function parseDraw(apiDraw) {
  if (!apiDraw?.date || !Array.isArray(apiDraw.numbers)) return null;
  const numbers = apiDraw.numbers.filter(n => !n.special).map(n => n.value).sort((a, b) => a - b);
  const stars = apiDraw.numbers.filter(n => n.special).map(n => n.value).sort((a, b) => a - b);
  if (numbers.length !== 5 || stars.length !== 2) return null;
  const [y, m, d] = apiDraw.date.split('-');
  const dateDDMMYYYY = `${d}/${m}/${y}`;
  return { date: dateDDMMYYYY, numbers, stars };
}

/**
 * Récupère le dernier tirage EuroMillions
 * @returns {{ date, numbers, stars } | null}
 */
export async function fetchLatestDraw() {
  const headers = getHeaders();
  if (!headers) return null;
  try {
    const res = await fetch(`${BASE_URL}/lottery/${TAG}/draw/latest/numbers`, { headers });
    if (!res.ok) {
      // #region agent log
      fetch('http://127.0.0.1:7243/ingest/0493409d-9f66-4ebc-8b03-f6f6058ca129',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'lotteryApi.js:fetchLatestDraw',message:'API latest draw non-OK',data:{apiStatus:res.status},timestamp:Date.now(),hypothesisId:'H2'})}).catch(()=>{});
      // #endregion
      return null;
    }
    const data = await res.json();
    const draw = parseDraw(data);
    // #region agent log
    fetch('http://127.0.0.1:7243/ingest/0493409d-9f66-4ebc-8b03-f6f6058ca129',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'lotteryApi.js:fetchLatestDraw',message:'API latest draw',data:{apiDate:data?.date,parsedDate:draw?.date ?? null},timestamp:Date.now(),hypothesisId:'H2'})}).catch(()=>{});
    // #endregion
    return draw;
  } catch (e) {
    console.warn('[LotteryAPI] fetchLatestDraw:', e?.message || e);
    return null;
  }
}

/**
 * Récupère une liste de tirages (pour compléter l'historique)
 * @param {number} limit
 * @returns {Array<{ date, numbers, stars }>}
 */
export async function fetchDraws(limit = 50) {
  const headers = getHeaders();
  if (!headers) return [];
  try {
    const res = await fetch(`${BASE_URL}/lottery/${TAG}/draw/numbers?limit=${limit}&sort_number=desc`, { headers });
    if (!res.ok) return [];
    const data = await res.json();
    const list = Array.isArray(data) ? data : [data];
    return list.map(parseDraw).filter(Boolean);
  } catch (e) {
    console.warn('[LotteryAPI] fetchDraws:', e?.message || e);
    return [];
  }
}

/**
 * Calcule les prochaines dates de tirage (mardi et vendredi)
 * @param {number} count
 * @returns {Array<{ date: string, label: string }>}
 */
export function getNextDrawDates(count = 8) {
  const now = new Date();
  const result = [];
  const days = [2, 5]; // mardi=2, vendredi=5
  const labels = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];
  let d = new Date(now);
  const seen = new Set();

  while (result.length < count) {
    const dayOfWeek = d.getDay();
    if (days.includes(dayOfWeek)) {
      const key = d.toISOString().slice(0, 10);
      if (!seen.has(key)) {
        seen.add(key);
        const dd = String(d.getDate()).padStart(2, '0');
        const mm = String(d.getMonth() + 1).padStart(2, '0');
        const yyyy = d.getFullYear();
        const label = `${labels[dayOfWeek]} ${dd}/${mm}/${yyyy}`;
        result.push({ date: `${dd}/${mm}/${yyyy}`, label });
      }
    }
    d.setDate(d.getDate() + 1);
  }
  return result;
}

/**
 * Retourne le prochain tirage (pour la notif home)
 */
export function getNextDraw() {
  const dates = getNextDrawDates(1);
  return dates[0] || null;
}
