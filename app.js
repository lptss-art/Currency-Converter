const i18n = {
    fr: {
        loading: "Chargement...",
        refresh: "Actualiser les taux",
        chooseCurrency: "Choisir une devise",
        searchPlaceholder: "Devise, pays ou ville…",
        addCurrency: "Ajouter une devise",
        manageList: "Gérer la liste",
        close: "Fermer",
        clear: "Effacer",
        clearSearch: "Effacer la recherche",
        ratesOf: "Taux du",
        savedRates: "Taux enregistrés",
        offlineRates: "Hors-ligne • Taux du",
        fetching: "Actualisation...",
        noCurrencyFound: "Aucune devise trouvée pour",
        deleteCurrency: "Supprimer la devise",
        euroZone: "Zone Euro (France, Allemagne, Espagne...)",
        networkError: "Erreur réseau",
        fetchError: "Impossible de récupérer les taux en direct:",
        recent: "Récentes",
        popular: "Populaires",
        allCurrencies: "Toutes les devises",
        removed: "{code} retiré de la liste",
        undo: "Annuler",
        about: "À propos",
        aboutRatesTitle: "Taux de change",
        aboutRatesText: "Les taux proviennent d'ExchangeRate-API et sont mis à jour une fois par jour. Ils sont donnés à titre indicatif : le taux appliqué par votre banque, votre carte ou un bureau de change peut être différent (frais, marge). Ne les utilisez pas pour des transactions financières.",
        aboutPrivacyTitle: "Vie privée",
        aboutPrivacyText: "L'application ne collecte aucune donnée personnelle et ne contient ni publicité ni traceur. Vos devises restent sur votre téléphone. La seule connexion sert à télécharger les taux.",
        privacyPolicy: "Politique de confidentialité",
        version: "Version",
        appName: "Convertisseur devises simple",
        inList: "Dans la liste",
        quoteOpen: "« ",
        quoteClose: " »"
    },
    en: {
        loading: "Loading...",
        refresh: "Refresh rates",
        chooseCurrency: "Choose a currency",
        searchPlaceholder: "Currency, country or city…",
        addCurrency: "Add currency",
        manageList: "Manage list",
        close: "Close",
        clear: "Clear",
        clearSearch: "Clear search",
        ratesOf: "Rates from",
        savedRates: "Saved rates",
        offlineRates: "Offline • Rates from",
        fetching: "Updating...",
        noCurrencyFound: "No currency found for",
        deleteCurrency: "Delete currency",
        euroZone: "Eurozone (France, Germany, Spain...)",
        networkError: "Network error",
        fetchError: "Failed to fetch live rates:",
        recent: "Recent",
        popular: "Popular",
        allCurrencies: "All currencies",
        removed: "{code} removed",
        undo: "Undo",
        about: "About",
        aboutRatesTitle: "Exchange rates",
        aboutRatesText: "Rates come from ExchangeRate-API and are updated once a day. They are indicative only: the rate applied by your bank, card or an exchange office may differ (fees, margin). Do not use them for financial transactions.",
        aboutPrivacyTitle: "Privacy",
        aboutPrivacyText: "The app collects no personal data and contains no ads or trackers. Your currencies stay on your phone. The only connection is used to download the rates.",
        privacyPolicy: "Privacy policy",
        version: "Version",
        appName: "Simple Currency Converter",
        inList: "In list",
        quoteOpen: "“",
        quoteClose: "”"
    }
};

const userLang = (navigator.language || navigator.userLanguage || 'en').substring(0, 2);
const lang = (userLang === 'fr') ? 'fr' : 'en';
const locale = navigator.language || 'en-US';
const t = i18n[lang];
const APP_VERSION = '1.0.0';
const RATES_ATTRIBUTION_URL = 'https://www.exchangerate-api.com';
// Séparateur décimal local (« , » en français, « . » en anglais)
const DECIMAL_SEP = (1.5).toLocaleString(locale).replace(/\d/g, '').charAt(0) || '.';

// Apply translations to static HTML
// Le script est chargé en fin de <body> : le DOM est prêt, on traduit tout de suite
// (avant initApp, sinon "Chargement..." écrasait la date des taux).
(() => {
    if (lang !== 'en') {
        document.getElementById('lastUpdated').textContent = t.loading;
        document.getElementById('refreshRatesBtn').setAttribute('title', t.refresh);
        document.getElementById('refreshRatesBtn').setAttribute('aria-label', t.refresh);
        document.getElementById('modalTitle').textContent = t.chooseCurrency;
        document.getElementById('currencySearch').setAttribute('placeholder', t.searchPlaceholder);
        document.getElementById('addCurrencyText').textContent = t.addCurrency;
        document.getElementById('toggleDeleteBtn').setAttribute('aria-label', t.manageList);
        document.getElementById('closeModalBtn').setAttribute('aria-label', t.close);
        document.getElementById('clearSearchBtn').setAttribute('aria-label', t.clearSearch);
        document.getElementById('deleteBtn').setAttribute('aria-label', t.clear);
        document.documentElement.lang = lang;
    }
    // Nom de l'app dans la langue de l'utilisateur
    const setText = (id, txt) => { const el = document.getElementById(id); if (el) el.textContent = txt; };
    document.title = t.appName;
    setText('brandTitle', t.appName);
    setText('aboutAppName', t.appName);
    const setAria = (id, txt) => { const el = document.getElementById(id); if (el) el.setAttribute('aria-label', txt); };
    setAria('aboutBtn', t.about);
    setAria('closeAboutBtn', t.close);
    // Textes de l'écran "À propos"
    setText('aboutTitle', t.about);
    setText('aboutRatesTitle', t.aboutRatesTitle);
    setText('aboutRatesText', t.aboutRatesText);
    setText('aboutPrivacyTitle', t.aboutPrivacyTitle);
    setText('aboutPrivacyText', t.aboutPrivacyText);
    setText('aboutPrivacyLink', t.privacyPolicy);
    // Séparateur décimal local sur la touche du clavier (« , » en français)
    const decimalKey = document.getElementById('decimalKey');
    if (decimalKey) {
        decimalKey.textContent = DECIMAL_SEP;
    }
})();

// Safe LocalStorage helpers
function safeGetStorage(key, fallback) {
    try {
        const item = localStorage.getItem(key);
        return item ? JSON.parse(item) : fallback;
    } catch (e) {
        return fallback;
    }
}

// Fallback baseline exchange rates (relative to EUR) so the app works immediately even on first launch offline
const DEFAULT_RATES = {
    EUR: 1,
    USD: 1.08,
    GBP: 0.85,
    JPY: 165.2,
    CHF: 0.96,
    CAD: 1.48,
    AUD: 1.66,
    TWD: 34.8,
    TND: 3.37,
    MAD: 10.75,
    DZD: 144.5
};

