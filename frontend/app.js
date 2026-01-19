const API_BASE = 'https://carboncredit-3ej7.onrender.com';

// ============================================
// UTILITY FUNCTIONS
// ============================================

function showMessage(elementId, message, type = 'success') {
    const messageDiv = document.getElementById(elementId);
    if (!messageDiv) return;
    
    messageDiv.className = `message ${type}`;
    messageDiv.textContent = message;
    messageDiv.classList.remove('hidden');
    
    setTimeout(() => {
        messageDiv.classList.add('hidden');
    }, 5000);
}

function setLoading(button, isLoading) {
    if (isLoading) {
        button.disabled = true;
        const originalText = button.textContent;
        button.setAttribute('data-original-text', originalText);
        button.innerHTML = '<span class="loading"></span> Processing...';
    } else {
        button.disabled = false;
        button.textContent = button.getAttribute('data-original-text') || 'Submit';
    }
}

// ============================================
// PASSWORD STRENGTH INDICATOR
// ============================================

function checkPasswordStrength(password, strengthElement) {
    if (!strengthElement) return;
    
    const strengthFill = strengthElement.querySelector('.strength-fill');
    const strengthText = strengthElement.querySelector('.strength-text');
    
    if (!password) {
        strengthFill.style.width = '0%';
        strengthFill.className = 'strength-fill';
        strengthText.textContent = 'Password strength: 12+ chars, uppercase, lowercase, digit & special';
        return;
    }
    
    let strength = 0;
    let requirements = [];
    
    // Check each requirement
    if (password.length >= 12) {
        strength++;
    } else {
        requirements.push('12+ characters');
    }
    
    if (/[a-z]/.test(password)) strength++;
    else requirements.push('lowercase');
    
    if (/[A-Z]/.test(password)) strength++;
    else requirements.push('UPPERCASE');
    
    if (/\d/.test(password)) strength++;
    else requirements.push('digit');
    
    if (/[!@#$%^&*(),.?":{}|<>]/.test(password)) strength++;
    else requirements.push('special char');
    
    let text = '';
    if (strength <= 2) {
        strengthFill.className = 'strength-fill weak';
        text = 'Weak - Missing: ' + requirements.join(', ');
    } else if (strength <= 3) {
        strengthFill.className = 'strength-fill medium';
        text = 'Medium - Missing: ' + requirements.join(', ');
    } else if (strength < 5) {
        strengthFill.className = 'strength-fill strong';
        text = 'Strong - Missing: ' + requirements.join(', ');
    } else {
        strengthFill.className = 'strength-fill very-strong';
        text = 'Very Strong ✓';
    }
    
    strengthFill.style.width = (strength * 20) + '%';
    strengthText.textContent = text;
}

// ============================================
// PASSWORD VISIBILITY TOGGLE
// ============================================

document.addEventListener('DOMContentLoaded', () => {
    // Password toggle buttons
    document.querySelectorAll('.toggle-password').forEach(btn => {
        btn.addEventListener('click', function() {
            const targetId = this.getAttribute('data-target');
            const input = document.getElementById(targetId);
            if (input.type === 'password') {
                input.type = 'text';
                this.textContent = '🙈';
            } else {
                input.type = 'password';
                this.textContent = '👁️';
            }
        });
    });
    
    // Password strength indicators
    const farmerRegPassword = document.getElementById('farmer-reg-password');
    const businessRegPassword = document.getElementById('business-reg-password');
    
    if (farmerRegPassword) {
        farmerRegPassword.addEventListener('input', function() {
            const strengthElement = document.getElementById('farmer-password-strength');
            checkPasswordStrength(this.value, strengthElement);
        });
    }
    
    if (businessRegPassword) {
        businessRegPassword.addEventListener('input', function() {
            const strengthElement = document.getElementById('business-password-strength');
            checkPasswordStrength(this.value, strengthElement);
        });
    }
});

// ============================================
// TAB SWITCHING
// ============================================

document.addEventListener('DOMContentLoaded', () => {
    const tabButtons = document.querySelectorAll('.tab-btn');
    const tabContents = document.querySelectorAll('.tab-content');
    
    tabButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            const targetTab = btn.getAttribute('data-tab');
            
            // Remove active class from all buttons and contents
            tabButtons.forEach(b => b.classList.remove('active'));
            tabContents.forEach(c => c.classList.remove('active'));
            
            // Add active class to clicked button and corresponding content
            btn.classList.add('active');
            document.getElementById(`${targetTab}-tab`).classList.add('active');
        });
    });
});

