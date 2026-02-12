# Variables d'environnement Vercel – Checklist

À vérifier dans **Vercel** → ton projet → **Settings** → **Environment Variables**.

| Variable | Obligatoire | Valeur locale (.env) | Utilisée pour |
|----------|-------------|----------------------|---------------|
| `VITE_SUPABASE_URL` | Recommandé | `https://uteqsqiqzcsuztnjmoto.supabase.co` | URL Supabase (fallback si non hardcodé) |
| `VITE_SUPABASE_ANON_KEY` | Recommandé | Voir `.env` ou `src/utils/supabase.js` | Clé anon Supabase |
| `VITE_LOTTERY_API_KEY` | Oui | `4c2a13352c867def5d0ec93cfed257c60dc9647215a1a8623cea16fe9015a8f4` | API Lottery Results (calendrier, dernier tirage) |
| `VITE_LOTTERY_API_URL` | Oui | `https://alpha-api.lotteryresultsapi.com` | URL API Lottery (version alpha) |
| `VITE_ADMIN_EMAIL` | Oui | `paulchaignon@hotmail.fr` | Affichage du bouton Admin |
| `VITE_ADMIN_IMPORT_SECRET` | Oui | `AdminImport2026` | Import CSV admin via Edge Function |

## Notes

- **Supabase** : `src/utils/supabase.js` contient des valeurs en dur ; les variables VITE_ servent surtout de fallback. Pour un déploiement propre, mieux vaut les définir dans Vercel.
- **Clé anon** : si tu utilises celle de `supabase.js`, c’est la clé JWT complète (format `eyJ...`), pas `sb_publishable_...`.

## Vérification manuelle

1. Va sur [vercel.com](https://vercel.com) → ton projet
2. **Settings** → **Environment Variables**
3. Coche les variables ci-dessus et ajoute celles qui manquent
4. Fais un **Redeploy** pour appliquer les changements
