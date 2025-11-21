// user-app.js - Dengan Base64 Photo Upload (GRATIS)
console.log("=== LINGKUNGAN KITA - WITH PHOTO UPLOAD ===");

// Initialize map - Bulukumba Center
const map = L.map('map').setView([-5.5576, 120.1963], 11); // Koordinat Bulukumba
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
}).addTo(map);

// Status colors
const statusColors = {
    'new': 'orange',
    'in-progress': 'blue',
    'completed': 'green'
};

// === FILTER FUNCTIONALITY ===
let currentFilters = {
    status: ['new', 'in-progress', 'completed'],
    type: ['trash', 'water', 'facility', 'tree']
};
// Load issues dari Firebase
async function loadIssues() {
    try {
        const issuesList = document.getElementById('issuesList');
        issuesList.innerHTML = '<div class="loading">Memuat laporan...</div>';
        
        const querySnapshot = await db.collection('issues')
            .orderBy('createdAt', 'desc')
            .limit(20)
            .get();
        
        issuesList.innerHTML = '';
        
        // Clear existing markers
        map.eachLayer((layer) => {
            if (layer instanceof L.Marker) {
                map.removeLayer(layer);
            }
        });
        
        if (querySnapshot.empty) {
            issuesList.innerHTML = `
                <div class="no-issues">
                    <i class="fas fa-inbox" style="font-size: 3rem; color: var(--gray); margin-bottom: 1rem;"></i>
                    <p>Belum ada laporan</p>
                    <small>Jadilah yang pertama melaporkan isu lingkungan</small>
                </div>
            `;
            return;
        }
        
        querySnapshot.forEach((doc) => {
            const issue = { 
                id: doc.id, 
                ...doc.data(),
                createdAt: doc.data().createdAt ? doc.data().createdAt.toDate() : new Date()
            };
            displayIssue(issue);
            addIssueToMap(issue);
        });
        
    } catch (error) {
        console.error('Error loading issues:', error);
        
        const issuesList = document.getElementById('issuesList');
        issuesList.innerHTML = `
            <div class="error">
                <i class="fas fa-exclamation-triangle"></i>
                <p>Gagal memuat laporan</p>
                <small>${error.message}</small>
            </div>
        `;
    }
}

// Initialize filter event listeners
function initializeFilters() {
    console.log("🔧 Initializing filters...");
    
    // Status filters
    const statusFilters = ['filter-new', 'filter-in-progress', 'filter-completed'];
    statusFilters.forEach(filterId => {
        const element = document.getElementById(filterId);
        if (element) {
            element.addEventListener('change', updateStatusFilter);
        }
    });
    
    // Type filters
    const typeFilters = ['type-trash', 'type-water', 'type-facility', 'type-tree'];
    typeFilters.forEach(filterId => {
        const element = document.getElementById(filterId);
        if (element) {
            element.addEventListener('change', updateTypeFilter);
        }
    });
    
    console.log("✅ Filters initialized");
}

// Update status filter
function updateStatusFilter(e) {
    const status = e.target.id.replace('filter-', '');
    
    if (e.target.checked) {
        if (!currentFilters.status.includes(status)) {
            currentFilters.status.push(status);
        }
    } else {
        currentFilters.status = currentFilters.status.filter(s => s !== status);
    }
    
    applyFilters();
}

// Update type filter
function updateTypeFilter(e) {
    const type = e.target.id.replace('type-', '');
    
    if (e.target.checked) {
        if (!currentFilters.type.includes(type)) {
            currentFilters.type.push(type);
        }
    } else {
        currentFilters.type = currentFilters.type.filter(t => t !== type);
    }
    
    applyFilters();
}

// Apply filters to issues
function applyFilters() {
    const issueCards = document.querySelectorAll('.issue-card');
    let visibleCount = 0;
    
    issueCards.forEach(card => {
        const status = card.getAttribute('data-status') || 'new';
        const type = card.getAttribute('data-type') || 'trash';
        
        const shouldShow = currentFilters.status.includes(status) && currentFilters.type.includes(type);
        
        if (shouldShow) {
            card.style.display = 'block';
            visibleCount++;
        } else {
            card.style.display = 'none';
        }
    });
    
    updateVisibleCount(visibleCount);
    updateMapMarkers();
}

