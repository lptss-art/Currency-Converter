# 💱 Currency Converter PWA

> Convertisseur de devises universel, minimaliste, ultra-rapide et conçu pour fonctionner à 100% hors-ligne. Optimisé pour être installé comme une application native (PWA / TWA).

---

## ✨ Fonctionnalités

* ⚡ **Ultra-fluide & Rapide :** Interface réactive conçue pour mobile avec pavé numérique intégré et retour haptique.
* 🔄 **Calcul bidirectionnel en direct :** Modifiez n'importe quelle devise, toutes les autres s'ajustent instantanément en temps réel.
* 📴 **100% Fonctionnel hors-ligne (Offline-First) :** Grâce au Service Worker et au stockage local (`localStorage`), l'application reste utilisable même en avion ou sans réseau avec les derniers taux récupérés.
* ↕️ **Réorganisation par glisser-déposer :** Réorganisez l'ordre de vos devises favorites facilement (alimenté par SortableJS).
* 🌍 **Support étendu des devises :** Plus de 160 monnaies mondiales avec recherche rapide par code ou nom de pays.
* 📱 **Expérience App Native (PWA) :** Installable sur l'écran d'accueil iOS & Android, sans barre d'adresse ni interface de navigateur.
* 🚀 **Prêt pour le Google Play Store :** Conforme aux critères PWA pour un empaquetage TWA (*Trusted Web Activity*) via Bubblewrap ou PWABuilder.

---

## 🛠️ Stack Technique

* **Front-end :** HTML5, Vanilla JavaScript (ES6+), Tailwind CSS
* **PWA & Offline :** Service Worker (Cache API), Web App Manifest
* **API Taux de Change :** [ExchangeRate-API (open.er-api.com)](https://open.er-api.com) — mise à jour quotidienne gratuite et sans clé API
* **Librairie externe :** [SortableJS](https://sortablejs.github.io/Sortable/) (glisser-déposer tactile fluide)

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

## 🛍️ Publication sur le Google Play Store (TWA)

Pour publier cette PWA sur le Google Play Store sans devoir réécrire l'application en Kotlin ou Flutter, vous pouvez utiliser la technologie **TWA (Trusted Web Activity)** :

1. **Option simple avec [PWABuilder](https://www.pwabuilder.com/) :**
   * Entrez l'URL de votre application déployée sur Cloudflare Pages.
   * Vérifiez que le score PWA est au vert (Manifest, Service Worker, HTTPS, Icônes).
   * Cliquez sur **« Package for Android »** pour générer un fichier `.aab` (Android App Bundle) prêt à être soumis sur la Google Play Console.
2. **Configuration du Digital Asset Links :**
   * Un fichier `assetlinks.json` doit être placé dans `/.well-known/assetlinks.json` sur Cloudflare pour prouver que vous êtes le propriétaire du domaine (cela supprime la barre d'adresse dans l'application Android).

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

## 🗺️ Roadmap & Optimisations prévues

- [ ] Compiler Tailwind CSS localement pour éliminer le script CDN de 3 Mo et garantir un chargement instantané.
- [ ] Rendu DOM optimisé pour le pavé numérique (éviter de recréer les éléments à chaque frappe).
- [ ] Prise en charge des touches physiques du clavier (ordinateur et tablettes).
- [ ] Gestion dynamique des décimales pour les devises à très faible valeur (ex. JPY, KRW).
- [ ] Ajout d'une touche `AC` (effacer tout d'un coup) et d'un bouton de rafraîchissement manuel des taux.
- [ ] Génération d'icônes adaptatives (`maskable`) pour Android.