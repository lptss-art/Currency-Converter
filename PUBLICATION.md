# Publier l'app sur le Google Play Store

Guide pas à pas pour transformer le site en application Android (TWA) et la publier.
Tout ce qui est nécessaire est dans ce dépôt ; il reste seulement à remplir ce qui est marqué **À FAIRE**.

---

## 0. Avant de commencer — À FAIRE

- [ ] Remplacer `CONTACT_EMAIL` (2 endroits) dans `privacy.html` par une adresse de contact.
- [ ] Pousser le code et vérifier que le site est en ligne (Cloudflare Pages), par exemple `https://VOTRE-SITE.pages.dev`.
- [ ] Vérifier que ces adresses s'ouvrent :
  - `https://VOTRE-SITE.pages.dev/` (l'app)
  - `https://VOTRE-SITE.pages.dev/privacy.html` (politique de confidentialité, demandée par Google)

## 1. Ce qui est déjà prêt dans le dépôt

| Élément demandé par Google | Fichier |
| --- | --- |
| Icône 512 × 512 | `store/play-store-icon-512.png` |
| Bannière 1024 × 500 (« Feature graphic ») | `store/feature-graphic-fr.png`, `store/feature-graphic-en.png` |
| Captures d'écran téléphone (4 par langue) | `store/screenshot-fr-*.png`, `store/screenshot-en-*.png` |
| Titre, description courte, description complète (FR + EN) | `STORE_LISTING.md` |
| Politique de confidentialité | `privacy.html` (en ligne une fois le site déployé) |
| Fichier de liaison site ↔ app Android | `.well-known/assetlinks.json` (à compléter à l'étape 4) |
| Icônes de l'app installée | `icon-192x192.png`, `icon-512x512.png`, `icon-maskable-512x512.png` |

## 2. Créer le compte développeur

1. Aller sur la [Google Play Console](https://play.google.com/console) et créer un compte développeur (frais uniques de 25 $).
2. Compte **personnel** : Google demande une vérification d'identité, puis un **test fermé avec au moins 12 testeurs pendant 14 jours d'affilée** avant de pouvoir publier en production. Commencez à chercher vos testeurs tôt (amis, famille, collègues : il leur faut un compte Google et un téléphone Android).

## 3. Générer l'app Android avec PWABuilder

1. Aller sur [pwabuilder.com](https://www.pwabuilder.com), entrer l'adresse du site, lancer l'analyse.
2. Choisir **Android** → **Generate Package** → options :
   - **Package ID** : identifiant unique et **définitif** (impossible à changer ensuite), par ex. `com.lptss.currencyconverter`.
   - **App name** : `Simple Currency Converter` — **Launcher name** (sous l'icône) : `Currency`.
   - **Version** : `1.0.0` / version code `1`.
   - **Theme / Status bar color** : `#ffffff` — **Background / Splash color** : `#eef3fa`.
   - **Signing key** : « Create new ».
3. Télécharger le ZIP. Il contient :
   - le fichier `.aab` à envoyer sur le Play Store ;
   - la **clé de signature** (`signing.keystore`) et son mot de passe (`signing-key-info.txt`).

> ⚠️ **Gardez la clé de signature et son mot de passe en lieu sûr (hors de ce dépôt, sauvegardés).** Sans eux, impossible de publier des mises à jour de l'app.

## 4. Relier le site à l'app (barre d'adresse cachée)

Sans cette étape, l'app Android affiche une barre d'adresse comme un navigateur.

1. Dans la Play Console : **Votre app → Test et publication → Intégrité de l'application → Signature d'application**. Copier l'empreinte **SHA-256** du « certificat de la clé de signature d'application ».
2. Ouvrir `.well-known/assetlinks.json` et remplacer :
   - `REMPLACER_PAR_LE_PACKAGE_ID` par votre Package ID (étape 3) ;
   - `REMPLACER_PAR_L_EMPREINTE_SHA256…` par l'empreinte copiée. Vous pouvez ajouter aussi l'empreinte de la clé PWABuilder (fichier `assetlinks.json` fourni dans le ZIP) : une ligne par empreinte, séparées par des virgules.
3. Pousser, puis vérifier que `https://VOTRE-SITE.pages.dev/.well-known/assetlinks.json` s'affiche.

## 5. Remplir la fiche Play Store

Dans **Croissance → Présence sur le Play Store → Fiche principale** :
- Textes : copier depuis `STORE_LISTING.md` (ajouter la traduction anglaise via « Gérer les traductions »).
- Icône, bannière et captures : dossier `store/`.
- Catégorie : **Outils** (ou Voyages et infos locales).

Dans **Règles et programmes → Contenu de l'application** :
- **Politique de confidentialité** : `https://VOTRE-SITE.pages.dev/privacy.html`
- **Annonces** : « Non, mon application ne contient pas d'annonces ».
- **Accès à l'application** : tout est accessible sans restriction.
- **Classification du contenu** : remplir le questionnaire (catégorie Utilitaire, aucune case sensible).
- **Public cible** : 18 ans et plus (ou 13+ ; évitez « enfants », qui ajoute des obligations).
- **Sécurité des données** :
  - « Votre application collecte-t-elle ou partage-t-elle des données ? » → **Non**.
  - Les devises et les taux restent sur le téléphone ; la seule connexion télécharge des taux publics, sans donnée personnelle.
- **Application financière** : déclarer qu'elle ne propose **aucun** service financier (simple convertisseur indicatif).

## 6. Tester puis publier

1. **Test fermé** : créer un test fermé, envoyer le `.aab`, ajouter les adresses e-mail des 12 testeurs, leur envoyer le lien d'inscription. Ils doivent rester inscrits **14 jours**.
2. Pendant ce temps : vérifier sur un vrai téléphone que l'app s'ouvre sans barre d'adresse, fonctionne hors-ligne, et que le bouton retour ferme bien les panneaux.
3. Après 14 jours : demander l'accès à la **production** (questionnaire court sur le test), puis publier.

## 7. Mettre à jour l'app plus tard

- Modifier le site et **incrémenter `CACHE_NAME` dans `sw.js`** à chaque déploiement : l'app installée (y compris celle du Play Store) se met à jour toute seule, sans republier.
- Republier sur le Play Store seulement si vous changez le nom, l'icône ou les réglages Android : regénérer avec PWABuilder **avec la même clé de signature** et augmenter le version code.
