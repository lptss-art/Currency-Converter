// State variables
let currencies = JSON.parse(localStorage.getItem('userCurrencies')) || ['EUR', 'USD', 'GBP', 'JPY', 'TWD'];
let exchangeRates = JSON.parse(localStorage.getItem('exchangeRates')) || {};
let lastFetchDate = localStorage.getItem('lastFetchDate') || null;

// New state for multi-directional calculation
let activeIndex = 0; // The row currently being edited
let activeValueString = '1'; // The raw string typed by user for the active row
let shouldResetValue = true; // True if the next keypress should override the value
let isEditingMode = false; // Whether delete buttons are shown

// Elements
const currencyList = document.getElementById('currencyList');
const addCurrencyBtn = document.getElementById('addCurrencyBtn');
const toggleDeleteBtn = document.getElementById('toggleDeleteBtn');
const lastUpdatedEl = document.getElementById('lastUpdated');
const keypadBtns = document.querySelectorAll('.keypad-btn');
const currencyModal = document.getElementById('currencyModal');
const closeModalBtn = document.getElementById('closeModalBtn');
const currencySearch = document.getElementById('currencySearch');
const modalCurrencyList = document.getElementById('modalCurrencyList');

let selectingForIndex = -1;
let currencyNamesFormatter;
try {
    currencyNamesFormatter = new Intl.DisplayNames(['en'], { type: 'currency' });
} catch (e) {
    // Fallback if not supported
}

function getCurrencySymbol(code) {
    try {
        const formatter = new Intl.NumberFormat('en', { style: 'currency', currency: code, maximumFractionDigits: 0 });
        const parts = formatter.formatToParts(0);
        const symbolPart = parts.find(part => part.type === 'currency');
        return symbolPart ? symbolPart.value : code;
    } catch(e) {
        return code;
    }
}

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

    // Ensure EUR is baseline if rates are empty initially
    if(Object.keys(exchangeRates).length === 0) {
        exchangeRates['EUR'] = 1;
    }

    renderCurrencies();
    setupEventListeners();
    setupSortable();

    // Fetch new rates asynchronously without blocking UI rendering
    fetchRates().then(() => {
        renderCurrencies();
    });
}

