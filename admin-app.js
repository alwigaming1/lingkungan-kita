// admin-app.js - FIXED VERSION
console.log("=== ADMIN PANEL - FIXED VERSION ===");

// ===== FILTER VARIABLES =====
let currentAdminFilters = {
    status: '',
    kecamatan: '',
    search: ''
};
let allIssues = []; // Untuk menyimpan semua data issues

// ===== AUTHENTICATION & INITIALIZATION =====
firebase.auth().onAuthStateChanged((user) => {
    console.log("Auth state changed:", user);
    if (user) {
        console.log("User is logged in:", user.email);
        showAdminPanel();
        loadAdminIssues();
    } else {
        console.log("No user, redirecting to login");
        window.location.href = 'admin-login.html';
    }
});

function showAdminPanel() {
    console.log("Showing admin panel");
    const loadingScreen = document.getElementById('loadingScreen');
    const adminPanel = document.getElementById('adminPanel');
    
    if (loadingScreen) loadingScreen.style.display = 'none';
    if (adminPanel) adminPanel.style.display = 'block';
    
    const adminUsername = document.getElementById('adminUsername');
    if (adminUsername) {
        adminUsername.textContent = firebase.auth().currentUser.email;
    }
}

// ===== CORE ADMIN FUNCTIONS =====

async function loadAdminIssues() {
    console.log("🔄 Loading admin issues...");
    
    try {
        const tableBody = document.getElementById('issuesTableBody');
        if (!tableBody) {
            console.error("❌ Table body element not found!");
            return;
        }
        
        tableBody.innerHTML = '<tr><td colspan="7" class="loading">Memuat data laporan...</td></tr>';
        
        if (typeof db === 'undefined') {
            console.error("❌ Firestore db is not defined!");
            tableBody.innerHTML = '<tr><td colspan="7">Database connection error</td></tr>';
            return;
        }
        
        const snapshot = await db.collection('issues').orderBy('createdAt', 'desc').get();
        console.log("✅ Got snapshot:", snapshot.size, "documents");
        
        // Clear previous data
        allIssues = [];
        
        snapshot.forEach((doc) => {
    const data = doc.data();
    
    // Handle createdAt
    let createdAtDate;
    try {
        if (data.createdAt && typeof data.createdAt.toDate === 'function') {
            createdAtDate = data.createdAt.toDate();
        } else if (data.createdAt instanceof Date) {
            createdAtDate = data.createdAt;
        } else if (typeof data.createdAt === 'string') {
            createdAtDate = new Date(data.createdAt);
        } else {
            createdAtDate = new Date();
        }
    } catch (error) {
        createdAtDate = new Date();
    }
    
    // FIX: Handle status - pastikan selalu ada nilai default
    const issueStatus = data.status || 'new'; // Default ke 'new' jika kosong
    
    const issueData = {
        id: doc.id,
        ...data,
        status: issueStatus, // Gunakan status yang sudah difix
        createdAt: createdAtDate
    };
    
    console.log("📝 Loaded issue:", issueData.id, 
                "- Status:", issueData.status, 
                "- Raw status:", data.status,
                "- Fixed status:", issueStatus);
    
    allIssues.push(issueData);
});
        
        console.log("💾 All issues stored:", allIssues.length);
        
        // Apply filters
        applyAdminFilters();
        
    } catch (error) {
        console.error("❌ Error loading issues:", error);
        const tableBody = document.getElementById('issuesTableBody');
        if (tableBody) {
            tableBody.innerHTML = '<tr><td colspan="7" class="error">Error loading data: ' + error.message + '</td></tr>';
        }
    }
}
// ===== REFRESH FUNCTION =====
function setupRefreshButton() {
    const refreshBtn = document.getElementById('refreshData');
    if (refreshBtn) {
        refreshBtn.addEventListener('click', async function() {
            const originalHTML = refreshBtn.innerHTML;
            
            refreshBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Memuat...';
            refreshBtn.disabled = true;
            
            try {
                console.log('🔄 Refreshing data...');
                await loadAdminIssues();
                showAdminMessage('Data berhasil diperbarui!', 'success');
                
            } catch (error) {
                console.error('Refresh error:', error);
                showAdminMessage('Gagal memuat data: ' + error.message, 'error');
            } finally {
                refreshBtn.innerHTML = originalHTML;
                refreshBtn.disabled = false;
            }
        });
    } else {
        console.error("Refresh button not found!");
    }
}

