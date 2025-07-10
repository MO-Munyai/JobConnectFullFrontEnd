let notifications = [];
let currentFilter = 'all';

// Initialize notifications
async function initNotifications() {
    await loadNotifications();
    updateUnreadCount();
    setInterval(updateUnreadCount, 60000); // Update count every minute
}

// Load notifications from API
async function loadNotifications() {
    try {
        const token = localStorage.getItem('access_token');
        const response = await fetch(`http://localhost:8000/notifications/?status=${currentFilter}`, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            throw new Error('Failed to load notifications');
        }

        notifications = await response.json();
        renderNotifications();
    } catch (error) {
        console.error('Error loading notifications:', error);
        showToast('Failed to load notifications', 'error');
    }
}

// Render notifications in the dropdown
function renderNotifications() {
    const notificationList = document.getElementById('notificationList');
    
    if (notifications.length === 0) {
        notificationList.innerHTML = `
            <div class="empty-notifications">
                <i class="fas fa-bell-slash"></i>
                <p>No notifications found</p>
            </div>
        `;
        return;
    }

    notificationList.innerHTML = '';
    notifications.forEach(notification => {
        const notificationItem = document.createElement('div');
        notificationItem.className = `notification-item ${notification.is_read ? '' : 'unread'}`;
        notificationItem.innerHTML = `
            <div class="notification-message">${notification.message}</div>
            <div class="notification-time">${formatTime(notification.created_at)}</div>
        `;
        notificationItem.onclick = () => handleNotificationClick(notification.notification_id);
        notificationList.appendChild(notificationItem);
    });
}