// Update visible count display - Compact version
function updateVisibleCount(count) {
    const issuesList = document.getElementById('issuesList');
    let countElement = issuesList.querySelector('.visible-count');
    
    if (!countElement) {
        countElement = document.createElement('div');
        countElement.className = 'visible-count';
        issuesList.insertBefore(countElement, issuesList.firstChild);
    }
    
    if (count > 0) {
        countElement.innerHTML = `
            <i class="fas fa-filter"></i>
            <span>Menampilkan <strong>${count}</strong> laporan</span>
        `;
    } else {
        countElement.innerHTML = `
            <i class="fas fa-search"></i>
            <span>Tidak ada laporan yang sesuai filter</span>
        `;
        countElement.classList.add('no-results');
    }
    
    countElement.style.display = 'block';
}
// Update map markers based on filters
function updateMapMarkers() {
    // Clear all markers
    map.eachLayer((layer) => {
        if (layer instanceof L.Marker) {
            map.removeLayer(layer);
        }
    });
    
    // Add back only visible markers
    const visibleCards = document.querySelectorAll('.issue-card[style="display: block"]');
    visibleCards.forEach(card => {
        const issueId = card.getAttribute('data-id');
        // You might need to store issue data to recreate markers
        // This is a simplified version
    });
}

// Reset filters to show all
function resetFilters() {
    // Reset checkbox states
    document.getElementById('filter-new').checked = true;
    document.getElementById('filter-in-progress').checked = true;
    document.getElementById('filter-completed').checked = true;
    
    document.getElementById('type-trash').checked = true;
    document.getElementById('type-water').checked = true;
    document.getElementById('type-facility').checked = true;
    document.getElementById('type-tree').checked = true;
    
    // Reset filter object
    currentFilters = {
        status: ['new', 'in-progress', 'completed'],
        type: ['trash', 'water', 'facility', 'tree']
    };
    
    applyFilters();
}

// Add reset filter button
function addResetFilterButton() {
    const firstFilterSection = document.querySelector('.filter-section');
    if (firstFilterSection && !document.getElementById('resetFilterBtn')) {
        const resetBtn = document.createElement('button');
        resetBtn.id = 'resetFilterBtn';
        resetBtn.className = 'btn btn-outline btn-sm';
        resetBtn.innerHTML = '<i class="fas fa-redo"></i> Reset Filter';
        resetBtn.style.marginTop = '1rem';
        resetBtn.style.width = '100%';
        resetBtn.addEventListener('click', resetFilters);
        
        firstFilterSection.appendChild(resetBtn);
    }
}

// Display issue di list
function displayIssue(issue) {
    const issuesList = document.getElementById('issuesList');
    const issueCard = document.createElement('div');
    issueCard.className = 'issue-card';
    issueCard.setAttribute('data-status', issue.status);
    issueCard.setAttribute('data-type', issue.type);
    issueCard.setAttribute('data-id', issue.id);
    
    // Photo badge jika ada foto
    let photosHTML = '';
    if (issue.photoBase64 && issue.photoBase64.length > 0) {
        photosHTML = `
            <div class="issue-photos-preview">
                <div class="photo-count">
                    <i class="fas fa-camera"></i> ${issue.photoBase64.length} foto
                </div>
            </div>
        `;
    }
    
    issueCard.innerHTML = `
        <div class="issue-header">
            <span class="issue-type">${getIssueTypeLabel(issue.type)}</span>
            <span class="issue-status status-${issue.status}">
                <i class="fas ${getStatusIcon(issue.status)}"></i> 
                ${getStatusLabel(issue.status)}
            </span>
        </div>
        <div class="issue-title">${issue.title}</div>
        ${photosHTML}
        <div class="issue-location"><i class="fas fa-map-marker-alt"></i> ${issue.location}</div>
        <div class="issue-date"><i class="far fa-clock"></i> ${formatDate(issue.createdAt)}</div>
    `;
    
    issueCard.addEventListener('click', () => {
        showIssueDetails(issue);
    });
    
    issuesList.appendChild(issueCard);
}

