# 💱 Simple Currency Converter

*Convertisseur devises simple* en français.

> Convertisseur de devises universel, minimaliste, ultra-rapide et conçu pour fonctionner à 100% hors-ligne. Optimisé pour être installé comme une application native (PWA / TWA).

---

## ✨ Fonctionnalités

* ⚡ **Rapide et fluide :** pavé numérique intégré avec retour haptique, ouverture instantanée avec les derniers taux enregistrés.
* 🔄 **Conversion dans tous les sens :** touchez n'importe quelle devise pour la saisir, toutes les autres s'ajustent en direct. Changer de ligne ne modifie aucune valeur : le montant exact est conservé.
* 🔢 **Saisie au format local :** séparateurs de milliers et virgule décimale en français (`1 234,5`), point en anglais (`1,234.5`).
* 📴 **100 % hors-ligne :** Service Worker + `localStorage`, l'app reste utilisable en avion avec les derniers taux.
* 🕒 **Taux à jour sans ralentir l'app :** mise à jour en arrière-plan au plus toutes les 3 h (à l'ouverture, au retour sur l'app ou quand le réseau revient). La date affichée est celle de publication des taux.
* ↕️ **Réorganisation par appui long :** la ligne suit le doigt et les autres s'écartent en direct (glisser-déposer maison, sans librairie).
* ➕ **Ajout via la recherche :** devises récentes et populaires en tête, puis la liste complète.
* ↩️ **Annuler une suppression :** un bandeau « Annuler » apparaît quelques secondes après avoir retiré une devise.
* 🌍 **Plus de 160 devises** avec recherche par code, nom ou pays (français et anglais, sans accents).
* 🌙 **Mode sombre** automatique selon le réglage du téléphone.
* 🌐 **Interface en français ou en anglais** selon la langue de l'appareil.
* 📱 **Expérience app native (PWA) :** installable sur l'écran d'accueil iOS et Android, sans barre d'adresse.
* 🚀 **Prêt pour le Google Play Store :** conforme aux critères PWA pour un empaquetage TWA (*Trusted Web Activity*) via Bubblewrap ou PWABuilder.

---

## 🛠️ Stack technique

* **Front-end :** HTML5, JavaScript (ES6+) sans framework, CSS fait main (variables CSS, mode clair/sombre). Aucune dépendance externe, aucun build.
* **PWA & hors-ligne :** Service Worker (Cache API), Web App Manifest
* **API des taux de change :** [ExchangeRate-API (open.er-api.com)](https://open.er-api.com) — gratuite, sans clé API, mise à jour quotidienne

### Structure des fichiers

| Fichier | Rôle |
| --- | --- |
| `index.html` | Structure de la page (en-tête, liste, clavier, sélecteur de devise) |
| `style.css` | Tous les styles ; couleurs centralisées dans les variables `:root` (clair) et `@media (prefers-color-scheme: dark)` (sombre) |
| `app.js` | Logique : traductions, conversion, clavier, sélecteur, glisser-déposer, mise à jour des taux |
| `sw.js` | Service Worker (cache hors-ligne). **Incrémenter `CACHE_NAME` à chaque déploiement** pour que l'app installée récupère la nouvelle version |
| `manifest.json` | Nom, couleurs et icônes de l'app installée |
| `logo.svg` | Logo (source vectorielle, 5 Ko) affiché dans l'en-tête et dans l'onglet du navigateur |
| `icon-*.png`, `apple-touch-icon.png` | Icônes de l'app installée (dont la version `maskable` pour Android), générées depuis `logo.svg` |
| `privacy.html` | Politique de confidentialité (FR + EN), exigée par le Play Store |
| `.well-known/assetlinks.json` | Liaison site ↔ app Android (à compléter, voir `PUBLICATION.md`) |
| `store/` | Visuels de la fiche Play Store : icône 512, bannière 1024×500, captures d'écran FR et EN |
| `STORE_LISTING.md` | Textes de la fiche Play Store (titre, descriptions FR + EN) |
| `PUBLICATION.md` | Guide pas à pas pour publier l'app sur le Google Play Store |

---

## 🚀 Déploiement sur Cloudflare Pages

Le projet est composé de fichiers statiques légers, ce qui le rend idéal pour un hébergement gratuit, sécurisé (HTTPS automatique requis pour les PWA) et ultra-rapide sur le réseau CDN mondial de Cloudflare.

### Méthode 1 : Via GitHub (Recommandé)
1. Créez un dépôt sur GitHub et poussez votre code :
   ```bash
   git add .
   git commit -m "Initial commit"
   git push origin main
   ```
2. Rendez-vous sur votre tableau de bord **Cloudflare** > **Workers & Pages** > **Create application** > **Pages** > **Connect to Git**.
3. Sélectionnez votre dépôt.
4. Dans **Build settings** :
   * **Framework preset :** None
   * **Build command :** *(laisser vide)*
   * **Build output directory :** `.` *(ou laisser vide pour la racine)*
5. Cliquez sur **Save and Deploy**. Votre PWA est déployée en quelques secondes avec HTTPS inclus !

### Méthode 2 : Direct Upload (CLI Wrangler)
```bash
npx wrangler pages deploy . --project-name currency-converter
```

---

## 📲 Comment installer l'application sur smartphone

### Sur iOS (Safari / iPhone)
1. Ouvrez l'URL de votre site Cloudflare Pages dans Safari.
2. Appuyez sur l'icône de partage (carré avec une flèche vers le haut).
3. Faites défiler et sélectionnez **« Sur l'écran d'accueil »** (*Add to Home Screen*).
4. L'application apparaît comme une vraie application sans cadre de navigateur.

### Sur Android (Chrome)
1. Ouvrez l'URL dans Chrome.
2. Une bannière ou une invitation **« Installer l'application »** apparaît automatiquement.
3. Sinon, ouvrez le menu (⋮ en haut à droite) et appuyez sur **« Installer l'application »** ou **« Ajouter à l'écran d'accueil »**.

---

## 🛍️ Publication sur le Google Play Store

Tout est prêt (visuels, textes, politique de confidentialité). Suivez le guide pas à pas : **[PUBLICATION.md](PUBLICATION.md)**.

---

## 💻 Développement local

Aucun outil de build complexe n'est requis. Lancez simplement un serveur local (nécessaire pour tester le Service Worker) :

```bash
# Avec Python
python -m http.server 8000

# Ou avec Node.js
npx serve .
```

Puis ouvrez votre navigateur sur `http://localhost:8000`.

---

## 🗺️ Pistes d'amélioration

- [ ] Couleur de la barre d'état iOS adaptée au mode sombre en mode installé.
- [ ] Nom sous l'icône traduit en français dans l'app Android (réglage du projet Android généré).