// ============================================
// FORM SWITCHING (LOGIN/REGISTER)
// ============================================

document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('.switch-link').forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            const target = this.getAttribute('data-switch');
            
            // Hide all forms in the current tab
            const currentTab = this.closest('.tab-content');
            if (currentTab) {
                currentTab.querySelectorAll('.auth-form-container').forEach(form => {
                    form.classList.add('hidden');
                });
                
                // Show target form - handle both with and without -form suffix
                let targetForm = document.getElementById(target);
                if (!targetForm && !target.endsWith('-form')) {
                    targetForm = document.getElementById(target + '-form');
                }
                
                if (targetForm) {
                    targetForm.classList.remove('hidden');
                    // Scroll to form smoothly
                    targetForm.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                } else {
                    console.error('Target form not found:', target);
                }
            }
        });
    });
});

// ============================================
// ANIMATED STATISTICS
// ============================================

function animateCounter(element, target, duration = 2000) {
    const start = 0;
    const increment = target / (duration / 16);
    let current = start;
    
    const timer = setInterval(() => {
        current += increment;
        if (current >= target) {
            // Format numbers appropriately
            if (target >= 1000) {
                element.textContent = (target / 1000).toFixed(1) + 'K';
            } else {
                element.textContent = Math.floor(target).toLocaleString();
            }
            clearInterval(timer);
        } else {
            if (target >= 1000) {
                element.textContent = (current / 1000).toFixed(1) + 'K';
            } else {
                element.textContent = Math.floor(current).toLocaleString();
            }
        }
    }, 16);
}

// Fetch real statistics from API
async function loadStats() {
    try {
        const response = await fetch(`${API_BASE}/stats`);
        if (!response.ok) {
            console.error('Failed to fetch stats');
            return;
        }
        const stats = await response.json();
        
        // Update stat elements with real data
        const statItems = document.querySelectorAll('.stat-item');
        if (statItems.length >= 3) {
            // Active Plantations
            const plantationsStat = statItems[0].querySelector('.stat-number');
            if (plantationsStat) {
                plantationsStat.setAttribute('data-target', stats.active_plantations || 0);
            }
            
            // Total Credits Traded
            const creditsStat = statItems[1].querySelector('.stat-number');
            if (creditsStat) {
                creditsStat.setAttribute('data-target', Math.round(stats.total_credits_traded || 0));
            }
            
            // Verified Farmers
            const farmersStat = statItems[2].querySelector('.stat-number');
            if (farmersStat) {
                farmersStat.setAttribute('data-target', stats.verified_farmers || 0);
            }
        }
    } catch (error) {
        console.error('Error loading stats:', error);
        // Keep default values if API fails
    }
}

document.addEventListener('DOMContentLoaded', () => {
    // Load real stats first
    loadStats().then(() => {
        // Then set up the animation observer
        const observerOptions = {
            threshold: 0.5,
            rootMargin: '0px'
        };
        
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const statNumber = entry.target.querySelector('.stat-number');
                    const target = parseInt(statNumber.getAttribute('data-target'));
                    if (target !== undefined && !statNumber.classList.contains('animated')) {
                        statNumber.classList.add('animated');
                        animateCounter(statNumber, target);
                    }
                }
            });
        }, observerOptions);
        
        document.querySelectorAll('.stat-item').forEach(item => {
            observer.observe(item);
        });
    });
});

// ============================================
// SMOOTH SCROLLING
// ============================================

document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function(e) {
            e.preventDefault();
            const target = document.querySelector(this.getAttribute('href'));
            if (target) {
                target.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });
            }
        });
    });
});

// ============================================
// FARMER LOGIN
// ============================================