// Format time for display
function formatTime(timestamp) {
    const now = new Date();
    const date = new Date(timestamp);
    const diffInHours = (now - date) / (1000 * 60 * 60);

    if (diffInHours < 24) {
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else {
        return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
    }
}

// Toggle notification dropdown
function toggleNotifications() {
    const dropdown = document.querySelector('.notification-dropdown');
    dropdown.classList.toggle('show');
    
    if (dropdown.classList.contains('show')) {
        loadNotifications();
    }
}

// Filter notifications
function filterNotifications() {
    currentFilter = document.getElementById('notificationFilter').value;
    loadNotifications();
}

// Handle notification click
async function handleNotificationClick(notificationId) {
    try {
        const token = localStorage.getItem('access_token');
        const response = await fetch(`http://localhost:8000/notifications/${notificationId}/mark-read`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            throw new Error('Failed to mark notification as read');
        }

        // Update UI
        const notification = notifications.find(n => n.notification_id === notificationId);
        if (notification) {
            notification.is_read = true;
            renderNotifications();
            updateUnreadCount();
        }
    } catch (error) {
        console.error('Error marking notification as read:', error);
    }
}

// Mark all notifications as read
async function markAllAsRead() {
    try {
        const token = localStorage.getItem('access_token');
        const response = await fetch('http://localhost:8000/notifications/mark-all-read', {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            throw new Error('Failed to mark all notifications as read');
        }

        // Update UI
        notifications.forEach(notification => {
            notification.is_read = true;
        });
        renderNotifications();
        updateUnreadCount();
        showToast('All notifications marked as read', 'success');
    } catch (error) {
        console.error('Error marking all notifications as read:', error);
        showToast('Failed to mark all as read', 'error');
    }
}

// View all notifications (redirect to notifications page)
function viewAllNotifications() {
    window.location.href = '/notifications.html';
}

// Update unread count badge
async function updateUnreadCount() {
    try {
        const token = localStorage.getItem('access_token');
        const response = await fetch('http://localhost:8000/notifications/unread/count', {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            throw new Error('Failed to get unread count');
        }

        const data = await response.json();
        const unreadCount = document.getElementById('unreadCount');
        unreadCount.textContent = data.count || '0';
        unreadCount.style.display = data.count > 0 ? 'block' : 'none';
    } catch (error) {
        console.error('Error updating unread count:', error);
    }
}

// ======================
// UTILITY FUNCTIONS
// ======================

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

function formatStatus(status) {
    const statusMap = {
        'pending': 'Pending',
        'confirmed': 'Confirmed',
        'completed': 'Completed',
        'cancelled': 'Cancelled',
        'in_progress': 'In Progress',
        'offered': 'Offer Sent',
        'rejected': 'Rejected'
    };
    return statusMap[status?.toLowerCase()] || status;
}

function formatDate(dateString) {
    if (!dateString) return 'Not scheduled';
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

function formatDateForPostgres(date) {
    // Formats date without timezone for PostgreSQL
    return date.toISOString().replace('Z', '');
}

function generateStarRating(rating) {
    const numericRating = Number(rating) || 0;
    const fullStars = Math.floor(numericRating);
    const hasHalfStar = numericRating % 1 >= 0.5;
    let stars = '';

    for (let i = 0; i < 5; i++) {
        if (i < fullStars) {
            stars += '<i class="fas fa-star"></i>';
        } else if (i === fullStars && hasHalfStar) {
            stars += '<i class="fas fa-star-half-alt"></i>';
        } else {
            stars += '<i class="far fa-star"></i>';
        }
    }

    return stars;
}

// ======================
// BOOKING FUNCTIONS
// ======================

async function getTechnicianSchedule(technicianId) {
    try {
        const token = localStorage.getItem('access_token');
        const response = await fetch(`http://localhost:8000/schedule/technician/${technicianId}`, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            throw new Error('Failed to load technician schedule');
        }

        return await response.json();
    } catch (error) {
        console.error('Error fetching technician schedule:', error);
        return [];
    }
}

async function showBookingDetails(bookingId) {
    try {
        const token = localStorage.getItem('access_token');
        const response = await fetch(`http://localhost:8000/bookings/${bookingId}`, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            throw new Error('Failed to load booking details');
        }

        const booking = await response.json();
        displayBookingModal(booking);
    } catch (error) {
        console.error('Error loading booking:', error);
        showToast('Failed to load booking details', 'error');
    }
}

function displayBookingModal(booking) {
    const modal = document.createElement('div');
    modal.className = 'booking-modal';
    modal.innerHTML = `
        <div class="modal-content">
            <span class="close-btn">&times;</span>
            <div class="booking-header">
                <h3>${booking.service_type}</h3>
                <span class="status-badge status-${booking.status.toLowerCase()}">${formatStatus(booking.status)}</span>
            </div>
            
            <div class="booking-info-grid">
                <div class="info-section">
                    <h4>Technician</h4>
                    <div class="tech-info">
                        <img src="${booking.technician_avatar || '/assets/profile-placeholder.png'}" 
                             alt="${booking.technician_name}" 
                             class="tech-avatar"
                             onerror="this.src='/assets/profile-placeholder.png'">
                        <div>
                            <h5>${booking.technician_name} ${booking.technician_surname}</h5>
                            <div class="tech-rating">
                                ${generateStarRating(booking.technician_rating || 0)}
                                <span>${(booking.technician_rating || 0).toFixed(1)}</span>
                            </div>
                        </div>
                    </div>
                </div>
                
                <div class="info-section">
                    <h4>Booking Details</h4>
                    <ul class="booking-meta">
                        <li><strong>Booking ID:</strong> ${booking.booking_id}</li>
                        <li><strong>Date Created:</strong> ${formatDate(booking.created_at)}</li>
                        ${booking.start_date ? `<li><strong>Scheduled Date:</strong> ${formatDate(booking.start_date)}</li>` : ''}
                        ${booking.price ? `<li><strong>Estimated Price:</strong> $${booking.price.toFixed(2)}</li>` : ''}
                    </ul>
                </div>
                
                <div class="info-section full-width">
                    <h4>Service Description</h4>
                    <p>${booking.description}</p>
                </div>
            </div>
            
            <div class="booking-actions">
                ${booking.status.toLowerCase() === 'pending' ? `
                <button class="btn btn-danger" onclick="cancelBookingFromModal('${booking.booking_id}', this)">
                    <i class="fas fa-times"></i> Cancel Booking
                </button>
                ` : ''}
                ${booking.status.toLowerCase() === 'completed' && !booking.is_paid ? `
                <button class="btn btn-primary" onclick="initiatePayment('${booking.booking_id}', ${booking.price})">
                    <i class="fas fa-credit-card"></i> Pay Now
                </button>
                ` : ''}
                <button class="btn btn-primary" onclick="showToast('Messaging feature coming soon!', 'info')">
                    <i class="fas fa-envelope"></i> Message Technician
                </button>
            </div>
        </div>
    `;

    document.body.appendChild(modal);

    // Close modal
    const closeBtn = modal.querySelector('.close-btn');
    closeBtn.onclick = () => modal.remove();

    // Close when clicking outside
    modal.onclick = (e) => {
        if (e.target === modal) {
            modal.remove();
        }
    };
}

window.cancelBookingFromModal = async function (bookingId, button) {
    if (!confirm('Are you sure you want to cancel this booking?')) return;

    try {
        button.disabled = true;
        button.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Processing...';

        const token = localStorage.getItem('access_token');
        const response = await fetch(`http://localhost:8000/bookings/${bookingId}/status`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                status: 'cancelled'
            })
        });

        if (!response.ok) {
            throw new Error('Failed to cancel booking');
        }

        showToast('Booking cancelled successfully', 'success');
        document.querySelector('.booking-modal').remove();
        loadRecentBookings();
    } catch (error) {
        console.error('Error cancelling booking:', error);
        showToast('Failed to cancel booking', 'error');
        button.disabled = false;
        button.innerHTML = '<i class="fas fa-times"></i> Cancel Booking';
    }
};

window.initiatePayment = async function (bookingId, amount) {
    try {
        const token = localStorage.getItem('access_token');
        const response = await fetch(`http://localhost:8000/bookings/${bookingId}/payment`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                amount: amount
            })
        });

        if (!response.ok) {
            throw new Error('Failed to initiate payment');
        }

        const paymentData = await response.json();
        showToast(`Payment initiated for $${amount.toFixed(2)}`, 'success');
        
        // Simulate payment completion after 2 seconds
        setTimeout(() => {
            completePayment(bookingId, paymentData.payment_id);
        }, 2000);
    } catch (error) {
        console.error('Error initiating payment:', error);
        showToast('Failed to initiate payment', 'error');
    }
};

