// Global variables
let timer;
let expirationTime;
let qrCode;
let dynamicQRUpdateInterval;

// DOM elements
const amountInput = document.getElementById('amount');
const expirationTimeSelect = document.getElementById('expirationTime');
const generateButton = document.getElementById('generateQR');
const downloadButton = document.getElementById('downloadQR');
const simulatePaymentButton = document.getElementById('simulatePayment');
const qrcodeDiv = document.getElementById('qrcode');
const paymentInfoDiv = document.getElementById('paymentInfo');
const timerDisplayDiv = document.getElementById('timerDisplay');
const transactionHistoryList = document.getElementById('transactionHistory');
const themeSwitch = document.getElementById('themeSwitch');

// Event listeners
generateButton.addEventListener('click', generatePaymentQR);
downloadButton.addEventListener('click', downloadQRCode);
simulatePaymentButton.addEventListener('click', simulatePayment);
themeSwitch.addEventListener('change', toggleTheme);

// Load transaction history from local storage
let transactionHistory = JSON.parse(localStorage.getItem('transactionHistory')) || [];
updateTransactionHistoryDisplay();

// Initialize theme
if (localStorage.getItem('darkMode') === 'true') {
    document.body.classList.add('dark-mode');
    themeSwitch.checked = true;
}

/**
 * Toggles between light and dark mode
 */
function toggleTheme() {
    document.body.classList.toggle('dark-mode');
    localStorage.setItem('darkMode', document.body.classList.contains('dark-mode'));
}

/**
 * Generates a payment QR code based on user input
 */
function generatePaymentQR() {
    const amount = amountInput.value;
    expirationTime = parseInt(expirationTimeSelect.value);
    
    if (!isValidAmount(amount)) {
        showError('Please enter a valid amount');
        return;
    }

    clearExistingQRCode();

    const transactionId = generateTransactionId();
    const expirationTimestamp = Date.now() + (expirationTime * 1000);
    const paymentUrl = constructPaymentUrl(transactionId, amount, expirationTimestamp);

    createDynamicQRCode(paymentUrl);
    displayPaymentInfo(amount, transactionId);
    startTimer(expirationTime);
    addToTransactionHistory(amount, transactionId);
    downloadButton.style.display = 'block';
    simulatePaymentButton.style.display = 'block';
}

/**
 * Validates the input amount
 * @param {string} amount - The input amount
 * @returns {boolean} - True if the amount is valid, false otherwise
 */
function isValidAmount(amount) {
    return amount && !isNaN(amount) && parseFloat(amount) > 0;
}

/**
 * Displays an error message
 * @param {string} message - The error message to display
 */
function showError(message) {
    const errorDiv = document.createElement('div');
    errorDiv.className = 'error';
    errorDiv.textContent = message;
    qrcodeDiv.innerHTML = '';
    qrcodeDiv.appendChild(errorDiv);
}

/**
 * Clears any existing QR code and timer
 */
function clearExistingQRCode() {
    if (timer) clearInterval(timer);
    if (dynamicQRUpdateInterval) clearInterval(dynamicQRUpdateInterval);
    qrcodeDiv.innerHTML = '';
    downloadButton.style.display = 'none';
    simulatePaymentButton.style.display = 'none';
}

/**
 * Generates a random transaction ID
 * @returns {string} - A random transaction ID
 */
function generateTransactionId() {
    return Math.random().toString(36).substr(2, 9);
}

/**
 * Constructs the payment URL
 * @param {string} transactionId - The transaction ID
 * @param {string} amount - The payment amount
 * @param {number} expirationTimestamp - The expiration timestamp
 * @returns {string} - The constructed payment URL
 */
function constructPaymentUrl(transactionId, amount, expirationTimestamp) {
    return `https://example.com/pay/${transactionId}?amount=${amount}&expires=${expirationTimestamp}`;
}

/**
 * Creates a dynamic QR code that updates with the time remaining
 * @param {string} baseUrl - The base payment URL
 */