document.getElementById('farmer-login')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const button = e.target.querySelector('button[type="submit"]');
    setLoading(button, true);
    
    const username = document.getElementById('farmer-username').value;
    const password = document.getElementById('farmer-password').value;
    
    try {
        const response = await fetch(`${API_BASE}/farmer/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });
        const data = await response.json();
        
        if (response.ok) {
            // 2FA required
            localStorage.setItem('farmer_user_id', data.user_id);
            showMessage('farmer-message', 'Check your email for 2FA code', 'success');
            setTimeout(() => {
                document.getElementById('farmer-login-form').classList.add('hidden');
                document.getElementById('farmer-2fa-form').classList.remove('hidden');
            }, 500);
        } else if (response.status === 403) {
            // Email verification required
            localStorage.setItem('farmer_user_id', data.user_id);
            showMessage('farmer-message', 'Please verify your email first', 'error');
            setTimeout(() => {
                document.getElementById('farmer-login-form').classList.add('hidden');
                document.getElementById('farmer-email-verify-form').classList.remove('hidden');
            }, 500);
        } else if (response.status === 423) {
            showMessage('farmer-message', data.error, 'error');
        } else {
            showMessage('farmer-message', data.error || 'Login failed', 'error');
        }
        setLoading(button, false);
    } catch (error) {
        showMessage('farmer-message', 'Network error. Please check your connection.', 'error');
        setLoading(button, false);
    }
});

// ============================================
// FARMER 2FA VERIFICATION
// ============================================

document.getElementById('farmer-2fa-verify')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const button = e.target.querySelector('button[type="submit"]');
    setLoading(button, true);
    
    const user_id = localStorage.getItem('farmer_user_id');
    const code = document.getElementById('farmer-2fa-code').value;
    
    if (!code || code.length !== 6) {
        showMessage('farmer-2fa-message', 'Please enter a 6-digit code', 'error');
        setLoading(button, false);
        return;
    }
    
    try {
        const response = await fetch(`${API_BASE}/farmer/verify-2fa`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ user_id, code })
        });
        const data = await response.json();
        
        if (response.ok) {
            localStorage.setItem('user_type', data.user_type);
            localStorage.setItem('user_id', data.user_id);
            localStorage.removeItem('farmer_user_id');
            showMessage('farmer-2fa-message', 'Login successful! Redirecting...', 'success');
            setTimeout(() => {
                window.location.href = 'farmer_dashboard.html';
            }, 1000);
        } else {
            showMessage('farmer-2fa-message', data.error || '2FA verification failed', 'error');
            setLoading(button, false);
        }
    } catch (error) {
        showMessage('farmer-2fa-message', 'Network error. Please check your connection.', 'error');
        setLoading(button, false);
    }
});

// ============================================
// FARMER REGISTRATION
// ============================================

document.getElementById('farmer-reg-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const button = e.target.querySelector('button[type="submit"]');
    setLoading(button, true);
    
    const username = document.getElementById('farmer-reg-username').value;
    const email = document.getElementById('farmer-reg-email').value;
    const password = document.getElementById('farmer-reg-password').value;
    
    // Validate password strength
    if (password.length < 12) {
        showMessage('farmer-reg-message', 'Password must be at least 12 characters long', 'error');
        setLoading(button, false);
        return;
    }
    if (!/[A-Z]/.test(password)) {
        showMessage('farmer-reg-message', 'Password must contain at least one uppercase letter', 'error');
        setLoading(button, false);
        return;
    }
    if (!/[a-z]/.test(password)) {
        showMessage('farmer-reg-message', 'Password must contain at least one lowercase letter', 'error');
        setLoading(button, false);
        return;
    }
    if (!/\d/.test(password)) {
        showMessage('farmer-reg-message', 'Password must contain at least one digit', 'error');
        setLoading(button, false);
        return;
    }
    if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
        showMessage('farmer-reg-message', 'Password must contain at least one special character (!@#$%^&*(),.?":{} |<>)', 'error');
        setLoading(button, false);
        return;
    }
    
    try {
        const response = await fetch(`${API_BASE}/farmer/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, email, password })
        });
        const data = await response.json();
        
        if (response.ok) {
            localStorage.setItem('farmer_user_id', data.user_id);
            showMessage('farmer-reg-message', 'Registration successful! Check your email for verification code.', 'success');
            setTimeout(() => {
                document.getElementById('farmer-register-form').classList.add('hidden');
                document.getElementById('farmer-email-verify-form').classList.remove('hidden');
                document.getElementById('farmer-verify-code').focus();
            }, 1500);
        } else {
            showMessage('farmer-reg-message', data.error || 'Registration failed', 'error');
        }
        setLoading(button, false);
    } catch (error) {
        showMessage('farmer-reg-message', 'Network error. Please check your connection.', 'error');
        setLoading(button, false);
    }
});