// ===== EXPORT FUNCTION =====
function setupExportButton() {
    const exportBtn = document.getElementById('exportData');
    if (exportBtn) {
        exportBtn.addEventListener('click', async function() {
            const originalHTML = exportBtn.innerHTML;
            
            exportBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Menyiapkan...';
            exportBtn.disabled = true;
            
            try {
                console.log('📊 Preparing data export...');
                
                const querySnapshot = await db.collection('issues').orderBy('createdAt', 'desc').get();
                
                if (querySnapshot.empty) {
                    showAdminMessage('Tidak ada data untuk diekspor', 'warning');
                    return;
                }
                
                let csvContent = "ID,Jenis Isu,Lokasi,Status,Email Pelapor,Telepon,Tanggal Dibuat,Terakhir Update,Jumlah Foto,Deskripsi\n";
                
                querySnapshot.forEach(doc => {
                    const data = doc.data();
                    
                    const createdAt = data.createdAt ? 
                        data.createdAt.toDate().toLocaleString('id-ID') : 'Tidak diketahui';
                    const updatedAt = data.updatedAt ? 
                        data.updatedAt.toDate().toLocaleString('id-ID') : 'Tidak pernah';
                    
                    const escapeCSV = (str) => {
                        if (!str) return '';
                        return `"${String(str).replace(/"/g, '""')}"`;
                    };
                    
                    csvContent += [
                        escapeCSV(doc.id),
                        escapeCSV(getIssueTypeLabel(data.type)),
                        escapeCSV(data.location),
                        escapeCSV(getStatusLabel(data.status)),
                        escapeCSV(data.reporterEmail),
                        escapeCSV(data.reporterPhone),
                        escapeCSV(createdAt),
                        escapeCSV(updatedAt),
                        escapeCSV(data.photoCount || 0),
                        escapeCSV(data.description)
                    ].join(',') + '\n';
                });
                
                // Create and download CSV file
                const blob = new Blob(['\uFEFF' + csvContent], { 
                    type: 'text/csv;charset=utf-8;' 
                });
                const url = URL.createObjectURL(blob);
                const link = document.createElement('a');
                const timestamp = new Date().toISOString().split('T')[0];
                
                link.href = url;
                link.download = `laporan-lingkungan-${timestamp}.csv`;
                link.style.display = 'none';
                
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                URL.revokeObjectURL(url);
                
                showAdminMessage(`Data berhasil diekspor (${querySnapshot.size} laporan)`, 'success');
                
            } catch (error) {
                console.error('Export error:', error);
                showAdminMessage('Gagal mengekspor data: ' + error.message, 'error');
            } finally {
                exportBtn.innerHTML = originalHTML;
                exportBtn.disabled = false;
            }
        });
    } else {
        console.error("Export button not found!");
    }
}

// ===== ISSUE MANAGEMENT FUNCTIONS =====
async function viewIssue(issueId) {
    console.log("Viewing issue:", issueId);
    try {
        const doc = await db.collection('issues').doc(issueId).get();
        if (doc.exists) {
            const data = doc.data();
            showIssueModal(issueId, data);
        } else {
            alert("Laporan tidak ditemukan!");
        }
    } catch (error) {
        console.error("Error viewing issue:", error);
        alert("Error loading issue details: " + error.message);
    }
}

async function updateIssueStatus(issueId) {
    const currentDoc = await db.collection('issues').doc(issueId).get();
    if (!currentDoc.exists) {
        alert('Laporan tidak ditemukan!');
        return;
    }
    
    const currentStatus = currentDoc.data().status || 'new';
    const newStatus = prompt(
        'Update Status Laporan:\n\n' +
        'new - Baru\n' +
        'in-progress - Sedang Diproses\n' +
        'completed - Selesai\n\n' +
        'Status saat ini: ' + getStatusLabel(currentStatus),
        currentStatus
    );
    
    if (newStatus && ['new', 'in-progress', 'completed'].includes(newStatus)) {
        try {
            await db.collection('issues').doc(issueId).update({
                status: newStatus,
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            });
            
            showAdminMessage('Status berhasil diupdate!', 'success');
            loadAdminIssues();
            closeAdminModal();
            
        } catch (error) {
            console.error("Error updating status:", error);
            alert("Error updating status: " + error.message);
        }
    } else if (newStatus) {
        alert("Status tidak valid! Gunakan: new, in-progress, atau completed");
    }
}

