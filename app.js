// State variables
let baseCurrency = localStorage.getItem('baseCurrency') || 'EUR';
let targetCurrencies = JSON.parse(localStorage.getItem('targetCurrencies')) || ['TWD'];
let exchangeRates = JSON.parse(localStorage.getItem('exchangeRates')) || {};
let lastFetchDate = localStorage.getItem('lastFetchDate') || null;
let currentAmount = 1;

// Elements
const amountInput = document.getElementById('amountInput');
const baseCurrencySelect = document.getElementById('baseCurrencySelect');
const targetsList = document.getElementById('targetsList');
const addCurrencySelect = document.getElementById('addCurrencySelect');
const lastUpdatedEl = document.getElementById('lastUpdated');

// Initialize app
async function initApp() {
    registerServiceWorker();
    await fetchRates();
    populateSelects();
    renderTargets();

    amountInput.addEventListener('input', handleAmountChange);
    baseCurrencySelect.addEventListener('change', handleBaseCurrencyChange);
    addCurrencySelect.addEventListener('change', handleAddCurrency);
}

// Register Service Worker
function registerServiceWorker() {
    if ('serviceWorker' in navigator) {
        window.addEventListener('load', () => {
            navigator.serviceWorker.register('./sw.js').then(registration => {
                console.log('ServiceWorker registration successful with scope: ', registration.scope);
            }, err => {
                console.log('ServiceWorker registration failed: ', err);
            });
        });
    }
}

// Fetch exchange rates from Frankfurter API
async function fetchRates() {
    const today = new Date().toISOString().split('T')[0];

    // Only fetch once per day if network is available
    if (lastFetchDate === today && Object.keys(exchangeRates).length > 0) {
        updateLastUpdatedText();
        return;
    }

    try {
        // Fallback to er-api since Frankfurter API seems to be blocked/down sometimes
        const response = await fetch(`https://open.er-api.com/v6/latest/EUR`);
        if (!response.ok) throw new Error('Network response was not ok');
        const data = await response.json();

        // er-api returns rates against EUR
        exchangeRates = data.rates;

        lastFetchDate = today;
        localStorage.setItem('exchangeRates', JSON.stringify(exchangeRates));
        localStorage.setItem('lastFetchDate', lastFetchDate);

        updateLastUpdatedText();
    } catch (error) {
        console.error('Failed to fetch rates, using cached data if available', error);
        updateLastUpdatedText(true);
    }
}

function updateLastUpdatedText(isOffline = false) {
    if (lastFetchDate) {
        lastUpdatedEl.textContent = isOffline
            ? `Offline mode - Last updated: ${lastFetchDate}`
            : `Rates updated: ${lastFetchDate}`;
    } else {
        lastUpdatedEl.textContent = 'No rates available. Please connect to internet.';
    }
}

// Conversion Logic
function convert(amount, from, to) {
    if (!exchangeRates[from] || !exchangeRates[to]) return 'N/A';

    // Since all rates are relative to EUR:
    // Value in EUR = amount / rate_of_from
    // Value in Target = Value in EUR * rate_of_to
    const amountInEur = amount / exchangeRates[from];
    const convertedAmount = amountInEur * exchangeRates[to];

    return convertedAmount.toFixed(2);
}

// Event Handlers
function handleAmountChange(e) {
    currentAmount = parseFloat(e.target.value) || 0;
    renderTargets();
}

function handleBaseCurrencyChange(e) {
    baseCurrency = e.target.value;
    localStorage.setItem('baseCurrency', baseCurrency);
    renderTargets();
}

function handleAddCurrency(e) {
    const newCurrency = e.target.value;
    if (newCurrency && !targetCurrencies.includes(newCurrency) && newCurrency !== baseCurrency) {
        targetCurrencies.push(newCurrency);
        saveTargets();
        renderTargets();
    }
    e.target.value = ''; // Reset select
}

function removeCurrency(currencyToRemove) {
    targetCurrencies = targetCurrencies.filter(c => c !== currencyToRemove);
    saveTargets();
    renderTargets();
}

function saveTargets() {
    localStorage.setItem('targetCurrencies', JSON.stringify(targetCurrencies));
}

// UI Rendering
function populateSelects() {
    const currencies = Object.keys(exchangeRates).sort();

    // Clear selects
    baseCurrencySelect.innerHTML = '';
    addCurrencySelect.innerHTML = '<option value="" disabled selected>Add currency...</option>';

    currencies.forEach(currency => {
        // Populate base currency select
        const baseOption = document.createElement('option');
        baseOption.value = currency;
        baseOption.textContent = currency;
        if (currency === baseCurrency) baseOption.selected = true;
        baseCurrencySelect.appendChild(baseOption);

        // Populate add currency select
        const addOption = document.createElement('option');
        addOption.value = currency;
        addOption.textContent = currency;
        addCurrencySelect.appendChild(addOption);
    });
}

function renderTargets() {
    targetsList.innerHTML = '';

    targetCurrencies.forEach(targetCurrency => {
        if (targetCurrency === baseCurrency) return; // Don't show base currency in targets

        const converted = convert(currentAmount, baseCurrency, targetCurrency);

        const li = document.createElement('li');
        li.className = 'flex justify-between items-center p-4 bg-white rounded-xl shadow-sm border border-gray-100 mb-3';

        li.innerHTML = `
            <div class="flex flex-col">
                <span class="text-2xl font-bold text-gray-800">${converted}</span>
                <span class="text-sm font-medium text-gray-500">${targetCurrency}</span>
            </div>
            <button onclick="removeCurrency('${targetCurrency}')" class="text-red-400 hover:text-red-600 p-2 rounded-full hover:bg-red-50 transition-colors" aria-label="Remove ${targetCurrency}">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
            </button>
        `;
        targetsList.appendChild(li);
    });
}

// Start
initApp();
