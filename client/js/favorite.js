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
                //loadRecentBookings();

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

document.addEventListener('DOMContentLoaded', function() {
    // DOM Elements
    loadSidebarData();
    
    const favoritesGrid = document.getElementById('favoritesGrid');
    const sortSelect = document.getElementById('sortSelect');
    const modal = document.getElementById('techModal');
    const closeBtn = document.querySelector('.close-btn');
    const modalBody = document.getElementById('modalBody');
    
    // Current favorites data
    let favoritesData = [];
    
    // First verify authentication
    verifyAuthentication()
        .then(userData => {
            loadFavorites();
        })
        .catch(error => {
            console.error('Authentication failed:', error);
            redirectToLogin();
        });
    
    // Sort select change handler
    sortSelect.addEventListener('change', function() {
        sortFavorites(this.value);
    });
    
    // Modal close button
    closeBtn.addEventListener('click', function() {
        modal.style.display = 'none';
    });
    
    // Close modal when clicking outside
    window.addEventListener('click', function(event) {
        if (event.target === modal) {
            modal.style.display = 'none';
        }
    });
    
    // Load favorites
    async function loadFavorites() {
        try {
            favoritesGrid.innerHTML = `
                <div class="loading-placeholder">
                    <i class="fas fa-spinner fa-spin"></i>
                    <span>Loading favorite technicians...</span>
                </div>
            `;
            
            const token = localStorage.getItem('access_token');
            const response = await fetch('http://localhost:8000/clients/dashboard', {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });
            
            if (!response.ok) {
                throw new Error('Failed to load favorites');
            }
            
            const data = await response.json();
            favoritesData = data.favorite_technicians || [];
            
            if (favoritesData.length > 0) {
                displayFavorites(favoritesData);
            } else {
                showEmptyState();
            }
        } catch (error) {
            console.error('Error loading favorites:', error);
            showError('Failed to load favorite technicians. Please try again.');
            displayMockFavorites();
        }
    }
    
    // Display favorites
    function displayFavorites(favorites) {
        favoritesGrid.innerHTML = '';
        
        favorites.forEach(tech => {
            const techCard = document.createElement('div');
            techCard.className = 'tech-card';
            techCard.innerHTML = `
                <div class="tech-header">
                    <img src="${tech.profile_picture_url || 'https://avatar.iran.liara.run/public'}" 
                         alt="${tech.name}" 
                         class="tech-avatar"
                         onerror="this.src='https://avatar.iran.liara.run/public'">
                    <div class="tech-info">
                        <h4 class="tech-name">${tech.name} ${tech.surname}</h4>
                        <p class="tech-specialty">${tech.specialty || 'General Technician'}</p>
                        <div class="tech-rating">
                            ${generateStarRating(tech.rating)}
                            <span>${tech.rating?.toFixed(1) || '0.0'}</span>
                        </div>
                        ${tech.distance_km ? `
                        <p class="tech-distance">${tech.distance_km.toFixed(1)} km away</p>
                        ` : ''}
                    </div>
                </div>
                <div class="tech-actions">
                    <button class="btn-book" onclick="onclick=bookTechnician('${tech.technician_id}', '${tech.name} ${tech.surname}')">
                        <i class="fas fa-calendar-plus"></i> Book
                    </button>
                    <button class="btn-view" onclick="viewTechnicianDetails('${tech.technician_id}')">
                        <i class="fas fa-eye"></i> View
                    </button>
                    <button class="btn-remove" onclick="removeFavorite('${tech.technician_id}', this)">
                        <i class="fas fa-heart-broken"></i> Remove
                    </button>
                </div>
            `;
            favoritesGrid.appendChild(techCard);
        });
    }
    
    // Sort favorites
    function sortFavorites(sortBy) {
        if (favoritesData.length === 0) return;
        
        const sorted = [...favoritesData];
        
        switch(sortBy) {
            case 'rating':
                sorted.sort((a, b) => (b.rating || 0) - (a.rating || 0));
                break;
            case 'name':
                sorted.sort((a, b) => {
                    const nameA = `${a.name} ${a.surname}`.toLowerCase();
                    const nameB = `${b.name} ${b.surname}`.toLowerCase();
                    return nameA.localeCompare(nameB);
                });
                break;
            case 'recent':
                // Assuming we have a 'added_at' field in the future
                // For now, we'll keep the original order
                break;
        }
        
        displayFavorites(sorted);
    }
    
    // View technician details - FIXED VERSION
    window.viewTechnicianDetails = async function(technicianId) {
        try {
            const token = localStorage.getItem('access_token');
            const response = await fetch(`http://localhost:8000/technicians/${technicianId}`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });
            
            if (!response.ok) {
                throw new Error('Failed to load technician details');
            }
            
            const technician = await response.json();
            showTechnicianModal(technician);
        } catch (error) {
            console.error('Error loading technician details:', error);
            showError('Failed to load technician details. Please try again.');
        }
    };
    
    // Show technician modal
    function showTechnicianModal(technician) {
        modalBody.innerHTML = `
            <div class="tech-detail">
                <div style="text-align: center; margin-bottom: 20px;">
                    <img src="${technician.profile_picture_url || 'https://avatar.iran.liara.run/public'}" 
                         alt="${technician.name}" 
                         style="width: 120px; height: 120px; border-radius: 50%; object-fit: cover; border: 4px solid var(--primary-light);"
                         onerror="this.src='https://avatar.iran.liara.run/public'">
                    <h3 style="margin-top: 10px;">${technician.name} ${technician.surname}</h3>
                    <div class="tech-rating" style="justify-content: center; margin: 5px 0 10px;">
                        ${generateStarRating(parseFloat(technician.avg_rating))}
                        <span>${technician.avg_rating?.toFixed(1) || '0.0'} (${technician.reviews_count || 0} reviews)</span>
                    </div>
                </div>
            </div>
            <div class="tech-detail">
                <label>Specialty:</label>
                <p>${technician.specialty || 'General Technician'}</p>
            </div>
            <div class="tech-detail">
                <label>Experience:</label>
                <p>${technician.experience_years || '0'} years</p>
            </div>
            <div class="tech-detail">
                <label>Location:</label>
                <p>${technician.location_name || 'Not specified'}</p>
            </div>
            <div class="tech-detail">
                <label>About:</label>
                <p>${technician.bio || 'No bio provided'}</p>
            </div>
            <div class="tech-detail">
                <label>Services:</label>
                <div class="tech-services">
                    ${technician.service_types?.map(service => `
                        <span class="service-tag">${service}</span>
                    `).join('') || 'No services specified'}
                </div>
            </div>
            <div class="modal-actions">
                <button class="btn btn-primary" onclick="location.href='/client/technicians/${technician.technician_id}'">
                    <i class="fas fa-calendar-plus"></i> Book Now
                </button>
                <button class="btn btn-secondary" onclick="modal.style.display='none'">
                    <i class="fas fa-times"></i> Close
                </button>
            </div>
        `;
        
        modal.style.display = 'flex';
    }
    
    // Remove favorite - UPDATED TO USE NEW ENDPOINT
    window.removeFavorite = async function(technicianId) {
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
            
            // Remove from local data
            favoritesData = favoritesData.filter(tech => tech.technician_id !== technicianId);
            
            // Update UI
            if (favoritesData.length > 0) {
                displayFavorites(favoritesData);
            } else {
                showEmptyState();
            }
            
            showSuccess('Technician removed from favorites');
        } catch (error) {
            console.error('Error removing favorite:', error);
            showError('Failed to remove favorite. Please try again.');
        }
    };
    
    // Show empty state
    function showEmptyState() {
        favoritesGrid.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-heart"></i>
                <p>You haven't added any favorite technicians yet</p>
                <a href="/client/search.html" class="btn btn-primary">Find Technicians</a>
            </div>
        `;
    }
    
    // Display mock favorites (fallback)
    function displayMockFavorites() {
        console.warn('Using mock favorites data');
        const mockFavorites = [
            {
                technician_id: '1',
                name: 'John',
                surname: 'Smith',
                profile_picture_url: '',
                specialty: 'Plumbing',
                rating: 4.5,
                distance_km: 2.3
            },
            {
                technician_id: '2',
                name: 'Sarah',
                surname: 'Johnson',
                profile_picture_url: '',
                specialty: 'Electrical',
                rating: 4.8,
                distance_km: 1.7
            }
        ];
        favoritesData = mockFavorites;
        displayFavorites(mockFavorites);
    }
    
    // Helper functions
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
    
    function showSuccess(message) {
        const successDiv = document.createElement('div');
        successDiv.className = 'notification success';
        successDiv.innerHTML = `
            <i class="fas fa-check-circle"></i>
            <span>${message}</span>
        `;
        document.body.appendChild(successDiv);
        setTimeout(() => successDiv.remove(), 3000);
    }
    
    function showError(message) {
        const errorDiv = document.createElement('div');
        errorDiv.className = 'notification error';
        errorDiv.innerHTML = `
            <i class="fas fa-exclamation-circle"></i>
            <span>${message}</span>
        `;
        document.body.appendChild(errorDiv);
        setTimeout(() => errorDiv.remove(), 3000);
    }
});