async function deleteIssue(issueId) {
    if (confirm(`Yakin ingin menghapus laporan ${issueId}?\n\nTindakan ini tidak dapat dibatalkan!`)) {
        try {
            await db.collection('issues').doc(issueId).delete();
            showAdminMessage('Laporan berhasil dihapus!', 'success');
            loadAdminIssues();
        } catch (error) {
            console.error("Error deleting issue:", error);
            alert("Error deleting issue: " + error.message);
        }
    }
}


// ===== FILTER FUNCTIONS =====
function initializeAdminFilters() {
    console.log("🔧 Initializing admin filters...");
    
    // Reset semua ke state awal
    currentAdminFilters = { status: '', kecamatan: '', search: '' };
    
    const searchInput = document.getElementById('searchIssues');
    const statusFilter = document.getElementById('statusFilter');
    const kecamatanFilter = document.getElementById('kecamatanFilter');
    
    // Reset UI elements
    if (searchInput) searchInput.value = '';
    if (statusFilter) statusFilter.value = '';
    if (kecamatanFilter) kecamatanFilter.value = '';
    
    // Event listeners
    if (searchInput) {
        searchInput.addEventListener('input', function(e) {
            currentAdminFilters.search = e.target.value.toLowerCase();
            applyAdminFilters();
        });
    }
    
    if (statusFilter) {
        statusFilter.addEventListener('change', function(e) {
            currentAdminFilters.status = e.target.value;
            applyAdminFilters();
        });
    }
    
    if (kecamatanFilter) {
        kecamatanFilter.addEventListener('change', function(e) {
            currentAdminFilters.kecamatan = e.target.value;
            applyAdminFilters();
        });
    }
    
    console.log("✅ Admin filters initialized - All reset to empty");
}



function applyAdminFilters() {
    console.log("🔄 SIMPLE FILTER VERSION");
    
    let filtered = [...allIssues];
    
    // STATUS FILTER - SIMPLE VERSION
    if (currentAdminFilters.status) {
        console.log("Filtering by status:", currentAdminFilters.status);
        console.log("Before status filter:", filtered.length);
        
        filtered = filtered.filter(issue => {
            const issueStatus = issue.status || 'new';
            const match = issueStatus === currentAdminFilters.status;
            console.log(`Issue ${issue.id}: ${issueStatus} === ${currentAdminFilters.status} => ${match}`);
            return match;
        });
        
        console.log("After status filter:", filtered.length);
    }
    
    // Kecamatan filter
    if (currentAdminFilters.kecamatan) {
        filtered = filtered.filter(issue => 
            issue.location && issue.location.toLowerCase().includes(currentAdminFilters.kecamatan.toLowerCase())
        );
    }
    
    // Search filter
    if (currentAdminFilters.search) {
        filtered = filtered.filter(issue => {
            const searchText = [
                issue.title, 
                issue.description,
                issue.location,
                issue.reporterEmail,
                getIssueTypeLabel(issue.type)
            ].join(' ').toLowerCase();
            return searchText.includes(currentAdminFilters.search.toLowerCase());
        });
    }
    
    console.log("Final filtered count:", filtered.length);
    displayFilteredIssues(filtered);
}
function displayFilteredIssues(issues) {
    const tableBody = document.getElementById('issuesTableBody');
    
    if (!tableBody) return;
    
    tableBody.innerHTML = '';
    
    if (issues.length === 0) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="7" class="no-data">
                    <div style="text-align: center; padding: 2rem; color: var(--gray);">
                        <i class="fas fa-search" style="font-size: 2rem; margin-bottom: 1rem;"></i>
                        <p>Tidak ada laporan yang sesuai dengan filter</p>
                    </div>
                </td>
            </tr>
        `;
    } else {
        issues.forEach((issue) => {
            const row = document.createElement('tr');
            const statusClass = getStatusClass(issue.status || 'new');
            row.className = statusClass;
            
            // FIX: Safe date formatting
            let formattedDate = 'Unknown';
            try {
                if (issue.createdAt instanceof Date && !isNaN(issue.createdAt)) {
                    formattedDate = issue.createdAt.toLocaleDateString('id-ID');
                } else if (issue.createdAt) {
                    // Try to parse if it's string or other format
                    const date = new Date(issue.createdAt);
                    if (!isNaN(date)) {
                        formattedDate = date.toLocaleDateString('id-ID');
                    }
                }
            } catch (error) {
                console.warn("Date formatting error for issue:", issue.id);
            }
            
            row.innerHTML = `
                <td>${issue.id.substring(0, 8)}...</td>
                <td>${getIssueTypeLabel(issue.type)}</td>
                <td>${issue.location || 'No location'}</td>
                <td><span class="status-badge status-${issue.status || 'new'}">${getStatusLabel(issue.status)}</span></td>
                <td>${formattedDate}</td>
                <td>${issue.reporterEmail || 'No email'}</td>
                <td class="action-buttons">
                    <button class="btn btn-primary btn-sm" onclick="viewIssue('${issue.id}')">
                        <i class="fas fa-eye"></i>
                    </button>
                    <button class="btn btn-success btn-sm" onclick="updateIssueStatus('${issue.id}')">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn btn-danger btn-sm" onclick="deleteIssue('${issue.id}')">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            `;
            tableBody.appendChild(row);
        });
    }
    
    document.getElementById('issuesCount').textContent = issues.length;
    document.getElementById('tableInfo').textContent = `Menampilkan ${issues.length} laporan`;
}

