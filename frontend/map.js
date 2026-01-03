let map;
let markers = [];

function initMap() {
    const mapContainer = document.getElementById('map-container');
    if (!mapContainer) {
        console.warn('Map container not found');
        return;
    }
    
    // Initialize map with a default view
    map = L.map('map-container').setView([20, 0], 2);
    
    // Add OpenStreetMap tile layer
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors',
        maxZoom: 19,
        crossOrigin: true
    }).addTo(map);
    
    // Fix Leaflet default icon path (for tracking prevention issues)
    delete L.Icon.Default.prototype._getIconUrl;
    L.Icon.Default.mergeOptions({
        iconRetinaUrl: 'https://cdn.jsdelivr.net/npm/leaflet@1.9.4/dist/images/marker-icon-2x.png',
        iconUrl: 'https://cdn.jsdelivr.net/npm/leaflet@1.9.4/dist/images/marker-icon.png',
        shadowUrl: 'https://cdn.jsdelivr.net/npm/leaflet@1.9.4/dist/images/marker-shadow.png',
    });
}

function updateMap(plantations) {
    if (!map) {
        console.warn('Map not initialized');
        return;
    }
    
    // Clear existing markers
    markers.forEach(marker => map.removeLayer(marker));
    markers = [];
    
    if (!plantations || plantations.length === 0) {
        return;
    }
    
    // Filter out plantations with invalid coordinates
    const validPlantations = plantations.filter(p => 
        p.latitude && p.longitude && 
        !isNaN(p.latitude) && !isNaN(p.longitude) &&
        p.latitude >= -90 && p.latitude <= 90 &&
        p.longitude >= -180 && p.longitude <= 180
    );
    
    if (validPlantations.length === 0) {
        return;
    }
    
    // Add markers for each plantation
    validPlantations.forEach(p => {
        const marker = L.marker([p.latitude, p.longitude]).addTo(map);
        
        // Create popup content
        const popupContent = `
            <div style="min-width: 200px;">
                <strong>${p.tree_type || 'Unknown'} Plantation</strong><br>
                <strong>Area:</strong> ${p.area ? p.area.toFixed(2) : 'N/A'} ha<br>
                ${p.ndvi ? `<strong>NDVI:</strong> ${p.ndvi.toFixed(3)}<br>` : ''}
                ${p.credits ? `<strong>Credits:</strong> ${p.credits.toFixed(2)}<br>` : ''}
                ${p.verification_status ? `<strong>Status:</strong> ${p.verification_status}<br>` : ''}
                <small><strong>Location:</strong> ${p.latitude.toFixed(4)}, ${p.longitude.toFixed(4)}</small>
        `;
        
        marker.bindPopup(popupContent);
        markers.push(marker);
    });
    
    // Fit map to show all markers
    if (validPlantations.length > 0) {
        const bounds = L.latLngBounds(validPlantations.map(p => [p.latitude, p.longitude]));
        map.fitBounds(bounds, { padding: [50, 50] });
    }
}

// Initialize map when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initMap);
} else {
    initMap();
}
