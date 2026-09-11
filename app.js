// State variables
let currencies = JSON.parse(localStorage.getItem('userCurrencies')) || ['EUR', 'TWD'];
let exchangeRates = JSON.parse(localStorage.getItem('exchangeRates')) || {};
let lastFetchDate = localStorage.getItem('lastFetchDate') || null;

// New state for multi-directional calculation
let activeIndex = 0; // The row currently being edited
let activeValueString = '1'; // The raw string typed by user for the active row

// Elements
const currencyList = document.getElementById('currencyList');
const addCurrencyBtn = document.getElementById('addCurrencyBtn');
const lastUpdatedEl = document.getElementById('lastUpdated');
const keypadBtns = document.querySelectorAll('.keypad-btn');

// Utility: Currency Code to Flag Emoji
function getFlagEmoji(currencyCode) {
    // Special cases
    if (currencyCode === 'EUR') return '🇪🇺';
    if (currencyCode === 'USD') return '🇺🇸';
    if (currencyCode === 'GBP') return '🇬🇧';
    if (currencyCode === 'TWD') return '🇹🇼';

    // Standard ISO 4217 mapping (first 2 letters map to country code)
    const countryCode = currencyCode.substring(0, 2);
    const codePoints = countryCode
        .toUpperCase()
        .split('')
        .map(char =>  127397 + char.charCodeAt());

    // Fallback if flag isn't supported (some OS might not render)
    try {
        return String.fromCodePoint(...codePoints);
    } catch (e) {
        return '💰';
    }
}

// Initialize app
async function initApp() {
    registerServiceWorker();
    await fetchRates();

    // Ensure EUR is baseline if rates are empty initially
    if(Object.keys(exchangeRates).length === 0) {
        exchangeRates['EUR'] = 1;
    }

    renderCurrencies();
    setupEventListeners();
}

// Register Service Worker
function registerServiceWorker() {
    if ('serviceWorker' in navigator) {
        window.addEventListener('load', () => {
            navigator.serviceWorker.register('./sw.js').then(registration => {
                console.log('ServiceWorker registration successful');
            }).catch(err => {
                console.log('ServiceWorker registration failed: ', err);
            });
        });
    }
}

// Fetch exchange rates
async function fetchRates() {
    const today = new Date().toISOString().split('T')[0];

    if (lastFetchDate === today && Object.keys(exchangeRates).length > 0) {
        updateLastUpdatedText();
        return;
    }

    try {
        const response = await fetch(`https://open.er-api.com/v6/latest/EUR`);
        if (!response.ok) throw new Error('Network response was not ok');
        const data = await response.json();

        exchangeRates = data.rates;

        lastFetchDate = today;
        localStorage.setItem('exchangeRates', JSON.stringify(exchangeRates));
        localStorage.setItem('lastFetchDate', lastFetchDate);

        updateLastUpdatedText();
    } catch (error) {
        console.error('Failed to fetch rates', error);
        updateLastUpdatedText(true);
    }
}

function updateLastUpdatedText(isOffline = false) {
    if (lastFetchDate) {
        lastUpdatedEl.textContent = isOffline
            ? `Offline - Last updated: ${lastFetchDate}`
            : `Rates updated: ${lastFetchDate}`;
    } else {
        lastUpdatedEl.textContent = 'No rates available. Please connect.';
    }
}

// Setup global listeners
function setupEventListeners() {
    addCurrencyBtn.addEventListener('click', () => {
        // Add USD or first available currency not in list
        const available = Object.keys(exchangeRates).filter(c => !currencies.includes(c));
        const toAdd = available.includes('USD') ? 'USD' : (available[0] || 'EUR');

        currencies.push(toAdd);
        saveState();
        renderCurrencies();
    });

    keypadBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            // Prevent event from bubbling up to button children if clicked on SVG
            const val = e.currentTarget.dataset.val;
            handleKeypadInput(val);
        });
    });
}

// Handle Keypad
function handleKeypadInput(val) {
    if (val === 'delete') {
        activeValueString = activeValueString.slice(0, -1);
        if (activeValueString === '') activeValueString = '0';
    } else if (val === '.') {
        if (!activeValueString.includes('.')) {
            activeValueString += '.';
        }
    } else {
        if (activeValueString === '0' && val !== '.') {
            activeValueString = val;
        } else {
            // Limit length
            if (activeValueString.length < 12) {
                activeValueString += val;
            }
        }
    }
    renderCurrencies();
}