function clearAdminFilters() {
    currentAdminFilters = { status: '', kecamatan: '', search: '' };
    document.getElementById('searchIssues').value = '';
    document.getElementById('statusFilter').value = '';
    document.getElementById('kecamatanFilter').value = '';
    displayFilteredIssues(allIssues);
}

function addClearFilterButton() {
    const tabActions = document.querySelector('.tab-actions');
    if (tabActions && !document.getElementById('clearFilterBtn')) {
        const clearBtn = document.createElement('button');
        clearBtn.id = 'clearFilterBtn';
        clearBtn.className = 'btn btn-outline btn-sm';
        clearBtn.innerHTML = '<i class="fas fa-times"></i> Clear Filter';
        clearBtn.addEventListener('click', clearAdminFilters);
        tabActions.appendChild(clearBtn);
    }
}

// ===== MODAL FUNCTIONS =====
function showIssueModal(issueId, data) {
    const modalContent = `
        <div class="issue-detail-modal">
            <div class="detail-section">
                <h3>Informasi Laporan</h3>
                <div class="detail-grid">
                    <div class="detail-item">
                        <label>ID Laporan:</label>
                        <span>${issueId}</span>
                    </div>
                    <div class="detail-item">
                        <label>Jenis Isu:</label>
                        <span>${getIssueTypeLabel(data.type)}</span>
                    </div>
                    <div class="detail-item">
                        <label>Status:</label>
                        <span class="status-badge status-${data.status}">${getStatusLabel(data.status)}</span>
                    </div>
                    <div class="detail-item">
                        <label>Lokasi:</label>
                        <span>${data.location || 'Tidak ada lokasi'}</span>
                    </div>
                    <div class="detail-item">
                        <label>Email Pelapor:</label>
                        <span>${data.reporterEmail || 'Tidak ada email'}</span>
                    </div>
                    <div class="detail-item">
                        <label>Telepon:</label>
                        <span>${data.reporterPhone || 'Tidak ada telepon'}</span>
                    </div>
                    <div class="detail-item">
                        <label>Tanggal Dibuat:</label>
                        <span>${data.createdAt ? data.createdAt.toDate().toLocaleString('id-ID') : 'Tidak diketahui'}</span>
                    </div>
                    <div class="detail-item">
                        <label>Terakhir Diupdate:</label>
                        <span>${data.updatedAt ? data.updatedAt.toDate().toLocaleString('id-ID') : 'Tidak pernah'}</span>
                    </div>
                </div>
            </div>
            
            <div class="detail-section">
                <h3>Deskripsi</h3>
                <div class="description-box">
                    ${data.description || 'Tidak ada deskripsi'}
                </div>
            </div>
            
            ${data.photoBase64 && data.photoBase64.length > 0 ? `
            <div class="detail-section">
                <h3>Foto Bukti (${data.photoBase64.length})</h3>
                <div class="photo-gallery-admin">
                    ${data.photoBase64.map((photo, index) => `
                        <div class="admin-photo-item">
                            <img src="${photo}" alt="Foto bukti ${index + 1}" onclick="openAdminPhotoModal('${photo}')">
                            <span class="photo-number">${index + 1}</span>
                        </div>
                    `).join('')}
                </div>
            </div>
            ` : ''}
            
            <div class="modal-actions">
                <button class="btn btn-primary" onclick="closeAdminModal()">Tutup</button>
                <button class="btn btn-success" onclick="updateIssueStatus('${issueId}')">Update Status</button>
            </div>
        </div>
    `;
    
    document.getElementById('modalTitle').textContent = 'Detail Laporan';
    document.getElementById('modalBody').innerHTML = modalContent;
    document.getElementById('adminModal').style.display = 'flex';
}

