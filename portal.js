// =============================================
// GLAMOROUS CARE INITIATIVE - MEMBER PORTAL
// Supabase Integration
// =============================================

const SUPABASE_URL = 'https://wbprrsuhkmdreuzhzmkq.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndicHJyc3Voa21kcmV1emh6bWtxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODMwMTAwMDYsImV4cCI6MjA5ODU4NjAwNn0.UI-hCP649fmYMV8Srnv0ARbG3Lvdgd260bcJ0RUt0N8';

// Initialize Supabase client
const client = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// DOM Elements
const loginView = document.getElementById('portalLogin');
const dashboardView = document.getElementById('portalDashboard');
const loginForm = document.getElementById('loginForm');
const loginError = document.getElementById('loginError');
const logoutBtn = document.getElementById('logoutBtn');
const loginFormContainer = document.getElementById('loginFormContainer');

// Password Reset Elements
const resetPasswordFormContainer = document.getElementById('resetPasswordFormContainer');
const resetPasswordForm = document.getElementById('resetPasswordForm');
const resetError = document.getElementById('resetError');

// Dashboard Elements
const profileName = document.getElementById('profileName');
const profileEmail = document.getElementById('profileEmail');
const profilePhone = document.getElementById('profilePhone');
const profileStatus = document.getElementById('profileStatus');
const profileJoinDate = document.getElementById('profileJoinDate');
const profileAvatar = document.getElementById('profileAvatar');
const profileDetailsGrid = document.getElementById('profileDetailsGrid');
const paymentsTableBody = document.getElementById('paymentsTableBody');
const totalContributions = document.getElementById('totalContributions');
const totalPayments = document.getElementById('totalPayments');
const pendingPayments = document.getElementById('pendingPayments');

// Global state
let currentSessionUser = null;

// Login Handler
if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('loginEmail').value;
        const password = document.getElementById('loginPassword').value;
        const submitBtn = loginForm.querySelector('button[type="submit"]');
        
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Signing in...';
        loginError.style.display = 'none';

        const { data, error } = await client.auth.signInWithPassword({
            email: email,
            password: password
        });

        if (error) {
            loginError.textContent = error.message;
            loginError.style.display = 'block';
            submitBtn.disabled = false;
            submitBtn.innerHTML = '<i class="fa-solid fa-right-to-bracket"></i> Sign In';
        } else {
            currentSessionUser = data.user;
            await checkUserAndLoadDashboard(data.user);
        }
    });
}

// Password Reset Handler
if (resetPasswordForm) {
    resetPasswordForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const newPassword = document.getElementById('newPassword').value;
        const confirmNewPassword = document.getElementById('confirmNewPassword').value;
        const submitBtn = resetPasswordForm.querySelector('button[type="submit"]');

        resetError.style.display = 'none';

        if (newPassword !== confirmNewPassword) {
            resetError.textContent = 'Passwords do not match.';
            resetError.style.display = 'block';
            return;
        }

        if (newPassword.length < 6) {
            resetError.textContent = 'Password must be at least 6 characters.';
            resetError.style.display = 'block';
            return;
        }

        submitBtn.disabled = true;
        submitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Updating...';

        // Update auth password
        const { error: authError } = await client.auth.updateUser({
            password: newPassword
        });

        if (authError) {
            resetError.textContent = authError.message;
            resetError.style.display = 'block';
            submitBtn.disabled = false;
            submitBtn.innerHTML = '<i class="fa-solid fa-shield-halved"></i> Save & Continue';
            return;
        }

        // Update member flag in db
        const { error: dbError } = await client
            .from('members')
            .update({ requires_password_reset: false })
            .eq('id', currentSessionUser.id);

        if (dbError) {
            console.error('Failed to update member reset flag:', dbError);
            // Non-critical, let them through
        }

        resetPasswordFormContainer.style.display = 'none';
        await loadDashboard(currentSessionUser);
    });
}