// Add issue to map
function addIssueToMap(issue) {
    const lat = issue.coordinates?.latitude || (-6.2088 + (Math.random() - 0.5) * 0.1);
    const lng = issue.coordinates?.longitude || (106.8456 + (Math.random() - 0.5) * 0.1);
    
    const marker = L.marker([lat, lng]).addTo(map);
    marker.bindPopup(`
        <div style="min-width: 200px;">
            <h4 style="margin: 0 0 10px 0; color: var(--dark);">${issue.title}</h4>
            <p style="margin: 5px 0; font-size: 0.9em;"><strong>Status:</strong> <span class="issue-status status-${issue.status}">${getStatusLabel(issue.status)}</span></p>
            <p style="margin: 5px 0; font-size: 0.9em;"><strong>Lokasi:</strong> ${issue.location}</p>
            <p style="margin: 5px 0; font-size: 0.9em;"><strong>Dilaporkan:</strong> ${formatDate(issue.createdAt)}</p>
            ${issue.photoBase64 && issue.photoBase64.length > 0 ? 
              `<p style="margin: 5px 0; font-size: 0.9em;"><i class="fas fa-camera"></i> ${issue.photoBase64.length} foto</p>` : ''}
        </div>
    `);
    
    const icon = L.divIcon({
        className: `custom-marker status-${issue.status}`,
        html: `<div style="background-color: ${statusColors[issue.status]}; width: 20px; height: 20px; border-radius: 50%; border: 2px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.2);"></div>`,
        iconSize: [24, 24],
        iconAnchor: [12, 12]
    });
    
    marker.setIcon(icon);
}

// Convert file to Base64
function fileToBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result);
        reader.onerror = error => reject(error);
    });
}

// Compress image untuk mengurangi ukuran
function compressImage(file, maxWidth = 800, quality = 0.7) {
    return new Promise((resolve) => {
        // Jika file kecil (< 500KB), langsung return tanpa kompresi
        if (file.size < 500000) {
            resolve(file);
            return;
        }

        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        const img = new Image();
        
        img.onload = function() {
            let width = img.width;
            let height = img.height;
            
            // Resize jika terlalu besar
            if (width > maxWidth) {
                height = (height * maxWidth) / width;
                width = maxWidth;
            }
            
            canvas.width = width;
            canvas.height = height;
            
            ctx.drawImage(img, 0, 0, width, height);
            
            // Convert to blob dengan quality
            canvas.toBlob(blob => {
                resolve(blob);
            }, 'image/jpeg', quality);
        };
        
        img.src = URL.createObjectURL(file);
    });
}

// Submit issue dengan Base64 photos
async function submitIssue(issueData) {
    console.log('🔄 Submitting issue with photos...');
    
    try {
        const photoBase64 = [];
        
        // Process photos jika ada
        if (issueData.photos && issueData.photos.length > 0) {
            console.log(`Processing ${issueData.photos.length} photos...`);
            
            for (let i = 0; i < issueData.photos.length; i++) {
                const photo = issueData.photos[i];
                console.log(`Compressing photo ${i + 1}: ${photo.name} (${(photo.size / 1024 / 1024).toFixed(2)} MB)`);
                
                // Compress image
                const compressedPhoto = await compressImage(photo);
                console.log(`Photo ${i + 1} compressed: ${(compressedPhoto.size / 1024 / 1024).toFixed(2)} MB`);
                
                // Convert to Base64
                const base64String = await fileToBase64(compressedPhoto);
                photoBase64.push(base64String);
                
                console.log(`✅ Photo ${i + 1} converted to Base64`);
            }
        }
        
        // Prepare data untuk Firestore
        const firebaseIssue = {
            type: issueData.type,
            title: issueData.title.substring(0, 100),
            description: issueData.description,
            location: issueData.location,
            coordinates: issueData.coordinates,
            status: 'new',
            reporterEmail: issueData.email || '',
            reporterPhone: issueData.phone || '',
            photoBase64: photoBase64,
            photoCount: photoBase64.length,
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        };
        
        console.log('💾 Saving to Firestore...');
        
        // Simpan ke Firestore
        const docRef = await db.collection('issues').add(firebaseIssue);
        console.log('✅ Issue saved with ID:', docRef.id);
        
        return docRef.id;
        
    } catch (error) {
        console.error('❌ Error submitting issue:', error);
        throw error;
    }
}

