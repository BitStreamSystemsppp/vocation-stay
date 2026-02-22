/**
 * VacationStay - Main Application Logic
 * A fully functional vacation rental platform
 */

// ============================================
// STATE MANAGEMENT
// ============================================
const state = {
    properties: [],
    filteredProperties: [],
    savedProperties: JSON.parse(localStorage.getItem('savedProperties')) || [],
    recentlyViewed: JSON.parse(localStorage.getItem('recentlyViewed')) || [],
    currentPage: 1,
    itemsPerPage: 8,
    columns: 2,
    filters: {
        search: '',
        minPrice: 0,
        maxPrice: 1000,
        bedrooms: 'any',
        propertyType: 'all',
        minRating: 0,
        maxDistance: 50,
        guests: { adults: 1, children: 0 }
    },
    map: null,
    markers: [],
    markerMap: new Map(),
    mobileMap: null,
    activePropertyId: null,
    isMobileMenuOpen: false
};

// ============================================
// INITIALIZATION
// ============================================
document.addEventListener('DOMContentLoaded', () => {
    initializeApp();
});

/**
 * Initialize the application
 */
function initializeApp() {
    // Load properties data
    state.properties = properties;
    state.filteredProperties = [...state.properties];
    
    // Initialize components
    initializeMap();
    renderProperties();
    updateAveragePrice();
    updateActiveFiltersCount();
    initializeEventListeners();
    initializeDropdowns();
    initializeMobileMenu();
    initializeDistanceSlider();
    
    console.log('VacationStay initialized successfully');
}

// ============================================
// MAP FUNCTIONS
// ============================================

/**
 * Initialize Leaflet map
 */
function initializeMap() {
    state.map = L.map('map').setView([53.5, -2.5], 5);
    
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(state.map);
    
    updateMapMarkers();
}

/**
 * Update map markers based on filtered properties
 */
function updateMapMarkers() {
    // Clear existing markers
    state.markers.forEach(marker => state.map.removeLayer(marker));
    state.markers = [];
    state.markerMap.clear();
    
    // Add markers for filtered properties
    state.filteredProperties.forEach(property => {
        const marker = createCustomMarker(property);
        marker.addTo(state.map);
        state.markers.push(marker);
        state.markerMap.set(property.id, marker);
    });
    
    // Fit bounds if there are markers
    if (state.markers.length > 0) {
        const group = new L.featureGroup(state.markers);
        state.map.fitBounds(group.getBounds().pad(0.1));
    }
}

/**
 * Create custom marker for a property
 */
function createCustomMarker(property) {
    const icon = L.divIcon({
        className: 'custom-marker-container',
        html: `<div class="custom-marker" data-property-id="${property.id}">£${property.pricePerNight}</div>`,
        iconSize: [80, 30],
        iconAnchor: [40, 15]
    });
    
    const marker = L.marker([property.coordinates.lat, property.coordinates.lng], { icon });
    marker.propertyId = property.id;
    
    // Create popup content
    const popupContent = `
        <div class="popup-content">
            <img src="${property.images[0]}" alt="${property.title}" class="popup-image">
            <div class="popup-info">
                <div class="popup-title">${property.title}</div>
                <div class="popup-location">${property.location}</div>
                <div class="popup-price">£${property.pricePerNight}/night</div>
            </div>
        </div>
    `;
    
    marker.bindPopup(popupContent, { closeButton: false });
    
    // Marker click event
    marker.on('click', () => {
        highlightMarker(property.id);
        highlightPropertyCard(property.id);
    });
    
    return marker;
}

/**
 * Highlight a marker on the map
 */
function highlightMarker(propertyId) {
    document.querySelectorAll('.custom-marker').forEach(m => m.classList.remove('active'));
    const markerEl = document.querySelector(`.custom-marker[data-property-id="${propertyId}"]`);
    if (markerEl) {
        markerEl.classList.add('active');
    }
    state.activePropertyId = propertyId;
}

/**
 * Highlight a property card
 */
