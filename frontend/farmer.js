const userId = localStorage.getItem('user_id');
const userType = localStorage.getItem('user_type');

// Check authentication - moved to DOMContentLoaded
document.addEventListener('DOMContentLoaded', () => {
    if (!userId || userType !== 'farmer') {
        // Use standard alert for now since modal functions aren't loaded yet
        alert('Please login as farmer first');
        window.location.href = 'index.html';
        return;
    }
    
    // Initialize the page
    setupImageModal();
    loadCredits();
    loadPlantations();
    
    // Modal event listeners
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
    const nav = document.querySelector('header nav');

    if (mobileMenuBtn && nav) {
        mobileMenuBtn.addEventListener('click', () => {
            mobileMenuBtn.classList.toggle('active');
            nav.classList.toggle('mobile-menu-active');
        });

        // Close mobile menu when clicking on a link
        nav.querySelectorAll('a').forEach(link => {
            link.addEventListener('click', () => {
                mobileMenuBtn.classList.remove('active');
                nav.classList.remove('mobile-menu-active');
            });
        });

        // Close mobile menu when clicking outside
        document.addEventListener('click', (e) => {
            if (!mobileMenuBtn.contains(e.target) && !nav.contains(e.target)) {
                mobileMenuBtn.classList.remove('active');
                nav.classList.remove('mobile-menu-active');
            }
        });
    }
});

// Image modal functionality
function setupImageModal() {
    const modal = document.getElementById('image-modal');
    const modalImg = document.getElementById('modal-image');
    const closeBtn = modal.querySelector('.close');
    
    // Close modal on click
    closeBtn.onclick = () => modal.classList.remove('active');
    modal.onclick = (e) => {
        if (e.target === modal) modal.classList.remove('active');
    };
    
    // Close on Escape key
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && modal.classList.contains('active')) {
            modal.classList.remove('active');
        }
    });
}

// Show image in modal
function showImageModal(imageSrc) {
    const modal = document.getElementById('image-modal');
    const modalImg = document.getElementById('modal-image');
    modalImg.src = imageSrc;
    modal.classList.add('active');
}

// Utility functions
function showMessage(message, type = 'success') {
    const messageDiv = document.getElementById('plantation-message');
    if (!messageDiv) return;
    
    messageDiv.className = `alert alert-${type}`;
    messageDiv.textContent = message;
    messageDiv.classList.remove('hidden');
    
    setTimeout(() => {
        messageDiv.classList.add('hidden');
    }, 5000);
}

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
    const footer = document.getElementById('modal-footer');
    
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

function hideModal() {
    const modal = document.getElementById('custom-modal');
    modal.classList.remove('active', 'alert-modal', 'confirm-modal');
}

function setLoading(button, isLoading) {
    if (isLoading) {
        button.disabled = true;
        button.innerHTML = '<span class="loading"></span> Processing...';
    } else {
        button.disabled = false;
        button.innerHTML = button.getAttribute('data-original-text') || button.textContent;
    }
}

// Logout
document.getElementById('logout').addEventListener('click', () => {
    if (confirm('Are you sure you want to logout?')) {
        localStorage.clear();
        window.location.href = 'index.html';
    }
});

// Get current location
document.getElementById('get-location').addEventListener('click', () => {
    const button = document.getElementById('get-location');
    button.setAttribute('data-original-text', button.textContent);
    setLoading(button, true);
    
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            (position) => {
                document.getElementById('latitude').value = position.coords.latitude.toFixed(6);
                document.getElementById('longitude').value = position.coords.longitude.toFixed(6);
                showMessage('Location retrieved successfully!', 'success');
                setLoading(button, false);
            },
            (error) => {
                showMessage('Error getting location: ' + error.message, 'error');
                setLoading(button, false);
            }
        );
    } else {
        showMessage('Geolocation is not supported by this browser.', 'error');
        setLoading(button, false);
    }
});

// Add plantation
document.getElementById('plantation-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const button = e.target.querySelector('button[type="submit"]');
    button.setAttribute('data-original-text', button.textContent);
    setLoading(button, true);
    
    const formData = new FormData();
    formData.append('latitude', document.getElementById('latitude').value);
    formData.append('longitude', document.getElementById('longitude').value);
    formData.append('tree_type', document.getElementById('tree-type').value);
    formData.append('area', document.getElementById('area').value);
    
    const imageFile = document.getElementById('image').files[0];
    if (imageFile) {
        formData.append('image', imageFile);
    }
    
    try {
        const response = await fetch(`${API_BASE}/farmer/plantations`, {
            method: 'POST',
            headers: {
                'User-Id': userId,
                'User-Type': userType
            },
            body: formData
        });
        
        if (response.ok) {
            showMessage('Plantation added successfully!', 'success');
            document.getElementById('plantation-form').reset();
            loadPlantations();
        } else {
            const error = await response.json();
            showMessage(error.error || 'Error adding plantation', 'error');
        }
    } catch (error) {
        showMessage('Network error. Please check your connection.', 'error');
    } finally {
        setLoading(button, false);
    }
});