// Complete global currency list so all currencies are ALWAYS searchable even before API loads
const ALL_SUPPORTED_CURRENCIES = [
    'AED', 'AFN', 'ALL', 'AMD', 'ANG', 'AOA', 'ARS', 'AUD', 'AWG', 'AZN',
    'BAM', 'BBD', 'BDT', 'BGN', 'BHD', 'BIF', 'BMD', 'BND', 'BOB', 'BRL',
    'BSD', 'BTN', 'BWP', 'BYN', 'BZD', 'CAD', 'CDF', 'CHF', 'CLP', 'CNY',
    'COP', 'CRC', 'CUP', 'CVE', 'CZK', 'DJF', 'DKK', 'DOP', 'DZD', 'EGP',
    'ERN', 'ETB', 'EUR', 'FJD', 'FKP', 'GBP', 'GEL', 'GHS', 'GIP', 'GMD',
    'GNF', 'GTQ', 'GYD', 'HKD', 'HNL', 'HTG', 'HUF', 'IDR', 'ILS',
    'INR', 'IQD', 'IRR', 'ISK', 'JMD', 'JOD', 'JPY', 'KES', 'KGS', 'KHR',
    'KMF', 'KRW', 'KWD', 'KYD', 'KZT', 'LAK', 'LBP', 'LKR', 'LRD', 'LSL',
    'LYD', 'MAD', 'MDL', 'MGA', 'MKD', 'MMK', 'MNT', 'MOP', 'MRU', 'MUR',
    'MVR', 'MWK', 'MXN', 'MYR', 'MZN', 'NAD', 'NGN', 'NIO', 'NOK', 'NPR',
    'NZD', 'OMR', 'PAB', 'PEN', 'PGK', 'PHP', 'PKR', 'PLN', 'PYG', 'QAR',
    'RON', 'RSD', 'RUB', 'RWF', 'SAR', 'SBD', 'SCR', 'SDG', 'SEK', 'SGD',
    'SHP', 'SLE', 'SOS', 'SRD', 'SSP', 'STN', 'SYP', 'SZL', 'THB',
    'TJS', 'TMT', 'TND', 'TOP', 'TRY', 'TTD', 'TVD', 'TWD', 'TZS', 'UAH',
    'UGX', 'USD', 'UYU', 'UZS', 'VES', 'VND', 'VUV', 'WST', 'XAF', 'XCD',
    'XOF', 'XPF', 'YER', 'ZAR', 'ZMW', 'ZWL'
];

// State variables
// L'app est faite pour voyager : uniquement des monnaies en circulation.
// L'API renvoie aussi des unités qui ne servent pas en voyage (DTS du FMI, unité de compte chilienne,
// yuan offshore) ou des monnaies remplacées : on les masque.
const NON_TRAVEL_CURRENCIES = new Set(['XDR', 'CLF', 'CNH', 'HRK', 'SLL', 'BTC', 'ETH', 'XAU', 'XAG']);

let currencies = safeGetStorage('userCurrencies', ['EUR', 'USD', 'GBP', 'JPY', 'TWD'])
    .filter(c => !NON_TRAVEL_CURRENCIES.has(c));
if (currencies.length === 0) currencies = ['EUR', 'USD'];
let exchangeRates = safeGetStorage('exchangeRates', DEFAULT_RATES);
let lastFetchDate = localStorage.getItem('lastFetchDate') || null;   // date des taux (AAAA-MM-JJ)
let lastFetchTime = parseInt(localStorage.getItem('lastFetchTime'), 10) || 0; // dernier téléchargement (ms)
const RATES_MAX_AGE = 3 * 60 * 60 * 1000; // on ne retélécharge pas les taux avant 3 h
const POPULAR_CURRENCIES = ['EUR', 'USD', 'GBP', 'JPY', 'CHF', 'CAD', 'AUD', 'CNY', 'HKD', 'SGD'];
let recentCurrencies = safeGetStorage('recentCurrencies', []);

// Multi-directional calculation state
let activeIndex = 0;
let activeValueString = '1';
let shouldResetValue = true;
// Montant exact (en EUR) quand on vient de sélectionner une autre ligne sans encore taper :
// évite de recalculer à partir d'une valeur arrondie (les autres lignes ne bougent plus).
let pinnedEur = null;
let isEditingMode = false;
let isFetchingRates = false;

// Elements
const currencyList = document.getElementById('currencyList');
const addCurrencyBtn = document.getElementById('addCurrencyBtn');
const toggleDeleteBtn = document.getElementById('toggleDeleteBtn');
const lastUpdatedEl = document.getElementById('lastUpdated');
const refreshRatesBtn = document.getElementById('refreshRatesBtn');
const refreshIcon = document.getElementById('refreshIcon');
const keypadBtns = document.querySelectorAll('.keypad-btn');
const currencyModal = document.getElementById('currencyModal');
const closeModalBtn = document.getElementById('closeModalBtn');
const currencySearch = document.getElementById('currencySearch');
const clearSearchBtn = document.getElementById('clearSearchBtn');
const modalCurrencyList = document.getElementById('modalCurrencyList');
const modalTitle = document.getElementById('modalTitle');

let selectingForIndex = -1;

// Multi-locale formatters for universal search (French & English)
let dnCurrFr, dnCurrEn, dnRegFr, dnRegEn;
try {
    dnCurrFr = new Intl.DisplayNames(['fr'], { type: 'currency' });
    dnCurrEn = new Intl.DisplayNames(['en'], { type: 'currency' });
    dnRegFr = new Intl.DisplayNames(['fr'], { type: 'region' });
    dnRegEn = new Intl.DisplayNames(['en'], { type: 'region' });
} catch (e) {}

// Normalize search text (removes accents, umlauts, punctuation and lowercases)
function normalizeSearch(str) {
    if (!str) return '';
    return str
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .replace(/[^a-z0-9]/g, ' ')
        .trim();
}

