document.addEventListener('DOMContentLoaded', function () {
    // DOM Elements
    loadSidebarData();
    const searchInput = document.getElementById('searchInput');
    const searchButton = document.getElementById('searchButton');
    const locationText = document.getElementById('locationText');
    const userMessage = document.getElementById('userMessage');
    const sendMessage = document.getElementById('sendMessage');
    const chatMessages = document.getElementById('chatMessages');
    const resultsSection = document.getElementById('resultsSection');
    const resultsGrid = document.getElementById('resultsGrid');
    const filterSelect = document.getElementById('filterSelect');
    const sortSelect = document.getElementById('sortSelect');

    // Current location and search results
    let currentLocation = null;
    let searchResults = [];

    // First verify authentication
    verifyAuthentication()
        .then(userData => {
            // Get user location
            getUserLocation();
        })
        .catch(error => {
            console.error('Authentication failed:', error);
            redirectToLogin();
        });

    // Search button click handler
    searchButton.addEventListener('click', performSearch);

    // Enter key in search input
    searchInput.addEventListener('keypress', function (e) {
        if (e.key === 'Enter') {
            performSearch();
        }
    });

    // Send message button click handler
    sendMessage.addEventListener('click', sendChatMessage);

    // Enter key in chat input
    userMessage.addEventListener('keypress', function (e) {
        if (e.key === 'Enter') {
            sendChatMessage();
        }
    });

    // Filter change handler
    filterSelect.addEventListener('change', filterResults);

    //sort results handler
    sortSelect.addEventListener('change', sortResults);

    // Get user's current location
    function getUserLocation() {
        locationText.textContent = 'Detecting your location...';

        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                position => {
                    const { latitude, longitude } = position.coords;
                    currentLocation = { lat: latitude, lng: longitude };
                    getLocationName(latitude, longitude);
                },
                error => {
                    console.error('Geolocation error:', error);
                    locationText.textContent = 'Unable to detect location. Using default location.';
                    // Fallback to a default location (e.g., user's saved location)
                    currentLocation = { lat: -25.6546, lng: 27.2379 }; // Example: Rustenburg
                }
            );
        } else {
            locationText.textContent = 'Geolocation not supported. Using default location.';
            currentLocation = { lat: -25.6546, lng: 27.2379 }; // Example: Rustenburg
        }
    }

    // Get location name from coordinates
    async function getLocationName(lat, lng) {
        try {
            const response = await fetch(`https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=YOUR_GOOGLE_MAPS_API_KEY`);
            const data = await response.json();

            if (data.results && data.results.length > 0) {
                const address = data.results[0].formatted_address;
                locationText.textContent = address;
            } else {
                locationText.textContent = `Location: ${lat.toFixed(4)}, ${lng.toFixed(4)}`;
            }
        } catch (error) {
            console.error('Error getting location name:', error);
            locationText.textContent = `Location: ${lat.toFixed(4)}, ${lng.toFixed(4)}`;
        }
    }

    // Perform search
    async function performSearch() {
        const query = searchInput.value.trim();

        if (!query) {
            showChatMessage('Please enter a search term.', false);
            return;
        }

        if (!currentLocation) {
            showChatMessage('Still detecting your location. Please wait...', false);
            return;
        }

        try {
            const token = localStorage.getItem('access_token');
            const response = await fetch(
                `http://localhost:8000/technicians/search?search_string=${encodeURIComponent(query)}&latitude=${currentLocation.lat}&longitude=${currentLocation.lng}`,
                {
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    }
                }
            );

            if (!response.ok) {
                throw new Error('Search failed');
            }

            const { in_app_technicians, external_technicians } = await response.json();

            // Combine and format results
            searchResults = [
                ...in_app_technicians.map(tech => ({
                    ...tech,
                    is_inapp: true,
                    rating: parseFloat(tech.avg_rating) || 0,
                    distance_km: tech.distance_km || 0,
                    specialty: tech.service_types?.join(', ') || 'General Technician'
                })),
                ...external_technicians.map(tech => ({
                    ...tech,
                    is_inapp: false,
                    rating: parseFloat(tech.rating) || 0,
                    distance_km: tech.distance_km || 0,
                    specialty: tech.service_type || 'General Technician'
                }))
            ];

            displaySearchResults(searchResults);
            resultsSection.style.display = 'block';
        } catch (error) {
            console.error('Search error:', error);
            showChatMessage('Failed to perform search. Please try again.', false);
        }
    }

    // Display search results
    function displaySearchResults(results) {
        resultsGrid.innerHTML = '';

        if (results.length === 0) {
            resultsGrid.innerHTML = `
            <div class="empty-results">
                <i class="fas fa-user-times"></i>
                <p>No technicians found matching your search.</p>
            </div>
        `;
            return;
        }

        results.forEach(tech => {
            const techCard = document.createElement('div');
            techCard.className = 'technician-card';

            techCard.innerHTML = `
            <img src="${tech.profile_picture_url || '/assets/profile-placeholder.png'}" 
                 alt="${tech.name}" 
                 class="tech-avatar"
                 onerror="this.src='/assets/profile-placeholder.png'">
            <div class="tech-info">
                <h4 class="tech-name">
                    ${tech.name} ${tech.surname}
                    <span class="tech-type ${tech.is_inapp ? 'type-inapp' : 'type-external'}">
                        ${tech.is_inapp ? 'In-App' : 'External'}
                    </span>
                </h4>
                <p class="tech-specialty">${tech.specialty}</p>
                <div class="tech-rating">
                    ${generateStarRating(tech.rating)}
                    <span>${tech.rating?.toFixed(1) || '0.0'}</span>
                </div>
                <p class="tech-distance">${tech.distance_km ? `${tech.distance_km.toFixed(1)} km away` : 'Distance not available'}</p>
                <div class="tech-actions">
                    <button class="btn-favorite" onclick="toggleFavorite('${tech.technician_id}', this)">
                        <i class="fas fa-heart"></i> Favorite
                    </button>
                    ${tech.is_inapp ? `
                    <button class="btn-view" onclick="viewTechnicianProfile('${tech.technician_id}')">
                        <i class="fas fa-eye"></i> View
                    </button>
                    <button class="btn-book" onclick="bookTechnicianFromSearch('${tech.technician_id}', '${tech.name} ${tech.surname}')">
                        <i class="fas fa-calendar-plus"></i> Book
                    </button>
                    ` : `
                    <button class="btn-view" onclick="viewExternalTechnician('${tech.name} ${tech.surname}', ${tech.latitude}, ${tech.longitude})">
                        <i class="fas fa-map-marker-alt"></i> View
                    </button>
                    `}
                </div>
            </div>
        `;

            resultsGrid.appendChild(techCard);
        });
    }


    // Filter results based on selection
    function filterResults() {
        const filterValue = filterSelect.value;

        if (filterValue === 'all') {
            displaySearchResults(searchResults);
        } else {
            const filtered = searchResults.filter(tech =>
                filterValue === 'inapp' ? tech.is_inapp : !tech.is_inapp
            );
            displaySearchResults(filtered);
        }
    }
    function sortResults() {
        const sortValue = sortSelect.value;

        switch (sortValue) {
            case 'rating_high':
                searchResults.sort((a, b) => b.rating - a.rating);
                break;
            case 'rating_low':
                searchResults.sort((a, b) => a.rating - b.rating);
                break;
            case 'distance':
                searchResults.sort((a, b) => (a.distance_km || Infinity) - (b.distance_km || Infinity));
                break;
            default:
                // Default sorting (maybe keep original order or sort by relevance)
                break;
        }

        displaySearchResults(searchResults);
    }

    // Chatbot functions
    async function sendChatMessage() {
        const message = userMessage.value.trim();

        if (!message) return;

        // Add user message to chat
        showChatMessage(message, true);
        userMessage.value = '';

        try {
            const token = localStorage.getItem('access_token');
            const response = await fetch('http://localhost:8000/recommendation/recommend', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ description: message })
            });

            if (!response.ok) {
                throw new Error('Recommendation failed');
            }

            const { service_type } = await response.json();
            const recommendation = `Based on your issue, I recommend searching for "${service_type}" professionals. I'll search for qualified ${service_type}s in your area.`;

            showChatMessage(recommendation, false);

            // Auto-fill and search
            searchInput.value = service_type;
            performSearch();

        } catch (error) {
            console.error('Recommendation error:', error);
            showChatMessage("I couldn't understand your issue. Please try describing it differently.", false);
        }
    }

    function showChatMessage(message, isUser) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `ai-message ${isUser ? 'user-message' : ''}`;
        messageDiv.innerHTML = `<p>${message}</p>`;
        chatMessages.appendChild(messageDiv);
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }

    // Star rating generator
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

    // Reuse your existing authentication functions
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
        window.location.href = '/login.html';
    }
});

