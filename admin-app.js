// admin-app.js - FIXED VERSION
console.log("=== ADMIN PANEL - FIXED VERSION ===");

// Initialize Firebase (pastikan ini sudah ada di file lain atau tambahkan di sini)
// Pastikan db sudah didefinisikan sebelumnya

// Check if user is logged in
firebase.auth().onAuthStateChanged((user) => {
    console.log("Auth state changed:", user);
    if (!user) {
        console.log("No user, redirecting to login");
        window.location.href = 'admin-login.html';
    } else {
        console.log("User is logged in:", user.email);
        showAdminPanel();
        loadIssues();
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

// Load issues function
async function loadIssues() {
    console.log("Loading issues...");
    
    try {
        const tableBody = document.getElementById('issuesTableBody');
        if (!tableBody) {
            console.error("Table body element not found!");
            return;
        }
        
        tableBody.innerHTML = '<tr><td colspan="7">Loading data...</td></tr>';
        
        // Pastikan db sudah terdefinisi
        if (typeof db === 'undefined') {
            console.error("Firestore db is not defined!");
            tableBody.innerHTML = '<tr><td colspan="7">Database connection error</td></tr>';
            return;
        }
        
        const snapshot = await db.collection('issues').orderBy('createdAt', 'desc').get();
        console.log("Got snapshot:", snapshot.size, "documents");
        
        tableBody.innerHTML = '';
        
        if (snapshot.empty) {
            tableBody.innerHTML = '<tr><td colspan="7">No issues found</td></tr>';
            return;
        }
        
        snapshot.forEach((doc) => {
            const data = doc.data();
            console.log("Issue data:", data);
            
            const row = document.createElement('tr');
            
            // Add status-based class for styling
            const statusClass = getStatusClass(data.status || 'new');
            row.className = statusClass;
            
            row.innerHTML = `
                <td>${doc.id.substring(0, 8)}...</td>
                <td>${data.type || 'Unknown'}</td>
                <td>${data.location || 'No location'}</td>
                <td><span class="status-badge status-${data.status || 'new'}">${data.status || 'new'}</span></td>
                <td>${data.createdAt ? data.createdAt.toDate().toLocaleDateString() : 'Unknown'}</td>
                <td>${data.reporterEmail || 'No email'}</td>
                <td>
                    <button class="btn btn-sm btn-primary" onclick="viewIssue('${doc.id}')">View</button>
                    <button class="btn btn-sm btn-success" onclick="updateStatus('${doc.id}')">Edit</button>
                    <button class="btn btn-sm btn-danger" onclick="deleteIssue('${doc.id}')">Delete</button>
                </td>
            `;
            tableBody.appendChild(row);
        });
        
    } catch (error) {
        console.error("Error loading issues:", error);
        const tableBody = document.getElementById('issuesTableBody');
        if (tableBody) {
            tableBody.innerHTML = '<tr><td colspan="7">Error loading data: ' + error.message + '</td></tr>';
        }
    }
}

// Helper function for status styling
function getStatusClass(status) {
    switch(status) {
        case 'completed': return 'status-completed';
        case 'in-progress': return 'status-in-progress';
        case 'new': return 'status-new';
        default: return 'status-unknown';
    }
}

// View issue function - improved with modal
async function viewIssue(issueId) {
    console.log("Viewing issue:", issueId);
    try {
        const doc = await db.collection('issues').doc(issueId).get();
        if (doc.exists) {
            const data = doc.data();
            
            // Create a more detailed view
            const details = `
ISSUE DETAILS:

ID: ${issueId}
Type: ${data.type || 'Unknown'}
Status: ${data.status || 'new'}
Location: ${data.location || 'No location'}
Description: ${data.description || 'No description'}
Email: ${data.reporterEmail || 'No email'}
Phone: ${data.reporterPhone || 'No phone'}
Created: ${data.createdAt ? data.createdAt.toDate().toLocaleString() : 'Unknown'}
Updated: ${data.updatedAt ? data.updatedAt.toDate().toLocaleString() : 'Never'}
            `;
            
            alert(details);
        } else {
            alert("Issue not found");
        }
    } catch (error) {
        console.error("Error viewing issue:", error);
        alert("Error loading issue details: " + error.message);
    }
}

// Update status function - improved with dropdown
async function updateStatus(issueId) {
    const newStatus = prompt(
        "Enter new status:\n\n- new\n- in-progress\n- completed", 
        "new"
    );
    
    if (newStatus && ['new', 'in-progress', 'completed'].includes(newStatus)) {
        try {
            await db.collection('issues').doc(issueId).update({
                status: newStatus,
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            });
            alert("Status updated successfully!");
            loadIssues(); // Reload the list
        } catch (error) {
            console.error("Error updating status:", error);
            alert("Error updating status: " + error.message);
        }
    } else if (newStatus) {
        alert("Invalid status! Please use: new, in-progress, or completed");
    }
}

// Delete issue function - with better confirmation
async function deleteIssue(issueId) {
    if (confirm(`Are you sure you want to delete issue ${issueId}?\n\nThis action cannot be undone!`)) {
        try {
            await db.collection('issues').doc(issueId).delete();
            alert("Issue deleted successfully!");
            loadIssues(); // Reload the list
        } catch (error) {
            console.error("Error deleting issue:", error);
            alert("Error deleting issue: " + error.message);
        }
    }
}

// Initialize event listeners when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    console.log("DOM loaded, initializing event listeners");
    
    // Logout function
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', function() {
            if (confirm("Are you sure you want to logout?")) {
                firebase.auth().signOut().then(() => {
                    console.log("User signed out");
                    window.location.href = 'admin-login.html';
                });
            }
        });
    }
    
    // Refresh function
    const refreshData = document.getElementById('refreshData');
    if (refreshData) {
        refreshData.addEventListener('click', function() {
            console.log("Refreshing data...");
            loadIssues();
        });
    }
    
    // Export function - basic implementation
    const exportData = document.getElementById('exportData');
    if (exportData) {
        exportData.addEventListener('click', async function() {
            try {
                const snapshot = await db.collection('issues').get();
                let csvContent = "ID,Type,Location,Status,Email,Created\\n";
                
                snapshot.forEach(doc => {
                    const data = doc.data();
                    csvContent += `"${doc.id}","${data.type || ''}","${data.location || ''}","${data.status || ''}","${data.reporterEmail || ''}","${data.createdAt ? data.createdAt.toDate().toISOString() : ''}"\\n`;
                });
                
                // Create download link
                const blob = new Blob([csvContent], { type: 'text/csv' });
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `issues-export-${new Date().toISOString().split('T')[0]}.csv`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                window.URL.revokeObjectURL(url);
                
                alert("Data exported successfully!");
            } catch (error) {
                console.error("Error exporting data:", error);
                alert("Error exporting data: " + error.message);
            }
        });
    }
    
    // Tab switching
    document.querySelectorAll('.admin-tab').forEach(tab => {
        tab.addEventListener('click', function() {
            // Remove active class from all tabs
            document.querySelectorAll('.admin-tab').forEach(t => t.classList.remove('active'));
            // Add active class to clicked tab
            this.classList.add('active');
            
            // Show corresponding content
            const tabId = this.getAttribute('data-tab');
            document.querySelectorAll('.admin-tab-content').forEach(content => {
                content.style.display = 'none';
            });
            
            const targetTab = document.getElementById(tabId + '-tab');
            if (targetTab) {
                targetTab.style.display = 'block';
            }
        });
    });
});

// Make functions global
window.viewIssue = viewIssue;
window.updateStatus = updateStatus;
window.deleteIssue = deleteIssue;

console.log("Admin panel initialized");