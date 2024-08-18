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

function toggleTheme() {
    document.body.classList.toggle('dark-mode');
    localStorage.setItem('darkMode', document.body.classList.contains('dark-mode'));
}

function generatePaymentQR() {
    const amount = amountInput.value;
    expirationTime = parseInt(expirationTimeSelect.value);
    
    if (!isValidAmount(amount)) {
        showError('Please enter a valid amount');
        return;
    }

    clearExistingQRCode();

    const transactionId = generateTransactionId();
    const paymentUrl = constructPaymentUrl(transactionId, amount, expirationTime);

    if (expirationTime > 0) {
        createDynamicQRCode(paymentUrl);
        startTimer(expirationTime);
    } else {
        createFixedQRCode(paymentUrl);
    }

    displayPaymentInfo(amount, transactionId, expirationTime);
    addToTransactionHistory(amount, transactionId, expirationTime, 'Pending');
    downloadButton.style.display = 'block';
    simulatePaymentButton.style.display = 'block';
}

function isValidAmount(amount) {
    return amount && !isNaN(amount) && parseFloat(amount) > 0;
}

function showError(message) {
    const errorDiv = document.createElement('div');
    errorDiv.className = 'error';
    errorDiv.textContent = message;
    qrcodeDiv.innerHTML = '';
    qrcodeDiv.appendChild(errorDiv);
}

function clearExistingQRCode() {
    if (timer) clearInterval(timer);
    if (dynamicQRUpdateInterval) clearInterval(dynamicQRUpdateInterval);
    qrcodeDiv.innerHTML = '';
    downloadButton.style.display = 'none';
    simulatePaymentButton.style.display = 'none';
}

function generateTransactionId() {
    return Math.random().toString(36).substr(2, 9);
}

function constructPaymentUrl(transactionId, amount, expirationTime) {
    let url = `https://example.com/pay/${transactionId}?amount=${amount}`;
    if (expirationTime > 0) {
        const expirationTimestamp = Date.now() + (expirationTime * 1000);
        url += `&expires=${expirationTimestamp}`;
    }
    return url;
}

function createDynamicQRCode(baseUrl) {
    qrcodeDiv.innerHTML = '';
    qrCode = new QRCode(qrcodeDiv, {
        text: baseUrl,
        width: 200,
        height: 200,
        colorDark : "#000000",
        colorLight : "#ffffff",
        correctLevel : QRCode.CorrectLevel.H
    });

    dynamicQRUpdateInterval = setInterval(() => {
        const updatedUrl = `${baseUrl}&timeLeft=${Math.floor(expirationTime)}`;
        qrCode.clear();
        qrCode.makeCode(updatedUrl);
    }, 1000);
}

function createFixedQRCode(url) {
    qrcodeDiv.innerHTML = '';
    qrCode = new QRCode(qrcodeDiv, {
        text: url,
        width: 200,
        height: 200,
        colorDark : "#000000",
        colorLight : "#ffffff",
        correctLevel : QRCode.CorrectLevel.H
    });
}

function displayPaymentInfo(amount, transactionId, expirationTime) {
    paymentInfoDiv.innerHTML = `
        <h3>Payment Details</h3>
        <p><strong>Amount:</strong> $${amount}</p>
        <p><strong>Transaction ID:</strong> ${transactionId}</p>
        ${expirationTime > 0 ? `<p><strong>Expires in:</strong> ${expirationTime} seconds</p>` : '<p><strong>No expiration</strong> (Fixed QR)</p>'}
    `;
}

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
            expirationTime = timeLeft;
        }
    }, 1000);
}

function updateTimerDisplay(timeLeft) {
    timerDisplayDiv.innerHTML = `<p>Time remaining: ${timeLeft} seconds</p>`;
}

function handleExpiredQRCode() {
    timerDisplayDiv.innerHTML = '<p class="expired">QR Code Expired</p>';
    qrcodeDiv.innerHTML = '';
    paymentInfoDiv.innerHTML = '';
    downloadButton.style.display = 'none';
    simulatePaymentButton.style.display = 'none';

    // Update the most recent transaction to 'Expired' if it's still pending
    if (transactionHistory.length > 0 && transactionHistory[0].status === 'Pending') {
        transactionHistory[0].status = 'Expired';
        localStorage.setItem('transactionHistory', JSON.stringify(transactionHistory));
        updateTransactionHistoryDisplay();
    }
}

function addToTransactionHistory(amount, transactionId, expirationTime, status) {
    const transaction = {
        amount,
        transactionId,
        expirationTime,
        status,
        timestamp: new Date().toISOString()
    };
    transactionHistory.unshift(transaction);
    if (transactionHistory.length > 5) {
        transactionHistory.pop();
    }
    localStorage.setItem('transactionHistory', JSON.stringify(transactionHistory));
    updateTransactionHistoryDisplay();
}

function updateTransactionHistoryDisplay() {
    transactionHistoryList.innerHTML = '';
    transactionHistory.forEach(transaction => {
        const li = document.createElement('li');
        const statusClass = transaction.status.toLowerCase();
        li.innerHTML = `
            $${transaction.amount} - ${new Date(transaction.timestamp).toLocaleString()} 
            ${transaction.expirationTime > 0 ? '(Dynamic)' : '(Fixed)'} 
            <span class="status ${statusClass}">${transaction.status}</span>
        `;
        transactionHistoryList.appendChild(li);
    });
}

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

function simulatePayment() {
    clearInterval(timer);
    clearInterval(dynamicQRUpdateInterval);
    qrcodeDiv.innerHTML = '<p class="success">Payment Successful!</p>';
    timerDisplayDiv.innerHTML = '';
    simulatePaymentButton.style.display = 'none';
    downloadButton.style.display = 'none';

    // Update the most recent transaction to 'Completed'
    if (transactionHistory.length > 0) {
        transactionHistory[0].status = 'Completed';
        localStorage.setItem('transactionHistory', JSON.stringify(transactionHistory));
        updateTransactionHistoryDisplay();
    }
}

// Initialize the page
document.addEventListener('DOMContentLoaded', () => {
    expirationTimeSelect.value = '60'; // Default to 1 minute
});