// Special dictionary for common aliases, capitals, international names and nicknames
const CURRENCY_ALIASES = {
    EUR: ['europe', 'france', 'allemagne', 'germany', 'deutschland', 'espagne', 'spain', 'espana', 'italie', 'italy', 'italia', 'portugal', 'belgique', 'belgium', 'pays-bas', 'netherlands', 'hollande', 'grece', 'greece', 'irlande', 'ireland', 'autriche', 'austria', 'finlande', 'finland', 'ue', 'eu', 'eurozone'],
    USD: ['usa', 'united states', 'etats-unis', 'etats unis', 'amerique', 'america', 'us', 'dollar', 'new york', 'washington'],
    GBP: ['uk', 'united kingdom', 'royaume-uni', 'royaume uni', 'angleterre', 'england', 'grande-bretagne', 'great britain', 'londres', 'london', 'livre sterling', 'pound', 'ecosse', 'scotland'],
    JPY: ['japan', 'japon', 'nippon', 'tokyo', 'yen', 'osaka'],
    CHF: ['switzerland', 'suisse', 'schweiz', 'svizzera', 'geneve', 'zurich', 'franc suisse'],
    CAD: ['canada', 'dollar canadien', 'canadian dollar', 'montreal', 'toronto', 'quebec', 'ottawa'],
    AUD: ['australia', 'australie', 'dollar australien', 'sydney', 'melbourne', 'canberra'],
    CNY: ['china', 'chine', 'yuan', 'renminbi', 'pekin', 'beijing', 'shanghai'],
    INR: ['india', 'inde', 'rupee', 'roupie', 'mumbai', 'delhi', 'new delhi'],
    BRL: ['brazil', 'bresil', 'brasil', 'real', 'rio', 'sao paulo'],
    MXN: ['mexico', 'mexique', 'peso mexicain', 'cancun'],
    KRW: ['korea', 'coree', 'south korea', 'coree du sud', 'seoul', 'won'],
    THB: ['thailand', 'thailande', 'siam', 'bangkok', 'baht', 'phuket'],
    AED: ['uae', 'united arab emirates', 'emirats arabes unis', 'dubai', 'abu dhabi', 'dirham'],
    MAD: ['morocco', 'maroc', 'casablanca', 'marrakech', 'rabat', 'dirham marocain'],
    TND: ['tunisia', 'tunisie', 'tunis', 'dinar tunisien'],
    DZD: ['algeria', 'algerie', 'alger', 'dinar algerien'],
    EGP: ['egypt', 'egypte', 'le caire', 'cairo', 'livre egyptienne'],
    SGD: ['singapore', 'singapour'],
    HKD: ['hong kong', 'hongkong'],
    TWD: ['taiwan', 'taipei', 'new taiwan dollar'],
    SEK: ['sweden', 'suede', 'sverige', 'stockholm', 'couronne suedoise', 'krona'],
    NOK: ['norway', 'norvege', 'norge', 'oslo', 'couronne norvegienne', 'krone'],
    DKK: ['denmark', 'danemark', 'danmark', 'copenhague', 'copenhagen', 'couronne danoise'],
    PLN: ['poland', 'pologne', 'polska', 'varsovie', 'warsaw', 'zloty'],
    CZK: ['czech', 'tchequie', 'czechia', 'prague', 'koruna', 'republique tcheque'],
    HUF: ['hungary', 'hongrie', 'budapest', 'forint'],
    TRY: ['turkey', 'turquie', 'turkiye', 'istanbul', 'ankara', 'lira', 'livre turque'],
    ILS: ['israel', 'shekel', 'tel aviv', 'jerusalem'],
    IDR: ['indonesia', 'indonesie', 'bali', 'jakarta', 'rupiah'],
    MYR: ['malaysia', 'malaisie', 'kuala lumpur', 'ringgit'],
    PHP: ['philippines', 'manille', 'manila', 'peso philippin'],
    VND: ['vietnam', 'dong', 'hanoi', 'saigon', 'ho chi minh'],
    ZAR: ['south africa', 'afrique du sud', 'rand', 'cape town', 'johannesburg'],
    NZD: ['new zealand', 'nouvelle-zelande', 'auckland', 'kiwi'],
    ARS: ['argentina', 'argentine', 'buenos aires', 'peso argentin'],
    CLP: ['chile', 'chili', 'santiago', 'peso chilien'],
    COP: ['colombia', 'colombie', 'bogota', 'peso colombien'],
    PEN: ['peru', 'perou', 'lima', 'sol'],
    XOF: ['afrique de l ouest', 'west africa', 'senegal', 'cote d ivoire', 'mali', 'burkina', 'benin', 'togo', 'cfa'],
    XAF: ['afrique centrale', 'central africa', 'cameroun', 'gabon', 'congo', 'tchad', 'cfa'],
    XPF: ['polynesie', 'tahiti', 'nouvelle-caledonie', 'cfp']
};

const currencyMetadataCache = {};

function getCurrencyMetadata(code) {
    if (currencyMetadataCache[code]) return currencyMetadataCache[code];

    let nameFr = code;
    let nameEn = code;
    let countryFr = '';
    let countryEn = '';

    if (dnCurrFr) {
        try { nameFr = dnCurrFr.of(code) || code; } catch(e) {}
    }
    if (dnCurrEn) {
        try { nameEn = dnCurrEn.of(code) || code; } catch(e) {}
    }

    const countryCode = code.substring(0, 2);
    if (dnRegFr && countryCode.length === 2) {
        try { countryFr = dnRegFr.of(countryCode) || ''; } catch(e) {}
    }
    if (dnRegEn && countryCode.length === 2) {
        try { countryEn = dnRegEn.of(countryCode) || ''; } catch(e) {}
    }

    const aliases = CURRENCY_ALIASES[code] || [];

    // Subtitle label for display in modal
    let subtitle = '';
    if (code === 'EUR') {
        subtitle = t.euroZone;
    } else if (countryFr || countryEn) {
        subtitle = lang === 'fr' ? (countryFr || countryEn) : (countryEn || countryFr);
    } else if (aliases.length > 0) {
        subtitle = aliases.slice(0, 2).map(a => a.charAt(0).toUpperCase() + a.slice(1)).join(', ');
    }

    // Capitalize first letter of currency name
    let displayName = lang === 'fr' ? nameFr : nameEn;
    const formattedName = displayName.charAt(0).toUpperCase() + displayName.slice(1);

    // Build exhaustive searchable text string
    const searchTokens = [
        code,
        nameFr,
        nameEn,
        countryFr,
        countryEn,
        ...aliases
    ].join(' ');

    const metadata = {
        code,
        nameFr: formattedName,
        nameEn,
        subtitle,
        searchIndex: normalizeSearch(searchTokens)
    };

    currencyMetadataCache[code] = metadata;
    return metadata;
}

function getCurrencySymbol(code) {
    try {
        const formatter = new Intl.NumberFormat(locale, { style: 'currency', currency: code, maximumFractionDigits: 0 });
        const parts = formatter.formatToParts(0);
        const symbolPart = parts.find(part => part.type === 'currency');
        return symbolPart ? symbolPart.value : code;
    } catch(e) {
        return code;
    }
}

