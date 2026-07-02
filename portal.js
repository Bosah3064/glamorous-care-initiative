// =============================================
// GLAMOROUS CARE INITIATIVE - MEMBER PORTAL
// Supabase Integration — Role-Based Dashboard
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
const profileRole = document.getElementById('profileRole');
const profileJoinDate = document.getElementById('profileJoinDate');
const profileAvatar = document.getElementById('profileAvatar');
const profileDetailsGrid = document.getElementById('profileDetailsGrid');
const paymentsTableBody = document.getElementById('paymentsTableBody');
const totalContributions = document.getElementById('totalContributions');
const totalPayments = document.getElementById('totalPayments');
const pendingPayments = document.getElementById('pendingPayments');

// Admin Panel
const adminPanel = document.getElementById('adminPanel');

// Global state
let currentSessionUser = null;
let currentMember = null;
let allMembers = [];

// Admin roles that can see the admin panel
const ADMIN_ROLES = ['admin', 'treasury', 'chairperson', 'vice_chairperson'];

// =============================================
// LOGIN HANDLER
// =============================================
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

// =============================================
// PASSWORD RESET HANDLER
// =============================================
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
        }

        resetPasswordFormContainer.style.display = 'none';
        await loadDashboard(currentSessionUser);
    });
}

// =============================================
// CHECK USER & LOAD DASHBOARD
// =============================================
async function checkUserAndLoadDashboard(user) {
    const { data: member, error: memberError } = await client
        .from('members')
        .select('*')
        .eq('id', user.id)
        .single();

    if (memberError) {
        console.error('Error fetching member:', memberError);
    }

    if (member && member.requires_password_reset) {
        loginFormContainer.style.display = 'none';
        resetPasswordFormContainer.style.display = 'block';
        loginView.style.display = 'block';
        dashboardView.style.display = 'none';
    } else {
        await loadDashboard(user, member);
    }
}

// =============================================
// LOAD DASHBOARD (role-aware)
// =============================================
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

    currentMember = member;

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
        
        if (profilePhone) profilePhone.textContent = member.phone || 'N/A';
        if (profileJoinDate) profileJoinDate.textContent = formatDate(member.join_date);
        
        // Generate avatar initials
        const initials = member.full_name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
        profileAvatar.textContent = initials;

        // Status badge
        profileStatus.textContent = member.status.charAt(0).toUpperCase() + member.status.slice(1);
        profileStatus.className = `status-badge status-${member.status}`;

        // Role badge — show for admin roles
        if (profileRole && member.role && member.role !== 'member') {
            const roleLabels = {
                'admin': '🛡️ Admin',
                'treasury': '💰 Treasury',
                'chairperson': '👑 Chairperson',
                'vice_chairperson': '⭐ Vice Chairperson'
            };
            profileRole.textContent = roleLabels[member.role] || member.role;
            profileRole.style.display = 'inline-block';
        }

        // Render extra form details
        if (member.form_details) {
            renderFormDetails(member.form_details);
        }

        // ===== ROLE-BASED ADMIN PANEL =====
        if (ADMIN_ROLES.includes(member.role) && adminPanel) {
            adminPanel.style.display = 'block';
            await loadAdminData();
        }
    }

    // Fetch payments for the current user
    const { data: payments, error: paymentsError } = await client
        .from('payments')
        .select('*')
        .eq('member_id', user.id)
        .order('payment_date', { ascending: false });

    renderPayments(payments || []);
}

// =============================================
// RENDER FORM DETAILS
// =============================================
function renderFormDetails(details) {
    const phoneEl = document.getElementById('profilePhone');
    const joinEl = document.getElementById('profileJoinDate');
    
    const phoneTxt = phoneEl ? phoneEl.textContent : 'N/A';
    const joinTxt = joinEl ? joinEl.textContent : 'N/A';
    
    const existingHTML = `
        <div class="detail-item">
            <i class="fa-solid fa-phone"></i>
            <div>
                <small>Phone Number</small>
                <p id="profilePhone">${phoneTxt}</p>
            </div>
        </div>
        <div class="detail-item">
            <i class="fa-solid fa-calendar"></i>
            <div>
                <small>Member Since</small>
                <p id="profileJoinDate">${joinTxt}</p>
            </div>
        </div>
    `;

    let extraHTML = '';
    
    const iconMap = {
        'id_number': 'fa-id-card',
        'branch': 'fa-building',
        'address': 'fa-location-dot',
        'occupation': 'fa-briefcase',
        'gender': 'fa-venus-mars',
        'date_of_birth': 'fa-cake-candles',
        'marital_status': 'fa-heart',
        'next_of_kin': 'fa-people-arrows',
        'dependants': 'fa-children'
    };

    for (const [key, value] of Object.entries(details)) {
        if (!value) continue;
        
        const formattedKey = key.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
        
        let icon = 'fa-list';
        for (const [kw, ic] of Object.entries(iconMap)) {
            if (key.toLowerCase().includes(kw)) {
                icon = ic;
                break;
            }
        }

        extraHTML += `
            <div class="detail-item">
                <i class="fa-solid ${icon}"></i>
                <div>
                    <small>${formattedKey}</small>
                    <p>${value}</p>
                </div>
            </div>
        `;
    }

    if (profileDetailsGrid) {
        profileDetailsGrid.innerHTML = existingHTML + extraHTML;
    }
}