// Conversion Logic
function calculateValue(targetCurrencyIndex) {
    if (targetCurrencyIndex === activeIndex) {
        return activeValueString;
    }

    const activeCurrency = currencies[activeIndex];
    const targetCurrency = currencies[targetCurrencyIndex];

    const amount = parseFloat(activeValueString) || 0;

    if (!exchangeRates[activeCurrency] || !exchangeRates[targetCurrency]) return '0.00';

    // Convert logic (everything is relative to EUR base from er-api)
    const amountInEur = amount / exchangeRates[activeCurrency];
    const convertedAmount = amountInEur * exchangeRates[targetCurrency];

    // Format appropriately: remove trailing zeros if not needed, max 2 decimals
    let formatted = convertedAmount.toFixed(2);
    formatted = parseFloat(formatted).toString();
    return formatted;
}

// UI Rendering
function renderCurrencies() {
    currencyList.innerHTML = '';

    const availableCurrencies = Object.keys(exchangeRates).sort();

    currencies.forEach((currency, index) => {
        const isEditing = index === activeIndex;
        const displayValue = calculateValue(index);

        const row = document.createElement('div');
        row.className = `flex items-center gap-3 p-4 rounded-2xl border-2 transition-all cursor-pointer ${
            isEditing
                ? 'bg-blue-50 border-blue-500 shadow-md transform scale-[1.02]'
                : 'bg-white border-transparent shadow-sm hover:bg-gray-50'
        }`;

        // Select logic
        row.addEventListener('click', (e) => {
            // Ignore click if clicking select or delete
            if (e.target.tagName === 'SELECT' || e.target.closest('.delete-btn')) return;

            if (activeIndex !== index) {
                activeIndex = index;
                activeValueString = displayValue;
                renderCurrencies();
            }
        });

        // Delete button (only if more than 2 currencies)
        let deleteHtml = '';
        if (currencies.length > 2) {
            deleteHtml = `
                <button class="delete-btn text-gray-400 hover:text-red-500 p-2 mr-4 rounded-full transition-colors" data-index="${index}">
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                </button>
            `;
        } else {
             deleteHtml = `<div class="w-9 mr-4"></div>`; // spacer
        }

        // Dropdown options
        const optionsHtml = availableCurrencies.map(c =>
            `<option value="${c}" ${c === currency ? 'selected' : ''}>${c}</option>`
        ).join('');

        row.innerHTML = `
            ${deleteHtml}
            <div class="flex flex-col relative">
                <div class="text-3xl mb-1">${getFlagEmoji(currency)}</div>
                <select class="appearance-none bg-transparent font-bold text-gray-700 text-sm focus:outline-none cursor-pointer pr-4" data-index="${index}">
                    ${optionsHtml}
                </select>
                <!-- chevron for select -->
                <div class="pointer-events-none absolute bottom-0.5 right-0 flex items-center text-gray-400">
                     <svg class="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path></svg>
                </div>
            </div>

            <div class="flex-grow text-right overflow-hidden flex flex-col justify-center">
                <div class="text-3xl font-bold tracking-tight text-gray-800 truncate w-full no-keyboard">
                    ${displayValue}${isEditing && !displayValue.includes('.') ? '<span class="animate-pulse text-blue-500">|</span>' : ''}
                </div>
            </div>
        `;

        currencyList.appendChild(row);
    });

    // Attach listeners for newly created elements
    document.querySelectorAll('select').forEach(select => {
        select.addEventListener('change', (e) => {
            const index = parseInt(e.target.dataset.index);
            currencies[index] = e.target.value;
            saveState();
            renderCurrencies();
        });
    });

    document.querySelectorAll('.delete-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const index = parseInt(e.currentTarget.dataset.index);
            currencies.splice(index, 1);

            // Adjust active index if needed
            if (activeIndex === index) {
                activeIndex = 0; // Reset to top
                // Recalculate activeValueString from the new active element
                activeValueString = calculateValue(0);
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

// Start
initApp();