// Utility: Currency Code to Flag Emoji
function getFlagEmoji(currencyCode) {
    if (currencyCode === 'EUR') return '🇪🇺';
    if (currencyCode === 'USD') return '🇺🇸';
    if (currencyCode === 'GBP') return '🇬🇧';
    if (currencyCode === 'TWD') return '🇹🇼';
    if (currencyCode === 'CHF') return '🇨🇭';
    if (currencyCode === 'CAD') return '🇨🇦';
    if (currencyCode === 'AUD') return '🇦🇺';
    if (currencyCode === 'JPY') return '🇯🇵';
    if (currencyCode === 'XOF' || currencyCode === 'XAF') return '🌍'; // Franc CFA
    if (currencyCode === 'XCD') return '🌴'; // Dollar des Caraïbes orientales
    if (currencyCode === 'ANG') return '🇨🇼';

    // Standard ISO 4217 mapping
    const countryCode = currencyCode.substring(0, 2);
    const codePoints = countryCode
        .toUpperCase()
        .split('')
        .map(char => 127397 + char.charCodeAt());

    try {
        return String.fromCodePoint(...codePoints);
    } catch (e) {
        return '💰';
    }
}

// Initialize app
async function initApp() {
    registerServiceWorker();

    // Ensure active currency has valid index
    if (activeIndex >= currencies.length) activeIndex = 0;

    renderCurrencies();
    setupEventListeners();
    setupKeyboardListeners();
    setupReorder();

    // Taux : l'app s'affiche d'abord avec les taux enregistrés, la mise à jour
    // (au plus toutes les 3 h) se fait ensuite en arrière-plan sans bloquer l'ouverture.
    updateLastUpdatedText();
    setTimeout(() => fetchRates(), 400);
    // Quand on revient sur l'app (ou que le réseau revient), on vérifie si les taux ont plus de 3 h
    document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') fetchRates();
    });
    window.addEventListener('online', () => fetchRates());

    // Fix for mobile keyboards covering search results
    if (window.visualViewport) {
        const adjustViewport = () => {
            const vh = window.visualViewport.height;
            document.body.style.height = `${vh}px`;
            currencyModal.style.height = `${vh}px`;
        };
        window.visualViewport.addEventListener('resize', adjustViewport);
        adjustViewport();
    }
}

// ---------- Réorganisation des devises (glisser-déposer maison) ----------
// La ligne suit le doigt, les autres lignes s'écartent en direct dès qu'on
// dépasse leur milieu, et au relâchement la ligne se pose dans son créneau.
let reorderState = null;        // non null pendant un glisser
let pendingRender = false;      // un rendu demandé pendant le glisser est différé

function setupReorder() {
    const LONG_PRESS_MS = 180;   // appui long (tactile) avant de saisir la ligne
    const TOUCH_SLOP = 8;        // px de mouvement qui annulent l'appui long (= scroll)
    const MOUSE_SLOP = 4;        // px de mouvement souris pour démarrer
    const EDGE = 60;             // zone d'auto-défilement en haut/bas de la liste
    const MAX_SCROLL_SPEED = 14; // px par frame

    let pressTimer = null;
    let pressRow = null;
    let startX = 0, startY = 0;
    let mouseDown = false;
    let suppressClick = false;

    const baseScale = (row) => row.classList.contains('scale-[1.01]') ? ' scale(1.01)' : '';

    function canStartOn(target) {
        if (!target || target.closest('.delete-btn')) return null;
        const row = target.closest('.currency-row');
        return row && row.parentElement === currencyList ? row : null;
    }

    function begin(row, y) {
        const rows = Array.from(currencyList.querySelectorAll(':scope > .currency-row'));
        const from = rows.indexOf(row);
        if (from < 0 || rows.length < 2) return;
        const rects = rows.map(r => r.getBoundingClientRect());
        const gap = rects[1].top - rects[0].bottom;
        reorderState = {
            row, rows, rects, from, to: from,
            startY: y, pointerY: y,
            scrollStart: currencyList.scrollTop,
            step: rects[from].height + gap,
            minDy: rects[0].top - rects[from].top,
            maxDy: rects[rects.length - 1].bottom - rects[from].bottom,
            raf: 0
        };
        row.classList.add('row-dragging');
        rows.forEach(r => { if (r !== row) r.classList.add('row-shifting'); });
        document.body.classList.add('is-dragging');
        if (navigator.vibrate) navigator.vibrate(12);
        update();
        reorderState.raf = requestAnimationFrame(autoScrollLoop);
    }

    function update() {
        const st = reorderState;
        if (!st) return;
        let dy = (st.pointerY - st.startY) + (currencyList.scrollTop - st.scrollStart);
        dy = Math.max(st.minDy, Math.min(st.maxDy, dy));
        st.row.style.transform = `translateY(${dy}px) scale(1.03)`;

        const r0 = st.rects[st.from];
        const center = r0.top + r0.height / 2 + dy;
        let to = st.from;
        st.rows.forEach((r, i) => {
            if (i === st.from) return;
            const c = st.rects[i].top + st.rects[i].height / 2;
            let shift = 0;
            if (i < st.from && center < c) { shift = st.step; to--; }
            else if (i > st.from && center > c) { shift = -st.step; to++; }
            r.style.transform = shift ? `translateY(${shift}px)${baseScale(r)}` : '';
        });
        if (to !== st.to && navigator.vibrate) navigator.vibrate(5);
        st.to = to;
    }

    function autoScrollLoop() {
        const st = reorderState;
        if (!st) return;
        const box = currencyList.getBoundingClientRect();
        let speed = 0;
        if (st.pointerY < box.top + EDGE) speed = -MAX_SCROLL_SPEED * Math.min(1, (box.top + EDGE - st.pointerY) / EDGE);
        else if (st.pointerY > box.bottom - EDGE) speed = MAX_SCROLL_SPEED * Math.min(1, (st.pointerY - (box.bottom - EDGE)) / EDGE);
        if (speed) {
            const before = currencyList.scrollTop;
            currencyList.scrollTop += speed;
            if (currencyList.scrollTop !== before) update();
        }
        st.raf = requestAnimationFrame(autoScrollLoop);
    }

    function finish() {
        const st = reorderState;
        if (!st) return;
        cancelAnimationFrame(st.raf);
        suppressClick = true;
        setTimeout(() => { suppressClick = false; }, 350);

        // Position finale de la ligne déplacée (dans son nouveau créneau)
        let finalDy = 0;
        if (st.to > st.from) finalDy = st.rects[st.to].bottom - st.rects[st.from].bottom;
        else if (st.to < st.from) finalDy = st.rects[st.to].top - st.rects[st.from].top;

        st.row.classList.add('row-settling');
        st.row.style.transform = `translateY(${finalDy}px)${baseScale(st.row)}`;

        let done = false;
        const commit = () => {
            if (done) return;
            done = true;
            reorderState = null;
            document.body.classList.remove('is-dragging');
            const { from, to } = st;
            if (from !== to) {
                const moved = currencies.splice(from, 1)[0];
                currencies.splice(to, 0, moved);
                if (activeIndex === from) activeIndex = to;
                else if (from < activeIndex && to >= activeIndex) activeIndex--;
                else if (from > activeIndex && to <= activeIndex) activeIndex++;
                saveState();
            }
            pendingRender = false;
            renderCurrencies();
        };
        st.row.addEventListener('transitionend', commit, { once: true });
        setTimeout(commit, 260); // filet de sécurité si transitionend ne vient pas
    }

    function clearPress() {
        clearTimeout(pressTimer);
        pressTimer = null;
        pressRow = null;
    }

    // --- Tactile : appui long puis glisser ---
    currencyList.addEventListener('touchstart', (e) => {
        if (reorderState || e.touches.length > 1) { clearPress(); return; }
        const row = canStartOn(e.target);
        if (!row) return;
        const t0 = e.touches[0];
        startX = t0.clientX; startY = t0.clientY;
        pressRow = row;
        pressTimer = setTimeout(() => {
            const r = pressRow;
            clearPress();
            if (r) begin(r, startY);
        }, LONG_PRESS_MS);
    }, { passive: true });

    currencyList.addEventListener('touchmove', (e) => {
        const t0 = e.touches[0];
        if (reorderState) {
            e.preventDefault(); // bloque le scroll pendant le glisser
            reorderState.pointerY = t0.clientY;
            update();
        } else if (pressTimer && Math.hypot(t0.clientX - startX, t0.clientY - startY) > TOUCH_SLOP) {
            clearPress(); // l'utilisateur fait défiler la liste
        }
    }, { passive: false });

    const touchEnd = () => { clearPress(); if (reorderState) finish(); };
    currencyList.addEventListener('touchend', touchEnd);
    currencyList.addEventListener('touchcancel', touchEnd);

    // Pas de menu contextuel sur appui long
    currencyList.addEventListener('contextmenu', (e) => {
        if (e.target.closest('.currency-row')) e.preventDefault();
    });

    // --- Souris : cliquer-glisser ---
    currencyList.addEventListener('mousedown', (e) => {
        if (e.button !== 0 || reorderState) return;
        if (e.sourceCapabilities && e.sourceCapabilities.firesTouchEvents) return;
        const row = canStartOn(e.target);
        if (!row) return;
        mouseDown = true; pressRow = row;
        startX = e.clientX; startY = e.clientY;
    });
    document.addEventListener('mousemove', (e) => {
        if (reorderState && mouseDown) {
            reorderState.pointerY = e.clientY;
            update();
        } else if (mouseDown && pressRow && Math.hypot(e.clientX - startX, e.clientY - startY) > MOUSE_SLOP) {
            const r = pressRow; pressRow = null;
            begin(r, startY);
            if (reorderState) { reorderState.pointerY = e.clientY; update(); }
        }
    });
    document.addEventListener('mouseup', () => {
        if (!mouseDown) return;
        mouseDown = false; pressRow = null;
        if (reorderState) finish();
    });

    // Empêche le "clic" qui suit un glisser d'activer la ligne
    currencyList.addEventListener('click', (e) => {
        if (suppressClick) { e.stopPropagation(); e.preventDefault(); }
    }, true);
}