// ============================================
// FARMER EMAIL VERIFICATION
// ============================================

document.getElementById('farmer-email-verify')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const button = e.target.querySelector('button[type="submit"]');
    setLoading(button, true);
    
    const user_id = localStorage.getItem('farmer_user_id');
    const code = document.getElementById('farmer-verify-code').value;
    
    if (!code || code.length !== 6) {
        showMessage('farmer-verify-message', 'Please enter a 6-digit code', 'error');
        setLoading(button, false);
        return;
    }
    
    try {
        const response = await fetch(`${API_BASE}/farmer/verify-email`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ user_id, code })
        });
        const data = await response.json();
        
        if (response.ok) {
            localStorage.removeItem('farmer_user_id');
            showMessage('farmer-verify-message', 'Email verified! Please login now.', 'success');
            setTimeout(() => {
                document.getElementById('farmer-email-verify-form').classList.add('hidden');
                document.getElementById('farmer-login-form').classList.remove('hidden');
                document.getElementById('farmer-login').reset();
            }, 1500);
        } else {
            showMessage('farmer-verify-message', data.error || 'Verification failed', 'error');
            setLoading(button, false);
        }
    } catch (error) {
        showMessage('farmer-verify-message', 'Network error. Please check your connection.', 'error');
        setLoading(button, false);
    }
});

// Farmer resend code
document.getElementById('farmer-resend-code')?.addEventListener('click', async (e) => {
    e.preventDefault();
    const userEmail = prompt('Enter your email address:');
    if (!userEmail) return;
    
    try {
        const response = await fetch(`${API_BASE}/farmer/resend-verification`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: userEmail })
        });
        const data = await response.json();
        
        if (response.ok) {
            showMessage('farmer-verify-message', 'New verification code sent to your email', 'success');
        } else {
            showMessage('farmer-verify-message', data.error || 'Failed to resend code', 'error');
        }
    } catch (error) {
        showMessage('farmer-verify-message', 'Network error', 'error');
    }
});

// ============================================
// BUSINESS LOGIN
// ============================================

document.getElementById('business-login')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const button = e.target.querySelector('button[type="submit"]');
    setLoading(button, true);
    
    const username = document.getElementById('business-username').value;
    const password = document.getElementById('business-password').value;
    
    try {
        const response = await fetch(`${API_BASE}/business/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });
        const data = await response.json();
        
        if (response.ok) {
            localStorage.setItem('user_type', 'business');
            localStorage.setItem('user_id', data.user_id);
            showMessage('business-message', 'Login successful! Redirecting...', 'success');
            setTimeout(() => {
                window.location.href = 'business_dashboard.html';
            }, 1000);
        } else {
            showMessage('business-message', data.error || 'Login failed', 'error');
            setLoading(button, false);
        }
    } catch (error) {
        showMessage('business-message', 'Network error. Please check your connection.', 'error');
        setLoading(button, false);
    }
});

// ============================================
// BUSINESS REGISTRATION
// ============================================

document.getElementById('business-reg-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const button = e.target.querySelector('button[type="submit"]');
    setLoading(button, true);
    
    const username = document.getElementById('business-reg-username').value;
    const email = document.getElementById('business-reg-email').value;
    const password = document.getElementById('business-reg-password').value;
    
    // Basic validation - at least 6 characters
    if (password.length < 6) {
        showMessage('business-reg-message', 'Password must be at least 6 characters long', 'error');
        setLoading(button, false);
        return;
    }
    
    try {
        const response = await fetch(`${API_BASE}/business/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, email, password })
        });
        const data = await response.json();
        
        if (response.ok) {
            localStorage.setItem('user_type', 'business');
            localStorage.setItem('user_id', data.user_id);
            showMessage('business-reg-message', 'Registration successful! Redirecting...', 'success');
            setTimeout(() => {
                window.location.href = 'business_dashboard.html';
            }, 1000);
        } else {
            showMessage('business-reg-message', data.error || 'Registration failed', 'error');
        }
        setLoading(button, false);
    } catch (error) {
        showMessage('business-reg-message', 'Network error. Please check your connection.', 'error');
        setLoading(button, false);
    }
});