function highlightPropertyCard(propertyId) {
    document.querySelectorAll('.property-card').forEach(card => {
        card.classList.remove('highlighted');
    });
    
    const card = document.querySelector(`.property-card[data-property-id="${propertyId}"]`);
    if (card) {
        card.classList.add('highlighted');
        card.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
}

// ============================================
// RENDER FUNCTIONS
// ============================================

/**
 * Render property cards
 */
function renderProperties() {
    const grid = document.getElementById('propertiesGrid');
    const start = (state.currentPage - 1) * state.itemsPerPage;
    const end = start + state.itemsPerPage;
    const pageProperties = state.filteredProperties.slice(start, end);
    
    if (pageProperties.length === 0) {
        grid.innerHTML = `
            <div class="no-results" style="grid-column: 1 / -1;">
                <i class="ph ph-house"></i>
                <h3>No properties found</h3>
                <p>Try adjusting your filters or search criteria</p>
                <button class="reset-filters-btn" onclick="resetFilters()">Reset Filters</button>
            </div>
        `;
    } else {
        grid.innerHTML = pageProperties.map((property, index) => 
            createPropertyCard(property, index)
        ).join('');
    }
    
    // Update count
    document.getElementById('propertyCount').textContent = state.filteredProperties.length;
    
    // Render pagination
    renderPagination();
    
    // Add event listeners to cards
    addCardEventListeners();
}

/**
 * Create property card HTML
 */
function createPropertyCard(property, index) {
    const isSaved = state.savedProperties.includes(property.id);
    const badges = [];
    
    if (property.guestFavorite) {
        badges.push('<span class="card-badge guest-favorite"><i class="ph-fill ph-star"></i> Guest favorite</span>');
    } else if (property.superhost) {
        badges.push('<span class="card-badge superhost"><i class="ph ph-medal"></i> Superhost</span>');
    }
    
    return `
        <article class="property-card" data-property-id="${property.id}" data-testid="property-card-${property.id}" style="animation-delay: ${index * 0.05}s">
            <div class="card-image">
                <img src="${property.images[0]}" alt="${property.title}" loading="lazy">
                ${badges.join('')}
                <button class="save-btn ${isSaved ? 'saved' : ''}" data-save-id="${property.id}" data-testid="save-btn-${property.id}" aria-label="${isSaved ? 'Remove from saved' : 'Save property'}">
                    <i class="ph${isSaved ? '-fill' : ''} ph-heart"></i>
                </button>
                <span class="price-badge">£${property.pricePerNight}</span>
            </div>
            <div class="card-content">
                <div class="card-header">
                    <h3 class="card-title">${property.title}</h3>
                    <div class="card-rating">
                        <i class="ph-fill ph-star"></i>
                        ${property.rating}
                    </div>
                </div>
                <p class="card-location">${property.location}</p>
                <p class="card-distance"><i class="ph ph-map-pin"></i> ${property.distanceText}</p>
                <div class="card-details">
                    <span><i class="ph ph-bed"></i> ${property.bedrooms} bedroom${property.bedrooms > 1 ? 's' : ''}</span>
                    <span><i class="ph ph-users"></i> ${property.guests} guests</span>
                </div>
                <p class="card-price"><strong>£${property.pricePerNight}</strong> /night</p>
            </div>
        </article>
    `;
}

/**
 * Add event listeners to property cards
 */
function addCardEventListeners() {
    // Property card clicks
    document.querySelectorAll('.property-card').forEach(card => {
        // Card click - navigate to property
        card.addEventListener('click', (e) => {
            if (e.target.closest('.save-btn')) return;
            const propertyId = card.dataset.propertyId;
            addToRecentlyViewed(parseInt(propertyId));
            window.location.href = `property.html?id=${propertyId}`;
        });
        
        // Card hover - highlight marker
        card.addEventListener('mouseenter', () => {
            const propertyId = parseInt(card.dataset.propertyId);
            highlightMarker(propertyId);
            
            // Open popup on map
            const marker = state.markerMap.get(propertyId);
            if (marker) {
                marker.openPopup();
            }
        });
        
        card.addEventListener('mouseleave', () => {
            const propertyId = parseInt(card.dataset.propertyId);
            const marker = state.markerMap.get(propertyId);
            if (marker) {
                marker.closePopup();
            }
        });
    });
    
    // Save button clicks
    document.querySelectorAll('.save-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const propertyId = parseInt(btn.dataset.saveId);
            toggleSaveProperty(propertyId);
        });
    });
}