// Register Service Worker
function registerServiceWorker() {
    if ('serviceWorker' in navigator) {
        window.addEventListener('load', () => {
            navigator.serviceWorker.register('./sw.js').then(reg => {
                reg.update();
            }).catch(err => {
                console.warn('ServiceWorker registration error:', err);
            });
        });
    }
}

// Fetch exchange rates with strict 3.5s timeout (prevents hanging on slow/flaky connections)
async function fetchRates(force = false) {
    if (isFetchingRates) return;

    const hasRates = Object.keys(exchangeRates).length > 1;
    if (!force && hasRates && lastFetchTime && (Date.now() - lastFetchTime) < RATES_MAX_AGE) {
        updateLastUpdatedText();
        return;
    }

    isFetchingRates = true;
    if (refreshIcon) refreshIcon.classList.add('animate-spin');
    setRatesState('loading');
    // Mise à jour silencieuse en arrière-plan : on garde la date affichée,
    // le texte "Actualisation..." n'apparaît que si on la demande ou qu'on n'a rien.
    if (force || !lastFetchDate) lastUpdatedEl.textContent = t.fetching;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3500);

    try {
        const response = await fetch('https://open.er-api.com/v6/latest/EUR', {
            signal: controller.signal
        });
        clearTimeout(timeoutId);

        if (!response.ok) throw new Error(t.networkError);
        const data = await response.json();

        if (data && data.rates) {
            // On garde exactement les valeurs affichées : la ligne active ne bouge pas
            if (pinnedEur !== null) pinnedEur = null;
            exchangeRates = data.rates;
            const updated = data.time_last_update_unix ? new Date(data.time_last_update_unix * 1000) : new Date();
            lastFetchDate = `${updated.getFullYear()}-${String(updated.getMonth() + 1).padStart(2, '0')}-${String(updated.getDate()).padStart(2, '0')}`;
            lastFetchTime = Date.now();
            localStorage.setItem('exchangeRates', JSON.stringify(exchangeRates));
            localStorage.setItem('lastFetchDate', lastFetchDate);
            localStorage.setItem('lastFetchTime', String(lastFetchTime));
            updateLastUpdatedText();
            updateDisplayValues();
        } else {
            updateLastUpdatedText(true);
        }
    } catch (error) {
        console.warn(t.fetchError, error);
        updateLastUpdatedText(true);
    } finally {
        isFetchingRates = false;
        if (refreshIcon) refreshIcon.classList.remove('animate-spin');
    }
}

function formatExchangeDate(isoDateStr) {
    if (!isoDateStr) return '';
    try {
        const parts = isoDateStr.split('-');
        if (parts.length === 3) {
            const date = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
            return new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'short' }).format(date);
        }
        return isoDateStr;
    } catch (e) {
        return isoDateStr;
    }
}

function setRatesState(state) {
    const el = document.getElementById('ratesStatus');
    if (el) el.dataset.state = state;
}