// Show message
function showMessage(message, type = 'info') {
    const messageDiv = document.createElement('div');
    messageDiv.style.cssText = `
        position: fixed;
        top: 100px;
        right: 20px;
        padding: 1rem;
        border-radius: 8px;
        color: white;
        z-index: 10000;
        max-width: 300px;
        box-shadow: var(--shadow-lg);
    `;
    
    const bgColors = {
        'success': 'var(--success)',
        'error': 'var(--danger)', 
        'warning': 'var(--warning)',
        'info': 'var(--primary)'
    };
    
    messageDiv.style.backgroundColor = bgColors[type] || bgColors.info;
    
    messageDiv.innerHTML = `
        <div style="display: flex; align-items: center; gap: 10px;">
            <i class="fas fa-${type === 'success' ? 'check' : type === 'error' ? 'exclamation-triangle' : 'info'}"></i>
            <span>${message}</span>
        </div>
    `;
    
    document.body.appendChild(messageDiv);
    
    setTimeout(() => {
        if (messageDiv.parentNode) {
            messageDiv.parentNode.removeChild(messageDiv);
        }
    }, 5000);
}

// Form submission handler
issueForm.addEventListener('submit', async function(e) {
    e.preventDefault();
    
    // Validate required fields
    if (!selectedIssueType) {
        showMessage('Silakan pilih jenis isu terlebih dahulu!', 'error');
        navigateToStep(0);
        return;
    }
    
    const description = document.getElementById('issueDescription').value.trim();
    if (!description) {
        showMessage('Silakan isi deskripsi isu!', 'error');
        navigateToStep(3);
        return;
    }
    
    // Get location data
    const location = description.split(' ').slice(0, 5).join(' ') + '...';
    const coordinates = locationMarker ? {
        latitude: locationMarker.getLatLng().lat,
        longitude: locationMarker.getLatLng().lng
    } : null;
    
    // Get photo files
    const photoFiles = Array.from(photoUpload.files);
    
    // Prepare issue data
    const issueData = {
        type: selectedIssueType,
        title: description.substring(0, 100),
        description: description,
        location: location,
        coordinates: coordinates,
        email: document.getElementById('userEmail').value.trim(),
        phone: document.getElementById('userPhone').value.trim(),
        photos: photoFiles
    };
    
    try {
        // Show loading state
        const submitBtn = document.getElementById('submitIssue');
        const originalText = submitBtn.innerHTML;
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Mengirim...';
        submitBtn.disabled = true;
        
        console.log('📤 Submitting issue data...');
        
        // Submit to Firebase
        const issueId = await submitIssue(issueData);
        
        // Success message
        showMessage(`✅ Laporan berhasil dikirim! ID: ${issueId}`, 'success');
        
        // Close modal and reset form
        setTimeout(() => {
            reportModal.style.display = 'none';
            document.body.style.overflow = 'auto';
            resetForm();
            
            // Reload issues
            loadIssues();
        }, 2000);
        
    } catch (error) {
        console.error('❌ Submission error:', error);
        
        let errorMessage = 'Maaf, terjadi kesalahan saat mengirim laporan. ';
        
        if (error.code === 'permission-denied') {
            errorMessage += 'Izin ditolak. Periksa Firestore rules.';
        } else if (error.code === 'unavailable') {
            errorMessage += 'Koneksi internet bermasalah.';
        } else {
            errorMessage += 'Silakan coba lagi.';
        }
        
        showMessage(errorMessage, 'error');
        
    } finally {
        // Reset button state
        const submitBtn = document.getElementById('submitIssue');
        submitBtn.innerHTML = '<i class="fas fa-paper-plane"></i> Kirim Laporan';
        submitBtn.disabled = false;
    }
});