// Load credits
async function loadCredits() {
    try {
        const response = await fetch(`${API_BASE}/farmer/credits`, {
            headers: {
                'User-Id': userId,
                'User-Type': userType
            }
        });
        const data = await response.json();
        document.getElementById('credit-amount').textContent = data.total_credits.toFixed(2);
    } catch (error) {
        console.error('Error loading credits:', error);
    }
}

// Load plantations
async function loadPlantations() {
    try {
        const response = await fetch(`${API_BASE}/farmer/plantations`, {
            headers: {
                'User-Id': userId,
                'User-Type': userType
            }
        });
        const plantations = await response.json();
        const list = document.getElementById('plantation-list');
        const emptyState = document.getElementById('empty-plantations');
        
        list.innerHTML = '';
        
        if (plantations.length === 0) {
            emptyState.classList.remove('hidden');
            return;
        }
        
        emptyState.classList.add('hidden');
        
        plantations.forEach(p => {
            const card = document.createElement('div');
            card.className = 'plantation-card';
            
            const statusClass = `status-${p.verification_status}`;
            const statusText = p.verification_status.charAt(0).toUpperCase() + p.verification_status.slice(1);
            
            // Determine image URL
            let imageUrl = '';
            if (p.image_path) {
                if (p.image_path.startsWith('http')) {
                    imageUrl = p.image_path;
                } else {
                    imageUrl = `${API_BASE}/uploads/${p.image_path}`;
                }
                console.log(`Plantation ${p.id} image URL:`, imageUrl);
            }
            
            // Build card HTML
            card.innerHTML = `
                <h3>${p.tree_type} Plantation</h3>
                <div id="img-container-${p.id}" style="margin: 1rem 0; min-height: 200px;">
                    ${p.image_path ? '<div style="height: 200px; background: #f0f0f0; border-radius: 8px; display: flex; align-items: center; justify-content: center; color: #999;">Loading image...</div>' : '<div style="height: 200px; background: #f0f0f0; border-radius: 8px; display: flex; align-items: center; justify-content: center; color: #999;">No Image</div>'}
                </div>
                <div class="plantation-info">
                    <div><strong>Status:</strong> <span class="status-badge ${statusClass}">${statusText}</span></div>
                    <div><strong>Area:</strong> <span>${p.area} ha</span></div>
                    <div><strong>NDVI:</strong> <span>${p.verification_status === 'verified' && p.ndvi ? p.ndvi.toFixed(3) : 'Pending approval'}</span></div>
                    <div><strong>Credits:</strong> <span>${p.verification_status === 'verified' ? p.credits.toFixed(2) : 'Pending'}</span></div>
                    <div><strong>Location:</strong> <span>${p.latitude.toFixed(4)}, ${p.longitude.toFixed(4)}</span></div>
                    <div><strong>Created:</strong> <span>${p.created_at ? new Date(p.created_at).toLocaleDateString() : 'N/A'}</span></div>
                </div>
            `;
            
            // Append card first
            list.appendChild(card);
            
            // Add image after card is in DOM
            if (p.image_path && imageUrl) {
                const imgContainer = card.querySelector(`#img-container-${p.id}`);
                if (imgContainer) {
                    const img = document.createElement('img');
                    img.src = imageUrl;
                    img.alt = 'Plantation Image';
                    img.style.cssText = 'cursor: pointer; width: 100%; height: 200px; object-fit: cover; border-radius: 8px; display: block;';
                    img.onclick = () => showImageModal(imageUrl);
                    
                    img.onerror = function() {
                        console.error('Image failed to load:', imageUrl);
                        imgContainer.innerHTML = '<div style="height: 200px; background: #f0f0f0; border-radius: 8px; display: flex; align-items: center; justify-content: center; color: #999;">Image failed to load</div>';
                    };
                    
                    img.onload = function() {
                        console.log('Image loaded successfully:', imageUrl);
                        console.log('Image element:', this);
                        console.log('Image visible:', this.offsetWidth > 0 && this.offsetHeight > 0);
                    };
                    
                    // Clear and add image
                    imgContainer.innerHTML = '';
                    imgContainer.appendChild(img);
                    console.log('Image added to container for plantation', p.id);
                } else {
                    console.error('Image container not found for plantation', p.id);
                }
            }
        });
        
        updateMap(plantations);
    } catch (error) {
        console.error('Error loading plantations:', error);
        showMessage('Error loading plantations', 'error');
    }
}

// Make showImageModal available globally
window.showImageModal = showImageModal;