function closeAdminModal() {
    document.getElementById('adminModal').style.display = 'none';
}

function openAdminPhotoModal(photoBase64) {
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
    
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.remove();
        }
    });
}

// ===== HELPER FUNCTIONS =====
function getIssueTypeLabel(type) {
    const types = {
        'trash': 'Sampah Liar',
        'water': 'Polusi Air', 
        'facility': 'Kerusakan Fasilitas',
        'tree': 'Pohon Tumbang'
    };
    return types[type] || type || 'Tidak Diketahui';
}

function getStatusLabel(status) {
    const statuses = {
        'new': 'Baru',
        'in-progress': 'Sedang Diproses',
        'completed': 'Selesai'
    };
    return statuses[status] || status || 'Tidak Diketahui';
}

function getStatusClass(status) {
    switch(status) {
        case 'completed': return 'status-completed';
        case 'in-progress': return 'status-in-progress';
        case 'new': return 'status-new';
        default: return 'status-unknown';
    }
}

function showAdminMessage(message, type = 'info') {
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
    messageDiv.innerHTML = `<div style="display: flex; align-items: center; gap: 10px;">
        <i class="fas fa-${type === 'success' ? 'check' : type === 'error' ? 'exclamation-triangle' : 'info'}"></i>
        <span>${message}</span>
    </div>`;
    
    document.body.appendChild(messageDiv);
    
    setTimeout(() => {
        if (messageDiv.parentNode) {
            messageDiv.parentNode.removeChild(messageDiv);
        }
    }, 4000);
}

// ===== TAB FUNCTIONALITY =====
function setupTabHandlers() {
    document.querySelectorAll('.admin-tab').forEach(tab => {
        tab.addEventListener('click', function() {
            // Remove active class from all tabs
            document.querySelectorAll('.admin-tab').forEach(t => t.classList.remove('active'));
            // Hide all tab content
            document.querySelectorAll('.admin-tab-content').forEach(c => c.style.display = 'none');

            // Add active class to clicked tab
            this.classList.add('active');
            const tabId = this.getAttribute('data-tab');
            const targetTab = document.getElementById(`${tabId}-tab`);
            
            if (targetTab) {
                targetTab.style.display = 'block';
            }
            
            // Load analytics if analytics tab is clicked
            if (tabId === 'analytics') {
                loadAnalytics();
            }
        });
    });
}

// ===== LOGOUT FUNCTION =====
function setupLogoutButton() {
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', function() {
            if (confirm('Apakah Anda yakin ingin keluar?')) {
                firebase.auth().signOut().then(() => {
                    console.log('User signed out');
                    window.location.href = 'admin-login.html';
                }).catch((error) => {
                    console.error('Sign out error:', error);
                });
            }
        });
    }
}

// ===== ANALYTICS FUNCTIONS =====
async function loadAnalytics() {
    try {
        console.log("📈 Loading analytics data...");
        showAnalyticsLoading();
        
        const querySnapshot = await db.collection('issues').get();
        const issues = [];
        
        querySnapshot.forEach(doc => {
            const data = doc.data();
            issues.push({ 
                id: doc.id, 
                ...data,
                createdAt: data.createdAt?.toDate() || new Date(),
                updatedAt: data.updatedAt?.toDate() || new Date()
            });
        });
        
        const analyticsData = calculateAnalytics(issues);
        updateAnalyticsUI(analyticsData);
        
        console.log("✅ Analytics loaded successfully");
        
    } catch (error) {
        console.error('❌ Error loading analytics:', error);
        showAdminMessage('Gagal memuat data analitik: ' + error.message, 'error');
        showAnalyticsError();
    }
}