// Show issue details dengan photos
function showIssueDetails(issue) {
    const modal = document.getElementById('reportModal');
    const modalHeader = document.querySelector('.modal-header h2');
    const modalBody = document.querySelector('.modal-body');
    
    let photosHTML = '';
    if (issue.photoBase64 && issue.photoBase64.length > 0) {
        photosHTML = `
            <div class="detail-section">
                <h3 style="color: var(--dark); margin-bottom: 1rem;">
                    <i class="fas fa-camera"></i> Foto Bukti (${issue.photoBase64.length})
                </h3>
                <div class="photo-gallery">
                    ${issue.photoBase64.map((photoBase64, index) => `
                        <div class="photo-item">
                            <img src="${photoBase64}" alt="Foto bukti ${index + 1}" 
                                 onclick="openPhotoModal('${photoBase64}')">
                            <div class="photo-number">${index + 1}</div>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    }
    
    modalHeader.innerHTML = `<i class="fas fa-info-circle"></i> Detail Laporan - ${issue.id}`;
    modalBody.innerHTML = `
        <div class="issue-detail">
            <div class="detail-section">
                <h3 style="color: var(--dark); margin-bottom: 1rem;">Informasi Laporan</h3>
                <div class="detail-grid" style="display: grid; gap: 1rem;">
                    <div class="detail-item" style="display: flex; justify-content: space-between; padding: 0.5rem 0; border-bottom: 1px solid var(--gray-light);">
                        <label style="font-weight: 600;">Judul:</label>
                        <span>${issue.title}</span>
                    </div>
                    <div class="detail-item" style="display: flex; justify-content: space-between; padding: 0.5rem 0; border-bottom: 1px solid var(--gray-light);">
                        <label style="font-weight: 600;">Jenis Isu:</label>
                        <span>${getIssueTypeLabel(issue.type)}</span>
                    </div>
                    <div class="detail-item" style="display: flex; justify-content: space-between; padding: 0.5rem 0; border-bottom: 1px solid var(--gray-light);">
                        <label style="font-weight: 600;">Status:</label>
                        <span class="issue-status status-${issue.status}">${getStatusLabel(issue.status)}</span>
                    </div>
                    <div class="detail-item" style="display: flex; justify-content: space-between; padding: 0.5rem 0; border-bottom: 1px solid var(--gray-light);">
                        <label style="font-weight: 600;">Lokasi:</label>
                        <span>${issue.location}</span>
                    </div>
                    <div class="detail-item" style="display: flex; justify-content: space-between; padding: 0.5rem 0; border-bottom: 1px solid var(--gray-light);">
                        <label style="font-weight: 600;">Dilaporkan:</label>
                        <span>${formatDate(issue.createdAt)}</span>
                    </div>
                </div>
            </div>
            
            <div class="detail-section" style="margin-top: 1.5rem;">
                <h3 style="color: var(--dark); margin-bottom: 1rem;">Deskripsi</h3>
                <p style="color: var(--gray); line-height: 1.6; background: var(--light); padding: 1rem; border-radius: 8px;">${issue.description}</p>
            </div>
            
            ${photosHTML}
            
            <div class="form-navigation" style="margin-top: 2rem; padding-top: 1.5rem; border-top: 1px solid var(--gray-light);">
                <button type="button" class="btn btn-outline" onclick="closeIssueDetails()">Tutup</button>
            </div>
        </div>
    `;
    
    modal.style.display = 'flex';
    document.body.style.overflow = 'hidden';
}

// Photo modal viewer
function openPhotoModal(photoBase64) {
    const modal = document.createElement('div');
    modal.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0,0,0,0.95);
        display: flex;
        justify-content: center;
        align-items: center;
        z-index: 10000;
        cursor: pointer;
    `;
    
    modal.innerHTML = `
        <div style="position: relative; max-width: 95%; max-height: 95%;">
            <img src="${photoBase64}" style="max-width: 100%; max-height: 95vh; border-radius: 8px; box-shadow: 0 10px 30px rgba(0,0,0,0.5);">
            <button onclick="this.parentElement.parentElement.remove()" 
                    style="position: absolute; top: -50px; right: 0; background: var(--danger); color: white; border: none; border-radius: 50%; width: 40px; height: 40px; cursor: pointer; font-size: 1.2rem; display: flex; align-items: center; justify-content: center;">
                ×
            </button>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    // Close on click outside
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.remove();
        }
    });
    
    // Close on ESC key
    const closeOnEsc = (e) => {
        if (e.key === 'Escape') {
            modal.remove();
            document.removeEventListener('keydown', closeOnEsc);
        }
    };
    document.addEventListener('keydown', closeOnEsc);
}