// Global functions
window.toggleFavorite = async function (technicianId, button) {
    const isFavorite = button.classList.contains('active');
    const token = localStorage.getItem('access_token');

    // Show loading state
    const originalContent = button.innerHTML;
    button.innerHTML = `<i class="fas fa-spinner fa-spin"></i> ${isFavorite ? 'Removing...' : 'Adding...'}`;
    button.disabled = true;

    try {
        const endpoint = `http://localhost:8000/clients/favorites`;
        const method = isFavorite ? 'DELETE' : 'POST';

        const response = await fetch(endpoint, {
            method: method,
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ technician_id: technicianId })
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.detail || (isFavorite ? 'Failed to remove favorite' : 'Failed to add favorite'));
        }

        // Update UI
        button.classList.toggle('active');
        button.innerHTML = `<i class="fas fa-heart"></i> ${isFavorite ? 'Favorite' : 'Favorited'}`;

        // Show toast notification
        showToast(`${isFavorite ? 'Removed from' : 'Added to'} favorites`, 'success');

    } catch (error) {
        console.error('Favorite error:', error);
        showToast(error.message, 'error');
        button.innerHTML = originalContent;
    } finally {
        button.disabled = false;
    }
};

// Helper function to show toast notifications
function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `
        <i class="fas ${type === 'success' ? 'fa-check-circle' : type === 'error' ? 'fa-exclamation-circle' : 'fa-info-circle'}"></i>
        <span>${message}</span>
    `;

    document.body.appendChild(toast);

    // Auto-remove after 3 seconds
    setTimeout(() => {
        toast.classList.add('fade-out');
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}


window.bookTechnician = async function (technicianId) {
    try {
        // Create a modal dialog for better UX
        const modal = document.createElement('div');
        modal.className = 'booking-modal';
        modal.innerHTML = `
            <div class="modal-content">
                <span class="close-btn">&times;</span>
                <h3>Book Technician</h3>
                <form id="bookingForm">
                    <div class="form-group">
                        <label for="serviceType">Service Needed:</label>
                        <input type="text" id="serviceType" required placeholder="e.g., Plumbing, Electrical">
                    </div>
                    <div class="form-group">
                        <label for="description">Description:</label>
                        <textarea id="description" required rows="4" placeholder="Describe the issue in detail"></textarea>
                    </div>
                    <button type="submit" class="btn-submit">Submit Booking</button>
                </form>
            </div>
        `;

        document.body.appendChild(modal);

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
                alert('Please fill in all fields');
                return;
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
                        description: description
                    })
                });

                if (!response.ok) {
                    const errorData = await response.json();
                    throw new Error(errorData.detail || 'Booking failed');
                }

                const bookingData = await response.json();
                modal.remove();

                // Show success message with booking details
                const successModal = document.createElement('div');
                successModal.className = 'booking-modal';
                successModal.innerHTML = `
                    <div class="modal-content success">
                        <h3>Booking Request Sent!</h3>
                        <p>Your booking for <strong>${serviceType}</strong> has been submitted successfully.</p>
                        <p>Booking ID: ${bookingData.booking_id}</p>
                        <p>Status: <span class="status-pending">Pending</span></p>
                        <button class="btn-close" onclick="this.parentElement.parentElement.remove()">Close</button>
                    </div>
                `;
                document.body.appendChild(successModal);

            } catch (error) {
                console.error('Booking error:', error);
                alert(`Booking failed: ${error.message}`);
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
        alert('Failed to initiate booking. Please try again.');
    }
};

