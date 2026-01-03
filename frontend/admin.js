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
function showConfirm(message, callback) {
    const modal = document.getElementById('custom-modal');
    const title = document.getElementById('modal-title');
    const body = document.getElementById('modal-body');
    
    title.textContent = 'Confirm Action';
    body.innerHTML = `<p>${message}</p>`;
    
    modal.classList.add('active', 'confirm-modal');
    
    document.getElementById('modal-cancel').onclick = () => hideModal();
    document.getElementById('modal-confirm').onclick = () => {
        hideModal();
        if (callback) callback();
    };
}

function hideModal() {
    const modal = document.getElementById('custom-modal');
    modal.classList.remove('active', 'alert-modal', 'confirm-modal');
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
    
    setupImageModal();
    loadPendingPlantations();

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

// Logout
document.getElementById('logout').addEventListener('click', () => {
    if (confirm('Are you sure you want to logout?')) {
        window.location.href = 'index.html';
    }
});

// Load pending plantations
async function loadPendingPlantations() {
    try {
        const response = await fetch(`${API_BASE}/plantations`);
        const plantations = await response.json();
        const pending = plantations.filter(p => p.verification_status === 'pending');
        const list = document.getElementById('plantation-list');
        const emptyState = document.getElementById('empty-pending');
        
        list.innerHTML = '';
        
        if (pending.length === 0) {
            emptyState.classList.remove('hidden');
            return;
        }
        
        emptyState.classList.add('hidden');
        
        pending.forEach(p => {
            const card = document.createElement('div');
            card.className = 'plantation-card';
            
            const ndviStatus = p.ndvi && p.ndvi > 0.3 ? 'good' : 'low';
            const ndviColor = p.ndvi && p.ndvi > 0.3 ? 'var(--success-color)' : 'var(--warning-color)';
            
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
                <h3>Plantation #${p.id} - ${p.tree_type}</h3>
                <div id="img-container-${p.id}" style="margin: 1rem 0; min-height: 200px;">
                    ${p.image_path ? '<div style="height: 200px; background: #f0f0f0; border-radius: 8px; display: flex; align-items: center; justify-content: center; color: #999;">Loading image...</div>' : '<div style="height: 200px; background: #f0f0f0; border-radius: 8px; display: flex; align-items: center; justify-content: center; color: #999;">No Image Available</div>'}
                </div>
                <div class="plantation-info">
                    <div><strong>Farmer ID:</strong> <span>${p.farmer_id}</span></div>
                    <div><strong>Tree Type:</strong> <span>${p.tree_type}</span></div>
                    <div><strong>Area:</strong> <span>${p.area} ha</span></div>
                    <div><strong>NDVI:</strong> <span style="color: ${ndviColor}; font-weight: 700;">${p.ndvi ? p.ndvi.toFixed(3) : 'Not calculated'}</span></div>
                    <div><strong>Credits:</strong> <span>${p.credits ? p.credits.toFixed(2) : 'Pending calculation'}</span></div>
                    <div><strong>Location:</strong> <span>${p.latitude.toFixed(4)}, ${p.longitude.toFixed(4)}</span></div>
                    <div><strong>Created:</strong> <span>${p.created_at ? new Date(p.created_at).toLocaleString() : 'N/A'}</span></div>
                </div>
                <div style="margin-top: 1.5rem; display: flex; gap: 1rem;">
                    <button onclick="verifyPlantation(${p.id}, 'verified')" style="flex: 1;">
                        ✓ Verify
                    </button>
                    <button onclick="verifyPlantation(${p.id}, 'rejected')" class="danger" style="flex: 1;">
                        ✗ Reject
                    </button>
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
                    };
                    
                    imgContainer.innerHTML = '';
                    imgContainer.appendChild(img);
                }
            }
        });
    } catch (error) {
        console.error('Error loading pending plantations:', error);
        showMessage('Error loading plantations', 'error');
    }
}

// Verify plantation
async function verifyPlantation(id, status) {
    const action = status === 'verified' ? 'verify' : 'reject';
    const message = `Are you sure you want to ${action} this plantation?`;
    
    showConfirm(message, async () => {
        try {
            const response = await fetch(`${API_BASE}/admin/verify/${id}/${status}`, {
                method: 'POST'
            });
            
            if (response.ok) {
                showMessage(`Plantation ${status} successfully!`, 'success');
                loadPendingPlantations();
            } else {
                const error = await response.json();
                showMessage(error.error || 'Error processing verification', 'error');
            }
        } catch (error) {
            showMessage('Network error. Please check your connection.', 'error');
        }
    });
}

// Make functions available globally
window.verifyPlantation = verifyPlantation;
window.showImageModal = showImageModal;