/**
 * Toggle save property
 */
function toggleSaveProperty(propertyId) {
    const index = state.savedProperties.indexOf(propertyId);
    const btn = document.querySelector(`[data-save-id="${propertyId}"]`);
    const icon = btn ? btn.querySelector('i') : null;
    
    if (index > -1) {
        state.savedProperties.splice(index, 1);
        showToast('Removed from saved');
        if (btn) {
            btn.classList.remove('saved');
            if (icon) {
                icon.className = 'ph ph-heart';
            }
        }
    } else {
        state.savedProperties.push(propertyId);
        showToast('Saved to tripboard');
        if (btn) {
            btn.classList.add('saved');
            if (icon) {
                icon.className = 'ph-fill ph-heart';
            }
        }
    }
    localStorage.setItem('savedProperties', JSON.stringify(state.savedProperties));
}

/**
 * Add property to recently viewed
 */
function addToRecentlyViewed(propertyId) {
    const index = state.recentlyViewed.indexOf(propertyId);
    if (index > -1) {
        state.recentlyViewed.splice(index, 1);
    }
    state.recentlyViewed.unshift(propertyId);
    if (state.recentlyViewed.length > 10) {
        state.recentlyViewed.pop();
    }
    localStorage.setItem('recentlyViewed', JSON.stringify(state.recentlyViewed));
}

// ============================================
// PAGINATION
// ============================================

/**
 * Render pagination controls
 */
function renderPagination() {
    const totalPages = Math.ceil(state.filteredProperties.length / state.itemsPerPage);
    const pagination = document.getElementById('pagination');
    
    if (totalPages <= 1) {
        pagination.innerHTML = '';
        return;
    }
    
    let html = '';
    
    // Previous button
    html += `<button class="page-btn" ${state.currentPage === 1 ? 'disabled' : ''} data-page="prev" data-testid="page-prev" aria-label="Previous page">
        <i class="ph ph-caret-left"></i>
    </button>`;
    
    // Page numbers
    for (let i = 1; i <= totalPages; i++) {
        if (i === 1 || i === totalPages || (i >= state.currentPage - 1 && i <= state.currentPage + 1)) {
            html += `<button class="page-btn ${i === state.currentPage ? 'active' : ''}" data-page="${i}" data-testid="page-${i}">${i}</button>`;
        } else if (i === state.currentPage - 2 || i === state.currentPage + 2) {
            html += '<span class="page-dots">...</span>';
        }
    }
    
    // Next button
    html += `<button class="page-btn" ${state.currentPage === totalPages ? 'disabled' : ''} data-page="next" data-testid="page-next" aria-label="Next page">
        <i class="ph ph-caret-right"></i>
    </button>`;
    
    pagination.innerHTML = html;
    
    // Add pagination event listeners
    pagination.querySelectorAll('.page-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const page = btn.dataset.page;
            if (page === 'prev') {
                state.currentPage--;
            } else if (page === 'next') {
                state.currentPage++;
            } else {
                state.currentPage = parseInt(page);
            }
            renderProperties();
            window.scrollTo({ top: 0, behavior: 'smooth' });
        });
    });
}

// ============================================
// AVERAGE PRICE CALCULATOR
// ============================================

/**
 * Update average price display
 */
function updateAveragePrice() {
    const avgPriceEl = document.getElementById('avgPrice');
    
    if (state.filteredProperties.length === 0) {
        avgPriceEl.textContent = '£0';
        avgPriceEl.classList.add('updating');
        setTimeout(() => avgPriceEl.classList.remove('updating'), 300);
        return;
    }
    
    const total = state.filteredProperties.reduce((sum, p) => sum + p.pricePerNight, 0);
    const avg = Math.round(total / state.filteredProperties.length);
    
    // Animate the price change
    avgPriceEl.classList.add('updating');
    setTimeout(() => {
        avgPriceEl.textContent = `£${avg}`;
        avgPriceEl.classList.remove('updating');
    }, 150);
}

