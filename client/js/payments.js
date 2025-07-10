async function verifyAuthentication() {
    const token = localStorage.getItem('access_token');
    const userType = localStorage.getItem('user_type');

    if (!token || userType !== 'client') {
        throw new Error('No valid authentication tokens found');
    }

    try {
        const response = await fetch('http://localhost:8000/clients/me', {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        return await response.json();
    } catch (error) {
        localStorage.removeItem('access_token');
        localStorage.removeItem('user_type');
        throw error;
    }
}

function displayUserInfo(userData) {
    const profilePicture = document.getElementById('profilePicture');
    const userName = document.getElementById('userName');

    if (userData.profile_picture_url) {
        profilePicture.src = userData.profile_picture_url;
    } else {
        profilePicture.src = '/assets/profile-placeholder.png';
    }
    userName.textContent = `${userData.name} ${userData.surname}`;
}

function redirectToLogin() {
    localStorage.removeItem('access_token');
    localStorage.removeItem('user_type');
    window.location.href = '/index.html';
}

function highlightActiveTab() {
    // Get current page path
    const currentPath = window.location.pathname;

    // Remove active class from all tabs
    document.querySelectorAll('.sidebar-nav li').forEach(li => {
        li.classList.remove('active');
    });

    // Find matching tab and add active class
    document.querySelectorAll('.sidebar-nav a').forEach(a => {
        if (a.getAttribute('href') === currentPath) {
            a.parentElement.classList.add('active');
        }
    });
}

document.addEventListener('DOMContentLoaded', function () {

    verifyAuthentication()
        .then(userData => {
            displayUserInfo(userData);
            highlightActiveTab();
            loadPayments();
            loadPaymentHistory();
        })
        .catch(error => {
            console.error('Authentication failed:', error);
            redirectToLogin();
        });
});

// Load both pending payments and payment history
async function loadPayments() {
    try {
        await loadPendingPayments();
        await loadPaymentHistory();
    } catch (error) {
        console.error('Error loading payments:', error);
        showToast('Failed to load payment data', 'error');
    }
}

// Load payable bookings from /bookings/payable/{client_id}
async function loadPendingPayments() {
    try {
        const token = localStorage.getItem('access_token');

        // First get client ID
        const userResponse = await fetch('http://localhost:8000/clients/me', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (!userResponse.ok) throw new Error('Failed to get client data');

        const userData = await userResponse.json();
        const clientId = userData.client_id;

        // Get payable bookings
        const response = await fetch(`http://localhost:8000/bookings/payable/${clientId}`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (!response.ok) throw new Error('Failed to load pending payments');

        const bookings = await response.json();
        displayPendingPayments(bookings);
    } catch (error) {
        console.error('Error loading pending payments:', error);
        showToast('Failed to load pending payments', 'error');
        throw error;
    }
}

function displayPendingPayments(bookings) {
    const container = document.getElementById('pendingPayments');
    container.innerHTML = '';

    if (!bookings || bookings.length === 0) {
        container.innerHTML = `
            <tr>
                <td colspan="7" class="empty-state">
                    <i class="fas fa-check-circle"></i>
                    <span>No pending payments</span>
                </td>
            </tr>
        `;
        return;
    }

    bookings.forEach(booking => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${booking.booking_id}</td>
            <td>${booking.service_type}</td>
            <td>${booking.technician_name || 'N/A'} ${booking.technician_surname || ''}</td>
            <td>R${booking.price?.toFixed(2) || '0.00'}</td>
            <td>${formatDate(booking.end_date || booking.created_at)}</td>
            <td><span class="status-badge status-${booking.status}">${formatStatus(booking.status)}</span></td>
            <td>
                <button class="btn btn-primary" onclick="initiatePayment('${booking.booking_id}', ${booking.price || 0})">
                    <i class="fas fa-credit-card"></i> Pay Now
                </button>
            </td>
        `;
        container.appendChild(row);
    });
}

// Load payment history from /payments/{client_id}
async function loadPaymentHistory() {
    try {
        const token = localStorage.getItem('access_token');

        // First get client ID
        const userResponse = await fetch('http://localhost:8000/clients/me', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (!userResponse.ok) throw new Error('Failed to get client data');

        const userData = await userResponse.json();
        const clientId = userData.client_id;

        const filter = document.getElementById('historyFilter').value;
        const response = await fetch(`http://localhost:8000/payments/${clientId}`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (!response.ok) throw new Error('Failed to load payment history');

        const payments = await response.json();
        displayPaymentHistory(payments);
    } catch (error) {
        console.error('Error loading payment history:', error);
        showToast('Failed to load payment history', 'error');
        throw error;
    }
}

function displayPaymentHistory(payments) {
    const container = document.getElementById('paymentHistory');
    container.innerHTML = '';

    if (!payments || payments.length === 0) {
        container.innerHTML = `
            <tr>
                <td colspan="8" class="empty-state">
                    <i class="fas fa-history"></i>
                    <span>No payment history found</span>
                </td>
            </tr>
        `;
        return;
    }

    payments.forEach(payment => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${payment.payment_id}</td>
            <td>${formatDate(payment.transaction_date)}</td>
            <td>${payment.booking_id}</td>
            <td>${getServiceTypeFromBookingId(payment.booking_id)}</td>
            <td>R${payment.amount?.toFixed(2) || '0.00'}</td>
            <td>${formatPaymentMethod(payment.payment_method)}</td>
            <td><span class="status-badge status-${payment.payment_status}">${formatStatus(payment.payment_status)}</span></td>
            <td>
                <button class="btn btn-secondary" onclick="viewReceipt('${payment.payment_id}')">
                    <i class="fas fa-receipt"></i> View
                </button>
            </td>
        `;
        container.appendChild(row);
    });
}

// Initiate payment using POST /payments/
window.initiatePayment = async function (bookingId, amount) {
    try {
        const token = localStorage.getItem('access_token');

        openPaymentModal(`
            <h2>Process Payment</h2>
            <div class="payment-loading">
                <i class="fas fa-spinner fa-spin"></i>
                <p>Preparing payment of R${amount.toFixed(2)}...</p>
            </div>
        `);

        // First verify booking is payable
        const bookingResponse = await fetch(`http://localhost:8000/bookings/${bookingId}`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (!bookingResponse.ok) throw new Error('Booking not found');
        const booking = await bookingResponse.json();

        if (booking.status !== 'completed') {
            throw new Error('Booking must be completed before payment');
        }

        showPaymentForm(bookingId, amount);

    } catch (error) {
        console.error('Payment initiation error:', error);
        showToast(error.message || 'Failed to initiate payment', 'error');
        closePaymentModal();
    }
};

function showPaymentForm(bookingId, amount) {
    const modalBody = `
        <h2>Complete Payment</h2>
        <div class="payment-summary">
            <p><strong>Amount Due:</strong> R${amount.toFixed(2)}</p>
            <p><strong>Booking ID:</strong> ${bookingId}</p>
        </div>
        
        <form id="paymentForm" onsubmit="processPayment(event, '${bookingId}', ${amount})">
            <div class="form-group">
                <label>Payment Method</label>
                <div class="payment-methods">
                    <label class="payment-method">
                        <input type="radio" name="paymentMethod" value="card" checked>
                        <i class="fab fa-cc-visa"></i>
                        <i class="fab fa-cc-mastercard"></i>
                        Credit/Debit Card
                    </label>
                    <label class="payment-method">
                        <input type="radio" name="paymentMethod" value="bank">
                        <i class="fas fa-university"></i>
                        Bank Transfer
                    </label>
                </div>
            </div>
            
            <div id="cardDetails">
                <div class="form-group">
                    <label for="cardNumber">Card Number</label>
                    <input type="text" id="cardNumber" placeholder="1234 5678 9012 3456" required>
                </div>
                
                <div class="form-row">
                    <div class="form-group">
                        <label for="expiry">Expiry Date</label>
                        <input type="text" id="expiry" placeholder="MM/YY" required>
                    </div>
                    <div class="form-group">
                        <label for="cvv">CVV</label>
                        <input type="text" id="cvv" placeholder="123" required>
                    </div>
                </div>
                
                <div class="form-group">
                    <label for="cardName">Name on Card</label>
                    <input type="text" id="cardName" placeholder="John Smith" required>
                </div>
            </div>
            
            <button type="submit" class="btn btn-primary">
                <i class="fas fa-lock"></i> Pay R${amount.toFixed(2)}
            </button>
        </form>
    `;

    document.getElementById('paymentModalBody').innerHTML = modalBody;
}

// Process payment using POST /payments/
window.processPayment = async function (e, bookingId, amount) {
    e.preventDefault();

    const submitBtn = e.target.querySelector('button[type="submit"]');
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Processing...';

    try {
        const token = localStorage.getItem('access_token');
        const paymentMethod = document.querySelector('input[name="paymentMethod"]:checked').value;

        // Create payment using your backend endpoint
        const response = await fetch('http://localhost:8000/payments/', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                booking_id: bookingId,
                amount: amount,
                payment_method: paymentMethod
            })
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.detail || 'Payment failed');
        }

        const paymentData = await response.json();

        showToast('Payment completed successfully!', 'success');
        closePaymentModal();
        loadPayments();
    } catch (error) {
        console.error('Payment error:', error);
        showToast(error.message || 'Payment failed. Please try again.', 'error');
        submitBtn.disabled = false;
        submitBtn.innerHTML = '<i class="fas fa-lock"></i> Try Again';
    }
};

// View receipt using GET /payments/{payment_id}
window.viewReceipt = async function (paymentId) {
    try {
        const token = localStorage.getItem('access_token');
        const response = await fetch(`http://localhost:8000/payments/${paymentId}`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (!response.ok) throw new Error('Failed to load payment details');

        const payment = await response.json();

        // In a real implementation, you would generate or fetch a PDF receipt
        // For now, we'll display the payment details in a modal
        openPaymentModal(`
            <h2>Payment Receipt</h2>
            <div class="receipt-details">
                <p><strong>Payment ID:</strong> ${payment.payment_id}</p>
                <p><strong>Date:</strong> ${formatDate(payment.transaction_date)}</p>
                <p><strong>Amount:</strong> R${payment.amount?.toFixed(2) || '0.00'}</p>
                <p><strong>Method:</strong> ${formatPaymentMethod(payment.payment_method)}</p>
                <p><strong>Status:</strong> <span class="status-badge status-${payment.payment_status}">${formatStatus(payment.payment_status)}</span></p>
                <p><strong>Booking ID:</strong> ${payment.booking_id}</p>
            </div>
            <div class="receipt-actions">
                <button class="btn btn-primary" onclick="downloadReceipt('${payment.payment_id}')">
                    <i class="fas fa-download"></i> Download Receipt
                </button>
                <button class="btn btn-secondary" onclick="closePaymentModal()">
                    Close
                </button>
            </div>
        `);
    } catch (error) {
        console.error('Error viewing receipt:', error);
        showToast('Failed to load receipt details', 'error');
    }
};

window.downloadReceipt = function (paymentId) {
    // In a real implementation, this would fetch the PDF receipt
    showToast('Receipt download will start shortly', 'info');
    // Simulate receipt download
    setTimeout(() => {
        showToast('Receipt downloaded successfully', 'success');
    }, 1500);
};


// Helper functions
function formatDate(dateString) {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });
}