function calculateAnalytics(issues) {
    const totalReports = issues.length;
    const completedReports = issues.filter(issue => issue.status === 'completed').length;
    const inProgressReports = issues.filter(issue => issue.status === 'in-progress').length;
    const newReports = issues.filter(issue => issue.status === 'new' || !issue.status).length;
    
    // Completion rate
    const completionRate = totalReports > 0 ? 
        Math.round((completedReports / totalReports) * 100) : 0;
    
    // Average resolution time (dalam jam)
    const avgResolutionHours = calculateAverageResolution(issues);
    const avgResolution = avgResolutionHours > 0 ? 
        `${Math.round(avgResolutionHours)} jam` : 'N/A';
    
    // Current month statistics
    const currentDate = new Date();
    const currentMonth = currentDate.getMonth();
    const currentYear = currentDate.getFullYear();
    
    const monthlyReports = issues.filter(issue => {
        const issueDate = new Date(issue.createdAt);
        return issueDate.getMonth() === currentMonth && 
               issueDate.getFullYear() === currentYear;
    }).length;
    
    const resolvedThisMonth = issues.filter(issue => {
        if (issue.status !== 'completed') return false;
        const issueDate = new Date(issue.updatedAt || issue.createdAt);
        return issueDate.getMonth() === currentMonth && 
               issueDate.getFullYear() === currentYear;
    }).length;
    
    const resolutionRate = monthlyReports > 0 ? 
        Math.round((resolvedThisMonth / monthlyReports) * 100) : 0;
    
    // Issue type distribution
    const issueTypes = {
        'trash': issues.filter(issue => issue.type === 'trash').length,
        'water': issues.filter(issue => issue.type === 'water').length,
        'facility': issues.filter(issue => issue.type === 'facility').length,
        'tree': issues.filter(issue => issue.type === 'tree').length,
        'other': issues.filter(issue => !issue.type || 
                 !['trash', 'water', 'facility', 'tree'].includes(issue.type)).length
    };
    
    return {
        totalReports,
        completedReports,
        inProgressReports,
        newReports,
        completionRate,
        avgResolution,
        monthlyReports,
        resolvedThisMonth,
        resolutionRate,
        issueTypes
    };
}

function calculateAverageResolution(issues) {
    const completedIssues = issues.filter(issue => 
        issue.status === 'completed' && issue.createdAt && issue.updatedAt
    );
    
    if (completedIssues.length === 0) return 0;
    
    let totalHours = 0;
    completedIssues.forEach(issue => {
        const created = new Date(issue.createdAt);
        const updated = new Date(issue.updatedAt || issue.createdAt);
        
        const diffHours = (updated - created) / (1000 * 60 * 60);
        totalHours += Math.max(diffHours, 0);
    });
    
    return Math.round(totalHours / completedIssues.length);
}

function updateAnalyticsUI(data) {
    // Update summary stats
    safeUpdateElement('totalReports', data.totalReports);
    safeUpdateElement('avgResolution', data.avgResolution);
    safeUpdateElement('completionRate', data.completionRate + '%');
    safeUpdateElement('monthlyReports', data.monthlyReports);
    safeUpdateElement('resolvedThisMonth', data.resolvedThisMonth);
    safeUpdateElement('resolutionRate', data.resolutionRate + '%');
    
    // Update status distribution
    safeUpdateElement('newReports', data.newReports);
    safeUpdateElement('inProgressReports', data.inProgressReports);
    safeUpdateElement('completedReports', data.completedReports);
    
    // Update chart with real data
    updateChartWithData(data.issueTypes, data.totalReports);
    
    // Update trend stats
    updateTrendStats(data);
    
    hideAnalyticsLoading();
}

function updateChartWithData(issueTypes, totalReports) {
    const chartBars = document.querySelectorAll('.chart-bar-enhanced');
    const types = ['trash', 'water', 'facility', 'tree', 'other'];
    const labels = ['Sampah Liar', 'Polusi Air', 'Kerusakan Fasilitas', 'Pohon Tumbang', 'Lainnya'];
    const colors = [
        'linear-gradient(135deg, #10B981 0%, #34D399 100%)',
        'linear-gradient(135deg, #3B82F6 0%, #60A5FA 100%)',
        'linear-gradient(135deg, #F59E0B 0%, #FBBF24 100%)',
        'linear-gradient(135deg, #8B5CF6 0%, #A78BFA 100%)',
        'linear-gradient(135deg, #6B7280 0%, #9CA3AF 100%)'
    ];
    
    // Find maximum count for scaling
    const maxCount = Math.max(...Object.values(issueTypes));
    
    chartBars.forEach((bar, index) => {
        if (index < types.length) {
            const type = types[index];
            const count = issueTypes[type] || 0;
            const percentage = maxCount > 0 ? (count / maxCount) * 80 + 20 : 20;
            
            // Update bar appearance
            bar.style.height = percentage + '%';
            bar.style.background = colors[index];
            bar.setAttribute('data-label', labels[index]);
            bar.setAttribute('data-count', count);
            
            // Add tooltip
            bar.title = `${labels[index]}: ${count} laporan (${Math.round((count / totalReports) * 100)}%)`;
        }
    });
}