// Helper functions
function formatDate(timestamp) {
    if (!timestamp) return 'Tanggal tidak tersedia';
    
    const date = timestamp instanceof Date ? timestamp : timestamp.toDate();
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    
    if (diffMins < 1) return 'Baru saja';
    if (diffMins < 60) return `${diffMins} menit yang lalu`;
    if (diffHours < 24) return `${diffHours} jam yang lalu`;
    if (diffDays < 7) return `${diffDays} hari yang lalu`;
    
    return date.toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'long',
        year: 'numeric'
    });
}

function getIssueTypeLabel(type) {
    const types = {
        'trash': 'Sampah Liar',
        'water': 'Polusi Air',
        'facility': 'Kerusakan Fasilitas',
        'tree': 'Pohon Tumbang'
    };
    return types[type] || 'Lainnya';
}

function getStatusLabel(status) {
    const statuses = {
        'new': 'Baru',
        'in-progress': 'Diproses',
        'completed': 'Selesai'
    };
    return statuses[status] || 'Tidak Diketahui';
}

function getStatusIcon(status) {
    const icons = {
        'new': 'fa-clock',
        'in-progress': 'fa-tools',
        'completed': 'fa-check-circle'
    };
    return icons[status] || 'fa-question';
}

// Mobile menu
const mobileMenuBtn = document.getElementById('mobileMenuBtn');
const sidebar = document.getElementById('sidebar');

if (mobileMenuBtn && sidebar) {
    mobileMenuBtn.addEventListener('click', () => {
        sidebar.classList.toggle('active');
    });
}

// Modal functionality
const reportModal = document.getElementById('reportModal');
const reportBtn = document.getElementById('reportIssueBtn');
const closeModal = document.querySelector('.close-modal');
const cancelReport = document.getElementById('cancelReport');

if (reportBtn) {
    reportBtn.addEventListener('click', () => {
        reportModal.style.display = 'flex';
        document.body.style.overflow = 'hidden';
        resetForm();
    });
}

if (closeModal) {
    closeModal.addEventListener('click', () => {
        reportModal.style.display = 'none';
        document.body.style.overflow = 'auto';
        resetForm();
    });
}

if (cancelReport) {
    cancelReport.addEventListener('click', () => {
        reportModal.style.display = 'none';
        document.body.style.overflow = 'auto';
        resetForm();
    });
}

// Form navigation
const steps = document.querySelectorAll('.form-step');
const stepIndicators = document.querySelectorAll('.step-indicator .step');
let currentStep = 0;

function updateStepIndicator() {
    stepIndicators.forEach((step, index) => {
        step.classList.toggle('active', index <= currentStep);
    });
}

// Navigation
document.getElementById('nextToStep2')?.addEventListener('click', () => {
    if (!selectedIssueType) {
        showMessage('Pilih jenis isu terlebih dahulu!', 'error');
        return;
    }
    navigateToStep(1);
});

document.getElementById('backToStep1')?.addEventListener('click', () => navigateToStep(0));
document.getElementById('nextToStep3')?.addEventListener('click', () => navigateToStep(2));
document.getElementById('backToStep2')?.addEventListener('click', () => navigateToStep(1));
document.getElementById('nextToStep4')?.addEventListener('click', () => navigateToStep(3));
document.getElementById('backToStep3')?.addEventListener('click', () => navigateToStep(2));
document.getElementById('nextToStep5')?.addEventListener('click', () => navigateToStep(4));
document.getElementById('backToStep4')?.addEventListener('click', () => navigateToStep(3));

function navigateToStep(stepIndex) {
    steps[currentStep].classList.remove('active');
    steps[stepIndex].classList.add('active');
    currentStep = stepIndex;
    updateStepIndicator();
}

// Issue type selection
const issueTypeBtns = document.querySelectorAll('.issue-type-btn');
let selectedIssueType = null;

issueTypeBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        issueTypeBtns.forEach(b => b.classList.remove('selected'));
        btn.classList.add('selected');
        selectedIssueType = btn.getAttribute('data-type');
        console.log("Selected issue type:", selectedIssueType);
    });
});

// Photo upload functionality
const photoUpload = document.getElementById('photoUpload');
const photoPreview = document.getElementById('photoPreview');