// =============================================
// RENDER PAYMENTS TABLE
// =============================================
function renderPayments(payments) {
    if (!paymentsTableBody) return;

    if (payments.length === 0) {
        paymentsTableBody.innerHTML = `
            <tr>
                <td colspan="5" class="empty-state">
                    <i class="fa-solid fa-receipt"></i>
                    <p>No payment records yet.</p>
                    <small>Your payments will appear here once recorded by the Treasurer.</small>
                </td>
            </tr>
        `;
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

        return `
            <tr>
                <td>${payment.month}</td>
                <td><strong>KES ${payment.amount.toLocaleString()}</strong></td>
                <td>${formatDate(payment.payment_date)}</td>
                <td><span class="status-badge ${statusClass}"><i class="fa-solid ${statusIcon}"></i> ${payment.status.charAt(0).toUpperCase() + payment.status.slice(1)}</span></td>
                <td>${payment.reference || '—'}</td>
            </tr>
        `;
    }).join('');

    totalContributions.textContent = `KES ${totalPaid.toLocaleString()}`;
    totalPayments.textContent = paidCount.toString();
    pendingPayments.textContent = pendingCount.toString();
}

// =============================================
// ADMIN FUNCTIONS
// =============================================

// Load admin data (members list + dropdown)
async function loadAdminData() {
    const { data: members } = await client.from('members').select('*').order('full_name');
    allMembers = members || [];
    renderMembersList(allMembers);
    populateMemberDropdown(allMembers);
    setupAdminEventListeners();
}

// Render Members Directory
function renderMembersList(members) {
    const list = document.getElementById('membersList');
    if (!list) return;

    if (members.length === 0) {
        list.innerHTML = '<p style="text-align:center;color:#9ca3af;">No members found.</p>';
        return;
    }
    list.innerHTML = members.map(m => {
        const roleColors = {
            'admin': 'background: #dbeafe; color: #2563eb;',
            'treasury': 'background: #fef3c7; color: #d97706;',
            'chairperson': 'background: #f3e8ff; color: #7c3aed;',
            'vice_chairperson': 'background: #e0e7ff; color: #4f46e5;',
            'member': m.status === 'active' ? 'background: #dcfce7; color: #16a34a;' : 'background: #fef3c7; color: #d97706;'
        };
        const roleLabel = m.role === 'member' 
            ? (m.status.charAt(0).toUpperCase() + m.status.slice(1)) 
            : (m.role === 'vice_chairperson' ? 'Vice Chairperson' : m.role.charAt(0).toUpperCase() + m.role.slice(1));
        const badgeStyle = roleColors[m.role] || roleColors['member'];
        return `
            <div style="display: flex; align-items: center; justify-content: space-between; padding: 12px 15px; border: 1px solid #f3f4f6; border-radius: 10px; margin-bottom: 8px; transition: 0.2s; flex-wrap: wrap; gap: 10px; cursor: default;" onmouseover="this.style.background='#f8fafc';this.style.borderColor='var(--color-blue)'" onmouseout="this.style.background='';this.style.borderColor='#f3f4f6'">
                <div>
                    <div style="font-weight: 600;">${m.full_name}</div>
                    <div style="color: #6b7280; font-size: 0.9rem;">${m.email}${m.phone ? ' • ' + m.phone : ''}</div>
                </div>
                <span style="padding: 3px 10px; border-radius: 15px; font-size: 0.75rem; font-weight: 600; ${badgeStyle}">${roleLabel}</span>
            </div>
        `;
    }).join('');
}

// Populate Payment Member Dropdown
function populateMemberDropdown(members) {
    const select = document.getElementById('paymentMember');
    if (!select) return;
    select.innerHTML = '<option value="">— Choose a member —</option>';
    members.forEach(m => {
        select.innerHTML += `<option value="${m.id}" data-name="${m.full_name}">${m.full_name} (${m.email})</option>`;
    });
}