function updateTrendStats(data) {
    const trendStats = document.querySelector('.trend-stats');
    if (trendStats) {
        trendStats.innerHTML = `
            <div class="trend-item">
                <div class="trend-value" style="color: var(--primary);">${data.monthlyReports}</div>
                <div class="trend-label">Laporan Bulan Ini</div>
                <div class="progress-bar">
                    <div class="progress-fill" style="width: ${Math.min((data.monthlyReports / 50) * 100, 100)}%"></div>
                </div>
            </div>
            <div class="trend-item">
                <div class="trend-value" style="color: var(--success);">${data.resolvedThisMonth}</div>
                <div class="trend-label">Diselesaikan</div>
                <div class="progress-bar">
                    <div class="progress-fill" style="width: ${data.monthlyReports > 0 ? (data.resolvedThisMonth / data.monthlyReports) * 100 : 0}%"></div>
                </div>
            </div>
            <div class="trend-item">
                <div class="trend-value" style="color: var(--secondary);">${data.resolutionRate}%</div>
                <div class="trend-label">Tingkat Resolusi</div>
                <div class="progress-bar">
                    <div class="progress-fill" style="width: ${data.resolutionRate}%"></div>
                </div>
            </div>
        `;
    }
}

// ===== SETTINGS STATISTICS FUNCTIONS =====
async function updateKecamatanStats() {
    try {
        console.log("📊 Updating kecamatan statistics...");
        
        const snapshot = await db.collection('issues').get();
        const totalReports = snapshot.size;
        
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        const todayReports = snapshot.docs.filter(doc => {
            const issueDate = doc.data().createdAt?.toDate();
            return issueDate && issueDate >= today;
        }).length;
        
        // Hitung statistik per kecamatan (simulasi)
        const kecamatanReports = {};
        const kecamatanList = [
            "Ujung Bulu", "Ujung Loe", "Gantarang", "Kindang", "Bonto Bahari",
            "Bontotiro", "Hero Lange-Lange", "Kajang", "Bulukumpa", "Rilau Ale"
        ];
        
        // Simulasi data kecamatan (dalam real app, ini harus disimpan di Firestore)
        kecamatanList.forEach(kecamatan => {
            kecamatanReports[kecamatan] = Math.floor(Math.random() * 15) + 1;
        });
        
        const activeKecamatan = Object.values(kecamatanReports).filter(count => count > 0).length;
        const avgPerKecamatan = Math.round(totalReports / kecamatanList.length);
        
        const statsContainer = document.getElementById('kecamatanStats');
        if (statsContainer) {
            statsContainer.innerHTML = `
                <div class="stat-item-small">
                    <span class="stat-label-small">Total Kecamatan:</span>
                    <span class="stat-value-small">${kecamatanList.length}</span>
                </div>
                <div class="stat-item-small">
                    <span class="stat-label-small">Kecamatan Aktif:</span>
                    <span class="stat-value-small">${activeKecamatan}</span>
                </div>
                <div class="stat-item-small">
                    <span class="stat-label-small">Total Laporan:</span>
                    <span class="stat-value-small">${totalReports}</span>
                </div>
                <div class="stat-item-small">
                    <span class="stat-label-small">Laporan Hari Ini:</span>
                    <span class="stat-value-small">${todayReports}</span>
                </div>
                <div class="stat-item-small">
                    <span class="stat-label-small">Rata-rata per Kecamatan:</span>
                    <span class="stat-value-small">${avgPerKecamatan}</span>
                </div>
            `;
        }
        
        showAdminMessage('Statistik wilayah berhasil diperbarui!', 'success');
        
    } catch (error) {
        console.error('Error updating kecamatan stats:', error);
        showAdminMessage('Gagal memperbarui statistik: ' + error.message, 'error');
    }
}

// ===== HELPER FUNCTIONS =====
function safeUpdateElement(elementId, value) {
    const element = document.getElementById(elementId);
    if (element) {
        element.textContent = value;
    } else {
        console.warn(`Element with id '${elementId}' not found`);
    }
}

function showAnalyticsLoading() {
    const analyticsCards = document.querySelectorAll('.analytics-card');
    analyticsCards.forEach(card => {
        const content = card.querySelector('.analytics-stats, .chart-container, .trend-container, .status-distribution');
        if (content) {
            content.style.opacity = '0.5';
        }
    });
}

function hideAnalyticsLoading() {
    const analyticsCards = document.querySelectorAll('.analytics-card');
    analyticsCards.forEach(card => {
        const content = card.querySelector('.analytics-stats, .chart-container, .trend-container, .status-distribution');
        if (content) {
            content.style.opacity = '1';
        }
    });
}

