const userId = localStorage.getItem('user_id');
const userType = localStorage.getItem('user_type');

// Check authentication - moved to DOMContentLoaded
document.addEventListener('DOMContentLoaded', () => {
    if (!userId || userType !== 'business') {
        // Use standard alert for now since modal functions aren't loaded yet
        alert('Please login as business first');
        window.location.href = 'index.html';
        return;
    }
    
    // Initialize the page
    setupImageModal();
    loadPurchasedCredits();
    loadPlantations();
    loadPurchases();
    
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
    
    closeBtn.onclick = () => modal.classList.remove('active');
    modal.onclick = (e) => {
        if (e.target === modal) modal.classList.remove('active');
    };
    
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && modal.classList.contains('active')) {
            modal.classList.remove('active');
        }
    });
}

function showImageModal(imageSrc) {
    const modal = document.getElementById('image-modal');
    const modalImg = document.getElementById('modal-image');
    modalImg.src = imageSrc;
    modal.classList.add('active');
}

// Utility functions
function showMessage(message, type = 'success') {
    const messageDiv = document.createElement('div');
    messageDiv.className = `alert alert-${type}`;
    messageDiv.textContent = message;
    messageDiv.style.position = 'fixed';
    messageDiv.style.top = '80px';
    messageDiv.style.left = '50%';
    messageDiv.style.transform = 'translateX(-50%)';
    messageDiv.style.zIndex = '2000';
    messageDiv.style.minWidth = '300px';
    document.body.appendChild(messageDiv);
    
    setTimeout(() => {
        messageDiv.remove();
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
    confirmBtn.textContent = 'Purchase';
    confirmBtn.className = 'btn btn-primary';
    
    modal.classList.add('active', 'input-modal');
    
    // Focus on input
    setTimeout(() => {
        document.getElementById('modal-input').focus();
    }, 100);
    
    document.getElementById('modal-cancel').onclick = () => hideModal();
    confirmBtn.onclick = () => {
        const value = document.getElementById('modal-input').value;
        hideModal();
        if (callback) callback(value);
    };
}

function hideModal() {
    const modal = document.getElementById('custom-modal');
    modal.classList.remove('active', 'alert-modal', 'confirm-modal', 'input-modal');
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
    showConfirm('Are you sure you want to logout?', () => {
        localStorage.clear();
        window.location.href = 'index.html';
    });
});

// Load purchased credits
async function loadPurchasedCredits() {
    try {
        const response = await fetch(`${API_BASE}/business/purchases`, {
            headers: {
                'User-Id': userId,
                'User-Type': userType
            }
        });
        const purchases = await response.json();
        const total = purchases.reduce((sum, p) => sum + p.credits_bought, 0);
        document.getElementById('purchased-amount').textContent = total.toFixed(2);
    } catch (error) {
        console.error('Error loading purchased credits:', error);
    }
}

// Load available plantations
async function loadPlantations() {
    try {
        const response = await fetch(`${API_BASE}/business/plantations`, {
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
            
            card.innerHTML = `
                <h3>${p.tree_type} Plantation</h3>
                <div id="img-container-${p.id}" style="margin: 1rem 0; min-height: 200px;">
                    ${p.image_path ? '<div style="height: 200px; background: #f0f0f0; border-radius: 8px; display: flex; align-items: center; justify-content: center; color: #999;">Loading image...</div>' : '<div style="height: 200px; background: #f0f0f0; border-radius: 8px; display: flex; align-items: center; justify-content: center; color: #999;">No Image</div>'}
                </div>
                <div class="plantation-info">
                    <div><strong>Area:</strong> <span>${p.area} ha</span></div>
                    <div><strong>NDVI:</strong> <span>${p.ndvi ? p.ndvi.toFixed(3) : 'N/A'}</span></div>
                    <div><strong>Available Credits:</strong> <span style="color: var(--primary-color); font-weight: 700;">${p.credits.toFixed(2)}</span></div>
                    <div><strong>Location:</strong> <span>${p.latitude.toFixed(4)}, ${p.longitude.toFixed(4)}</span></div>
                </div>
                <button onclick="buyCredits(${p.id}, ${p.credits})" style="width: 100%; margin-top: 1rem;">
                    💰 Buy Credits
                </button>
            `;
            
            // Append card first
            list.appendChild(card);
            
            // Add image after card is in DOM - use requestAnimationFrame to ensure DOM is ready
            if (p.image_path && imageUrl) {
                requestAnimationFrame(() => {
                    const imgContainer = card.querySelector(`#img-container-${p.id}`);
                    if (!imgContainer) {
                        console.error('Image container not found for plantation', p.id);
                        return;
                    }
                    
                    const img = document.createElement('img');
                    img.src = imageUrl;
                    img.alt = 'Plantation Image';
                    img.style.cssText = 'cursor: pointer; width: 100%; height: 200px; object-fit: cover; border-radius: 8px; display: block;';
                    img.onclick = () => showImageModal(imageUrl);
                    
                    img.onerror = function() {
                        console.error('Image failed to load:', imageUrl);
                        console.error('Error details:', this);
                        if (imgContainer) {
                            imgContainer.innerHTML = '<div style="height: 200px; background: #f0f0f0; border-radius: 8px; display: flex; align-items: center; justify-content: center; color: #999;">Image failed to load</div>';
                        }
                    };
                    
                    img.onload = function() {
                        console.log('Image loaded successfully:', imageUrl);
                        console.log('Image element:', this);
                        console.log('Image visible:', this.offsetWidth > 0 && this.offsetHeight > 0);
                    };
                    
                    // Clear and add image
                    imgContainer.innerHTML = '';
                    imgContainer.appendChild(img);
                    console.log('Image added to container for plantation', p.id, 'URL:', imageUrl);
                });
            }
        });
        
        // Update map after all cards and images are added
        updateMap(plantations);
    } catch (error) {
        console.error('Error loading plantations:', error);
        showMessage('Error loading plantations', 'error');
    }
}

// Load purchase history
async function loadPurchases() {
    try {
        const response = await fetch(`${API_BASE}/business/purchases`, {
            headers: {
                'User-Id': userId,
                'User-Type': userType
            }
        });
        const purchases = await response.json();
        const list = document.getElementById('purchase-list');
        const emptyState = document.getElementById('empty-purchases');
        
        list.innerHTML = '';
        
        if (purchases.length === 0) {
            emptyState.classList.remove('hidden');
            return;
        }
        
        emptyState.classList.add('hidden');
        
        purchases.forEach(p => {
            const card = document.createElement('div');
            card.className = 'plantation-card';
            
            card.innerHTML = `
                <h3>Purchase #${p.id}</h3>
                <div class="plantation-info">
                    <div><strong>Plantation ID:</strong> <span>${p.plantation_id}</span></div>
                    <div><strong>Credits Purchased:</strong> <span style="color: var(--primary-color); font-weight: 700;">${p.credits_bought.toFixed(2)}</span></div>
                    <div><strong>Date:</strong> <span>${new Date(p.date).toLocaleString()}</span></div>
                </div>
            `;
            list.appendChild(card);
        });
    } catch (error) {
        console.error('Error loading purchases:', error);
    }
}

// Buy credits
async function buyCredits(plantationId, availableCredits) {
    showInputModal(
        'Purchase Carbon Credits',
        `Enter the number of credits you want to purchase (maximum: ${availableCredits.toFixed(2)}):`,
        `Max: ${availableCredits.toFixed(2)}`,
        async (credits) => {
            if (!credits) return;
            
            const creditsNum = parseFloat(credits);
            
            if (isNaN(creditsNum) || creditsNum <= 0) {
                showMessage('Please enter a valid number', 'error');
                return;
            }
            
            if (creditsNum > availableCredits) {
                showMessage(`Cannot buy more than ${availableCredits.toFixed(2)} credits`, 'error');
                return;
            }
            
            try {
                const response = await fetch(`${API_BASE}/business/buy`, {
                    method: 'POST',
                    headers: { 
                        'Content-Type': 'application/json',
                        'User-Id': userId,
                        'User-Type': userType
                    },
                    body: JSON.stringify({ plantation_id: plantationId, credits: creditsNum })
                });
                
                const data = await response.json();
                
                if (response.ok) {
                    showMessage(`Successfully purchased ${creditsNum.toFixed(2)} credits!`, 'success');
                    loadPlantations();
                    loadPurchases();
                    loadPurchasedCredits();
                } else {
                    showMessage(data.error || 'Purchase failed', 'error');
                }
            } catch (error) {
                showMessage('Network error. Please check your connection.', 'error');
            }
        }
    );
}

// Make functions available globally
window.buyCredits = buyCredits;
window.showImageModal = showImageModal;
