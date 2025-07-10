document.addEventListener('DOMContentLoaded', function() {
    const signupForm = document.getElementById('signupForm');
    const togglePassword = document.getElementById('togglePassword');
    const passwordInput = document.getElementById('password');
    const submitBtn = document.getElementById('submitBtn');

    // Toggle password visibility
    if (togglePassword) {
        togglePassword.addEventListener('click', function() {
            const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
            passwordInput.setAttribute('type', type);
            this.classList.toggle('fa-eye-slash');
        });
    }

    // Form submission
    if (signupForm) {
        signupForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            // Validate passwords match
            const password = document.getElementById('password').value;
            const confirmPassword = document.getElementById('confirmPassword').value;
            
            if (password !== confirmPassword) {
                showToast('Passwords do not match', 'error');
                return;
            }
            
            // Get form data
            const formData = {
                name: document.getElementById('firstName').value.trim(),
                surname: document.getElementById('lastName').value.trim(),
                email: document.getElementById('email').value.trim(),
                phone_number: document.getElementById('phone').value.trim(),
                location_name: document.getElementById('location').value.trim(),
                password: password
            };

            // Show loading state
            submitBtn.disabled = true;
            submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Creating Account...';

            try {
                const response = await fetch('http://localhost:8000/auth/register/client', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(formData)
                });

                const data = await response.json();

                if (!response.ok) {
                    throw new Error(data.detail || 'Registration failed');
                }

                showToast('Account created successfully! Login to continue...', 'success');
                
                // Redirect to login after 2 seconds
                setTimeout(() => {
                    window.location.href = '/index.html';
                }, 2000);
                
            } catch (error) {
                console.error('Registration error:', error);
                showToast(error.message || 'Registration failed. Please try again.', 'error');
                submitBtn.disabled = false;
                submitBtn.innerHTML = '<i class="fas fa-user-plus"></i> Create Account';
            }
        });
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
});