function showAnalyticsError() {
    const analyticsContainer = document.getElementById('analytics-tab');
    if (analyticsContainer) {
        const errorDiv = document.createElement('div');
        errorDiv.className = 'analytics-error';
        errorDiv.innerHTML = `
            <div style="text-align: center; padding: 2rem; color: var(--danger);">
                <i class="fas fa-exclamation-triangle fa-2x" style="margin-bottom: 1rem;"></i>
                <p>Gagal memuat data analitik</p>
                <button class="btn btn-outline btn-sm" onclick="loadAnalytics()">
                    <i class="fas fa-redo"></i> Coba Lagi
                </button>
            </div>
        `;
        analyticsContainer.appendChild(errorDiv);
    }
}

// ===== INITIALIZATION =====
function initializeEventListeners() {
    console.log("🔄 Initializing event listeners...");
    
    // Refresh Button
    const refreshBtn = document.getElementById('refreshData');
    if (refreshBtn) {
        refreshBtn.addEventListener('click', handleRefresh);
    }
    
    // Export Button
    const exportBtn = document.getElementById('exportData');
    if (exportBtn) {
        exportBtn.addEventListener('click', handleExport);
    }
    
    // Tab Handlers
    setupTabHandlers();
    
    // Settings - Kecamatan Stats Button
    const updateStatsBtn = document.querySelector('button[onclick="updateKecamatanStats()"]');
    if (updateStatsBtn) {
        // Remove existing onclick and add proper event listener
        updateStatsBtn.removeAttribute('onclick');
        updateStatsBtn.addEventListener('click', updateKecamatanStats);
    }
    
    console.log("✅ All event listeners initialized");
}

// Update tab handler untuk load analytics
function setupTabHandlers() {
    document.querySelectorAll('.admin-tab').forEach(tab => {
        tab.addEventListener('click', function() {
            document.querySelectorAll('.admin-tab').forEach(t => t.classList.remove('active'));
            document.querySelectorAll('.admin-tab-content').forEach(c => {
                c.classList.remove('active');
                c.style.display = 'none';
            });

            this.classList.add('active');
            const tabId = this.getAttribute('data-tab');
            const targetTab = document.getElementById(`${tabId}-tab`);
            
            if (targetTab) {
                targetTab.classList.add('active');
                targetTab.style.display = 'block';
            }
            
            // Load analytics when analytics tab is clicked
            if (tabId === 'analytics') {
                loadAnalytics();
            }
            
            // Update kecamatan stats when settings tab is clicked
            if (tabId === 'settings') {
                updateKecamatanStats();
            }
        });
    });
}

// Make functions global
window.loadAnalytics = loadAnalytics;
window.updateKecamatanStats = updateKecamatanStats;


// ===== PASSWORD CHANGE =====
function setupPasswordChange() {
    const changePasswordBtn = document.getElementById('changePassword');
    if (changePasswordBtn) {
        changePasswordBtn.addEventListener('click', function() {
            const newPassword = prompt('Masukkan password baru:');
            if (newPassword && newPassword.length >= 6) {
                const user = firebase.auth().currentUser;
                
                user.updatePassword(newPassword).then(() => {
                    showAdminMessage('Password berhasil diubah!', 'success');
                }).catch((error) => {
                    console.error('Error changing password:', error);
                    showAdminMessage('Gagal mengubah password: ' + error.message, 'error');
                });
            } else if (newPassword) {
                alert('Password harus minimal 6 karakter!');
            }
        });
    }
}

// ===== INITIALIZATION =====
// ===== INITIALIZATION =====
document.addEventListener('DOMContentLoaded', function() {
    console.log("🚀 Initializing admin panel...");
    
    // Setup semua event listeners
    setupRefreshButton();
    setupExportButton();
    setupTabHandlers();
    setupLogoutButton();
    setupPasswordChange();
    
    // TAMBAHKAN INI: Initialize filters
    initializeAdminFilters();
    
    // Add clear filter button
    addClearFilterButton();
    
    console.log("✅ Admin panel initialized");
});

// Make functions global
window.viewIssue = viewIssue;
window.updateIssueStatus = updateIssueStatus;
window.deleteIssue = deleteIssue;
window.closeAdminModal = closeAdminModal;
window.openAdminPhotoModal = openAdminPhotoModal;
window.loadAnalytics = loadAnalytics;

console.log("Admin panel functions loaded");