async function completePayment(bookingId, paymentId) {
    try {
        const token = localStorage.getItem('access_token');
        const response = await fetch(`http://localhost:8000/bookings/${bookingId}/payment/${paymentId}/complete`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            throw new Error('Failed to complete payment');
        }

        showToast('Payment completed successfully!', 'success');
        loadRecentBookings();
        loadPayableBookings();
    } catch (error) {
        console.error('Error completing payment:', error);
        showToast('Failed to complete payment', 'error');
    }
}

// ======================
// BOOKING CREATION FUNCTIONS
// ======================

window.bookTechnician = async function (technicianId, technicianName = '') {
    try {
        // First get the technician's schedule
        const schedules = await getTechnicianSchedule(technicianId);
        const hasSchedule = schedules.length > 0;

        // Create booking modal
        const modal = document.createElement('div');
        modal.className = 'booking-modal';
        modal.innerHTML = `
        <div class="modal-content">
            <span class="close-btn">&times;</span>
            <h3>Book Technician</h3>
            <p class="tech-booking-for">Booking for: <strong>${technicianName}</strong></p>
            <form id="bookingForm">
                <div class="form-group">
                    <label for="serviceType">Service Needed:</label>
                    <input type="text" id="serviceType" required placeholder="e.g., Plumbing, Electrical">
                </div>
                
                ${hasSchedule ? `
                <div class="form-group" id="scheduleSelection">
                    <label>Available Time Slots:</label>
                    <select id="scheduleSelect">
                        <option value="">Select an available time slot</option>
                        ${schedules.map(schedule => `
                            <option value="${schedule.schedule_id}">
                                ${formatDate(schedule.start_time)} - ${formatDate(schedule.end_time)}
                            </option>
                        `).join('')}
                        <option value="custom">Custom time slot</option>
                    </select>
                    <div id="customDateContainer" style="display: none; margin-top: 10px;">
                        <div class="form-group">
                            <label for="customStartDate">Start Date & Time:</label>
                            <input type="datetime-local" id="customStartDate">
                        </div>
                        <div class="form-group">
                            <label for="customEndDate">End Date & Time:</label>
                            <input type="datetime-local" id="customEndDate">
                        </div>
                    </div>
                </div>
                ` : `
                <div class="form-group">
                    <label for="startDate">Start Date & Time:</label>
                    <input type="datetime-local" id="startDate" required>
                </div>
                <div class="form-group">
                    <label for="endDate">End Date & Time:</label>
                    <input type="datetime-local" id="endDate" required>
                </div>
                `}
                
                <div class="form-group">
                    <label for="description">Description:</label>
                    <textarea id="description" required rows="4" placeholder="Describe the issue in detail"></textarea>
                </div>
                <button type="submit" class="btn-submit">Submit Booking</button>
            </form>
        </div>
        `;

        document.body.appendChild(modal);

        // Show custom date inputs when "Custom time slot" is selected
        if (hasSchedule) {
            const scheduleSelect = modal.querySelector('#scheduleSelect');
            const customDateContainer = modal.querySelector('#customDateContainer');

            scheduleSelect.addEventListener('change', (e) => {
                customDateContainer.style.display = e.target.value === 'custom' ? 'block' : 'none';
            });
        }

        // Handle modal close
        const closeBtn = modal.querySelector('.close-btn');
        closeBtn.onclick = () => modal.remove();

        // Handle form submission
        const bookingForm = modal.querySelector('#bookingForm');
        bookingForm.onsubmit = async (e) => {
            e.preventDefault();

            const serviceType = document.getElementById('serviceType').value.trim();
            const description = document.getElementById('description').value.trim();

            if (!serviceType || !description) {
                showToast('Please fill in all required fields', 'error');
                return;
            }

            let startDate, endDate;

            if (hasSchedule) {
                const scheduleSelect = document.getElementById('scheduleSelect');
                const selectedScheduleId = scheduleSelect.value;

                if (!selectedScheduleId) {
                    showToast('Please select a time slot or choose custom', 'error');
                    return;
                }

                if (selectedScheduleId === 'custom') {
                    const startInput = document.getElementById('customStartDate').value;
                    const endInput = document.getElementById('customEndDate').value;

                    if (!startInput || !endInput) {
                        showToast('Please enter custom start and end times', 'error');
                        return;
                    }

                    startDate = new Date(startInput);
                    endDate = new Date(endInput);
                } else {
                    const selectedSchedule = schedules.find(s => s.schedule_id === selectedScheduleId);
                    startDate = new Date(selectedSchedule.start_time);
                    endDate = new Date(selectedSchedule.end_time);
                }
            } else {
                const startInput = document.getElementById('startDate').value;
                const endInput = document.getElementById('endDate').value;

                if (!startInput || !endInput) {
                    showToast('Please enter start and end times', 'error');
                    return;
                }

                startDate = new Date(startInput);
                endDate = new Date(endInput);
            }

            const token = localStorage.getItem('access_token');
            const submitBtn = bookingForm.querySelector('.btn-submit');
            submitBtn.disabled = true;
            submitBtn.textContent = 'Processing...';

            try {
                const response = await fetch('http://localhost:8000/bookings', {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        technician_id: technicianId,
                        service_type: serviceType,
                        description: description,
                        start_date: formatDateForPostgres(startDate),
                        end_date: formatDateForPostgres(endDate)
                    })
                });

                if (!response.ok) {
                    const errorData = await response.json();
                    throw new Error(errorData.detail || 'Booking failed');
                }

                const bookingData = await response.json();
                modal.remove();

                // Show success message
                const successModal = document.createElement('div');
                successModal.className = 'booking-modal';
                successModal.innerHTML = `
                    <div class="modal-content success">
                        <h3>Booking Request Sent!</h3>
                        <p>Your booking for <strong>${serviceType}</strong> has been submitted successfully.</p>
                        <p>Technician: ${technicianName}</p>
                        <p>Booking ID: ${bookingData.booking_id}</p>
                        <p>Status: <span class="status-pending">Pending</span></p>
                        <div class="modal-actions">
                            <button class="btn-close" onclick="this.parentElement.parentElement.remove()">Close</button>
                            <button class="btn-view" onclick="showBookingDetails('${bookingData.booking_id}')">
                                View Details
                            </button>
                        </div>
                    </div>
                `;
                document.body.appendChild(successModal);

                // Refresh recent bookings
                loadRecentBookings();

            } catch (error) {
                console.error('Booking error:', error);
                showToast(`Booking failed: ${error.message}`, 'error');
                submitBtn.disabled = false;
                submitBtn.textContent = 'Submit Booking';
            }
        };

        // Close modal when clicking outside
        modal.onclick = (e) => {
            if (e.target === modal) {
                modal.remove();
            }
        };

    } catch (error) {
        console.error('Error creating booking modal:', error);
        showToast('Failed to initiate booking. Please try again.', 'error');
    }
};