function setupSortable() {
    if (typeof Sortable !== 'undefined') {
        new Sortable(currencyList, {
            delay: 300,
            delayOnTouchOnly: true,
            animation: 150,
            onEnd: function (evt) {
                const oldIndex = evt.oldIndex;
                const newIndex = evt.newIndex;
                if (oldIndex === newIndex) return;

                // Move in array
                const movedCurrency = currencies.splice(oldIndex, 1)[0];
                currencies.splice(newIndex, 0, movedCurrency);

                // Update active index tracking so editing stays on the right item
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

// Modal logic
function openCurrencyModal(index) {
    selectingForIndex = index;
    currencySearch.value = '';
    renderModalCurrencies('');
    currencyModal.classList.remove('hidden');
    currencyModal.classList.add('flex');
}

function renderModalCurrencies(searchQuery) {
    modalCurrencyList.innerHTML = '';
    const query = searchQuery.toLowerCase();

    const availableCurrencies = Object.keys(exchangeRates).sort();

    availableCurrencies.forEach(code => {
        let name = code;
        if (currencyNamesFormatter) {
            try {
                name = currencyNamesFormatter.of(code);
            } catch(e) {}
        }

        const searchString = `${code} ${name}`.toLowerCase();
        if (query && !searchString.includes(query)) return;

        const row = document.createElement('div');
        row.className = "flex items-center gap-4 p-3 hover:bg-gray-100 rounded-xl cursor-pointer transition-colors";
        row.innerHTML = `
            <div class="text-3xl">${getFlagEmoji(code)}</div>
            <div class="flex flex-col">
                <span class="font-bold text-gray-800">${code}</span>
                <span class="text-sm text-gray-500">${name}</span>
            </div>
        `;
        row.addEventListener('click', () => {
            currencies[selectingForIndex] = code;
            saveState();
            renderCurrencies();
            currencyModal.classList.add('hidden');
            currencyModal.classList.remove('flex');
        });

        modalCurrencyList.appendChild(row);
    });
}

// Setup global listeners
function setupEventListeners() {
    closeModalBtn.addEventListener('click', () => {
        currencyModal.classList.add('hidden');
        currencyModal.classList.remove('flex');
    });

    currencySearch.addEventListener('input', (e) => {
        renderModalCurrencies(e.target.value);
    });

    addCurrencyBtn.addEventListener('click', () => {
        // Add USD or first available currency not in list
        const available = Object.keys(exchangeRates).filter(c => !currencies.includes(c));
        const toAdd = available.includes('USD') ? 'USD' : (available[0] || 'EUR');

        currencies.push(toAdd);
        saveState();
        renderCurrencies();
    });

    toggleDeleteBtn.addEventListener('click', () => {
        isEditingMode = !isEditingMode;
        if (isEditingMode) {
            toggleDeleteBtn.classList.replace('bg-gray-200', 'bg-red-100');
            toggleDeleteBtn.classList.replace('hover:bg-gray-300', 'hover:bg-red-200');
            toggleDeleteBtn.classList.replace('text-gray-700', 'text-red-700');
        } else {
            toggleDeleteBtn.classList.replace('bg-red-100', 'bg-gray-200');
            toggleDeleteBtn.classList.replace('hover:bg-red-200', 'hover:bg-gray-300');
            toggleDeleteBtn.classList.replace('text-red-700', 'text-gray-700');
        }
        renderCurrencies();
    });

    keypadBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            // Trigger haptic feedback if supported (50ms vibration)
            if (navigator.vibrate) {
                navigator.vibrate(50);
            }

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
        shouldResetValue = false; // deleting implies we are editing now
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
        row.className = `flex items-center gap-1.5 p-1.5 rounded-xl border-2 transition-all cursor-pointer ${
            isEditing
                ? 'bg-blue-50 border-blue-500 shadow-md transform scale-[1.02]'
                : 'bg-white border-transparent shadow-sm hover:bg-gray-50'
        }`;

        // Select logic
        row.addEventListener('click', (e) => {
            // Ignore click if clicking delete or currency selector
            if (e.target.closest('.delete-btn') || e.target.closest('.currency-selector')) return;

            if (activeIndex !== index) {
                activeIndex = index;
                activeValueString = displayValue;
                shouldResetValue = true; // Reset on focus change
                renderCurrencies();
            }
        });

        // Delete button (only if more than 1 currency and editing mode is active)
        let deleteHtml = '';
        if (isEditingMode && currencies.length > 1) {
            deleteHtml = `
                <button class="delete-btn text-gray-400 hover:text-red-500 p-2 mr-1 rounded-full transition-colors" data-index="${index}">
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                </button>
            `;
        } else if (isEditingMode) {
             deleteHtml = `<div class="w-9 mr-1"></div>`; // spacer to keep aligned if only 1 left
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
                    <span>${displayValue}${isEditing ? '<span class="animate-pulse text-blue-500">|</span>' : ''}</span>
                    <span class="text-gray-500 text-lg font-normal ml-1">${getCurrencySymbol(currency)}</span>
                </div>
            </div>
        `;

        currencyList.appendChild(row);
    });

    // Attach listeners for newly created elements
    document.querySelectorAll('.currency-selector').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const index = parseInt(e.currentTarget.dataset.index);
            openCurrencyModal(index);
        });
    });

    document.querySelectorAll('.delete-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const index = parseInt(e.currentTarget.dataset.index);

            // Before deleting, determine what the value of the row that WILL become active is.
            // If we are deleting the active row, row 0 will become active (unless we are deleting row 0, then the old row 1 becomes the new row 0).
            let newValueForNextActive = '1';
            if (activeIndex === index) {
                const nextActiveIndex = index === 0 ? 1 : 0;
                newValueForNextActive = calculateValue(nextActiveIndex);
            }

            currencies.splice(index, 1);

            // Adjust active index if needed
            if (activeIndex === index) {
                activeIndex = 0; // Reset to top
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

// Start
initApp();