if (photoUpload && photoPreview) {
    photoUpload.addEventListener('change', function() {
        photoPreview.innerHTML = '';
        const files = this.files;
        
        if (files.length > 3) {
            showMessage('Maksimal 3 foto yang diupload', 'warning');
            this.value = '';
            return;
        }
        
        for (let i = 0; i < Math.min(files.length, 3); i++) {
            const file = files[i];
            
            // Validasi ukuran file (max 5MB)
            if (file.size > 5 * 1024 * 1024) {
                showMessage(`File ${file.name} terlalu besar (max 5MB)`, 'error');
                continue;
            }
            
            const reader = new FileReader();
            
            reader.onload = function(e) {
                const previewItem = document.createElement('div');
                previewItem.className = 'photo-preview-item';
                
                const img = document.createElement('img');
                img.src = e.target.result;
                
                const removeBtn = document.createElement('button');
                removeBtn.className = 'remove-photo';
                removeBtn.innerHTML = '×';
                removeBtn.title = 'Hapus foto';
                removeBtn.addEventListener('click', function() {
                    previewItem.remove();
                    const newFiles = Array.from(photoUpload.files).filter(f => f !== file);
                    const dt = new DataTransfer();
                    newFiles.forEach(f => dt.items.add(f));
                    photoUpload.files = dt.files;
                });
                
                previewItem.appendChild(img);
                previewItem.appendChild(removeBtn);
                photoPreview.appendChild(previewItem);
            };
            
            reader.readAsDataURL(file);
        }
    });
}

// Character count
const descriptionTextarea = document.getElementById('issueDescription');
const charCount = document.getElementById('charCount');

if (descriptionTextarea && charCount) {
    descriptionTextarea.addEventListener('input', function() {
        const count = this.value.length;
        charCount.textContent = `${count}/300 karakter`;
        
        // Warning jika mendekati limit
        if (count > 250) {
            charCount.style.color = 'var(--warning)';
        } else {
            charCount.style.color = 'var(--gray)';
        }
    });
}

// Location map
let locationMap;
let locationMarker = null;

function initLocationMap() {
    if (!document.getElementById('locationMap')) return;
    
    // Set center ke Bulukumba
    locationMap = L.map('locationMap').setView([-5.5576, 120.1963], 12);
    
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(locationMap);
    
    locationMap.on('click', function(e) {
        if (locationMarker) {
            locationMap.removeLayer(locationMarker);
        }
        
        locationMarker = L.marker(e.latlng).addTo(locationMap);
        console.log("Location selected:", e.latlng);
        showMessage('Lokasi berhasil dipilih!', 'success');
    });
}

// Use current location
document.getElementById('useCurrentLocation')?.addEventListener('click', function() {
    if (navigator.geolocation) {
        const btn = this;
        const originalText = btn.innerHTML;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Mendeteksi lokasi...';
        btn.disabled = true;
        
        navigator.geolocation.getCurrentPosition(function(position) {
            const lat = position.coords.latitude;
            const lng = position.coords.longitude;
            
            // Set view ke lokasi user, tapi tetap dalam area Bulukumba
            locationMap.setView([lat, lng], 15);
            
            if (locationMarker) {
                locationMap.removeLayer(locationMarker);
            }
            
            locationMarker = L.marker([lat, lng]).addTo(locationMap);
            
            btn.innerHTML = originalText;
            btn.disabled = false;
            showMessage('Lokasi berhasil dideteksi!', 'success');
        }, function(error) {
            console.error('Geolocation error:', error);
            // Fallback ke Bulukumba center jika geolocation gagal
            locationMap.setView([-5.5576, 120.1963], 12);
            showMessage('Menggunakan peta Bulukumba. Pastikan izin lokasi diaktifkan untuk deteksi otomatis.', 'warning');
            btn.innerHTML = originalText;
            btn.disabled = false;
        });
    } else {
        showMessage('Browser tidak mendukung geolocation. Menggunakan peta Bulukumba.', 'warning');
    }
});

