

// --- 1. Image Modal Logic ---
function setupImageModal() {
    const modal = document.getElementById('image-modal');
    if (!modal) return;

    const closeBtn = modal.querySelector('.close');
    
    if (closeBtn) {
        closeBtn.onclick = () => modal.classList.remove('active');
    }

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
    if (modal && modalImg) {
        modalImg.src = imageSrc;
        modal.classList.add('active');
    }
}

// --- 2. Custom Confirmation Modal Logic ---
// This fixed the "Cannot set properties of null" error
function showConfirm(message, callback) {
    const modal = document.getElementById('custom-modal');
    const title = document.getElementById('modal-title');
    const body = document.getElementById('modal-message'); // Corrected to match your HTML ID
    
    if (!modal || !body) {
        console.error("Required Modal HTML elements are missing.");
        return;
    }

    title.textContent = 'Confirm Action';
    body.innerHTML = message;
    
    modal.classList.add('active');
    
    document.getElementById('modal-cancel').onclick = () => hideModal();
    document.getElementById('modal-confirm').onclick = () => {
        hideModal();
        if (callback) callback();
    };
}

function hideModal() {
    const modal = document.getElementById('custom-modal');
    if (modal) {
        modal.classList.remove('active');
    }
}

// --- 3. Plantation Data Logic ---
async function loadPendingPlantations() {
    try {
        const headers = {
            'User-Id': localStorage.getItem('user_id'),
            'User-Type': localStorage.getItem('user_type')
        };
        
        const response = await fetch(`${API_BASE}/plantations`, { headers });
        const plantations = await response.json();
        const pending = plantations.filter(p => p.verification_status === 'pending');
        
        const list = document.getElementById('plantation-list');
        const emptyState = document.getElementById('empty-pending');
        
        if (!list || !emptyState) return;

        list.innerHTML = '';
        
        if (pending.length === 0) {
            emptyState.classList.remove('hidden');
            return;
        }
        
        emptyState.classList.add('hidden');
        
        pending.forEach(p => {
            const card = document.createElement('div');
            card.className = 'plantation-card';
            
            const ndviColor = p.ndvi && p.ndvi > 0.3 ? '#16a34a' : '#ea580c';
            
            // Determine image URL
            let imageUrl = p.image_path 
                ? (p.image_path.startsWith('http') ? p.image_path : `${API_BASE}/uploads/${p.image_path}`)
                : null;
            
            card.innerHTML = `
                <h3>Plantation #${p.id} - ${p.tree_type}</h3>
                <div id="img-container-${p.id}" class="img-preview-box" style="margin: 1rem 0; min-height: 200px; background: #f0f0f0; border-radius: 8px; display: flex; align-items: center; justify-content: center;">
                    ${imageUrl ? '<span>Loading image...</span>' : '<span>No Image Available</span>'}
                </div>
                <div class="plantation-info">
                    <div><strong>Farmer ID:</strong> ${p.farmer_id}</div>
                    <div><strong>Area:</strong> ${p.area} ha</div>
                    <div><strong>NDVI:</strong> <span style="color: ${ndviColor}; font-weight: bold;">${p.ndvi ? p.ndvi.toFixed(3) : 'N/A'}</span></div>
                    <div><strong>Location:</strong> ${p.latitude.toFixed(4)}, ${p.longitude.toFixed(4)}</div>
                </div>
                <div style="margin-top: 1.5rem; display: flex; gap: 1rem;">
                    <button onclick="verifyPlantation(${p.id}, 'verified')" class="btn-verify" style="flex: 1; background: #16a34a; color: white; border: none; padding: 10px; border-radius: 4px; cursor: pointer;">✓ Verify</button>
                    <button onclick="verifyPlantation(${p.id}, 'rejected')" class="btn-reject" style="flex: 1; background: #dc2626; color: white; border: none; padding: 10px; border-radius: 4px; cursor: pointer;">✗ Reject</button>
                </div>
            `;
            
            list.appendChild(card);
            
            // Load image into container
            if (imageUrl) {
                const imgContainer = document.getElementById(`img-container-${p.id}`);
                const img = new Image();
                img.src = imageUrl;
                img.style.cssText = 'width: 100%; height: 200px; object-fit: cover; border-radius: 8px; cursor: pointer;';
                img.onclick = () => showImageModal(imageUrl);
                img.onload = () => { imgContainer.innerHTML = ''; imgContainer.appendChild(img); };
                img.onerror = () => { imgContainer.innerHTML = '<span>Image Load Failed</span>'; };
            }
        });
    } catch (error) {
        console.error('Error:', error);
        showMessage('Error loading plantations', 'error');
    }
}

async function verifyPlantation(id, status) {
    const action = status === 'verified' ? 'verify' : 'reject';
    const message = `Are you sure you want to <strong>${action}</strong> plantation #${id}?`;

    showConfirm(message, async () => {
        try {
            const response = await fetch(`${API_BASE}/admin/verify/${id}/${status}`, {
                method: 'POST',
                headers: {
                    'User-Id': localStorage.getItem('user_id'),
                    'User-Type': localStorage.getItem('user_type')
                }
            });
            
            if (response.ok) {
                showMessage(`Plantation ${status} successfully!`, 'success');
                loadPendingPlantations();
            } else {
                const error = await response.json();
                showMessage(error.error || 'Error processing verification', 'error');
            }
        } catch (error) {
            showMessage('Network error. Check connection.', 'error');
        }
    });
}

// --- 4. Utilities & Initialization ---
function showMessage(message, type = 'success') {
    const div = document.createElement('div');
    div.className = `alert alert-${type}`;
    div.textContent = message;
    div.style.cssText = "position:fixed; top:20px; left:50%; transform:translateX(-50%); z-index:9999; padding:15px 30px; background:white; border-radius:8px; box-shadow:0 4px 12px rgba(0,0,0,0.15); font-weight:bold;";
    document.body.appendChild(div);
    setTimeout(() => div.remove(), 4000);
}

document.addEventListener('DOMContentLoaded', () => {
    setupImageModal();
    loadPendingPlantations();

    // Logout
    const logoutBtn = document.getElementById('logout');
    if (logoutBtn) {
        logoutBtn.onclick = () => {
            if (confirm('Logout?')) window.location.href = 'index.html';
        };
    }
    
    // Close button for custom modal
    const modalClose = document.querySelector('.modal-close');
    if (modalClose) modalClose.onclick = hideModal;
});

// Global exports for inline HTML onclicks
window.verifyPlantation = verifyPlantation;
window.showImageModal = showImageModal;