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
    'GNF', 'GTQ', 'GYD', 'HKD', 'HNL', 'HRK', 'HTG', 'HUF', 'IDR', 'ILS',
    'INR', 'IQD', 'IRR', 'ISK', 'JMD', 'JOD', 'JPY', 'KES', 'KGS', 'KHR',
    'KMF', 'KRW', 'KWD', 'KYD', 'KZT', 'LAK', 'LBP', 'LKR', 'LRD', 'LSL',
    'LYD', 'MAD', 'MDL', 'MGA', 'MKD', 'MMK', 'MNT', 'MOP', 'MRU', 'MUR',
    'MVR', 'MWK', 'MXN', 'MYR', 'MZN', 'NAD', 'NGN', 'NIO', 'NOK', 'NPR',
    'NZD', 'OMR', 'PAB', 'PEN', 'PGK', 'PHP', 'PKR', 'PLN', 'PYG', 'QAR',
    'RON', 'RSD', 'RUB', 'RWF', 'SAR', 'SBD', 'SCR', 'SDG', 'SEK', 'SGD',
    'SHP', 'SLE', 'SLL', 'SOS', 'SRD', 'SSP', 'STN', 'SYP', 'SZL', 'THB',
    'TJS', 'TMT', 'TND', 'TOP', 'TRY', 'TTD', 'TVD', 'TWD', 'TZS', 'UAH',
    'UGX', 'USD', 'UYU', 'UZS', 'VES', 'VND', 'VUV', 'WST', 'XAF', 'XCD',
    'XOF', 'XPF', 'YER', 'ZAR', 'ZMW', 'ZWL', 'BTC', 'ETH', 'XAU', 'XAG'
];

// State variables
let currencies = safeGetStorage('userCurrencies', ['EUR', 'USD', 'GBP', 'JPY', 'TWD']);
let exchangeRates = safeGetStorage('exchangeRates', DEFAULT_RATES);
let lastFetchDate = localStorage.getItem('lastFetchDate') || null;

// Multi-directional calculation state
let activeIndex = 0;
let activeValueString = '1';
let shouldResetValue = true;
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
    XPF: ['polynesie', 'tahiti', 'nouvelle-caledonie', 'cfp'],
    BTC: ['bitcoin', 'crypto', 'satoshi', 'btc'],
    ETH: ['ethereum', 'ether', 'crypto', 'eth'],
    XAU: ['gold', 'or', 'once d or'],
    XAG: ['silver', 'argent']
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
        subtitle = 'Zone Euro (France, Allemagne, Espagne...)';
    } else if (countryFr && countryEn && countryFr !== countryEn) {
        subtitle = `${countryFr} (${countryEn})`;
    } else if (countryFr || countryEn) {
        subtitle = countryFr || countryEn;
    } else if (aliases.length > 0) {
        subtitle = aliases.slice(0, 2).map(a => a.charAt(0).toUpperCase() + a.slice(1)).join(', ');
    }

    // Capitalize first letter of currency name
    const formattedName = nameFr.charAt(0).toUpperCase() + nameFr.slice(1);

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
        const formatter = new Intl.NumberFormat('fr', { style: 'currency', currency: code, maximumFractionDigits: 0 });
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
    if (currencyCode === 'BTC' || currencyCode === 'ETH') return '🪙';
    if (currencyCode === 'XAU') return '🥇'; // Or
    if (currencyCode === 'XAG') return '🥈'; // Argent
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
    setupSortable();

    // Fetch new rates asynchronously with strict timeout (Lie-Fi proof)
    fetchRates();
}

function setupSortable() {
    if (typeof Sortable !== 'undefined') {
        new Sortable(currencyList, {
            delay: 200,
            delayOnTouchOnly: true,
            animation: 150,
            onEnd: function (evt) {
                const oldIndex = evt.oldIndex;
                const newIndex = evt.newIndex;
                if (oldIndex === newIndex) return;

                const movedCurrency = currencies.splice(oldIndex, 1)[0];
                currencies.splice(newIndex, 0, movedCurrency);

                if (activeIndex === oldIndex) {
                    activeIndex = newIndex;
                } else if (oldIndex < activeIndex && newIndex >= activeIndex) {
                    activeIndex--;
                } else if (oldIndex > activeIndex && newIndex <= activeIndex) {
                    activeIndex++;
                }

                saveState();
                renderCurrencies();
            }
        });
    }
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

    const today = new Date().toISOString().split('T')[0];
    if (!force && lastFetchDate === today && Object.keys(exchangeRates).length > 1) {
        updateLastUpdatedText();
        return;
    }

    isFetchingRates = true;
    if (refreshIcon) refreshIcon.classList.add('animate-spin');
    lastUpdatedEl.textContent = 'Actualisation...';

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3500);

    try {
        const response = await fetch('https://open.er-api.com/v6/latest/EUR', {
            signal: controller.signal
        });
        clearTimeout(timeoutId);

        if (!response.ok) throw new Error('Erreur réseau');
        const data = await response.json();

        if (data && data.rates) {
            exchangeRates = data.rates;
            lastFetchDate = today;
            localStorage.setItem('exchangeRates', JSON.stringify(exchangeRates));
            localStorage.setItem('lastFetchDate', lastFetchDate);
            updateLastUpdatedText();
            updateDisplayValues();
        }
    } catch (error) {
        console.warn('Impossible de récupérer les taux en direct:', error);
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
            return new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'short' }).format(date);
        }
        return isoDateStr;
    } catch (e) {
        return isoDateStr;
    }
}

