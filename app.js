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
    TWD: 34.8
};

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
let currencyNamesFormatter;
try {
    currencyNamesFormatter = new Intl.DisplayNames(['fr'], { type: 'currency' });
} catch (e) {
    // Fallback if not supported
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
            navigator.serviceWorker.register('./sw.js').catch(err => {
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

function updateLastUpdatedText(isOffline = false) {
    if (lastFetchDate) {
        const dateParts = lastFetchDate.split('-');
        const formattedDate = dateParts.length === 3 ? `${dateParts[2]}/${dateParts[1]}` : lastFetchDate;
        lastUpdatedEl.textContent = isOffline
            ? `Hors-ligne (taux ${formattedDate})`
            : `Taux : ${formattedDate}`;
    } else {
        lastUpdatedEl.textContent = 'Taux enregistrés';
    }
}

// Modal logic
function openCurrencyModal(index) {
    selectingForIndex = index;
    currencySearch.value = '';
    if (clearSearchBtn) clearSearchBtn.classList.add('hidden');
    renderModalCurrencies('');
    currencyModal.classList.remove('hidden');
    currencyModal.classList.add('flex');
    setTimeout(() => currencySearch.focus(), 50);
}

function renderModalCurrencies(searchQuery) {
    modalCurrencyList.innerHTML = '';
    const query = searchQuery.trim().toLowerCase();
    const availableCurrencies = Object.keys(exchangeRates).sort();

    const fragment = document.createDocumentFragment();

    availableCurrencies.forEach(code => {
        let name = code;
        if (currencyNamesFormatter) {
            try {
                name = currencyNamesFormatter.of(code) || code;
            } catch(e) {}
        }

        const searchString = `${code} ${name}`.toLowerCase();
        if (query && !searchString.includes(query)) return;

        const isAlreadyAdded = currencies.includes(code);

        const row = document.createElement('div');
        row.className = `flex items-center justify-between p-3 rounded-xl cursor-pointer transition-colors ${
            isAlreadyAdded ? 'bg-blue-50/70 hover:bg-blue-100' : 'hover:bg-gray-100'
        }`;
        row.innerHTML = `
            <div class="flex items-center gap-4">
                <div class="text-3xl">${getFlagEmoji(code)}</div>
                <div class="flex flex-col">
                    <span class="font-bold text-gray-800">${code}</span>
                    <span class="text-sm text-gray-500">${name}</span>
                </div>
            </div>
            ${isAlreadyAdded ? '<span class="text-xs font-semibold text-blue-600 bg-blue-100 px-2 py-0.5 rounded-full">Actif</span>' : ''}
        `;
        row.addEventListener('click', () => {
            currencies[selectingForIndex] = code;
            saveState();
            renderCurrencies();
            currencyModal.classList.add('hidden');
            currencyModal.classList.remove('flex');
        });

        fragment.appendChild(row);
    });

    modalCurrencyList.appendChild(fragment);
}

// Setup Event Listeners
function setupEventListeners() {
    closeModalBtn.addEventListener('click', () => {
        currencyModal.classList.add('hidden');
        currencyModal.classList.remove('flex');
    });

    currencySearch.addEventListener('input', (e) => {
        const val = e.target.value;
        if (clearSearchBtn) {
            clearSearchBtn.classList.toggle('hidden', val.length === 0);
        }
        renderModalCurrencies(val);
    });

    if (clearSearchBtn) {
        clearSearchBtn.addEventListener('click', () => {
            currencySearch.value = '';
            clearSearchBtn.classList.add('hidden');
            currencySearch.focus();
            renderModalCurrencies('');
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

        valSpan.innerHTML = `${displayValue}${isEditing ? '<span class="animate-pulse text-blue-500">|</span>' : ''}`;
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
        row.className = `flex items-center gap-1.5 p-1.5 rounded-xl border-2 transition-all cursor-pointer ${
            isEditing
                ? 'bg-blue-50 border-blue-500 shadow-md scale-[1.02]'
                : 'bg-white border-transparent shadow-sm hover:bg-gray-50'
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
                <div class="text-xl font-bold tracking-tight text-gray-800 truncate w-full no-keyboard flex items-center justify-end gap-1">
                    <span id="currency-val-${index}">${displayValue}${isEditing ? '<span class="animate-pulse text-blue-500">|</span>' : ''}</span>
                    <span class="text-gray-500 text-lg font-normal ml-1">${getCurrencySymbol(currency)}</span>
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