// Setup admin event listeners (only once)
let adminListenersAttached = false;
function setupAdminEventListeners() {
    if (adminListenersAttached) return;
    adminListenersAttached = true;

    // Member Search
    const searchInput = document.getElementById('memberSearch');
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            const query = e.target.value.toLowerCase();
            const filtered = allMembers.filter(m =>
                m.full_name.toLowerCase().includes(query) || m.email.toLowerCase().includes(query)
            );
            renderMembersList(filtered);
        });
    }

    // Add Payment Form
    const addPaymentForm = document.getElementById('addPaymentForm');
    if (addPaymentForm) {
        addPaymentForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const msgDiv = document.getElementById('paymentMsg');
            const memberSelect = document.getElementById('paymentMember');
            const selectedOption = memberSelect.options[memberSelect.selectedIndex];

            const payment = {
                member_id: memberSelect.value,
                member_name: selectedOption.getAttribute('data-name'),
                amount: parseInt(document.getElementById('paymentAmount').value),
                month: document.getElementById('paymentMonth').value,
                payment_date: document.getElementById('paymentDate').value,
                status: document.getElementById('paymentStatus').value,
                reference: document.getElementById('paymentRef').value || null,
                added_by: currentMember ? currentMember.role : 'admin'
            };

            const { error } = await client.from('payments').insert(payment);

            if (error) {
                msgDiv.className = 'admin-msg error';
                msgDiv.style.display = 'block';
                msgDiv.textContent = 'Error: ' + error.message;
            } else {
                msgDiv.className = 'admin-msg success';
                msgDiv.style.display = 'block';
                msgDiv.textContent = `✅ Payment of KES ${payment.amount} for ${payment.member_name} (${payment.month}) saved successfully!`;
                addPaymentForm.reset();
            }

            setTimeout(() => { msgDiv.style.display = 'none'; msgDiv.className = 'admin-msg'; }, 5000);
        });
    }

    // Create Member Form (Note: this requires service_role key on a backend.
    // For now, we show a placeholder message directing to the import script.)
    const addMemberForm = document.getElementById('addMemberForm');
    if (addMemberForm) {
        addMemberForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const msgDiv = document.getElementById('addMemberMsg');
            
            // Creating auth users requires the service_role key, which cannot be
            // safely used in the browser. Show an informational message.
            msgDiv.className = 'admin-msg error';
            msgDiv.style.display = 'block';
            msgDiv.textContent = 'Account creation requires server-side access. Please use the import script or contact the system administrator to add new members.';
            
            setTimeout(() => { msgDiv.style.display = 'none'; msgDiv.className = 'admin-msg'; }, 8000);
        });
    }
}

// =============================================
// HELPERS
// =============================================
function formatDate(dateStr) {
    if (!dateStr) return 'N/A';
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-KE', { year: 'numeric', month: 'short', day: 'numeric' });
}

// =============================================
// LOGOUT
// =============================================
if (logoutBtn) {
    logoutBtn.addEventListener('click', async () => {
        await client.auth.signOut();
        currentSessionUser = null;
        currentMember = null;
        dashboardView.style.display = 'none';
        loginView.style.display = 'block';
        loginFormContainer.style.display = 'block';
        resetPasswordFormContainer.style.display = 'none';
        
        // Hide admin panel
        if (adminPanel) adminPanel.style.display = 'none';
        
        // Hide role badge
        if (profileRole) profileRole.style.display = 'none';

        // Reset forms
        if (loginForm) loginForm.reset();
        if (resetPasswordForm) resetPasswordForm.reset();
        
        const submitBtn = loginForm.querySelector('button[type="submit"]');
        submitBtn.disabled = false;
        submitBtn.innerHTML = '<i class="fa-solid fa-right-to-bracket"></i> Sign In';
    });
}

// =============================================
// AUTH CHECK ON PAGE LOAD
// =============================================
async function checkAuth() {
    const { data: { session } } = await client.auth.getSession();
    if (session) {
        currentSessionUser = session.user;
        await checkUserAndLoadDashboard(session.user);
    }
}

// Fetch total members for home page
async function fetchMemberCount() {
    const countEl = document.getElementById('liveMemberCount');
    if (!countEl) return;
    
    countEl.style.display = 'block';
    
    // Call the secure database function to get the count without exposing member data
    const { data: count, error } = await client.rpc('get_member_count');
        
    if (!error && count !== null) {
        countEl.innerHTML = `🎉 ${count} Happy Members!`;
    } else {
        countEl.style.display = 'none'; // hide if failed
    }
}

document.addEventListener('DOMContentLoaded', () => {
    // Fetch member count for home page
    fetchMemberCount();

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

    if (portalSection && portalSection.classList.contains('active')) {
        checkAuth();
    }
});