// ============================================
// FILTERS
// ============================================

/**
 * Apply all filters
 */
function applyFilters() {
    const { search, minPrice, maxPrice, bedrooms, propertyType, minRating, maxDistance, guests } = state.filters;
    const totalGuests = guests.adults + guests.children;
    
    state.filteredProperties = state.properties.filter(property => {
        // Search filter
        if (search && !property.location.toLowerCase().includes(search.toLowerCase()) &&
            !property.title.toLowerCase().includes(search.toLowerCase())) {
            return false;
        }
        
        // Price filter
        if (property.pricePerNight < minPrice || property.pricePerNight > maxPrice) {
            return false;
        }
        
        // Distance filter
        if (property.distance > maxDistance) {
            return false;
        }
        
        // Bedrooms filter
        if (bedrooms !== 'any') {
            const bedroomCount = parseInt(bedrooms);
            if (bedroomCount === 4) {
                if (property.bedrooms < 4) return false;
            } else {
                if (property.bedrooms !== bedroomCount) return false;
            }
        }
        
        // Property type filter
        if (propertyType !== 'all' && property.type !== propertyType) {
            return false;
        }
        
        // Rating filter
        if (property.rating < minRating) {
            return false;
        }
        
        // Guests filter
        if (property.guests < totalGuests) {
            return false;
        }
        
        return true;
    });
    
    state.currentPage = 1;
    renderProperties();
    updateAveragePrice();
    updateMapMarkers();
    updateActiveFiltersCount();
    closeAllDropdowns();
}

/**
 * Reset all filters
 */
function resetFilters() {
    state.filters = {
        search: '',
        minPrice: 0,
        maxPrice: 1000,
        bedrooms: 'any',
        propertyType: 'all',
        minRating: 0,
        maxDistance: 50,
        guests: { adults: 1, children: 0 }
    };
    
    // Reset UI elements
    document.getElementById('searchInput').value = '';
    document.getElementById('minPrice').value = '0';
    document.getElementById('maxPrice').value = '1000';
    document.getElementById('sidebarMinPrice').value = '0';
    document.getElementById('sidebarMaxPrice').value = '1000';
    document.getElementById('distanceSlider').value = '50';
    document.getElementById('distanceValue').textContent = 'Up to 50 miles';
    
    // Reset bedroom buttons
    document.querySelectorAll('.bedroom-btn').forEach(btn => {
        btn.classList.remove('active');
        if (btn.dataset.bedrooms === 'any') {
            btn.classList.add('active');
        }
    });
    
    // Reset type buttons
    document.querySelectorAll('.type-btn').forEach(btn => {
        btn.classList.remove('active');
        if (btn.dataset.type === 'all') {
            btn.classList.add('active');
        }
    });
    
    // Reset rating
    document.querySelectorAll('input[name="rating"]').forEach(input => {
        input.checked = input.value === '0';
    });
    
    // Reset guest counts
    document.getElementById('adultsCount').textContent = '1';
    document.getElementById('childrenCount').textContent = '0';
    
    applyFilters();
    showToast('Filters reset');
}

/**
 * Update active filters count badge
 */
function updateActiveFiltersCount() {
    const { minPrice, maxPrice, bedrooms, propertyType, minRating, maxDistance, guests } = state.filters;
    let count = 0;
    
    if (minPrice > 0 || maxPrice < 1000) count++;
    if (bedrooms !== 'any') count++;
    if (propertyType !== 'all') count++;
    if (minRating > 0) count++;
    if (maxDistance < 50) count++;
    if (guests.adults > 1 || guests.children > 0) count++;
    
    const filterBtn = document.getElementById('filterSidebarBtn');
    const existingBadge = filterBtn.querySelector('.filter-count');
    
    if (count > 0) {
        if (existingBadge) {
            existingBadge.textContent = count;
        } else {
            filterBtn.innerHTML += `<span class="filter-count">${count}</span>`;
        }
    } else if (existingBadge) {
        existingBadge.remove();
    }
}