function updateLastUpdatedText(isOffline = false) {
    setRatesState(!lastFetchDate ? 'saved' : (isOffline ? 'offline' : 'ok'));
    if (lastFetchDate) {
        const formattedDate = formatExchangeDate(lastFetchDate);
        lastUpdatedEl.textContent = isOffline
            ? `${t.offlineRates} ${formattedDate}`
            : `${t.ratesOf} ${formattedDate}`;
    } else {
        lastUpdatedEl.textContent = t.savedRates;
    }
}

// Modal logic
function openCurrencyModal(index) {
    selectingForIndex = index;
    modalTitle.textContent = index === -1 ? t.addCurrency : t.chooseCurrency;
    currencySearch.value = '';
    if (clearSearchBtn) clearSearchBtn.classList.add('hidden');
    modalCurrencyList.scrollTop = 0;
    renderModalCurrencies('');
    currencyModal.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
    pushLayer('picker');
    setTimeout(() => currencySearch.focus(), 80);
}

function closeCurrencyModal(fromBackButton = false) {
    if (currencyModal.classList.contains('hidden')) return;
    currencyModal.classList.add('hidden');
    document.body.style.overflow = '';
    currencySearch.blur();
    if (!fromBackButton) popLayer('picker');
}

// ---------- Bouton retour Android ----------
// Chaque panneau ouvert (sélecteur, À propos, mode suppression) ajoute une entrée
// dans l'historique : le bouton retour le ferme au lieu de quitter l'app.
function pushLayer(name) {
    try { history.pushState({ layer: name }, ''); } catch (e) {}
}
let ignoreNextPop = false;
function popLayer(name) {
    if (history.state && history.state.layer === name) {
        ignoreNextPop = true; // ce "retour" vient de nous (✕, choix d'une devise…), pas du bouton
        history.back();
    }
}
window.addEventListener('popstate', () => {
    if (ignoreNextPop) { ignoreNextPop = false; return; }
    if (!aboutModal.classList.contains('hidden')) { closeAbout(true); return; }
    if (!currencyModal.classList.contains('hidden')) { closeCurrencyModal(true); return; }
    if (isEditingMode) { setEditingMode(false, true); }
});

// ---------- Mode suppression ----------
function setEditingMode(on, fromBackButton = false) {
    if (isEditingMode === on) return;
    isEditingMode = on;
    toggleDeleteBtn.classList.toggle('is-active', on);
    if (on) pushLayer('edit');
    else if (!fromBackButton) popLayer('edit');
    renderCurrencies();
}

// ---------- À propos ----------
const aboutModal = document.getElementById('aboutModal');
function openAbout() {
    document.getElementById('aboutVersion').textContent = `${t.version} ${APP_VERSION}`;
    aboutModal.classList.remove('hidden');
    pushLayer('about');
}
function closeAbout(fromBackButton = false) {
    if (aboutModal.classList.contains('hidden')) return;
    aboutModal.classList.add('hidden');
    if (!fromBackButton) popLayer('about');
}

function pickCurrency(code) {
    if (selectingForIndex === -1) {
        // Ajout : on n'ajoute pas un doublon
        if (!currencies.includes(code)) currencies.push(code);
    } else {
        // Si on change la devise de la ligne en cours de saisie, on garde le nombre tapé
        if (selectingForIndex === activeIndex) pinnedEur = null;
        // Devise déjà présente ailleurs : on échange les deux lignes plutôt que de créer un doublon
        const existing = currencies.indexOf(code);
        if (existing !== -1 && existing !== selectingForIndex) {
            if (existing === activeIndex) pinnedEur = null;
            currencies[existing] = currencies[selectingForIndex];
        }
        currencies[selectingForIndex] = code;
    }
    recentCurrencies = [code, ...recentCurrencies.filter(c => c !== code)].slice(0, 5);
    localStorage.setItem('recentCurrencies', JSON.stringify(recentCurrencies));
    saveState();
    renderCurrencies();
    closeCurrencyModal();
    if (selectingForIndex === -1) {
        requestAnimationFrame(() => { currencyList.scrollTop = currencyList.scrollHeight; });
    }
}

function buildPickerRow(code) {
    const meta = getCurrencyMetadata(code);
    const isAlreadyAdded = currencies.includes(code);
    const row = document.createElement('div');
    row.className = 'picker-row';
    row.innerHTML = `
        <div class="picker-flag">${getFlagEmoji(code)}</div>
        <div class="picker-text">
            <div class="picker-title">
                <span class="picker-code">${code}</span>
                <span class="picker-name">${meta.nameFr}</span>
            </div>
            ${meta.subtitle ? `<span class="picker-sub">${meta.subtitle}</span>` : ''}
        </div>
        ${isAlreadyAdded ? `<span class="badge">${t.inList}</span>` : ''}
    `;
    row.addEventListener('click', () => pickCurrency(code));
    return row;
}

function buildPickerSection(title) {
    const el = document.createElement('div');
    el.className = 'picker-section';
    el.textContent = title;
    return el;
}

function renderModalCurrencies(searchQuery) {
    modalCurrencyList.innerHTML = '';
    modalCurrencyList.scrollTop = 0;
    const rawTokens = normalizeSearch(searchQuery).split(/\s+/).filter(Boolean);
    const availableCurrencies = Array.from(new Set([...Object.keys(exchangeRates), ...ALL_SUPPORTED_CURRENCIES]))
        .filter(c => !NON_TRAVEL_CURRENCIES.has(c))
        .sort();
    const fragment = document.createDocumentFragment();

    // Sans recherche : récentes et populaires en tête, puis toute la liste
    if (rawTokens.length === 0) {
        const recent = recentCurrencies.filter(c => availableCurrencies.includes(c));
        const popular = POPULAR_CURRENCIES.filter(c => availableCurrencies.includes(c) && !recent.includes(c));
        if (recent.length) {
            fragment.appendChild(buildPickerSection(t.recent));
            recent.forEach(code => fragment.appendChild(buildPickerRow(code)));
        }
        fragment.appendChild(buildPickerSection(t.popular));
        popular.forEach(code => fragment.appendChild(buildPickerRow(code)));
        fragment.appendChild(buildPickerSection(t.allCurrencies));
        availableCurrencies.forEach(code => fragment.appendChild(buildPickerRow(code)));
        modalCurrencyList.appendChild(fragment);
        return;
    }

    let matchCount = 0;
    availableCurrencies.forEach(code => {
        const meta = getCurrencyMetadata(code);
        if (!rawTokens.every(token => meta.searchIndex.includes(token))) return;
        matchCount++;
        fragment.appendChild(buildPickerRow(code));
    });

    if (matchCount === 0) {
        const emptyMsg = document.createElement('div');
        emptyMsg.className = 'picker-empty';
        emptyMsg.textContent = `${t.noCurrencyFound} ${t.quoteOpen}${searchQuery}${t.quoteClose}`;
        fragment.appendChild(emptyMsg);
    }

    modalCurrencyList.appendChild(fragment);
}