// Check if user requires password reset, else load dashboard
async function checkUserAndLoadDashboard(user) {
    // Fetch member profile to check reset flag
    const { data: member, error: memberError } = await client
        .from('members')
        .select('*')
        .eq('id', user.id)
        .single();

    if (memberError) {
        console.error('Error fetching member:', memberError);
    }

    if (member && member.requires_password_reset) {
        // Show forced reset form
        loginFormContainer.style.display = 'none';
        resetPasswordFormContainer.style.display = 'block';
        loginView.style.display = 'block';
        dashboardView.style.display = 'none';
    } else {
        await loadDashboard(user, member);
    }
}

// Load Dashboard
async function loadDashboard(user, preloadedMember = null) {
    loginView.style.display = 'none';
    dashboardView.style.display = 'block';

    let member = preloadedMember;
    
    if (!member) {
        const { data, error } = await client
            .from('members')
            .select('*')
            .eq('id', user.id)
            .single();
        member = data;
    }

    if (!member) {
        profileName.textContent = user.email;
        profileEmail.textContent = user.email;
        if (profilePhone) profilePhone.textContent = 'N/A';
        profileStatus.textContent = 'New';
        profileStatus.className = 'status-badge status-probation';
        if (profileJoinDate) profileJoinDate.textContent = 'N/A';
    } else {
        profileName.textContent = member.full_name;
        profileEmail.textContent = member.email;
        
        // Ensure static elements are updated initially
        if (profilePhone) profilePhone.textContent = member.phone || 'N/A';
        if (profileJoinDate) profileJoinDate.textContent = formatDate(member.join_date);
        
        // Generate avatar initials
        const initials = member.full_name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
        profileAvatar.textContent = initials;

        // Status badge
        profileStatus.textContent = member.status.charAt(0).toUpperCase() + member.status.slice(1);
        profileStatus.className = \`status-badge status-\${member.status}\`;

        // Render extra form details if they exist
        if (member.form_details) {
            renderFormDetails(member.form_details);
        }
    }

    // Fetch payments
    const { data: payments, error: paymentsError } = await client
        .from('payments')
        .select('*')
        .eq('member_id', user.id)
        .order('payment_date', { ascending: false });

    // Render payments table
    renderPayments(payments || []);
}

function renderFormDetails(details) {
    // Keep Phone and Joined Date which are static in HTML, but append new ones
    // First, save the existing static HTML elements so we can restore them and append new ones
    
    const phoneEl = document.getElementById('profilePhone');
    const joinEl = document.getElementById('profileJoinDate');
    
    const phoneTxt = phoneEl ? phoneEl.textContent : 'N/A';
    const joinTxt = joinEl ? joinEl.textContent : 'N/A';
    
    // Instead of replacing the whole grid, we'll selectively append
    const existingHTML = \`
        <div class="detail-item">
            <i class="fa-solid fa-phone"></i>
            <div>
                <small>Phone Number</small>
                <p id="profilePhone">\${phoneTxt}</p>
            </div>
        </div>
        <div class="detail-item">
            <i class="fa-solid fa-calendar"></i>
            <div>
                <small>Member Since</small>
                <p id="profileJoinDate">\${joinTxt}</p>
            </div>
        </div>
    \`;

    let extraHTML = '';
    
    // Map of known form fields to icons
    const iconMap = {
        'id_number': 'fa-id-card',
        'branch': 'fa-building',
        'address': 'fa-location-dot',
        'occupation': 'fa-briefcase',
        'gender': 'fa-venus-mars',
        'date_of_birth': 'fa-cake-candles'
    };

    for (const [key, value] of Object.entries(details)) {
        if (!value) continue;
        
        // Format key from "id_number" to "ID Number"
        const formattedKey = key.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
        
        // Guess an icon based on key name, fallback to a list icon
        let icon = 'fa-list';
        for (const [kw, ic] of Object.entries(iconMap)) {
            if (key.toLowerCase().includes(kw)) {
                icon = ic;
                break;
            }
        }

        extraHTML += \`
            <div class="detail-item">
                <i class="fa-solid \${icon}"></i>
                <div>
                    <small>\${formattedKey}</small>
                    <p>\${value}</p>
                </div>
            </div>
        \`;
    }

    if (profileDetailsGrid) {
        profileDetailsGrid.innerHTML = existingHTML + extraHTML;
    }
}

// Render Payments Table
function renderPayments(payments) {
    if (!paymentsTableBody) return;

    if (payments.length === 0) {
        paymentsTableBody.innerHTML = \`
            <tr>
                <td colspan="5" class="empty-state">
                    <i class="fa-solid fa-receipt"></i>
                    <p>No payment records yet.</p>
                    <small>Your payments will appear here once recorded by the Treasurer.</small>
                </td>
            </tr>
        \`;
        totalContributions.textContent = 'KES 0';
        totalPayments.textContent = '0';
        pendingPayments.textContent = '0';
        return;
    }

    let totalPaid = 0;
    let paidCount = 0;
    let pendingCount = 0;

    paymentsTableBody.innerHTML = payments.map(payment => {
        if (payment.status === 'paid') {
            totalPaid += payment.amount;
            paidCount++;
        } else {
            pendingCount++;
        }

        const statusClass = payment.status === 'paid' ? 'status-active' :
                           payment.status === 'pending' ? 'status-probation' : 'status-suspended';
        const statusIcon = payment.status === 'paid' ? 'fa-circle-check' :
                          payment.status === 'pending' ? 'fa-clock' : 'fa-triangle-exclamation';

        return \`
            <tr>
                <td>\${payment.month}</td>
                <td><strong>KES \${payment.amount.toLocaleString()}</strong></td>
                <td>\${formatDate(payment.payment_date)}</td>
                <td><span class="status-badge \${statusClass}"><i class="fa-solid \${statusIcon}"></i> \${payment.status.charAt(0).toUpperCase() + payment.status.slice(1)}</span></td>
                <td>\${payment.reference || '—'}</td>
            </tr>
        \`;
    }).join('');

    totalContributions.textContent = \`KES \${totalPaid.toLocaleString()}\`;
    totalPayments.textContent = paidCount.toString();
    pendingPayments.textContent = pendingCount.toString();
}

// Format date helper
function formatDate(dateStr) {
    if (!dateStr) return 'N/A';
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-KE', { year: 'numeric', month: 'short', day: 'numeric' });
}

// Logout Handler
if (logoutBtn) {
    logoutBtn.addEventListener('click', async () => {
        await client.auth.signOut();
        currentSessionUser = null;
        dashboardView.style.display = 'none';
        loginView.style.display = 'block';
        loginFormContainer.style.display = 'block';
        resetPasswordFormContainer.style.display = 'none';
        
        // Reset forms
        if (loginForm) loginForm.reset();
        if (resetPasswordForm) resetPasswordForm.reset();
        
        const submitBtn = loginForm.querySelector('button[type="submit"]');
        submitBtn.disabled = false;
        submitBtn.innerHTML = '<i class="fa-solid fa-right-to-bracket"></i> Sign In';
    });
}

// Check if user is already logged in on page load
async function checkAuth() {
    const { data: { session } } = await client.auth.getSession();
    if (session) {
        currentSessionUser = session.user;
        await checkUserAndLoadDashboard(session.user);
    }
}

// Run auth check when portal page becomes visible
document.addEventListener('DOMContentLoaded', () => {
    // Watch for portal section becoming active
    const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
            if (mutation.target.id === 'portal' && mutation.target.classList.contains('active')) {
                checkAuth();
            }
        });
    });

    const portalSection = document.getElementById('portal');
    if (portalSection) {
        observer.observe(portalSection, { attributes: true, attributeFilter: ['class'] });
    }

    // Also check on initial load if portal is active
    if (portalSection && portalSection.classList.contains('active')) {
        checkAuth();
    }
});