// ============================================
// DISTANCE SLIDER
// ============================================

/**
 * Initialize distance slider
 */
function initializeDistanceSlider() {
    const slider = document.getElementById('distanceSlider');
    const valueDisplay = document.getElementById('distanceValue');
    
    if (!slider) return;
    
    slider.addEventListener('input', (e) => {
        const value = e.target.value;
        valueDisplay.textContent = `Up to ${value} miles`;
        state.filters.maxDistance = parseInt(value);
        
        // Live update with debounce
        clearTimeout(slider.debounceTimer);
        slider.debounceTimer = setTimeout(() => {
            applyFilters();
        }, 300);
    });
}

// ============================================
// MOBILE MENU
// ============================================

/**
 * Initialize mobile menu
 */
function initializeMobileMenu() {
    const mobileMenuBtn = document.getElementById('mobileMenuBtn');
    const mobileMenu = document.getElementById('mobileMenu');
    const closeMobileMenuBtn = document.getElementById('closeMobileMenu');
    const overlay = document.getElementById('overlay');
    
    if (!mobileMenuBtn || !mobileMenu) return;
    
    mobileMenuBtn.addEventListener('click', () => {
        openMobileMenu();
    });
    
    if (closeMobileMenuBtn) {
        closeMobileMenuBtn.addEventListener('click', () => {
            closeMobileMenu();
        });
    }
    
    // Close on overlay click
    if (overlay) {
        overlay.addEventListener('click', () => {
            if (state.isMobileMenuOpen) {
                closeMobileMenu();
            }
        });
    }
    
    // Close on nav link click
    mobileMenu.querySelectorAll('.mobile-nav-link').forEach(link => {
        link.addEventListener('click', (e) => {
            closeMobileMenu();
            
            // Handle specific actions
            const action = link.dataset.action;
            if (action === 'signin') {
                e.preventDefault();
                setTimeout(() => toggleModal('signInModal'), 300);
            } else if (action === 'tripboard') {
                e.preventDefault();
                showToast(`You have ${state.savedProperties.length} saved properties`);
            }
        });
    });
}

/**
 * Open mobile menu
 */
function openMobileMenu() {
    const mobileMenu = document.getElementById('mobileMenu');
    const overlay = document.getElementById('overlay');
    
    mobileMenu.classList.add('open');
    overlay.classList.add('show');
    document.body.style.overflow = 'hidden';
    state.isMobileMenuOpen = true;
}

/**
 * Close mobile menu
 */
function closeMobileMenu() {
    const mobileMenu = document.getElementById('mobileMenu');
    const overlay = document.getElementById('overlay');
    
    mobileMenu.classList.remove('open');
    if (!document.querySelector('.modal.show') && !document.querySelector('.filter-sidebar.open')) {
        overlay.classList.remove('show');
    }
    document.body.style.overflow = '';
    state.isMobileMenuOpen = false;
}

// ============================================
// EVENT LISTENERS
// ============================================

/**
 * Initialize all event listeners
 */