// ======================
// DASHBOARD MAIN FUNCTIONS
// ======================

document.addEventListener('DOMContentLoaded', function () {
    // DOM Elements
    const profilePicture = document.getElementById('profilePicture');
    const userName = document.getElementById('userName');
    const activeBookings = document.getElementById('activeBookings');
    const pendingPayments = document.getElementById('pendingPayments');
    const favoriteTechs = document.getElementById('favoriteTechs');
    const favoritesGrid = document.getElementById('favoritesGrid');
    const recentBookings = document.getElementById('recentBookings');
    const payableBookings = document.getElementById('payableBookings');

    // First verify authentication before doing anything else
    verifyAuthentication()
        .then(userData => {
            initNotifications();
            displayUserInfo(userData);
            loadDashboardData();
            highlightActiveTab();
        })
        .catch(error => {
            console.error('Authentication failed:', error);
            redirectToLogin();
        });

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

    function redirectToLogin() {
        localStorage.removeItem('access_token');
        localStorage.removeItem('user_type');
        window.location.href = '/index.html';
    }

    function highlightActiveTab() {
        const currentPath = window.location.pathname;
        document.querySelectorAll('.sidebar-nav li').forEach(li => {
            li.classList.remove('active');
        });
        document.querySelectorAll('.sidebar-nav a').forEach(a => {
            if (a.getAttribute('href') === currentPath) {
                a.parentElement.classList.add('active');
            }
        });
    }

    function displayUserInfo(userData) {
        if (userData.profile_picture_url) {
            profilePicture.src = userData.profile_picture_url;
        } else {
            profilePicture.src = '/assets/profile-placeholder.png';
        }
        userName.textContent = `${userData.name} ${userData.surname}`;
    }

    async function loadDashboardData() {
        try {
            const token = localStorage.getItem('access_token');
            const dashboardResponse = await fetch('http://localhost:8000/clients/dashboard', {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!dashboardResponse.ok) {
                throw new Error('Failed to load dashboard data');
            }

            const dashboardData = await dashboardResponse.json();
            updateDashboardStats(dashboardData);

            if (dashboardData.favorite_technicians?.length > 0) {
                displayFavoriteTechnicians(dashboardData.favorite_technicians);
            } else {
                showEmptyFavoritesState();
            }

            loadRecentBookings();
            loadPayableBookings();
        } catch (error) {
            console.error('Error loading dashboard data:', error);
            showError('Failed to load dashboard data. Please try again later.');
        }
    }

    function updateDashboardStats(data) {
        activeBookings.textContent = data.active_bookings || '0';
        pendingPayments.textContent = data.pending_payments || '0';
        favoriteTechs.textContent = data.favorite_technicians?.length || '0';
    }

    function displayFavoriteTechnicians(technicians) {
        favoritesGrid.innerHTML = '';
        technicians.forEach(tech => {
            const techCard = document.createElement('div');
            techCard.className = 'tech-card';
            techCard.innerHTML = `
                <img src="${tech.profile_picture_url || '/assets/profile-placeholder.png'}" 
                     alt="${tech.name}" 
                     class="tech-avatar"
                     onerror="this.src='/assets/profile-placeholder.png'">
                <h4 class="tech-name">${tech.name} ${tech.surname}</h4>
                <div class="tech-rating">
                    ${generateStarRating(tech.rating)}
                    <span>${tech.rating?.toFixed(1) || '0.0'}</span>
                </div>
                <div class="tech-actions">
                    <button class="btn-book" onclick="bookTechnician('${tech.technician_id}', '${tech.name} ${tech.surname}')">
                        <i class="fas fa-calendar-plus"></i> Book
                    </button>
                    <button class="btn-remove" onclick="removeFavorite('${tech.technician_id}')">
                        <i class="fas fa-heart-broken"></i> Remove
                    </button>
                </div>
            `;
            favoritesGrid.appendChild(techCard);
        });
    }

    function showEmptyFavoritesState() {
        favoritesGrid.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-heart"></i>
                <p>You haven't added any favorite technicians yet</p>
                <a href="/technicians" class="btn-primary">Find Technicians</a>
            </div>
        `;
    }

    async function loadRecentBookings() {
        try {
            const token = localStorage.getItem('access_token');
            const response = await fetch('http://localhost:8000/bookings/', {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error('Failed to load recent bookings');
            }

            const bookings = await response.json();
            displayRecentBookings(bookings);
        } catch (error) {
            console.error('Error loading bookings:', error);
            displayMockBookings();
        }
    }

    function displayRecentBookings(bookings) {
        recentBookings.innerHTML = '';

        if (bookings.length === 0) {
            recentBookings.innerHTML = `
                <tr>
                    <td colspan="5" class="empty-bookings">
                        <i class="fas fa-calendar-times"></i>
                        <span>No recent bookings found</span>
                    </td>
                </tr>
            `;
            return;
        }

        bookings.forEach(booking => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${booking.technician_name || 'N/A'} ${booking.technician_surname || ''}</td>
                <td>${booking.service_type || 'N/A'}</td>
                <td>${formatDate(booking.created_at)}</td>
                <td><span class="status-badge status-${booking.status}">${formatStatus(booking.status)}</span></td>
                <td>
                    <button class="action-btn btn-primary" onclick="showBookingDetails('${booking.booking_id}')">
                        <i class="fas fa-eye"></i> View
                    </button>
                    ${booking.status === 'pending' ? `
                    <button class="action-btn btn-danger" onclick="cancelBooking('${booking.booking_id}')">
                        <i class="fas fa-times"></i> Cancel
                    </button>
                    ` : ''}
                </td>
            `;
            recentBookings.appendChild(row);
        });
    }

    async function loadPayableBookings() {
        try {
            const token = localStorage.getItem('access_token');
            const userResponse = await fetch('http://localhost:8000/clients/me', {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!userResponse.ok) {
                throw new Error('Failed to get client data');
            }

            const userData = await userResponse.json();
            const clientId = userData.client_id;

            const response = await fetch(`http://localhost:8000/bookings/payable/${clientId}`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error('Failed to load payable bookings');
            }

            const bookings = await response.json();
            displayPayableBookings(bookings);
        } catch (error) {
            console.error('Error loading payable bookings:', error);
            showToast('Failed to load payable bookings', 'error');
        }
    }

    function displayPayableBookings(bookings) {
        if (!payableBookings) return;

        payableBookings.innerHTML = '';

        if (bookings.length === 0) {
            payableBookings.innerHTML = `
                <tr>
                    <td colspan="5" class="empty-bookings">
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
                <td>${booking.technician_name || 'N/A'} ${booking.technician_surname || ''}</td>
                <td>${booking.service_type || 'N/A'}</td>
                <td>${formatDate(booking.created_at)}</td>
                <td>$${booking.price?.toFixed(2) || '0.00'}</td>
                <td>
                    <button class="action-btn btn-primary" onclick="initiatePayment('${booking.booking_id}', ${booking.price})">
                        <i class="fas fa-credit-card"></i> Pay Now
                    </button>
                </td>
            `;
            payableBookings.appendChild(row);
        });
    }

    function displayMockBookings() {
        console.warn('Using mock booking data');
        const mockBookings = [
            {
                booking_id: '1',
                technician_name: 'John',
                technician_surname: 'Smith',
                service_type: 'Plumbing Repair',
                created_at: '2023-06-15T10:00:00',
                status: 'confirmed'
            },
            {
                booking_id: '2',
                technician_name: 'Sarah',
                technician_surname: 'Johnson',
                service_type: 'Electrical Wiring',
                created_at: '2023-06-16T14:00:00',
                status: 'pending'
            }
        ];
        displayRecentBookings(mockBookings);
    }

    function showError(message) {
        const errorDisplay = document.getElementById('error-display') || createErrorDisplay();
        errorDisplay.textContent = message;
        errorDisplay.style.display = 'block';
        setTimeout(() => {
            errorDisplay.style.display = 'none';
        }, 5000);
    }

    function createErrorDisplay() {
        const div = document.createElement('div');
        div.id = 'error-display';
        div.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 15px;
            background-color: #ff4444;
            color: white;
            border-radius: 5px;
            display: none;
            z-index: 1000;
        `;
        document.body.appendChild(div);
        return div;
    }

    window.removeFavorite = async function (technicianId) {
        if (!confirm('Are you sure you want to remove this technician from your favorites?')) {
            return;
        }

        try {
            const token = localStorage.getItem('access_token');
            const response = await fetch(`http://localhost:8000/clients/favorites/${technicianId}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error('Failed to remove favorite');
            }
            loadDashboardData();
        } catch (error) {
            console.error('Error removing favorite:', error);
            showError('Failed to remove favorite. Please try again.');
        }
    };

    window.cancelBooking = async function (bookingId) {
        try {
            // Create a modal for cancellation reason
            const modal = document.createElement('div');
            modal.className = 'booking-modal';
            modal.innerHTML = `
                <div class="modal-content">
                    <span class="close-btn">&times;</span>
                    <h3>Cancel Booking</h3>
                    <form id="cancelForm">
                        <div class="form-group">
                            <label for="cancelReason">Reason for cancellation (min 10 characters):</label>
                            <textarea id="cancelReason" required rows="4" minlength="10" 
                                      placeholder="Please explain why you're cancelling this booking"></textarea>
                        </div>
                        <button type="submit" class="btn-submit btn-danger">Confirm Cancellation</button>
                    </form>
                </div>
            `;

            document.body.appendChild(modal);

            // Handle modal close
            const closeBtn = modal.querySelector('.close-btn');
            closeBtn.onclick = () => modal.remove();

            // Handle form submission
            const cancelForm = modal.querySelector('#cancelForm');
            cancelForm.onsubmit = async (e) => {
                e.preventDefault();

                const reason = document.getElementById('cancelReason').value.trim();

                if (reason.length < 10) {
                    showToast('Please provide a reason with at least 10 characters', 'error');
                    return;
                }

                if (!confirm('Are you sure you want to cancel this booking?')) {
                    return;
                }

                const token = localStorage.getItem('access_token');
                const submitBtn = cancelForm.querySelector('.btn-submit');
                submitBtn.disabled = true;
                submitBtn.textContent = 'Processing...';

                try {
                    const response = await fetch(`http://localhost:8000/clients/bookings/${bookingId}/cancel`, {
                        method: 'PUT',
                        headers: {
                            'Authorization': `Bearer ${token}`,
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({
                            status: 'cancelled',
                            reason: reason
                        })
                    });

                    if (!response.ok) {
                        throw new Error('Failed to cancel booking');
                    }

                    showToast('Booking cancelled successfully', 'success');
                    modal.remove();
                    loadRecentBookings();
                } catch (error) {
                    console.error('Error cancelling booking:', error);
                    showToast('Failed to cancel booking', 'error');
                    submitBtn.disabled = false;
                    submitBtn.textContent = 'Confirm Cancellation';
                }
            };

            // Close modal when clicking outside
            modal.onclick = (e) => {
                if (e.target === modal) {
                    modal.remove();
                }
            };

        } catch (error) {
            console.error('Error creating cancel modal:', error);
            showToast('Failed to initiate cancellation. Please try again.', 'error');
        }
    };
});