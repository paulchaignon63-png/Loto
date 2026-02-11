# Supabase – Sync Combo Check

Pour activer la synchronisation multi-appareils, exécutez **une fois** le script SQL suivant dans votre projet Supabase :

1. Ouvrez [Supabase Dashboard](https://supabase.com/dashboard) → votre projet
2. Allez dans **SQL Editor** → **New query**
3. Copiez-collez le contenu de `migrations/001_combo_check_tables.sql`
4. Cliquez sur **Run**

Cela crée les tables `euromillions_history` et `personal_combos` ainsi que les règles de sécurité (RLS) pour que chaque utilisateur ne voie que ses données.