function initializeEventListeners() {
    // Search input with debounce
    const searchInput = document.getElementById('searchInput');
    let searchTimeout;
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            clearTimeout(searchTimeout);
            searchTimeout = setTimeout(() => {
                state.filters.search = e.target.value;
                applyFilters();
            }, 300);
        });
    }
    
    // Search button (mobile)
    const searchBtn = document.getElementById('searchBtn');
    if (searchBtn) {
        searchBtn.addEventListener('click', () => {
            applyFilters();
        });
    }
    
    // Column switcher
    document.querySelectorAll('.column-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const cols = btn.dataset.cols;
            
            // Update all column switchers
            document.querySelectorAll('.column-btn').forEach(b => {
                b.classList.remove('active');
                if (b.dataset.cols === cols) {
                    b.classList.add('active');
                }
            });
            
            const grid = document.getElementById('propertiesGrid');
            grid.className = `properties-grid cols-${cols}`;
            state.columns = parseInt(cols);
        });
    });
    
    // View toggle
    document.querySelectorAll('.view-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.view-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
        });
    });
    
    // Bedroom buttons
    document.querySelectorAll('.bedroom-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const parent = btn.closest('.bedrooms-selector');
            parent.querySelectorAll('.bedroom-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            state.filters.bedrooms = btn.dataset.bedrooms;
        });
    });
    
    // Property type buttons
    document.querySelectorAll('.type-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.type-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            state.filters.propertyType = btn.dataset.type;
        });
    });
    
    // Rating options
    document.querySelectorAll('input[name="rating"]').forEach(input => {
        input.addEventListener('change', (e) => {
            state.filters.minRating = parseFloat(e.target.value);
        });
    });
    
    // Price inputs with validation
    const minPriceInput = document.getElementById('minPrice');
    const maxPriceInput = document.getElementById('maxPrice');
    
    minPriceInput.addEventListener('change', (e) => {
        let value = parseInt(e.target.value) || 0;
        const maxValue = parseInt(maxPriceInput.value) || 1000;
        
        // Validation: min cannot exceed max
        if (value > maxValue) {
            value = maxValue;
            e.target.value = value;
            showToast('Min price cannot exceed max price');
        }
        
        state.filters.minPrice = value;
        document.getElementById('sidebarMinPrice').value = value;
    });
    
    maxPriceInput.addEventListener('change', (e) => {
        let value = parseInt(e.target.value) || 1000;
        const minValue = parseInt(minPriceInput.value) || 0;
        
        // Validation: max cannot be less than min
        if (value < minValue) {
            value = minValue;
            e.target.value = value;
            showToast('Max price cannot be less than min price');
        }
        
        state.filters.maxPrice = value;
        document.getElementById('sidebarMaxPrice').value = value;
    });
    
    // Sidebar price inputs
    const sidebarMinPrice = document.getElementById('sidebarMinPrice');
    if (sidebarMinPrice) {
        sidebarMinPrice.addEventListener('change', (e) => {
            let value = parseInt(e.target.value) || 0;
            state.filters.minPrice = value;
            document.getElementById('minPrice').value = value;
        });
    }
    
    const sidebarMaxPrice = document.getElementById('sidebarMaxPrice');
    if (sidebarMaxPrice) {
        sidebarMaxPrice.addEventListener('change', (e) => {
            let value = parseInt(e.target.value) || 1000;
            state.filters.maxPrice = value;
            document.getElementById('maxPrice').value = value;
        });
    }
    
    // Apply sidebar filters
    const applySidebarBtn = document.getElementById('applySidebarFilters');
    if (applySidebarBtn) {
        applySidebarBtn.addEventListener('click', () => {
            applyFilters();
            toggleFilterSidebar();
        });
    }
    
    // Reset sidebar filters
    const resetSidebarBtn = document.getElementById('resetSidebarFilters');
    if (resetSidebarBtn) {
        resetSidebarBtn.addEventListener('click', () => {
            resetFilters();
        });
    }
    
    // Filter sidebar toggle
    const filterSidebarBtn = document.getElementById('filterSidebarBtn');
    if (filterSidebarBtn) {
        filterSidebarBtn.addEventListener('click', toggleFilterSidebar);
    }
    
    const closeFilterBtn = document.getElementById('closeFilterBtn');
    if (closeFilterBtn) {
        closeFilterBtn.addEventListener('click', toggleFilterSidebar);
    }
    
    // Modal toggles
    const signInBtn = document.getElementById('signInBtn');
    if (signInBtn) {
        signInBtn.addEventListener('click', () => toggleModal('signInModal'));
    }
    
    const showSignUp = document.getElementById('showSignUp');
    if (showSignUp) {
        showSignUp.addEventListener('click', (e) => {
            e.preventDefault();
            toggleModal('signInModal');
            setTimeout(() => toggleModal('signUpModal'), 300);
        });
    }
    
    const showSignIn = document.getElementById('showSignIn');
    if (showSignIn) {
        showSignIn.addEventListener('click', (e) => {
            e.preventDefault();
            toggleModal('signUpModal');
            setTimeout(() => toggleModal('signInModal'), 300);
        });
    }
    
    // Close modal buttons
    document.querySelectorAll('.close-modal-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const modalId = btn.dataset.close;
            if (modalId) {
                toggleModal(modalId);
            }
        });
    });
    
    // Overlay click
    const overlay = document.getElementById('overlay');
    if (overlay) {
        overlay.addEventListener('click', () => {
            if (!state.isMobileMenuOpen) {
                closeAllModals();
                closeFilterSidebar();
            }
        });
    }
    
    // Form submissions
    const signInForm = document.getElementById('signInForm');
    if (signInForm) {
        signInForm.addEventListener('submit', (e) => {
            e.preventDefault();
            showToast('Sign in successful!');
            toggleModal('signInModal');
        });
    }
    
    const signUpForm = document.getElementById('signUpForm');
    if (signUpForm) {
        signUpForm.addEventListener('submit', (e) => {
            e.preventDefault();
            showToast('Account created successfully!');
            toggleModal('signUpModal');
        });
    }
    
    // Guest counter
    document.querySelectorAll('.counter-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const action = btn.dataset.action;
            const type = btn.dataset.type;
            const countEl = document.getElementById(`${type}Count`);
            let count = parseInt(countEl.textContent);
            
            if (action === 'increase') {
                count++;
            } else if (action === 'decrease' && count > 0) {
                count--;
            }
            
            countEl.textContent = count;
            state.filters.guests[type] = count;
            
            // Update button states
            const decreaseBtn = btn.parentElement.querySelector('[data-action="decrease"]');
            if (type === 'adults') {
                decreaseBtn.disabled = count <= 1;
            } else {
                decreaseBtn.disabled = count <= 0;
            }
        });
    });
    
    const applyGuestsBtn = document.getElementById('applyGuests');
    if (applyGuestsBtn) {
        applyGuestsBtn.addEventListener('click', () => {
            applyFilters();
            toggleModal('guestModal');
        });
    }
    
    // Mobile map button
    const mobileMapBtn = document.getElementById('mobileMapBtn');
    if (mobileMapBtn) {
        mobileMapBtn.addEventListener('click', () => {
            openMobileMapModal();
        });
    }
    
    const closeMapModalBtn = document.getElementById('closeMapModal');
    if (closeMapModalBtn) {
        closeMapModalBtn.addEventListener('click', () => {
            closeMobileMapModal();
        });
    }
    
    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            closeAllModals();
            closeFilterSidebar();
            closeMobileMenu();
            closeMobileMapModal();
        }
    });
}