window.viewTechnicianProfile = async function (technicianId) {
    try {
        const token = localStorage.getItem('access_token');
        const response = await fetch(`http://localhost:8000/technicians/${technicianId}`, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            throw new Error('Failed to load technician profile');
        }

        const technician = await response.json();
        displayTechnicianProfileModal(technician);
    } catch (error) {
        console.error('Error viewing technician profile:', error);
        showToast('Failed to load technician profile', 'error');
    }
};

function displayTechnicianProfileModal(technician) {
    const modal = document.createElement('div');
    modal.className = 'profile-modal';
    modal.innerHTML = `
        <div class="modal-content">
            <span class="close-btn">&times;</span>
            <div class="profile-header">
                <img src="${technician.profile_picture_url || '/assets/profile-placeholder.png'}" 
                     alt="${technician.name}" 
                     class="profile-avatar"
                     onerror="this.src='/assets/profile-placeholder.png'">
                <div class="profile-info">
                    <h3>${technician.name} ${technician.surname}</h3>
                    <p class="profile-specialty">${technician.service_types?.join(', ') || 'General Technician'}</p>
                    <div class="profile-rating">
                        ${generateStarRating(technician.avg_rating || 0)}
                        <span>${(technician.avg_rating || 0).toFixed(1)} (${technician.review_count || 0} reviews)</span>
                    </div>
                </div>
            </div>
            <div class="profile-details">
                <div class="detail-section">
                    <h4>About</h4>
                    <p>${technician.bio || 'No bio available'}</p>
                </div>
                <div class="detail-section">
                    <h4>Services</h4>
                    <ul class="service-list">
                        ${technician.service_types?.map(service => `<li>${service}</li>`).join('') || '<li>No specific services listed</li>'}
                    </ul>
                </div>
                <div class="profile-actions">
                    <button class="btn-favorite" onclick="toggleFavorite('${technician.technician_id}', this)">
                        <i class="fas fa-heart"></i> Favorite
                    </button>
                    <button class="btn-book" onclick="bookTechnicianFromSearch('${technician.technician_id}', '${technician.name} ${technician.surname}')">
                        <i class="fas fa-calendar-plus"></i> Book Now
                    </button>
                </div>
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

window.bookTechnicianFromSearch = async function (technicianId, technicianName) {
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

// Add this CSS for the new modal
const style = document.createElement('style');
style.textContent = `
.profile-modal {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background-color: rgba(0, 0, 0, 0.5);
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 1000;
}

.profile-modal .modal-content {
    background-color: white;
    border-radius: 8px;
    padding: 25px;
    width: 90%;
    max-width: 600px;
    max-height: 80vh;
    overflow-y: auto;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    position: relative;
}

.profile-modal .close-btn {
    position: absolute;
    top: 15px;
    right: 15px;
    font-size: 24px;
    cursor: pointer;
    color: #666;
}

.profile-header {
    display: flex;
    align-items: center;
    margin-bottom: 20px;
}

.profile-avatar {
    width: 100px;
    height: 100px;
    border-radius: 50%;
    object-fit: cover;
    margin-right: 20px;
    border: 3px solid #e6efff;
}

.profile-info h3 {
    margin: 0 0 5px 0;
    font-size: 24px;
}

.profile-specialty {
    color: #6c757d;
    margin: 0 0 10px 0;
}

.profile-rating {
    color: #ffb33e;
    font-size: 18px;
}

.profile-rating span {
    color: #6c757d;
    font-size: 14px;
    margin-left: 5px;
}

.profile-details {
    margin-top: 20px;
}

.detail-section {
    margin-bottom: 20px;
}

.detail-section h4 {
    margin-bottom: 10px;
    color: #2f3941;
}

.service-list {
    list-style-type: none;
    padding: 0;
}

.service-list li {
    padding: 5px 0;
    border-bottom: 1px solid #eee;
}

.profile-actions {
    display: flex;
    gap: 10px;
    margin-top: 20px;
}

.profile-actions button {
    flex: 1;
    padding: 10px;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    font-weight: 600;
    transition: all 0.3s ease;
}

.profile-actions .btn-favorite {
    background-color: #f8f9fa;
    color: #6c757d;
}

.profile-actions .btn-favorite:hover {
    background-color: #e9ecef;
}

.profile-actions .btn-favorite.active {
    background-color: #dc3545;
    color: white;
}

.profile-actions .btn-book {
    background-color: #2a5bd7;
    color: white;
}

.profile-actions .btn-book:hover {
    background-color: #1e4bbb;
}
`;
document.head.appendChild(style);

window.viewExternalTechnician = function (name, lat, lng) {
    const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(name)}@${lat},${lng}`;
    window.open(mapsUrl, '_blank');
};

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