// Refresh issues
document.getElementById('refreshIssues')?.addEventListener('click', function() {
    const btn = this;
    const originalHTML = btn.innerHTML;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Memuat...';
    btn.disabled = true;
    
    loadIssues();
    
    setTimeout(() => {
        btn.innerHTML = originalHTML;
        btn.disabled = false;
        showMessage('Data diperbarui!', 'success');
    }, 1000);
});

// Close modal when clicking outside
window.addEventListener('click', function(e) {
    if (e.target === reportModal) {
        reportModal.style.display = 'none';
        document.body.style.overflow = 'auto';
        resetForm();
    }
});

// Reset form
function resetForm() {
    if (issueForm) issueForm.reset();
    if (photoPreview) photoPreview.innerHTML = '';
    if (issueTypeBtns) {
        issueTypeBtns.forEach(btn => btn.classList.remove('selected'));
    }
    selectedIssueType = null;
    if (charCount) {
        charCount.textContent = '0/300 karakter';
        charCount.style.color = 'var(--gray)';
    }
    if (steps.length > 0) navigateToStep(0);
    
    if (locationMarker && locationMap) {
        locationMap.removeLayer(locationMarker);
        locationMarker = null;
    }
}

// Close issue details
function closeIssueDetails() {
    const modal = document.getElementById('reportModal');
    modal.style.display = 'none';
    document.body.style.overflow = 'auto';
    resetForm();
}

// Add custom CSS untuk photos
const style = document.createElement('style');
style.textContent = `
    .photo-gallery {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
        gap: 1rem;
        margin-top: 1rem;
    }
    
    .photo-item {
        border-radius: 8px;
        overflow: hidden;
        cursor: pointer;
        transition: var(--transition);
        border: 2px solid var(--gray-light);
        position: relative;
    }
    
    .photo-item:hover {
        transform: scale(1.05);
        border-color: var(--primary);
        box-shadow: var(--shadow-lg);
    }
    
    .photo-item img {
        width: 100%;
        height: 150px;
        object-fit: cover;
    }
    
    .photo-number {
        position: absolute;
        top: 5px;
        left: 5px;
        background: rgba(0,0,0,0.7);
        color: white;
        border-radius: 50%;
        width: 25px;
        height: 25px;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 0.8rem;
        font-weight: bold;
    }
    
    .issue-photos-preview {
        margin: 0.5rem 0;
    }
    
    .photo-count {
        display: inline-flex;
        align-items: center;
        gap: 0.5rem;
        background: var(--light);
        padding: 0.3rem 0.7rem;
        border-radius: 20px;
        font-size: 0.8rem;
        color: var(--gray);
        border: 1px solid var(--gray-light);
    }
    
    .photo-preview {
        display: flex;
        gap: 0.8rem;
        margin-top: 0.8rem;
        flex-wrap: wrap;
    }
    
    .photo-preview-item {
        width: 100px;
        height: 100px;
        border-radius: 8px;
        overflow: hidden;
        position: relative;
        box-shadow: var(--shadow);
        border: 2px solid var(--primary);
    }
    
    .photo-preview-item img {
        width: 100%;
        height: 100%;
        object-fit: cover;
    }
    
    .remove-photo {
        position: absolute;
        top: 2px;
        right: 2px;
        background: var(--danger);
        color: var(--white);
        border: none;
        width: 20px;
        height: 20px;
        border-radius: 50%;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 0.8rem;
    }
`;
document.head.appendChild(style);

// Initialize app
document.addEventListener('DOMContentLoaded', function() {
    console.log("🚀 Initializing Lingkungan Kita App...");
    
    // Initialize filters first
    initializeFilters();
    addResetFilterButton();
    
    // Then load issues
    loadIssues();
    
    // Initialize location map when modal opens
    const observer = new MutationObserver(function(mutations) {
        mutations.forEach(function(mutation) {
            if (mutation.type === 'attributes' && mutation.attributeName === 'style') {
                if (reportModal.style.display === 'flex') {
                    setTimeout(() => {
                        console.log("🗺️ Initializing location map...");
                        initLocationMap();
                    }, 100);
                }
            }
        });
    });
    
    observer.observe(reportModal, {
        attributes: true,
        attributeFilter: ['style']
    });
});

// Global functions untuk modal
window.openPhotoModal = openPhotoModal;
window.closeIssueDetails = closeIssueDetails;