// ============================================
// DROPDOWNS
// ============================================

/**
 * Initialize dropdown menus
 */
function initializeDropdowns() {
    const dropdowns = [
        { btn: 'priceFilterBtn', content: 'priceDropdown' },
        { btn: 'bedroomsFilterBtn', content: 'bedroomsDropdown' }
    ];
    
    dropdowns.forEach(({ btn, content }) => {
        const btnEl = document.getElementById(btn);
        if (!btnEl) return;
        
        btnEl.addEventListener('click', (e) => {
            e.stopPropagation();
            const dropdown = document.getElementById(content);
            const isOpen = dropdown.classList.contains('show');
            
            closeAllDropdowns();
            
            if (!isOpen) {
                dropdown.classList.add('show');
                btnEl.classList.add('active');
            }
        });
    });
    
    // Close dropdowns when clicking outside
    document.addEventListener('click', (e) => {
        if (!e.target.closest('.filter-dropdown')) {
            closeAllDropdowns();
        }
    });
}

/**
 * Close all dropdowns
 */
function closeAllDropdowns() {
    document.querySelectorAll('.dropdown-content').forEach(d => d.classList.remove('show'));
    document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
}

// ============================================
// SIDEBAR
// ============================================

/**
 * Toggle filter sidebar
 */
function toggleFilterSidebar() {
    const sidebar = document.getElementById('filterSidebar');
    const overlay = document.getElementById('overlay');
    
    sidebar.classList.toggle('open');
    overlay.classList.toggle('show');
    
    if (sidebar.classList.contains('open')) {
        document.body.style.overflow = 'hidden';
    } else {
        document.body.style.overflow = '';
    }
}

