// admin-app.js - Versi dengan Firebase

// Check authentication
firebase.auth().onAuthStateChanged((user) => {
    if (!user) {
        window.location.href = 'admin-login.html';
    } else {
        document.getElementById('adminUsername').textContent = user.email.split('@')[0];
        loadAdminIssues();
    }
});

// Load issues from Firebase
async function loadAdminIssues() {
    try {
        const tableBody = document.getElementById('issuesTableBody');
        tableBody.innerHTML = '<tr><td colspan="7" class="loading">Memuat laporan...</td></tr>';
        
        const querySnapshot = await db.collection('issues')
            .orderBy('createdAt', 'desc')
            .get();
        
        tableBody.innerHTML = '';
        
        let totalReports = 0;
        let newReports = 0;
        let inProgressReports = 0;
        let completedReports = 0;
        
        querySnapshot.forEach((doc) => {
            const issue = { id: doc.id, ...doc.data() };
            displayIssueInTable(issue);
            
            totalReports++;
            if (issue.status === 'new') newReports++;
            if (issue.status === 'in-progress') inProgressReports++;
            if (issue.status === 'completed') completedReports++;
        });
        
        // Update counts
        document.getElementById('issuesCount').textContent = totalReports;
        document.getElementById('tableInfo').textContent = `Menampilkan ${totalReports} laporan`;
        
        // Update analytics
        updateAnalytics(totalReports, newReports, inProgressReports, completedReports);
        
        if (querySnapshot.empty) {
            tableBody.innerHTML = '<tr><td colspan="7" class="no-data">Belum ada laporan</td></tr>';
        }
        
    } catch (error) {
        console.error('Error loading issues:', error);
        tableBody.innerHTML = '<tr><td colspan="7" class="error">Gagal memuat laporan</td></tr>';
    }
}

// Display issue in admin table
function displayIssueInTable(issue) {
    const tableBody = document.getElementById('issuesTableBody');
    const row = document.createElement('tr');
    row.innerHTML = `
        <td>${issue.id}</td>
        <td>${getIssueTypeLabel(issue.type)}</td>
        <td>${issue.location || 'Lokasi tidak tersedia'}</td>
        <td><span class="issue-status status-${issue.status}">${getStatusLabel(issue.status)}</span></td>
        <td>${formatDate(issue.createdAt)}</td>
        <td>${issue.reporterEmail || 'Tidak ada kontak'}</td>
        <td class="action-buttons">
            <button class="btn btn-primary btn-sm view-issue" data-id="${issue.id}">
                <i class="fas fa-eye"></i>
            </button>
            <button class="btn btn-success btn-sm update-issue" data-id="${issue.id}">
                <i class="fas ${issue.status === 'completed' ? 'fa-redo' : 'fa-check'}"></i>
            </button>
            <button class="btn btn-danger btn-sm delete-issue" data-id="${issue.id}">
                <i class="fas fa-trash"></i>
            </button>
        </td>
    `;
    tableBody.appendChild(row);
    
    // Add event listeners
    row.querySelector('.view-issue').addEventListener('click', () => {
        viewIssueDetails(issue.id);
    });
    
    row.querySelector('.update-issue').addEventListener('click', () => {
        updateIssueStatus(issue.id, issue.status);
    });
    
    row.querySelector('.delete-issue').addEventListener('click', () => {
        deleteIssue(issue.id);
    });
}

