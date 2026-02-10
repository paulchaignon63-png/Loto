# 🎰 EuroMillions Analyzer

Application web locale pour analyser vos combinaisons de loto EuroMillions avec des statistiques, détection de patterns et générateur intelligent.

## 🚀 Installation

1. Installer les dépendances :
```bash
npm install
```

2. Lancer le serveur de développement :
```bash
npm run dev
```

3. Ouvrir votre navigateur à l'adresse indiquée (généralement `http://localhost:5173`)

## 📥 Import des données historiques

### Source officielle

Les données historiques EuroMillions sont disponibles sur le site de la FDJ :
- **URL** : https://www.fdj.fr/jeux-de-tirage/euromillions-my-million/historique
- **Format** : Fichiers ZIP contenant des CSV

### Périodes disponibles

- **Février 2020 à janvier 2026** (102 ko) - Le plus récent
- Mars 2019 à février 2020 (17 ko)
- Septembre 2016 à février 2019 (41 ko)
- Février 2014 à septembre 2016 (35 ko)
- Mai 2011 à février 2014 (35 ko)
- Février 2004 à mai 2011 (43 ko)

### Format CSV attendu

L'application accepte automatiquement plusieurs formats :

**Format 1 - Simple (virgules)** :
```
date, num1, num2, num3, num4, num5, star1, star2
01/01/2024, 5, 12, 23, 34, 45, 3, 8
```

**Format 2 - Simple (point-virgule)** :
```
date; num1; num2; num3; num4; num5; star1; star2
01/01/2024; 5; 12; 23; 34; 45; 3; 8
```

**Format 3 - FDJ officiel** :
Les fichiers téléchargés depuis le site FDJ sont automatiquement reconnus. Le format contient beaucoup de colonnes, mais l'application extrait automatiquement :
- La date de tirage
- Les 5 boules (boule_1 à boule_5)
- Les 2 étoiles (etoile_1 et etoile_2)

**Format 4 - Texte libre** :
```
Date: 01/01/2024 - Nums: 5 12 23 34 45 - Stars: 3 8
```

### Étapes d'import

1. Téléchargez un fichier ZIP depuis le site FDJ
2. Extrayez le fichier CSV du ZIP
3. Dans l'application, allez dans l'onglet **"Import"**
4. Cliquez sur **"Choisir un fichier CSV"**
5. Sélectionnez votre fichier CSV
6. Les données seront automatiquement importées et sauvegardées dans votre navigateur

### Mise à jour des données (pas d'API automatique)

**La FDJ ne propose pas d'API publique** pour récupérer les tirages en automatique.

**Recommandation – mise à jour manuelle :**
- Périodiquement (chaque semaine ou chaque mois), retéléchargez le fichier de la **période la plus récente** sur [fdj.fr/euromillions/historique](https://www.fdj.fr/jeux-de-tirage/euromillions-my-million/historique). Ce ZIP est **mis à jour par la FDJ** avec les nouveaux tirages.
- Extrayez le CSV et réimportez-le dans l'app. Les nouveaux tirages seront **ajoutés**, les doublons supprimés. Pas besoin de réimporter tout l'historique.
- Alternative payante : services type [Apify Euromillions Results API](https://apify.com/ayf/euromillions-results) (nécessiterait un petit backend pour appeler l'API).

## ✨ Fonctionnalités

### 1. 📥 Import des données
- Import de fichiers CSV avec historique des tirages
- Validation automatique des données
- Stockage local dans le navigateur (localStorage)

### 2. ✅ Vérification de combinaison
- Vérifie si votre combo exacte est déjà sortie
- Compte les occurrences avec 4/5 et 3/5 numéros en commun
- Détecte les patterns (suites, pairs/impairs, etc.)
- Calcule un score de "banalité" (0-100)
- Visualisation sur grille 1-50

### 3. 📊 Statistiques
- Numéros les plus/moins fréquents (chauds/froids)
- Fréquences des étoiles
- Graphiques de distribution
- Informations générales sur les tirages

### 4. 🎲 Générateur intelligent
- Génère des combinaisons optimisées
- Évite les patterns populaires
- Équilibre la distribution des numéros
- Affiche le score de banalité

### 5. 📝 Historique personnel
- Sauvegarde vos combinaisons jouées
- Vérifie automatiquement vos combos contre l'historique
- Export en CSV
- Suppression de combos

## 🎨 Design

- Style **neumorphism/glassmorphism** moderne
- **Dark mode** disponible
- **Responsive** (mobile et desktop)
- Couleurs : palette bleu/violet (style loterie)

## 📁 Structure du projet

```
Loto/
├── index.html              # Point d'entrée HTML
├── src/
│   ├── main.js            # Point d'entrée JavaScript
│   ├── utils/
│   │   ├── dataParser.js  # Parser CSV
│   │   ├── analyzer.js    # Analyses statistiques
│   │   ├── generator.js   # Générateur de combos
│   │   └── storage.js     # Gestion localStorage
│   ├── components/
│   │   ├── checker.js     # Vérification de combo
│   │   ├── stats.js       # Graphiques et stats
│   │   └── history.js     # Historique personnel
│   └── styles/
│       └── main.css       # Styles principaux
├── package.json
├── vite.config.js
└── README.md
```

## 🛠️ Technologies

- **HTML5 / CSS3 / JavaScript** (vanilla, ES6+)
- **Vite** (serveur de développement)
- **localStorage** (stockage des données)

## 📝 Notes importantes

⚠️ **Rappel** : Cette application est purement à des fins de divertissement. Les jeux de hasard ne peuvent pas être prédits, et cette application n'améliore pas réellement vos chances de gagner. Jouez responsablement !

## 🚀 Build pour production

Pour créer une version de production :

```bash
npm run build
```

Les fichiers seront générés dans le dossier `dist/`. Le build génère aussi les icônes PWA (192×192 et 512×512) à partir de `public/vite.svg`.

## 📱 PWA (Progressive Web App)

L’application est une PWA : elle peut être **installée sur l’écran d’accueil** (Android, iOS, desktop) et **fonctionne hors ligne** après une première visite.

- **Manifest** : nom, icônes, thème (généré par `vite-plugin-pwa`).
- **Service worker** : mise en cache des assets pour le mode hors ligne.
- **Données** : tout est stocké en local (localStorage), donc aucune requête réseau nécessaire une fois l’app chargée.

## 🌐 Déploiement sur Vercel

1. **Build local** (vérification) :
   ```bash
   npm run build
   ```

2. **Déploiement avec Vercel CLI** :
   - Installer le CLI : `npm i -g vercel`
   - À la racine du projet : `vercel`
   - Première fois : connexion (navigateur), choix du scope, création ou liaison du projet.
   - À la fin, Vercel affiche une URL du type `https://votre-projet.vercel.app`.

3. **Déploiement continu** (optionnel) : sur [vercel.com](https://vercel.com), “Add New Project” → importer le dépôt Git. Chaque push sur la branche de production (ex. `main`) déclenche un build et met à jour l’URL.

La configuration est dans `vercel.json` (build : `npm run build`, sortie : `dist`). Vercel sert le site en HTTPS, requis pour l’installation PWA.

## 📄 Licence

Projet personnel - Usage libre