/**
 * Close filter sidebar
 */
function closeFilterSidebar() {
    const sidebar = document.getElementById('filterSidebar');
    const overlay = document.getElementById('overlay');
    
    sidebar.classList.remove('open');
    if (!state.isMobileMenuOpen && !document.querySelector('.modal.show')) {
        overlay.classList.remove('show');
    }
    document.body.style.overflow = '';
}

// ============================================
// MODALS
// ============================================

/**
 * Toggle modal
 */
function toggleModal(modalId) {
    const modal = document.getElementById(modalId);
    const overlay = document.getElementById('overlay');
    
    if (!modal) return;
    
    modal.classList.toggle('show');
    overlay.classList.toggle('show');
    
    if (modal.classList.contains('show')) {
        document.body.style.overflow = 'hidden';
    } else {
        document.body.style.overflow = '';
    }
}

/**
 * Close all modals
 */
function closeAllModals() {
    document.querySelectorAll('.modal').forEach(m => m.classList.remove('show'));
    const overlay = document.getElementById('overlay');
    if (!state.isMobileMenuOpen && !document.querySelector('.filter-sidebar.open')) {
        overlay.classList.remove('show');
    }
    document.body.style.overflow = '';
}

// ============================================
// MOBILE MAP MODAL
// ============================================

/**
 * Open mobile map modal
 */
function openMobileMapModal() {
    const mapModal = document.getElementById('mapModal');
    mapModal.classList.add('show');
    document.body.style.overflow = 'hidden';
    
    // Initialize mobile map if not exists
    if (!state.mobileMap) {
        setTimeout(() => {
            state.mobileMap = L.map('mobileMap').setView([53.5, -2.5], 5);
            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                attribution: '&copy; OpenStreetMap contributors'
            }).addTo(state.mobileMap);
            
            updateMobileMapMarkers();
        }, 100);
    } else {
        updateMobileMapMarkers();
        state.mobileMap.invalidateSize();
    }
}

/**
 * Update mobile map markers
 */
function updateMobileMapMarkers() {
    if (!state.mobileMap) return;
    
    // Clear existing layers except tile layer
    state.mobileMap.eachLayer(layer => {
        if (layer instanceof L.Marker) {
            state.mobileMap.removeLayer(layer);
        }
    });
    
    // Add markers for filtered properties
    state.filteredProperties.forEach(property => {
        const icon = L.divIcon({
            className: 'custom-marker-container',
            html: `<div class="custom-marker" data-property-id="${property.id}">£${property.pricePerNight}</div>`,
            iconSize: [80, 30],
            iconAnchor: [40, 15]
        });
        
        const marker = L.marker([property.coordinates.lat, property.coordinates.lng], { icon });
        marker.addTo(state.mobileMap);
        
        marker.on('click', () => {
            closeMobileMapModal();
            setTimeout(() => {
                window.location.href = `property.html?id=${property.id}`;
            }, 300);
        });
    });
    
    // Fit bounds
    if (state.filteredProperties.length > 0) {
        const bounds = state.filteredProperties.map(p => [p.coordinates.lat, p.coordinates.lng]);
        state.mobileMap.fitBounds(bounds, { padding: [50, 50] });
    }
}

/**
 * Close mobile map modal
 */
function closeMobileMapModal() {
    const mapModal = document.getElementById('mapModal');
    mapModal.classList.remove('show');
    document.body.style.overflow = '';
}

// ============================================
// TOAST NOTIFICATIONS
// ============================================

/**
 * Show toast notification
 */
function showToast(message) {
    const toast = document.getElementById('toast');
    const toastMessage = document.getElementById('toastMessage');
    
    toastMessage.textContent = message;
    toast.classList.add('show');
    
    setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
}

// Make functions globally accessible
window.applyFilters = applyFilters;
window.resetFilters = resetFilters;
window.toggleModal = toggleModal;
window.toggleFilterSidebar = toggleFilterSidebar;
