document.addEventListener('DOMContentLoaded', function() {
    // Get modal elements
    const modal = document.getElementById('signupModal');
    const headerSignupBtn = document.getElementById('headerSignup');
    const heroSignupBtn = document.getElementById('heroSignup');
    const closeModal = document.querySelector('.close-modal');
    const clientCard = document.getElementById('clientCard');
    const technicianCard = document.getElementById('technicianCard');
    const loginModal = document.getElementById('loginModal');
    const loginButtons = document.querySelectorAll('.btn-login');
    const loginForm = document.getElementById('loginForm');
    const togglePassword = document.getElementById('togglePassword');
    const loginPassword = document.getElementById('loginPassword');
    const loginError = document.getElementById('loginError');
    const signupLink = document.querySelector('.signup-link');
    const loginSubmitBtn = document.querySelector('.btn-login-submit');

    // Function to open modal
    function openModal() {
        modal.style.display = 'block';
        document.body.style.overflow = 'hidden';
    }

    // Function to close modal
    function closeModalFunc() {
        modal.style.display = 'none';
        document.body.style.overflow = 'auto';
    }

    // Event listeners for opening modal
    if (headerSignupBtn) {
        headerSignupBtn.addEventListener('click', function(e) {
            e.preventDefault();
            openModal();
        });
    }

    if (heroSignupBtn) {
        heroSignupBtn.addEventListener('click', function(e) {
            e.preventDefault();
            openModal();
        });
    }

    // Event listener for closing modal
    if (closeModal) {
        closeModal.addEventListener('click', closeModalFunc);
    }

    // Close modal when clicking outside
    window.addEventListener('click', function(e) {
        if (e.target === modal) {
            closeModalFunc();
        }
    });

    // User type selection
    if (clientCard) {
        clientCard.addEventListener('click', function() {
            window.location.href = '/signup-client.html';
        });
    }

    if (technicianCard) {
        technicianCard.addEventListener('click', function() {
            window.location.href = '/signup-technician.html';
        });
    }

    // Toggle password visibility
    if (togglePassword) {
        togglePassword.addEventListener('click', function() {
            const type = loginPassword.getAttribute('type') === 'password' ? 'text' : 'password';
            loginPassword.setAttribute('type', type);
            this.classList.toggle('fa-eye-slash');
        });
    }

    // Open login modal
    function openLoginModal() {
        loginModal.style.display = 'block';
        document.body.style.overflow = 'hidden';
        loginError.textContent = '';
    }

    // Close login modal
    function closeLoginModal() {
        loginModal.style.display = 'none';
        document.body.style.overflow = 'auto';
        loginForm.reset();
    }

    // Login button event listeners
    loginButtons.forEach(btn => {
        btn.addEventListener('click', function(e) {
            e.preventDefault();
            closeModalFunc(); // Close any other open modals
            openLoginModal();
        });
    });

    // Switch to signup modal
    if (signupLink) {
        signupLink.addEventListener('click', function(e) {
            e.preventDefault();
            closeLoginModal();
            openModal();
        });
    }

    // Login form submission
    if (loginForm) {
        loginForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            const email = loginForm.email.value.trim();
            const password = loginForm.password.value;
            const rememberMe = loginForm.rememberMe.checked;
            
            // Show loading state
            loginSubmitBtn.disabled = true;
            loginSubmitBtn.classList.add('loading');
            loginError.textContent = '';
            
            try {
                const response = await fetch('http://localhost:8000/auth/token', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/x-www-form-urlencoded',
                        'Accept': 'application/json'
                    },
                    body: new URLSearchParams({
                        username: email,
                        password: password,
                        grant_type: 'password'
                    }),
                    credentials: 'include'  // For cookie-based auth
                });

                // First check if we got any response at all
                if (!response) {
                    throw new Error('No response from server');
                }

                // Check if response is JSON
                const contentType = response.headers.get('content-type');
                if (!contentType || !contentType.includes('application/json')) {
                    const text = await response.text();
                    console.error("Non-JSON response:", text);
                    throw new Error('Server returned unexpected response');
                }

                const data = await response.json();
                
                if (!response.ok) {
                    throw new Error(data.detail || 'Login failed. Please try again.');
                }
                
                // Store the token and user type
                localStorage.setItem('access_token', data.access_token);
                localStorage.setItem('user_type', data.user_type);
                
                // If "Remember me" is checked, store the email
                if (rememberMe) {
                    localStorage.setItem('remember_me', 'true');
                    localStorage.setItem('remembered_email', email);
                } else {
                    localStorage.removeItem('remember_me');
                    localStorage.removeItem('remembered_email');
                }
                
                // Verify user status before redirecting
                await verifyAndRedirect(data.user_type, data.access_token);
                
            } catch (error) {
                console.error('Login error:', error);
                loginError.textContent = error.message || 'Login failed. Please try again.';
                
                // Reset password field on error
                loginForm.password.value = '';
                
            } finally {
                // Reset loading state
                loginSubmitBtn.disabled = false;
                loginSubmitBtn.classList.remove('loading');
            }
        });
    }

    // Verify user status and redirect
    async function verifyAndRedirect(userType, token) {
        try {
            const verifyResponse = await fetch(`http://localhost:8000/${userType}s/me`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                },
                credentials: 'include'
            });

            if (!verifyResponse.ok) {
                throw new Error('Failed to verify user status');
            }

            const userData = await verifyResponse.json();
            
            // Clear any existing error messages
            loginError.textContent = '';
            
            // Close login modal
            closeLoginModal();
            
            // Redirect based on user type
            switch(userType) {
                case 'client':
                    window.location.href = '/client/dashboard.html';
                    break;
                case 'technician':
                    window.location.href = '/technician/dashboard.html';
                    break;
                case 'admin':
                    window.location.href = '/admin/dashboard.html';
                    break;
                default:
                    window.location.href = '/index.html';
            }
            
        } catch (error) {
            console.error('Verification error:', error);
            throw new Error('Failed to verify your account status');
        }
    }

    // Close modal when clicking outside
    window.addEventListener('click', function(e) {
        if (e.target === loginModal) {
            closeLoginModal();
        }
    });

    // Check for "remember me" on page load
    if (localStorage.getItem('remember_me') === 'true') {
        const emailInput = document.getElementById('loginEmail');
        if (emailInput) {
            emailInput.value = localStorage.getItem('remembered_email') || '';
        }
        const rememberCheckbox = document.getElementById('rememberMe');
        if (rememberCheckbox) {
            rememberCheckbox.checked = true;
        }
    }
});