// Setup Event Listeners
function setupEventListeners() {
    closeModalBtn.addEventListener('click', () => closeCurrencyModal());

    // Clicking on backdrop closes modal
    currencyModal.addEventListener('click', (e) => {
        if (e.target === currencyModal) {
            closeCurrencyModal();
        }
    });

    // Dismiss virtual keyboard smoothly when scrolling the list on touch devices
    modalCurrencyList.addEventListener('touchstart', () => {
        if (document.activeElement === currencySearch) {
            currencySearch.blur();
        }
    }, { passive: true });

    let searchRaf = null;
    currencySearch.addEventListener('input', (e) => {
        const val = e.target.value;
        if (clearSearchBtn) {
            clearSearchBtn.classList.toggle('hidden', val.length === 0);
        }
        if (searchRaf) cancelAnimationFrame(searchRaf);
        searchRaf = requestAnimationFrame(() => {
            renderModalCurrencies(val);
        });
    });

    if (clearSearchBtn) {
        clearSearchBtn.addEventListener('click', (e) => {
            e.preventDefault();
            currencySearch.value = '';
            clearSearchBtn.classList.add('hidden');
            renderModalCurrencies('');
            currencySearch.focus();
        });
    }

    if (refreshRatesBtn) {
        refreshRatesBtn.addEventListener('click', () => {
            fetchRates(true);
        });
    }

    // "Ajouter une devise" ouvre directement la recherche (index -1 = ajout en fin de liste)
    addCurrencyBtn.addEventListener('click', () => openCurrencyModal(-1));

    toggleDeleteBtn.addEventListener('click', () => setEditingMode(!isEditingMode));

    // À propos : bouton du bas de liste, logo/titre, fermeture
    document.getElementById('aboutBtn').addEventListener('click', openAbout);
    document.getElementById('closeAboutBtn').addEventListener('click', () => closeAbout());
    aboutModal.addEventListener('click', (e) => { if (e.target === aboutModal) closeAbout(); });

    // Touch & Click handling with long-press support on delete key
    keypadBtns.forEach(btn => {
        let pressTimer = null;
        let isLongPress = false;

        const handlePress = () => {
            if (navigator.vibrate) navigator.vibrate(15);
            handleKeypadInput(btn.dataset.val);
        };

        btn.addEventListener('click', (e) => {
            if (isLongPress) {
                isLongPress = false;
                return;
            }
            handlePress();
        });

        // Long press on delete clears all (All Clear)
        if (btn.dataset.val === 'delete') {
            btn.addEventListener('touchstart', () => {
                isLongPress = false;
                pressTimer = setTimeout(() => {
                    isLongPress = true;
                    if (navigator.vibrate) navigator.vibrate(40);
                    pinnedEur = null;
                    activeValueString = '0';
                    shouldResetValue = true;
                    updateDisplayValues();
                }, 450);
            }, { passive: true });

            btn.addEventListener('touchend', () => {
                if (pressTimer) clearTimeout(pressTimer);
            });
            btn.addEventListener('touchcancel', () => {
                if (pressTimer) clearTimeout(pressTimer);
            });
        }
    });
}

// Physical Keyboard Support (Desktop, Laptop, iPad)
function setupKeyboardListeners() {
    window.addEventListener('keydown', (e) => {
        // Ignore if typing in currency search input
        if (e.target === currencySearch) return;

        if (e.key >= '0' && e.key <= '9') {
            handleKeypadInput(e.key);
        } else if (e.key === '.' || e.key === ',') {
            handleKeypadInput('.');
        } else if (e.key === 'Backspace') {
            handleKeypadInput('delete');
        } else if (e.key === 'Escape' || e.key.toLowerCase() === 'c') {
            pinnedEur = null;
            activeValueString = '0';
            shouldResetValue = true;
            updateDisplayValues();
        }
    });
}

// Fast Keypad Processing
function handleKeypadInput(val) {
    pinnedEur = null;
    if (val === 'delete') {
        activeValueString = activeValueString.slice(0, -1);
        if (activeValueString === '' || activeValueString === '-') activeValueString = '0';
        shouldResetValue = false;
    } else if (val === '.') {
        if (shouldResetValue) {
            activeValueString = '0.';
            shouldResetValue = false;
        } else if (!activeValueString.includes('.')) {
            activeValueString += '.';
        }
    } else {
        if (shouldResetValue) {
            activeValueString = val;
            shouldResetValue = false;
        } else if (activeValueString === '0') {
            activeValueString = val;
        } else {
            if (activeValueString.length < 12) {
                activeValueString += val;
            }
        }
    }

    // High performance: update numbers only, do not destroy/rebuild DOM!
    updateDisplayValues();
}

// Formatting Helper with Smart Decimals & Separators
function formatCurrencyValue(amount) {
    if (isNaN(amount) || amount === 0) return '0';

    // Adapt decimals for high precision needed on small numbers (e.g. JPY to EUR = 0.0061)
    let maxFractionDigits = 2;
    if (amount < 0.0001) maxFractionDigits = 6;
    else if (amount < 0.01) maxFractionDigits = 4;

    try {
        return new Intl.NumberFormat(locale, {
            maximumFractionDigits: maxFractionDigits,
            minimumFractionDigits: 0
        }).format(amount);
    } catch (e) {
        return amount.toFixed(maxFractionDigits).replace(/\.?0+$/, '');
    }
}

// Montant saisi -> valeur affichée avec les séparateurs locaux, en gardant
// exactement ce que l'utilisateur tape (ex. "1234." -> "1 234,")
function formatTypedValue(str) {
    const [intPart, decPart] = String(str).split('.');
    let intFmt;
    try {
        intFmt = new Intl.NumberFormat(locale, { maximumFractionDigits: 0 }).format(Number(intPart || '0'));
    } catch (e) {
        intFmt = intPart || '0';
    }
    return decPart === undefined ? intFmt : intFmt + DECIMAL_SEP + decPart;
}

// Montant -> chaîne brute (point décimal) arrondie comme à l'affichage, pour continuer la saisie
function rawFromAmount(amount) {
    if (!amount || isNaN(amount)) return '0';
    const digits = amount < 0.0001 ? 6 : (amount < 0.01 ? 4 : 2);
    const rounded = parseFloat(amount.toFixed(digits));
    return rounded.toLocaleString('en-US', { useGrouping: false, maximumFractionDigits: digits });
}