function createDynamicQRCode(baseUrl) {
    qrcodeDiv.innerHTML = ''; // Clear existing QR code
    qrCode = new QRCode(qrcodeDiv, {
        text: baseUrl,
        width: 200,
        height: 200,
        colorDark : "#000000",
        colorLight : "#ffffff",
        correctLevel : QRCode.CorrectLevel.H
    });

    // Update QR code every second
    dynamicQRUpdateInterval = setInterval(() => {
        const updatedUrl = `${baseUrl}&timeLeft=${Math.floor(expirationTime)}`;
        qrCode.clear();
        qrCode.makeCode(updatedUrl);
    }, 1000);
}

/**
 * Displays the payment information
 * @param {string} amount - The payment amount
 * @param {string} transactionId - The transaction ID
 */
function displayPaymentInfo(amount, transactionId) {
    paymentInfoDiv.innerHTML = `
        <h3>Payment Details</h3>
        <p><strong>Amount:</strong> $${amount}</p>
        <p><strong>Transaction ID:</strong> ${transactionId}</p>
        <p><strong>Expires in:</strong> ${expirationTime} seconds</p>
    `;
}

/**
 * Starts the expiration timer
 * @param {number} duration - The duration of the timer in seconds
 */
function startTimer(duration) {
    let timeLeft = duration;
    updateTimerDisplay(timeLeft);

    timer = setInterval(() => {
        timeLeft--;
        if (timeLeft < 0) {
            clearInterval(timer);
            clearInterval(dynamicQRUpdateInterval);
            handleExpiredQRCode();
        } else {
            updateTimerDisplay(timeLeft);
            expirationTime = timeLeft; // Update global expirationTime for dynamic QR
        }
    }, 1000);
}

/**
 * Updates the timer display
 * @param {number} timeLeft - The time left in seconds
 */
function updateTimerDisplay(timeLeft) {
    timerDisplayDiv.innerHTML = `<p>Time remaining: ${timeLeft} seconds</p>`;
}

/**
 * Handles the expiration of the QR code
 */
function handleExpiredQRCode() {
    timerDisplayDiv.innerHTML = '<p class="expired">QR Code Expired</p>';
    qrcodeDiv.innerHTML = '';
    paymentInfoDiv.innerHTML = '';
    downloadButton.style.display = 'none';
    simulatePaymentButton.style.display = 'none';
}

/**
 * Adds a transaction to the history
 * @param {string} amount - The payment amount
 * @param {string} transactionId - The transaction ID
 */
function addToTransactionHistory(amount, transactionId) {
    const transaction = {
        amount,
        transactionId,
        timestamp: new Date().toISOString()
    };
    transactionHistory.unshift(transaction);
    if (transactionHistory.length > 5) {
        transactionHistory.pop();
    }
    localStorage.setItem('transactionHistory', JSON.stringify(transactionHistory));
    updateTransactionHistoryDisplay();
}

/**
 * Updates the transaction history display
 */
function updateTransactionHistoryDisplay() {
    transactionHistoryList.innerHTML = '';
    transactionHistory.forEach(transaction => {
        const li = document.createElement('li');
        li.textContent = `$${transaction.amount} - ${new Date(transaction.timestamp).toLocaleString()}`;
        transactionHistoryList.appendChild(li);
    });
}

/**
 * Downloads the QR code as an image
 */
function downloadQRCode() {
    if (!qrCode) return;
    
    const canvas = qrcodeDiv.querySelector('canvas');
    if (canvas) {
        const dataURL = canvas.toDataURL('image/png');
        const link = document.createElement('a');
        link.download = 'qr-code.png';
        link.href = dataURL;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }
}

/**
 * Simulates a payment confirmation
 */
function simulatePayment() {
    clearInterval(timer);
    clearInterval(dynamicQRUpdateInterval);
    qrcodeDiv.innerHTML = '<p class="success">Payment Successful!</p>';
    timerDisplayDiv.innerHTML = '';
    simulatePaymentButton.style.display = 'none';
    downloadButton.style.display = 'none';
}

// Initialize the page
document.addEventListener('DOMContentLoaded', () => {
    // Set default values if needed
    expirationTimeSelect.value = '60'; // Default to 1 minute
});