function updateLastUpdatedText(isOffline = false) {
    if (lastFetchDate) {
        const formattedDate = formatExchangeDate(lastFetchDate);
        lastUpdatedEl.textContent = isOffline
            ? `Hors-ligne • Taux du ${formattedDate}`
            : `Taux du ${formattedDate}`;
    } else {
        lastUpdatedEl.textContent = 'Taux enregistrés';
    }
}

// Modal logic
function openCurrencyModal(index) {
    selectingForIndex = index;
    currencySearch.value = '';
    if (clearSearchBtn) clearSearchBtn.classList.add('hidden');
    modalCurrencyList.scrollTop = 0;
    renderModalCurrencies('');
    currencyModal.classList.remove('hidden');
    currencyModal.classList.add('flex');
    document.body.style.overflow = 'hidden';
    setTimeout(() => currencySearch.focus(), 80);
}

function closeCurrencyModal() {
    currencyModal.classList.add('hidden');
    currencyModal.classList.remove('flex');
    document.body.style.overflow = '';
    currencySearch.blur();
}

function renderModalCurrencies(searchQuery) {
    modalCurrencyList.innerHTML = '';
    modalCurrencyList.scrollTop = 0;
    const rawTokens = normalizeSearch(searchQuery).split(/\s+/).filter(Boolean);
    const availableCurrencies = Array.from(new Set([...Object.keys(exchangeRates), ...ALL_SUPPORTED_CURRENCIES])).sort();

    const fragment = document.createDocumentFragment();
    let matchCount = 0;

    availableCurrencies.forEach(code => {
        const meta = getCurrencyMetadata(code);

        // Check if every query word matches in the search index
        if (rawTokens.length > 0) {
            const matchesAll = rawTokens.every(token => meta.searchIndex.includes(token));
            if (!matchesAll) return;
        }

        matchCount++;
        const isAlreadyAdded = currencies.includes(code);

        const row = document.createElement('div');
        row.className = `flex items-center justify-between p-3 rounded-xl cursor-pointer transition-colors ${
            isAlreadyAdded ? 'bg-blue-50/80 hover:bg-blue-100/90' : 'hover:bg-gray-100'
        }`;
        row.innerHTML = `
            <div class="flex items-center gap-3.5">
                <div class="text-3xl">${getFlagEmoji(code)}</div>
                <div class="flex flex-col">
                    <div class="flex items-center gap-2">
                        <span class="font-bold text-gray-900">${code}</span>
                        <span class="text-sm font-medium text-gray-700">${meta.nameFr}</span>
                    </div>
                    ${meta.subtitle ? `<span class="text-xs text-gray-400 mt-0.5">${meta.subtitle}</span>` : ''}
                </div>
            </div>
            ${isAlreadyAdded ? '<span class="text-xs font-semibold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">Actif</span>' : ''}
        `;
        row.addEventListener('click', () => {
            currencies[selectingForIndex] = code;
            saveState();
            renderCurrencies();
            closeCurrencyModal();
        });

        fragment.appendChild(row);
    });

    if (matchCount === 0) {
        const emptyMsg = document.createElement('div');
        emptyMsg.className = 'text-center py-8 text-gray-400 text-sm';
        emptyMsg.textContent = `Aucune devise trouvée pour « ${searchQuery} »`;
        fragment.appendChild(emptyMsg);
    }

    modalCurrencyList.appendChild(fragment);
}

// Setup Event Listeners
function setupEventListeners() {
    closeModalBtn.addEventListener('click', closeCurrencyModal);

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

    addCurrencyBtn.addEventListener('click', () => {
        const available = Object.keys(exchangeRates).filter(c => !currencies.includes(c));
        const toAdd = available.includes('USD') ? 'USD' : (available[0] || 'EUR');

        currencies.push(toAdd);
        saveState();
        renderCurrencies();
    });

    toggleDeleteBtn.addEventListener('click', () => {
        isEditingMode = !isEditingMode;
        if (isEditingMode) {
            toggleDeleteBtn.className = "bg-red-100 hover:bg-red-200 text-red-700 font-semibold py-2 px-3 rounded-xl transition-colors shadow-sm flex justify-center items-center cursor-pointer";
        } else {
            toggleDeleteBtn.className = "bg-gray-200 hover:bg-gray-300 text-gray-700 font-semibold py-2 px-3 rounded-xl transition-colors shadow-sm flex justify-center items-center cursor-pointer";
        }
        renderCurrencies();
    });

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
            activeValueString = '0';
            shouldResetValue = true;
            updateDisplayValues();
        }
    });
}