// Taux d'une devise par rapport à l'EUR ; NaN si on ne l'a pas encore (ex. premier lancement hors-ligne)
function rateOf(code) {
    const r = exchangeRates[code];
    return (typeof r === 'number' && r > 0) ? r : NaN;
}

// Montant actuel exprimé en EUR (devise pivot des taux)
function getAmountEur() {
    if (pinnedEur !== null) return pinnedEur;
    return (parseFloat(activeValueString) || 0) / rateOf(currencies[activeIndex]);
}

// Change la ligne active sans modifier aucune valeur affichée
function setActiveRow(newIndex) {
    const eur = getAmountEur();
    activeIndex = newIndex;
    pinnedEur = isFinite(eur) ? eur : null;
    activeValueString = rawFromAmount(eur * rateOf(currencies[newIndex]));
    shouldResetValue = true;
}

// Multi-Directional Conversion Calculation
function calculateValue(targetCurrencyIndex) {
    if (targetCurrencyIndex === activeIndex) {
        if (pinnedEur !== null) {
            const v = pinnedEur * rateOf(currencies[activeIndex]);
            if (isFinite(v)) return formatCurrencyValue(v);
        }
        return formatTypedValue(activeValueString);
    }
    const v = getAmountEur() * rateOf(currencies[targetCurrencyIndex]);
    return isFinite(v) ? formatCurrencyValue(v) : '—';
}

// Ultra-fast updates for 60fps keypad fluidity without DOM re-creation
function updateDisplayValues() {
    currencies.forEach((currency, index) => {
        const valSpan = document.getElementById(`currency-val-${index}`);
        if (!valSpan) return;

        const displayValue = calculateValue(index);
        valSpan.textContent = displayValue;
    });
}

// Full DOM render (only called on Add, Remove, Reorder, or Focus change)
function renderCurrencies() {
    if (reorderState) { pendingRender = true; return; }
    currencyList.innerHTML = '';
    const fragment = document.createDocumentFragment();

    currencies.forEach((currency, index) => {
        const isEditing = index === activeIndex;
        const displayValue = calculateValue(index);

        const row = document.createElement('div');
        row.className = `currency-row${isEditing ? ' is-active' : ''}`;

        row.addEventListener('click', (e) => {
            if (e.target.closest('.delete-btn') || e.target.closest('.currency-selector')) return;

            if (activeIndex !== index) {
                setActiveRow(index);
                renderCurrencies();
            }
        });

        let deleteHtml = '';
        if (isEditingMode && currencies.length > 1) {
            deleteHtml = `
                <button class="delete-btn row-delete" data-index="${index}" aria-label="${t.deleteCurrency}">
                    <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-width="2.6" d="M6 12h12"></path></svg>
                </button>
            `;
        } else if (isEditingMode) {
            deleteHtml = `<div class="row-delete-spacer"></div>`;
        }

        const meta = getCurrencyMetadata(currency);

        row.innerHTML = `
            ${deleteHtml}
            <div class="currency-selector cur-selector" data-index="${index}">
                <div class="cur-flag">${getFlagEmoji(currency)}</div>
                <div class="cur-meta">
                    <div class="cur-code">
                        ${currency}
                        <svg width="12" height="12" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.6" d="M19 9l-7 7-7-7"></path></svg>
                    </div>
                    <div class="cur-name">${meta.nameFr}</div>
                </div>
            </div>

            <div class="cur-value no-keyboard">
                <span class="cur-amount" id="currency-val-${index}">${displayValue}</span>
                <span class="cur-symbol">${getCurrencySymbol(currency)}</span>
            </div>
        `;

        fragment.appendChild(row);
    });

    // Mention de la source des taux (obligatoire pour l'API gratuite) + accès à "À propos"
    const footer = document.createElement('div');
    footer.className = 'list-footer';
    footer.innerHTML = `<a href="${RATES_ATTRIBUTION_URL}" target="_blank" rel="noopener">Rates By Exchange Rate API</a><span aria-hidden="true">·</span><button type="button" class="list-footer-about"></button>`;
    footer.querySelector('.list-footer-about').textContent = t.about;
    footer.querySelector('.list-footer-about').addEventListener('click', openAbout);
    fragment.appendChild(footer);

    currencyList.appendChild(fragment);

    // Attach listeners
    document.querySelectorAll('.currency-selector').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const index = parseInt(e.currentTarget.dataset.index);
            openCurrencyModal(index);
        });
    });

    document.querySelectorAll('.delete-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const index = parseInt(e.currentTarget.dataset.index);
            const eur = getAmountEur();
            const wasActive = activeIndex === index;
            const removedCode = currencies[index];
            const snapshot = {
                currencies: currencies.slice(),
                activeIndex, activeValueString, shouldResetValue, pinnedEur
            };

            currencies.splice(index, 1);

            if (wasActive) {
                // La devise saisie disparaît : la première ligne prend le relais, même montant
                activeIndex = 0;
                pinnedEur = isFinite(eur) ? eur : null;
                activeValueString = rawFromAmount(eur * rateOf(currencies[0]));
                shouldResetValue = true;
            } else if (activeIndex > index) {
                activeIndex--;
            }

            saveState();
            renderCurrencies();
            showUndoToast(t.removed.replace('{code}', removedCode), snapshot);
        });
    });
}

// Bandeau "XXX retiré · Annuler" affiché quelques secondes après une suppression
let toastTimer = null;
function hideToast(immediate = false) {
    clearTimeout(toastTimer);
    const anchor = document.getElementById('toastAnchor');
    const toast = anchor && anchor.firstElementChild;
    if (!toast) return;
    if (immediate) { toast.remove(); return; }
    toast.classList.add('is-leaving');
    setTimeout(() => toast.remove(), 200);
}

function showUndoToast(message, snapshot) {
    const anchor = document.getElementById('toastAnchor');
    if (!anchor) return;
    hideToast(true);
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.innerHTML = `<span class="toast-text"></span><button class="toast-action"></button>`;
    toast.querySelector('.toast-text').textContent = message;
    const undoBtn = toast.querySelector('.toast-action');
    undoBtn.textContent = t.undo;
    undoBtn.addEventListener('click', () => {
        currencies = snapshot.currencies;
        activeIndex = snapshot.activeIndex;
        activeValueString = snapshot.activeValueString;
        shouldResetValue = snapshot.shouldResetValue;
        pinnedEur = snapshot.pinnedEur;
        saveState();
        renderCurrencies();
        hideToast();
    });
    anchor.appendChild(toast);
    toastTimer = setTimeout(() => hideToast(), 4500);
}

function saveState() {
    localStorage.setItem('userCurrencies', JSON.stringify(currencies));
}

// Start app
initApp();