// ============================================
// ADMIN LOGIN
// ============================================

document.getElementById('admin-login')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const button = e.target.querySelector('button[type="submit"]');
    setLoading(button, true);

    const password = document.getElementById('admin-password').value;

    if (password === 'admin123') {
        localStorage.setItem('user_type', 'admin');
        localStorage.setItem('user_id', '1'); // Dummy admin user ID
        showMessage('admin-message', 'Login successful! Redirecting...', 'success');
        setTimeout(() => {
            window.location.href = 'admin_dashboard.html';
        }, 1000);
    } else {
        showMessage('admin-message', 'Invalid admin password', 'error');
        setLoading(button, false);
    }
});

// ============================================
// CUSTOM MODAL SYSTEM
// ============================================

// Custom Modal Functions
function showAlert(message, type = 'info', callback = null) {
    const modal = document.getElementById('custom-modal');
    const title = document.getElementById('modal-title');
    const body = document.getElementById('modal-body');
    const footer = document.getElementById('modal-footer');
    
    title.textContent = type === 'error' ? 'Error' : type === 'warning' ? 'Warning' : 'Information';
    body.innerHTML = `<p>${message}</p>`;
    
    // Hide cancel button for alerts
    document.getElementById('modal-cancel').style.display = 'none';
    
    // Change confirm button text and style
    const confirmBtn = document.getElementById('modal-confirm');
    confirmBtn.textContent = 'OK';
    confirmBtn.className = 'btn btn-primary';
    
    modal.classList.add('active', 'alert-modal');
    
    confirmBtn.onclick = () => {
        hideModal();
        if (callback) callback();
    };
}

function showConfirm(message, callback) {
    const modal = document.getElementById('custom-modal');
    const title = document.getElementById('modal-title');
    const body = document.getElementById('modal-body');
    
    title.textContent = 'Confirm Action';
    body.innerHTML = `<p>${message}</p>`;
    
    // Show cancel button for confirms
    document.getElementById('modal-cancel').style.display = 'inline-block';
    
    // Change confirm button text
    const confirmBtn = document.getElementById('modal-confirm');
    confirmBtn.textContent = 'Confirm';
    confirmBtn.className = 'btn btn-primary';
    
    modal.classList.add('active', 'confirm-modal');
    
    document.getElementById('modal-cancel').onclick = () => hideModal();
    confirmBtn.onclick = () => {
        hideModal();
        if (callback) callback();
    };
}

function showInputModal(title, message, placeholder, callback) {
    const modal = document.getElementById('custom-modal');
    const modalTitle = document.getElementById('modal-title');
    const body = document.querySelector('.modal-body');
    
    modalTitle.textContent = title;
    body.innerHTML = `
        <p>${message}</p>
        <input type="number" id="modal-input" placeholder="${placeholder}" step="0.01" min="0.01" style="width: 100%; padding: 0.75rem; border: 2px solid var(--border-color); border-radius: var(--radius); margin-top: 1rem;">
    `;
    
    // Show cancel button
    document.getElementById('modal-cancel').style.display = 'inline-block';
    
    // Change confirm button text
    const confirmBtn = document.getElementById('modal-confirm');
    confirmBtn.textContent = 'Submit';
    confirmBtn.className = 'btn btn-primary';
    
    modal.classList.add('active', 'input-modal');
    
    // Focus on input
    setTimeout(() => {
        const input = document.getElementById('modal-input');
        if (input) input.focus();
    }, 100);
    
    document.getElementById('modal-cancel').onclick = () => hideModal();
    confirmBtn.onclick = () => {
        const input = document.getElementById('modal-input');
        const value = input ? input.value : '';
        hideModal();
        if (callback) callback(value);
    };
}

function hideModal() {
    const modal = document.getElementById('custom-modal');
    modal.classList.remove('active', 'alert-modal', 'confirm-modal', 'input-modal');
}