// Fast Keypad Processing
function handleKeypadInput(val) {
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
        return new Intl.NumberFormat('fr-FR', {
            maximumFractionDigits: maxFractionDigits,
            minimumFractionDigits: 0
        }).format(amount);
    } catch (e) {
        return amount.toFixed(maxFractionDigits).replace(/\.?0+$/, '');
    }
}

// Multi-Directional Conversion Calculation
function calculateValue(targetCurrencyIndex) {
    if (targetCurrencyIndex === activeIndex) {
        return activeValueString;
    }

    const activeCurrency = currencies[activeIndex];
    const targetCurrency = currencies[targetCurrencyIndex];
    const amount = parseFloat(activeValueString) || 0;

    const rateActive = exchangeRates[activeCurrency] || 1;
    const rateTarget = exchangeRates[targetCurrency] || 1;

    // Convert via EUR base
    const amountInEur = amount / rateActive;
    const convertedAmount = amountInEur * rateTarget;

    return formatCurrencyValue(convertedAmount);
}

// Ultra-fast updates for 60fps keypad fluidity without DOM re-creation
function updateDisplayValues() {
    currencies.forEach((currency, index) => {
        const valSpan = document.getElementById(`currency-val-${index}`);
        if (!valSpan) return;

        const displayValue = calculateValue(index);
        const isEditing = index === activeIndex;

        valSpan.innerHTML = `${displayValue}${isEditing ? '<span class="animate-pulse text-blue-600">|</span>' : ''}`;
    });
}

// Full DOM render (only called on Add, Remove, Reorder, or Focus change)
function renderCurrencies() {
    currencyList.innerHTML = '';
    const fragment = document.createDocumentFragment();

    currencies.forEach((currency, index) => {
        const isEditing = index === activeIndex;
        const displayValue = calculateValue(index);

        const row = document.createElement('div');
        row.className = `flex items-center gap-1.5 p-2 rounded-xl border-2 transition-all cursor-pointer ${
            isEditing
                ? 'bg-gradient-active border-blue-500 shadow-md scale-[1.01]'
                : 'card-inactive border-gray-100 hover:border-gray-200'
        }`;

        row.addEventListener('click', (e) => {
            if (e.target.closest('.delete-btn') || e.target.closest('.currency-selector')) return;

            if (activeIndex !== index) {
                // Keep the exact numerical value when switching row
                const currentCalculated = parseFloat(calculateValue(index).replace(/\s/g, '').replace(',', '.')) || 0;
                activeIndex = index;
                activeValueString = currentCalculated.toString();
                shouldResetValue = true;
                renderCurrencies();
            }
        });

        let deleteHtml = '';
        if (isEditingMode && currencies.length > 1) {
            deleteHtml = `
                <button class="delete-btn text-gray-400 hover:text-red-500 p-2 mr-1 rounded-full transition-colors cursor-pointer" data-index="${index}" aria-label="Supprimer la devise">
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                </button>
            `;
        } else if (isEditingMode) {
            deleteHtml = `<div class="w-9 mr-1"></div>`;
        }

        row.innerHTML = `
            ${deleteHtml}
            <div class="flex flex-col relative items-center justify-center cursor-pointer currency-selector hover:bg-gray-200/50 p-1.5 rounded-lg" data-index="${index}">
                <div class="text-xl mb-0.5">${getFlagEmoji(currency)}</div>
                <div class="font-bold text-gray-700 text-xs flex items-center gap-1">
                    ${currency}
                    <svg class="h-3 w-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path></svg>
                </div>
            </div>

            <div class="flex-grow text-right overflow-hidden flex flex-col justify-center">
                <div class="text-xl font-bold tracking-tight text-gray-900 truncate w-full no-keyboard flex items-center justify-end gap-1">
                    <span id="currency-val-${index}">${displayValue}${isEditing ? '<span class="animate-pulse text-blue-600">|</span>' : ''}</span>
                    <span class="text-emerald-600 text-lg font-semibold ml-1">${getCurrencySymbol(currency)}</span>
                </div>
            </div>
        `;

        fragment.appendChild(row);
    });

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
            let newValueForNextActive = '1';
            if (activeIndex === index) {
                const nextActiveIndex = index === 0 ? 1 : 0;
                newValueForNextActive = calculateValue(nextActiveIndex);
            }

            currencies.splice(index, 1);

            if (activeIndex === index) {
                activeIndex = 0;
                activeValueString = newValueForNextActive;
                shouldResetValue = true;
            } else if (activeIndex > index) {
                activeIndex--;
            }

            saveState();
            renderCurrencies();
        });
    });
}

function saveState() {
    localStorage.setItem('userCurrencies', JSON.stringify(currencies));
}

// Start app
initApp();