// Update issue status in Firebase
async function updateIssueStatus(issueId, currentStatus) {
    try {
        // Cycle through statuses
        const statusOrder = ['new', 'in-progress', 'completed'];
        const currentIndex = statusOrder.indexOf(currentStatus);
        const nextIndex = (currentIndex + 1) % statusOrder.length;
        const newStatus = statusOrder[nextIndex];
        
        await db.collection('issues').doc(issueId).update({
            status: newStatus,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        
        alert(`Status laporan ${issueId} diubah menjadi: ${getStatusLabel(newStatus)}`);
        loadAdminIssues();
        
    } catch (error) {
        console.error('Error updating issue:', error);
        alert('Gagal mengupdate status laporan');
    }
}

// Delete issue from Firebase
async function deleteIssue(issueId) {
    if (confirm(`Apakah Anda yakin ingin menghapus laporan ${issueId}? Tindakan ini tidak dapat dibatalkan.`)) {
        try {
            await db.collection('issues').doc(issueId).delete();
            alert(`Laporan ${issueId} telah dihapus.`);
            loadAdminIssues();
        } catch (error) {
            console.error('Error deleting issue:', error);
            alert('Gagal menghapus laporan');
        }
    }
}

// View issue details
async function viewIssueDetails(issueId) {
    try {
        const doc = await db.collection('issues').doc(issueId).get();
        
        if (!doc.exists) {
            alert('Laporan tidak ditemukan');
            return;
        }
        
        const issue = { id: doc.id, ...doc.data() };
        
        const modal = document.getElementById('adminModal');
        const modalTitle = document.getElementById('modalTitle');
        const modalBody = document.getElementById('modalBody');
        
        modalTitle.textContent = `Detail Laporan - ${issue.id}`;
        modalBody.innerHTML = `
            <div class="issue-detail">
                <div class="detail-section">
                    <h3>Informasi Laporan</h3>
                    <div class="detail-grid">
                        <div class="detail-item">
                            <label>ID Laporan:</label>
                            <span>${issue.id}</span>
                        </div>
                        <div class="detail-item">
                            <label>Judul:</label>
                            <span>${issue.title}</span>
                        </div>
                        <div class="detail-item">
                            <label>Jenis Isu:</label>
                            <span>${getIssueTypeLabel(issue.type)}</span>
                        </div>
                        <div class="detail-item">
                            <label>Status:</label>
                            <span class="issue-status status-${issue.status}">${getStatusLabel(issue.status)}</span>
                        </div>
                        <div class="detail-item">
                            <label>Lokasi:</label>
                            <span>${issue.location || 'Tidak tersedia'}</span>
                        </div>
                        <div class="detail-item">
                            <label>Email Pelapor:</label>
                            <span>${issue.reporterEmail || 'Tidak tersedia'}</span>
                        </div>
                        <div class="detail-item">
                            <label>Telepon Pelapor:</label>
                            <span>${issue.reporterPhone || 'Tidak tersedia'}</span>
                        </div>
                        <div class="detail-item">
                            <label>Koordinat:</label>
                            <span>${issue.coordinates ? `${issue.coordinates.latitude}, ${issue.coordinates.longitude}` : 'Tidak tersedia'}</span>
                        </div>
                        <div class="detail-item">
                            <label>Tanggal Lapor:</label>
                            <span>${formatDate(issue.createdAt)}</span>
                        </div>
                    </div>
                </div>
                
                <div class="detail-section">
                    <h3>Deskripsi Isu</h3>
                    <div class="description-box">
                        <p>${issue.description}</p>
                    </div>
                </div>
                
                ${issue.photoUrls && issue.photoUrls.length > 0 ? `
                <div class="detail-section">
                    <h3>Foto Bukti</h3>
                    <div class="photo-gallery">
                        ${issue.photoUrls.map(url => `
                            <div class="photo-item">
                                <img src="${url}" alt="Bukti foto" onclick="openPhoto('${url}')">
                            </div>
                        `).join('')}
                    </div>
                </div>
                ` : ''}
                
                <div class="detail-section">
                    <h3>Update Status</h3>
                    <div class="status-actions">
                        <select class="form-control" id="statusUpdate">
                            <option value="new" ${issue.status === 'new' ? 'selected' : ''}>Baru</option>
                            <option value="in-progress" ${issue.status === 'in-progress' ? 'selected' : ''}>Diproses</option>
                            <option value="completed" ${issue.status === 'completed' ? 'selected' : ''}>Selesai</option>
                        </select>
                        <button class="btn btn-primary" onclick="saveStatusUpdate('${issue.id}')">
                            <i class="fas fa-save"></i> Simpan Status
                        </button>
                    </div>
                </div>
            </div>
        `;
        
        modal.style.display = 'flex';
        document.body.style.overflow = 'hidden';
        
    } catch (error) {
        console.error('Error loading issue details:', error);
        alert('Gagal memuat detail laporan');
    }
}

// Save status update from modal
async function saveStatusUpdate(issueId) {
    try {
        const statusSelect = document.getElementById('statusUpdate');
        const newStatus = statusSelect.value;
        
        await db.collection('issues').doc(issueId).update({
            status: newStatus,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        
        alert(`Status laporan ${issueId} telah diubah menjadi: ${getStatusLabel(newStatus)}`);
        closeAdminModal();
        loadAdminIssues();
        
    } catch (error) {
        console.error('Error updating status:', error);
        alert('Gagal mengupdate status');
    }
}

// Update analytics data
function updateAnalytics(total, newCount, inProgress, completed) {
    document.getElementById('totalReports').textContent = total;
    document.getElementById('avgResolution').textContent = '2.5 hr';
    document.getElementById('completionRate').textContent = total > 0 ? Math.round((completed / total) * 100) + '%' : '0%';
    
    document.getElementById('monthlyReports').textContent = total;
    document.getElementById('resolvedThisMonth').textContent = completed;
    document.getElementById('resolutionRate').textContent = total > 0 ? Math.round((completed / total) * 100) + '%' : '0%';
}

// Export data to CSV
document.getElementById('exportData').addEventListener('click', async function() {
    try {
        const btn = this;
        const originalHTML = btn.innerHTML;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Mengekspor...';
        btn.disabled = true;
        
        const querySnapshot = await db.collection('issues').get();
        const issues = [];
        
        querySnapshot.forEach((doc) => {
            issues.push({ id: doc.id, ...doc.data() });
        });
        
        // Convert to CSV
        const csv = convertToCSV(issues);
        
        // Download CSV
        downloadCSV(csv, 'laporan-lingkungan.csv');
        
        btn.innerHTML = originalHTML;
        btn.disabled = false;
        alert('Data berhasil diekspor!');
        
    } catch (error) {
        console.error('Error exporting data:', error);
        alert('Gagal mengekspor data');
    }
});

// Helper function to convert to CSV
function convertToCSV(issues) {
    const headers = ['ID', 'Jenis', 'Status', 'Lokasi', 'Email Pelapor', 'Tanggal'];
    const rows = issues.map(issue => [
        issue.id,
        getIssueTypeLabel(issue.type),
        getStatusLabel(issue.status),
        issue.location,
        issue.reporterEmail || '',
        formatDate(issue.createdAt)
    ]);
    
    return [headers, ...rows].map(row => row.map(field => `"${field}"`).join(',')).join('\n');
}

// Helper function to download CSV
function downloadCSV(csv, filename) {
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    window.URL.revokeObjectURL(url);
}

// Logout
document.getElementById('logoutBtn').addEventListener('click', function() {
    if (confirm('Apakah Anda yakin ingin keluar?')) {
        firebase.auth().signOut().then(() => {
            window.location.href = 'admin-login.html';
        });
    }
});

// ... (rest of existing helper functions)