// Modal event listeners
document.addEventListener('DOMContentLoaded', () => {
    const modal = document.getElementById('custom-modal');
    const closeBtn = document.querySelector('.modal-close');
    
    if (closeBtn) {
        closeBtn.onclick = hideModal;
    }
    
    if (modal) {
        modal.onclick = (e) => {
            if (e.target === modal) hideModal();
        };
        
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && modal.classList.contains('active')) {
                hideModal();
            }
        });
    }

    // Mobile menu functionality
    const mobileMenuBtn = document.querySelector('.mobile-menu-btn');
    const navLinks = document.querySelector('.nav-links');

    if (mobileMenuBtn && navLinks) {
        mobileMenuBtn.addEventListener('click', () => {
            mobileMenuBtn.classList.toggle('active');
            navLinks.classList.toggle('active');
        });

        // Close mobile menu when clicking on a link
        navLinks.querySelectorAll('a').forEach(link => {
            link.addEventListener('click', () => {
                mobileMenuBtn.classList.remove('active');
                navLinks.classList.remove('active');
            });
        });

        // Close mobile menu when clicking outside
        document.addEventListener('click', (e) => {
            if (!mobileMenuBtn.contains(e.target) && !navLinks.contains(e.target)) {
                mobileMenuBtn.classList.remove('active');
                navLinks.classList.remove('active');
            }
        });
    }
});
// ============================================
// GOOGLE OAUTH LOGIN
// ============================================

// Note: In production, integrate with Google Sign-In SDK
// For now, we'll provide placeholder functions
window.handleFarmerGoogleSignup = async function() {
    // In production: Initialize Google Sign-In
    // This is a placeholder - integrate with actual Google OAuth 2.0
    const googleId = prompt('This would open Google login. For testing, enter a test Google ID:');
    if (!googleId) return;
    
    const email = prompt('Enter email:');
    const name = prompt('Enter name:');
    
    if (!email || !name) return;
    
    try {
        const response = await fetch(`${API_BASE}/farmer/google-login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ google_id: googleId, email, name })
        });
        const data = await response.json();
        
        if (response.ok || response.status === 201) {
            localStorage.setItem('farmer_user_id', data.user_id);
            showMessage('farmer-reg-message', 'Check your email for 2FA code', 'success');
            setTimeout(() => {
                document.getElementById('farmer-register-form').classList.add('hidden');
                document.getElementById('farmer-2fa-form').classList.remove('hidden');
            }, 500);
        } else {
            showMessage('farmer-reg-message', data.error || 'Google login failed', 'error');
        }
    } catch (error) {
        showMessage('farmer-reg-message', 'Network error', 'error');
    }
};

window.handleBusinessGoogleSignup = async function() {
    const googleId = prompt('This would open Google login. For testing, enter a test Google ID:');
    if (!googleId) return;
    
    const email = prompt('Enter email:');
    const name = prompt('Enter name:');
    
    if (!email || !name) return;
    
    try {
        const response = await fetch(`${API_BASE}/business/google-login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ google_id: googleId, email, name })
        });
        const data = await response.json();
        
        if (response.ok || response.status === 201) {
            localStorage.setItem('business_user_id', data.user_id);
            showMessage('business-reg-message', 'Check your email for 2FA code', 'success');
            setTimeout(() => {
                document.getElementById('business-register-form').classList.add('hidden');
                document.getElementById('business-2fa-form').classList.remove('hidden');
            }, 500);
        } else {
            showMessage('business-reg-message', data.error || 'Google login failed', 'error');
        }
    } catch (error) {
        showMessage('business-reg-message', 'Network error', 'error');
    }
};

// Setup Google login button click handlers
document.addEventListener('DOMContentLoaded', () => {
    const farmerGoogleBtn = document.getElementById('farmer-google-signup');
    const businessGoogleBtn = document.getElementById('business-google-signup');
    
    if (farmerGoogleBtn) {
        farmerGoogleBtn.addEventListener('click', handleFarmerGoogleSignup);
    }
    
    if (businessGoogleBtn) {
        businessGoogleBtn.addEventListener('click', handleBusinessGoogleSignup);
    }
});