function formatStatus(status) {
    const statusMap = {
        'completed': 'Completed',
        'pending': 'Pending',
        'failed': 'Failed',
        'refunded': 'Refunded'
    };
    return statusMap[status?.toLowerCase()] || status;
}
function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast-notification toast-${type}`;
    toast.innerHTML = `
        <div class="toast-message">${message}</div>
        <button class="toast-close">&times;</button>
    `;

    document.body.appendChild(toast);

    // Auto-remove after 5 seconds
    setTimeout(() => {
        toast.classList.add('fade-out');
        setTimeout(() => toast.remove(), 300);
    }, 5000);

    // Manual close
    toast.querySelector('.toast-close').onclick = () => toast.remove();
}

function openPaymentModal(content) {
    document.getElementById('paymentModalBody').innerHTML = content;
    document.getElementById('paymentModal').style.display = 'flex';
}

function closePaymentModal() {
    document.getElementById('paymentModal').style.display = 'none';
}

function formatStatus(status) {
    const statusMap = {
        'completed': 'Completed',
        'pending': 'Pending',
        'failed': 'Failed',
        'refunded': 'Refunded',
        'confirmed': 'Confirmed',
        'cancelled': 'Cancelled'
    };
    return statusMap[status?.toLowerCase()] || status;
}

function formatPaymentMethod(method) {
    const methodMap = {
        'card': 'Credit Card',
        'bank': 'Bank Transfer'
    };
    return methodMap[method?.toLowerCase()] || method;
}

async function getServiceTypeFromBookingId(bookingId) {
    try {
        const token = localStorage.getItem('access_token');
        const response = await fetch(`http://localhost:8000/bookings/${bookingId}`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (!response.ok) return 'N/A';
        const booking = await response.json();
        return booking.service_type || 'N/A';
    } catch (error) {
        return 'N/A';
    }
}