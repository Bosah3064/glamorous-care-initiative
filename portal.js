// =============================================
// GLAMOROUS CARE INITIATIVE - MEMBER PORTAL
// Supabase Integration — Role-Based Dashboard
// =============================================

const SUPABASE_URL = 'https://wbprrsuhkmdreuzhzmkq.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndicHJyc3Voa21kcmV1emh6bWtxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODMwMTAwMDYsImV4cCI6MjA5ODU4NjAwNn0.UI-hCP649fmYMV8Srnv0ARbG3Lvdgd260bcJ0RUt0N8';

// Initialize Supabase client
const client = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const bulkPaymentHelpers = window.bulkPaymentHelpers || {};

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
const totalSavings = document.getElementById('totalSavings');
const paidOutSavings = document.getElementById('paidOutSavings');
const registrationStatus = document.getElementById('registrationStatus');
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
        profileStatus.textContent = (member.status === 'approved' || member.status === 'active') ? 'Registered' : (member.status.charAt(0).toUpperCase() + member.status.slice(1));
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
        } else if (profileRole) {
            profileRole.style.display = 'none';
        }

        // Render form details directly into the main grid
        renderFormDetails(member);

        // ===== PROFILE COMPLETENESS CHECK =====
        // Uses the same resolveFieldValue + canonical keys as the save/edit logic
        const missingFields = [];
        const fd = member.form_details || {};
        const isMissing = (val) => !val || String(val).trim() === '';
        
        // Check each canonical field using the shared resolver
        if (isMissing(member.phone)) missingFields.push('<li><strong>Phone Number</strong></li>');
        if (isMissing(resolveFieldValue(fd, 'date_of_birth'))) missingFields.push('<li><strong>Date of Birth</strong></li>');
        if (isMissing(resolveFieldValue(fd, 'gender'))) missingFields.push('<li><strong>Gender</strong></li>');
        if (isMissing(resolveFieldValue(fd, 'marital_status'))) missingFields.push('<li><strong>Marital Status</strong></li>');
        if (isMissing(resolveFieldValue(fd, 'national_id_number'))) missingFields.push('<li><strong>National ID Number</strong></li>');
        if (isMissing(resolveFieldValue(fd, 'occupation'))) missingFields.push('<li><strong>Occupation / Profession</strong></li>');
        if (isMissing(resolveFieldValue(fd, 'next_of_kin_full_name'))) missingFields.push('<li><strong>Next of Kin Full Name</strong></li>');
        if (isMissing(resolveFieldValue(fd, 'next_of_kin_national_id_number'))) missingFields.push('<li><strong>Next of Kin ID Number</strong></li>');
        if (isMissing(resolveFieldValue(fd, 'next_of_kin_phone_number'))) missingFields.push('<li><strong>Next of Kin Phone Number</strong></li>');
        if (isMissing(resolveFieldValue(fd, 'relationship_to_you'))) missingFields.push('<li><strong>Relationship to Next of Kin</strong></li>');

        const alertDiv = document.getElementById('profileIncompleteAlert');
        const missingList = document.getElementById('missingFieldsList');
        if (alertDiv && missingList && missingFields.length > 0) {
            missingList.innerHTML = missingFields.join('');
            alertDiv.style.display = 'block';
        } else if (alertDiv) {
            alertDiv.style.display = 'none';
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
    // Render member-facing analytics (monthly breakdown + legend)
    try {
        renderPaymentAnalytics(payments || []);
    } catch (err) {
        console.error('Payment analytics render error:', err);
    }
    // Render virtual card and member-specific analytics
    try {
        if (typeof renderMemberPaymentsAnalytics === 'function') {
            renderMemberPaymentsAnalytics(currentMember || user, payments || []);
        } else if (typeof renderMemberVirtualCard === 'function') {
            renderMemberVirtualCard(currentMember || user, payments || []);
        }
    } catch (err) {
        console.error('Member virtual card render error:', err);
    }
}

// =============================================
// RENDER FORM DETAILS
// =============================================
function renderFormDetails(member) {
    const phoneEl = document.getElementById('profilePhone');
    const joinEl = document.getElementById('profileJoinDate');
    const grid = document.getElementById('profileDetailsGrid');
    const extraGrid = document.getElementById('extraDetailsGrid');
    const toggleBtn = document.getElementById('fullProfileToggle');
    
    if (grid) {
        grid.innerHTML = `
            <div class="detail-item">
                <i class="fa-solid fa-phone"></i>
                <div>
                    <small>Phone Number</small>
                    <p id="profilePhone">${member.phone || 'N/A'}</p>
                </div>
            </div>
            <div class="detail-item">
                <i class="fa-solid fa-calendar"></i>
                <div>
                    <small>Member Since</small>
                    <p id="profileJoinDate">${formatDate(member.join_date)}</p>
                </div>
            </div>
        `;
    }

    const details = member.form_details || {};
    
    // Use the canonical schema for rendering
    const schema = typeof buildProfileSchema === 'function' ? buildProfileSchema() : [];
    
    // Collect the fields to display
    const displayItems = [];
    
    // Add canonical schema fields
    if (schema && schema.length > 0) {
        schema.forEach(field => {
            if (field.key === 'phone') return; // Phone is already rendered above
            
            let val;
            if (field.isFieldOnMember) val = member[field.key];
            else val = typeof resolveFieldValue === 'function' ? resolveFieldValue(details, field.key) : details[field.key];
            
            if (val && String(val).trim() !== '') {
                displayItems.push({
                    label: field.label,
                    value: val,
                    key: field.key
                });
            }
        });
    } else {
        // Fallback if schema isn't loaded for some reason
        for (const [key, value] of Object.entries(details)) {
            if (!value || String(value).trim() === '') continue;
            const cleanKey = key.toLowerCase();
            if (cleanKey === 'timestamp' || cleanKey === 'column 2' || cleanKey.includes('another relative')) continue;
            
            const formattedKey = key.replace(/_/g, ' ').split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
            displayItems.push({
                label: formattedKey,
                value: value,
                key: key
            });
        }
    }

    if (displayItems.length > 0 && toggleBtn) {
        toggleBtn.style.display = 'block';
    } else if (toggleBtn) {
        toggleBtn.style.display = 'none';
    }

    let extraHTML = '';
    
    const iconMap = {
        'id_number': 'fa-id-card',
        'id number': 'fa-id-card',
        'national id': 'fa-id-card',
        'national_id_number': 'fa-id-card',
        'branch': 'fa-building',
        'address': 'fa-location-dot',
        'occupation': 'fa-briefcase',
        'profession': 'fa-briefcase',
        'gender': 'fa-venus-mars',
        'date_of_birth': 'fa-cake-candles',
        'date of birth': 'fa-cake-candles',
        'dob': 'fa-cake-candles',
        'marital': 'fa-heart',
        'next of kin': 'fa-people-arrows',
        'kin phone': 'fa-people-arrows',
        'dependants': 'fa-children',
        'dependents': 'fa-children'
    };

    displayItems.forEach(item => {
        let displayValue = item.value;
        const key = item.key;
        
        // Format date of birth professionally
        const lowerKey = key.toLowerCase();
        if (lowerKey.includes('date of birth') || lowerKey.includes('dob') || lowerKey.includes('date_of_birth')) {
            if (!isNaN(displayValue) && String(displayValue).trim() !== '') {
               const excelEpoch = new Date(1899, 11, 31);
               const dob = new Date(excelEpoch.getTime() + Number(displayValue) * 86400000);
               if (!isNaN(dob)) {
                   displayValue = dob.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
               }
            } else {
               const dob = new Date(displayValue);
               if (!isNaN(dob)) {
                   displayValue = dob.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
               }
            }
        }
        
        let icon = 'fa-list';
        const cleanKey = key.replace(/_/g, ' ').toLowerCase();
        for (const [kw, ic] of Object.entries(iconMap)) {
            if (cleanKey.includes(kw)) {
                icon = ic;
                break;
            }
        }

        extraHTML += `
            <div class="detail-item">
                <i class="fa-solid ${icon}"></i>
                <div>
                    <small>${item.label}</small>
                    <p>${displayValue}</p>
                </div>
            </div>
        `;
    });

    if (extraGrid) {
        extraGrid.innerHTML = extraHTML;
    }
}

// Toggle full profile view
window.toggleFullProfile = function() {
    const detailsDiv = document.getElementById('fullProfileDetails');
    const btn = document.getElementById('btnViewFullProfile');
    
    if (detailsDiv.style.display === 'none') {
        detailsDiv.style.display = 'block';
        btn.innerHTML = '<i class="fa-solid fa-chevron-up"></i> Hide Full Profile';
    } else {
        detailsDiv.style.display = 'none';
        btn.innerHTML = '<i class="fa-solid fa-id-card"></i> View Full Profile';
    }
}

// =============================================
// RENDER PAYMENTS TABLE
// =============================================
function renderPayments(payments) {
    if (!paymentsTableBody) return;
    paymentsTableBody.innerHTML = '';
    window.allPayments = []; // Reset stored payments

    if (!payments || payments.length === 0) {
        paymentsTableBody.innerHTML = `
            <tr>
                <td colspan="5" class="empty-state">
                    <i class="fa-solid fa-receipt"></i>
                    <p>No payment records yet.</p>
                    <small>Your payments will appear here once recorded by the Treasurer.</small>
                </td>
            </tr>
        `;
        if (totalSavings) totalSavings.textContent = 'KES 0';
        if (paidOutSavings) paidOutSavings.textContent = 'KES 0';
        if (registrationStatus) registrationStatus.textContent = 'Unpaid';
        if (pendingPayments) pendingPayments.textContent = '0';
        return;
    }

    let totalSavedAmount = 0;
    let totalPaidOutAmount = 0;
    let isRegistered = false;
    let pendingCount = 0;

    paymentsTableBody.innerHTML = payments.map(payment => {
        const status = (payment.status || '').toString().trim().toLowerCase();
        const type = (payment.payment_type || '').toString().trim().toLowerCase();
        const payoutStatus = (payment.payout_status || '').toString().trim().toLowerCase();

        if (status === 'paid') {
            if (type === 'registration') {
                isRegistered = true;
            } else if (type === 'saving' || type === '') {
                if (payoutStatus === 'paid_out') {
                    totalPaidOutAmount += parseFloat(payment.amount) || 0;
                } else {
                    totalSavedAmount += parseFloat(payment.amount) || 0;
                }
            }
        } else if (status === 'pending') {
            pendingCount++;
        }

        const statusClass = status === 'paid' ? 'status-active' :
                           status === 'pending' ? 'status-probation' : 'status-suspended';
        const statusIcon = status === 'paid' ? 'fa-circle-check' :
                          status === 'pending' ? 'fa-clock' : 'fa-triangle-exclamation';

        // Store the payment globally for the edit modal
        window.allPayments = window.allPayments || [];
        if (!window.allPayments.find(p => p.id === payment.id)) {
            window.allPayments.push(payment);
        }

        const isAdmin = ADMIN_ROLES.includes(currentMember?.role);
        const editBtn = isAdmin ? `<button onclick="openEditPaymentModal('${payment.id}')" style="background: none; border: none; color: var(--color-blue); cursor: pointer; font-size: 0.9rem;" title="Edit Payment"><i class="fa-solid fa-pen-to-square"></i></button>` : '';

        return `
            <tr>
                <td>${payment.month}</td>
                <td><strong>KES ${payment.amount.toLocaleString()}</strong><br><small style="color: #6b7280;">${payment.payment_type === 'registration' ? 'Registration' : (payment.payout_status === 'paid_out' ? 'Paid Out' : 'Saving')}</small></td>
                <td>${formatDate(payment.payment_date)}</td>
                <td><span class="status-badge ${statusClass}"><i class="fa-solid ${statusIcon}"></i> ${payment.status.charAt(0).toUpperCase() + payment.status.slice(1)}</span></td>
                <td>${payment.reference || '—'}</td>
                ${isAdmin ? `<td>${editBtn}</td>` : ''}
            </tr>
        `;
    }).join('');

    if (totalSavings) totalSavings.textContent = `KES ${totalSavedAmount.toLocaleString()}`;
    if (paidOutSavings) paidOutSavings.textContent = `KES ${totalPaidOutAmount.toLocaleString()}`;
    if (registrationStatus) {
        if (isRegistered) {
            registrationStatus.innerHTML = '<i class="fa-solid fa-circle-check"></i> Paid';
            registrationStatus.style.color = '#16a34a';
            registrationStatus.style.background = 'rgba(134, 239, 172, 0.2)';
            registrationStatus.style.border = '1px solid rgba(16, 185, 129, 0.25)';
            registrationStatus.style.padding = '4px 10px';
            registrationStatus.style.borderRadius = '999px';
        } else {
            registrationStatus.textContent = 'Unpaid';
            registrationStatus.style.color = 'var(--color-orange)';
            registrationStatus.style.background = 'transparent';
            registrationStatus.style.border = 'none';
            registrationStatus.style.padding = '';
        }
    }
    if (pendingPayments) pendingPayments.textContent = pendingCount.toString();
}

// =============================================
// ADMIN FUNCTIONS
// =============================================

// Load admin data (members list + dropdown)
async function loadAdminData() {
    const { data: members } = await client.from('members').select('*').order('full_name');
    const { data: payments } = await client.from('payments').select('*').order('payment_date', { ascending: true });
    allMembers = members || [];
    renderMembersList(allMembers, ""); // pass empty string to hide by default
    populateMemberDropdown(allMembers);
    renderPaymentAnalytics(payments || []);
    setupAdminEventListeners();
}

function renderPaymentAnalytics(payments) {
    const chartContainer = document.getElementById('paymentAnalyticsChart');
    const adjustmentsEl = document.getElementById('paymentAnalyticsAdjustments');
    const advancesEl = document.getElementById('paymentAnalyticsAdvances');
    const legendEl = document.getElementById('paymentAnalyticsLegend');

    if (!chartContainer && !adjustmentsEl && !advancesEl) return;

    const analytics = (bulkPaymentHelpers.buildMonthlyPaymentAnalytics || (() => []))(payments || []);
    const summary = (bulkPaymentHelpers.summarizeAdjustmentsAndAdvances || (() => ({ adjustmentCount: 0, adjustmentAmount: 0, advanceCount: 0, advanceAmount: 0 })))(payments || []);

    if (adjustmentsEl) {
        adjustmentsEl.textContent = `KES ${summary.adjustmentAmount.toLocaleString()}`;
    }

    if (advancesEl) {
        advancesEl.textContent = `KES ${summary.advanceAmount.toLocaleString()}`;
    }

    if (chartContainer) {
        if (!analytics.length) {
            chartContainer.innerHTML = '<p style="margin:0;color:#6b7280;">No payment history yet for analytics.</p>';
            if (legendEl) legendEl.innerHTML = '';
            return;
        }

        const size = 220;
        const radius = 72;
        const circumference = 2 * Math.PI * radius;
        const colors = ['#2563eb', '#16a34a', '#f59e0b', '#8b5cf6', '#ef4444', '#14b8a6', '#ec4899', '#0f766e', '#6366f1', '#f97316', '#64748b', '#84cc16'];
        const total = analytics.reduce((sum, item) => sum + item.amount, 0) || 1;
        let offset = 0;

        const segments = analytics.map((item, index) => {
            const segmentLength = (item.amount / total) * circumference;
            const color = colors[index % colors.length];
            const segment = `<circle cx="110" cy="110" r="${radius}" fill="none" stroke="${color}" stroke-width="34" stroke-linecap="round" stroke-dasharray="${segmentLength} ${circumference - segmentLength}" stroke-dashoffset="${-offset}" transform="rotate(-90 110 110)" />`;
            offset += segmentLength;
            return segment;
        }).join('');

        chartContainer.innerHTML = `
            <div style="display:flex; flex-direction:column; align-items:center; gap:12px;">
                <svg width="220" height="220" viewBox="0 0 220 220" aria-label="Monthly payment chart">
                    <circle cx="110" cy="110" r="${radius}" fill="none" stroke="#e5e7eb" stroke-width="34" />
                    ${segments}
                    <circle cx="110" cy="110" r="${radius - 34}" fill="white" />
                    <text x="110" y="104" text-anchor="middle" font-size="18" font-weight="700" fill="#111827">KES ${Math.round(total).toLocaleString()}</text>
                    <text x="110" y="126" text-anchor="middle" font-size="12" fill="#6b7280">Monthly total</text>
                </svg>
            </div>
        `;

        if (legendEl) {
            legendEl.innerHTML = analytics.map((item, index) => `
                <div style="display:flex; align-items:center; gap:6px; font-size:0.9rem; color:#374151;">
                    <span style="width:10px; height:10px; border-radius:999px; background:${colors[index % colors.length]};"></span>
                    <span>${item.label}</span>
                    <strong>KES ${Math.round(item.amount).toLocaleString()}</strong>
                </div>
            `).join('');
        }
    }
}

// MEMBER VIRTUAL CARD + DOWNLOAD HELPERS
function maskValue(val) {
    if (!val) return '';
    const s = String(val);
    if (s.includes('@')) {
        const parts = s.split('@');
        const name = parts[0];
        const domain = parts[1];
        if (name.length <= 2) return name[0] + '***@' + domain;
        return name[0] + '***' + name.slice(-1) + '@' + domain;
    }
    if (/^\d+$/.test(s)) {
        return s.length > 4 ? '****' + s.slice(-4) : s;
    }
    return s.length > 6 ? s.slice(0,3) + '...' + s.slice(-2) : s;
}

function colorForMember(id) {
    const colors = ['#0f172a','#0ea5a4','#2563eb','#7c3aed','#ef4444','#f59e0b','#16a34a'];
    if (!id) return colors[0];
    let hash = 0; for (let i=0;i<id.length;i++) hash = ((hash<<5)-hash) + id.charCodeAt(i);
    return colors[Math.abs(hash) % colors.length];
}

function renderMemberVirtualCard(payments) {
    const cardEl = document.getElementById('memberVirtualCard');
    if (!cardEl) return;
    const member = currentMember || { full_name: 'Member', email: '', phone: '' };
    const paidTotal = (payments || []).reduce((s,p) => s + (Number(p.amount) || 0), 0);
    const color = colorForMember(member.id || member.email || member.full_name);

    cardEl.style.background = color;
    cardEl.innerHTML = `
        <div style="display:flex; align-items:center; gap:8px;">
            <img src="assets/logo.png" alt="logo" style="width:42px; height:42px; border-radius:8px; background:rgba(255,255,255,0.12); padding:6px; object-fit:contain;" />
            <div>
                <div style="font-weight:700; font-size:0.95rem;">Glamorous Care</div>
                <div style="font-size:0.78rem; opacity:0.95;">Community Card</div>
            </div>
        </div>
        <div style="margin-top:8px; font-size:0.95rem; font-weight:700;">${member.full_name}</div>
        <div style="font-size:0.85rem; opacity:0.95;">${maskValue(member.email)} ${member.phone ? '• ' + maskValue(member.phone) : ''}</div>
        <div style="margin-top:8px; display:flex; justify-content:space-between; align-items:center;">
            <div style="font-size:0.9rem;">Paid</div>
            <div style="font-weight:700;">KES ${paidTotal.toLocaleString()}</div>
        </div>
        <div style="font-size:0.72rem; opacity:0.95; margin-top:6px;">Member ID: ${String(member.id || '').slice(-6).padStart(3,'*')}</div>
    `;

    // attach download handlers
    const pngBtn = document.getElementById('downloadCardPngBtn');
    const pdfBtn = document.getElementById('downloadCardPdfBtn');

    if (pngBtn) {
        pngBtn.onclick = async () => {
            try {
                const canvas = await html2canvas(cardEl, { scale: 2 });
                const dataUrl = canvas.toDataURL('image/png');
                const link = document.createElement('a');
                link.href = dataUrl;
                link.download = `${(member.full_name || 'member').replace(/\s+/g,'_')}_card.png`;
                link.click();
            } catch (err) { console.error('PNG export failed', err); }
        };
    }

    if (pdfBtn) {
        pdfBtn.onclick = async () => {
            try {
                const canvas = await html2canvas(cardEl, { scale: 2 });
                const imgData = canvas.toDataURL('image/png');
                const { jsPDF } = window.jspdf || {};
                if (jsPDF) {
                    const pdf = new jsPDF({ orientation: 'landscape' });
                    const pageWidth = pdf.internal.pageSize.getWidth();
                    const pageHeight = pdf.internal.pageSize.getHeight();
                    pdf.addImage(imgData, 'PNG', 10, 10, pageWidth - 20, 0);
                    pdf.save(`${(member.full_name || 'member').replace(/\s+/g,'_')}_card.pdf`);
                } else {
                    // fallback: save PNG
                    const link = document.createElement('a');
                    link.href = imgData;
                    link.download = `${(member.full_name || 'member').replace(/\s+/g,'_')}_card.png`;
                    link.click();
                }
            } catch (err) { console.error('PDF export failed', err); }
        };
    }
}

// Render Members Directory (Only show when filtered)
function renderMembersList(members, searchTerm = "") {
    const list = document.getElementById('membersList');
    if (!list) return;

    if (!searchTerm || searchTerm.trim() === "") {
        list.innerHTML = '<p style="text-align:center;color:#9ca3af;padding: 10px;"><i class="fa-solid fa-search"></i> Type a name or email to search members...</p>';
        return;
    }

    if (members.length === 0) {
        list.innerHTML = '<p style="text-align:center;color:#ef4444;padding: 10px;">No members found matching your search.</p>';
        return;
    }
    list.innerHTML = members.map(m => {
        const roleColors = {
            'admin': 'background: #dbeafe; color: #2563eb;',
            'treasury': 'background: #fef3c7; color: #d97706;',
            'chairperson': 'background: #f3e8ff; color: #7c3aed;',
            'vice_chairperson': 'background: #e0e7ff; color: #4f46e5;'
        };
        
        const statusBadgeStyle = (m.status === 'active' || m.status === 'approved') ? 'background: #dcfce7; color: #16a34a;' : 'background: #fef3c7; color: #d97706;';
        const statusLabel = (m.status === 'approved' || m.status === 'active') ? 'Registered' : (m.status.charAt(0).toUpperCase() + m.status.slice(1));
        const statusSpan = `<span style="padding: 3px 10px; border-radius: 15px; font-size: 0.75rem; font-weight: 600; ${statusBadgeStyle}">${statusLabel}</span>`;
        
        let roleSpan = '';
        if (m.role && m.role !== 'member') {
            const badgeStyle = roleColors[m.role] || roleColors['admin'];
            const roleLabel = m.role === 'vice_chairperson' ? 'Vice Chairperson' : m.role.charAt(0).toUpperCase() + m.role.slice(1);
            roleSpan = `<span style="padding: 3px 10px; border-radius: 15px; font-size: 0.75rem; font-weight: 600; ${badgeStyle}">${roleLabel}</span>`;
        }

        return `
            <div style="display: flex; align-items: center; justify-content: space-between; padding: 12px 15px; border: 1px solid #f3f4f6; border-radius: 10px; margin-bottom: 8px; transition: 0.2s; flex-wrap: wrap; gap: 10px; cursor: default;" onmouseover="this.style.background='#f8fafc';this.style.borderColor='var(--color-blue)'" onmouseout="this.style.background='';this.style.borderColor='#f3f4f6'">
                <div style="flex: 1;">
                    <div style="font-weight: 600;">${m.full_name}</div>
                    <div style="color: #6b7280; font-size: 0.9rem;">${m.email}${m.phone ? ' • ' + m.phone : ''}</div>
                </div>
                <div style="display: flex; gap: 5px; align-items: center;">
                    ${statusSpan}
                    ${roleSpan}
                    <button onclick="openEditMemberModal('${m.id}')" style="background: var(--color-blue); color: white; border: none; padding: 5px 10px; border-radius: 5px; cursor: pointer; font-size: 0.8rem; display: flex; align-items: center; gap: 5px; margin-left: 5px;"><i class="fa-solid fa-pen"></i> Edit</button>
                </div>
            </div>
        `;
    }).join('');
}

function renderBulkPaymentMembers(members) {
    const list = document.getElementById('bulkPaymentMembersList');
    const selectAllBtn = document.getElementById('selectAllBulkPaymentsBtn');
    const searchInput = document.getElementById('bulkPaymentMemberSearch');
    if (!list) return;

    const eligibleMembers = (bulkPaymentHelpers.filterBulkPaymentEligibleMembers || ((items) => (items || []).filter((item) => {
        const role = (item.role || '').toString().trim().toLowerCase();
        return role === '' || role === 'member';
    })))(members);

    const searchTerm = (searchInput && searchInput.value ? searchInput.value : '').toLowerCase();
    const filteredMembers = eligibleMembers.filter((member) => {
        const haystack = `${member.full_name || ''} ${member.email || ''}`.toLowerCase();
        return haystack.includes(searchTerm);
    });

    list.innerHTML = filteredMembers.length === 0
        ? '<p style="margin:0;color:#6b7280;">No matching regular members found.</p>'
        : filteredMembers.map((member) => `
            <label style="display:flex; align-items:center; justify-content:space-between; gap:10px; padding:8px 6px; border-bottom:1px solid #e5e7eb; cursor:pointer;">
                <span style="display:flex; align-items:center; gap:8px;">
                    <input type="checkbox" class="bulk-payment-member-checkbox" value="${member.id}" />
                    <span>
                        <strong>${member.full_name}</strong><br>
                        <small style="color:#6b7280;">${member.email || 'No email'}</small>
                    </span>
                </span>
            </label>
        `).join('');

    if (selectAllBtn) {
        selectAllBtn.onclick = () => {
            const checkboxes = list.querySelectorAll('.bulk-payment-member-checkbox');
            const shouldSelectAll = Array.from(checkboxes).some((checkbox) => !checkbox.checked);
            checkboxes.forEach((checkbox) => {
                checkbox.checked = shouldSelectAll;
            });
        };
    }
}

// Populate Payment Member Dropdowns
function populateMemberDropdown(members) {
    const select = document.getElementById('paymentMember');
    const selectView = document.getElementById('viewPaymentsMember');
    
    if (select) {
        select.innerHTML = '<option value="">— Choose a member —</option>';
        members.forEach(m => {
            select.innerHTML += `<option value="${m.id}" data-name="${m.full_name}">${m.full_name} (${m.email})</option>`;
        });
    }
    
    if (selectView) {
        selectView.innerHTML = '<option value="">— Select a member —</option>';
        members.forEach(m => {
            selectView.innerHTML += `<option value="${m.id}">${m.full_name} (${m.email})</option>`;
        });
    }

    renderBulkPaymentMembers(members);
}

// Setup admin event listeners (only once)
let adminListenersAttached = false;
function togglePaymentPayoutField(paymentType, containerId, selectId) {
    const container = document.getElementById(containerId);
    const select = document.getElementById(selectId);
    if (!container || !select) return;
    const isRegistration = paymentType === 'registration';
    container.style.display = isRegistration ? 'none' : 'block';
    select.disabled = isRegistration;
    if (isRegistration) {
        select.value = 'accumulating';
    }
}

function setupAdminEventListeners() {
    if (adminListenersAttached) return;
    adminListenersAttached = true;

    const bulkSearchInput = document.getElementById('bulkPaymentMemberSearch');
    if (bulkSearchInput) {
        bulkSearchInput.addEventListener('input', () => {
            renderBulkPaymentMembers(allMembers);
        });
    }

    // Member Search
    const searchInput = document.getElementById('memberSearch');
    if (searchInput) {
        // Remove existing listeners by replacing the element
        const newSearch = searchInput.cloneNode(true);
        searchInput.parentNode.replaceChild(newSearch, searchInput);
        
        newSearch.addEventListener('input', (e) => {
            const term = e.target.value.toLowerCase();
            const filtered = allMembers.filter(m => 
                m.full_name.toLowerCase().includes(term) || 
                (m.email && m.email.toLowerCase().includes(term)) ||
                (m.phone && m.phone.toLowerCase().includes(term))
            );
            renderMembersList(filtered, term);
        });
    }

    // View Member Payments dropdown
    const viewPaymentsSelect = document.getElementById('viewPaymentsMember');
    if (viewPaymentsSelect) {
        viewPaymentsSelect.addEventListener('change', (e) => {
            const memberId = e.target.value;
            if (memberId) {
                window.loadMemberPaymentsAdmin(memberId);
            } else {
                const section = document.getElementById('adminMemberPaymentsSection');
                if (section) section.style.display = 'none';
            }
        });
    }

    // Admin member payments action buttons (edit/delete)
    const adminMemberPaymentsBody = document.getElementById('adminMemberPaymentsBody');
    if (adminMemberPaymentsBody) {
        adminMemberPaymentsBody.addEventListener('click', (event) => {
            const button = event.target.closest('button.admin-payment-action');
            if (!button) return;
            const action = button.dataset.action;
            const paymentId = button.dataset.paymentId;
            if (!action || !paymentId) return;

            if (action === 'edit-payment') {
                window.openEditPaymentModal(paymentId);
            } else if (action === 'delete-payment') {
                window.deletePaymentRecord(paymentId);
            }
        });
    }

    const paymentTypeSelect = document.getElementById('paymentType');
    if (paymentTypeSelect) {
        paymentTypeSelect.addEventListener('change', (e) => {
            togglePaymentPayoutField(e.target.value, 'paymentPayoutStatusContainer', 'paymentPayoutStatus');
        });
        togglePaymentPayoutField(paymentTypeSelect.value, 'paymentPayoutStatusContainer', 'paymentPayoutStatus');
    }

    const editPaymentTypeSelect = document.getElementById('editPaymentType');
    if (editPaymentTypeSelect) {
        editPaymentTypeSelect.addEventListener('change', (e) => {
            togglePaymentPayoutField(e.target.value, 'editPaymentPayoutStatusContainer', 'editPaymentPayoutStatus');
        });
        togglePaymentPayoutField(editPaymentTypeSelect.value, 'editPaymentPayoutStatusContainer', 'editPaymentPayoutStatus');
    }

    // Add Payment Form
    const addPaymentForm = document.getElementById('addPaymentForm');
    if (addPaymentForm) {
        addPaymentForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const msgDiv = document.getElementById('paymentMsg');
            const paymentType = document.getElementById('paymentType').value;
            const payoutStatusValue = paymentType === 'registration' ? 'accumulating' : document.getElementById('paymentPayoutStatus').value;
            const selectedMemberCheckboxes = Array.from(document.querySelectorAll('.bulk-payment-member-checkbox:checked'));
            const selectedIds = selectedMemberCheckboxes.map((checkbox) => checkbox.value);

            const validationErrors = (bulkPaymentHelpers.validateBulkPaymentSelection || ((payload) => {
                const errors = [];
                if (!payload.selectedIds.length) errors.push('Select at least one member.');
                if (!payload.amount || Number(payload.amount) <= 0) errors.push('Enter a payment amount.');
                if (!payload.month) errors.push('Select a month.');
                if (!payload.paymentDate) errors.push('Select a payment date.');
                return errors;
            }))({
                selectedIds,
                amount: document.getElementById('paymentAmount').value,
                month: document.getElementById('paymentMonth').value,
                paymentDate: document.getElementById('paymentDate').value
            });

            if (validationErrors.length > 0) {
                msgDiv.className = 'admin-msg error';
                msgDiv.style.display = 'block';
                msgDiv.textContent = validationErrors.join(' ');
                setTimeout(() => { msgDiv.style.display = 'none'; msgDiv.className = 'admin-msg'; }, 5000);
                return;
            }

            const selectedMembers = allMembers.filter((member) => selectedIds.includes(member.id));
            const payments = (bulkPaymentHelpers.buildBulkPaymentRows || ((members, payload) => members.filter((member) => selectedIds.includes(member.id)).map((member) => ({
                member_id: member.id,
                member_name: member.full_name,
                amount: Number(payload.amount),
                month: payload.month,
                payment_date: payload.paymentDate,
                status: payload.status,
                payment_type: payload.paymentType,
                payout_status: payload.payoutStatus,
                reference: payload.reference || null,
                added_by: payload.addedBy || 'admin'
            }))))(selectedMembers, {
                selectedIds,
                amount: document.getElementById('paymentAmount').value,
                month: document.getElementById('paymentMonth').value,
                paymentDate: document.getElementById('paymentDate').value,
                status: document.getElementById('paymentStatus').value,
                paymentType,
                payoutStatus: payoutStatusValue,
                reference: document.getElementById('paymentRef').value || null,
                addedBy: currentMember ? currentMember.role : 'admin'
            });

            const { error } = await client.from('payments').insert(payments);

            if (error) {
                msgDiv.className = 'admin-msg error';
                msgDiv.style.display = 'block';
                msgDiv.textContent = 'Error: ' + error.message;
            } else {
                msgDiv.className = 'admin-msg success';
                msgDiv.style.display = 'block';
                msgDiv.textContent = `✅ ${payments.length} payment${payments.length === 1 ? '' : 's'} saved successfully for ${payments.length === 1 ? payments[0].member_name : 'the selected members'}.`;
                addPaymentForm.reset();
                renderBulkPaymentMembers(allMembers);
            }

            setTimeout(() => { msgDiv.style.display = 'none'; msgDiv.className = 'admin-msg'; }, 5000);
        });
    }

    // Create Member Form — uses the import_single_member RPC function
    const addMemberForm = document.getElementById('addMemberForm');
    if (addMemberForm) {
        addMemberForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const msgDiv = document.getElementById('addMemberMsg');
            const submitBtn = document.getElementById('btnCreateMember');
            
            const fullName = document.getElementById('newMemberName').value.trim();
            const email = document.getElementById('newMemberEmail').value.trim().toLowerCase();
            const phone = document.getElementById('newMemberPhone').value.trim();
            const role = document.getElementById('newMemberRole').value;
            const idNumber = document.getElementById('newMemberId').value.trim();
            const branch = document.getElementById('newMemberBranch').value.trim();
            
            if (!fullName || !email) {
                msgDiv.className = 'admin-msg error';
                msgDiv.style.display = 'block';
                msgDiv.textContent = 'Name and email are required.';
                return;
            }
            
            submitBtn.disabled = true;
            submitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Creating...';
            
            const formDetails = {};
            if (idNumber) formDetails.id_number = idNumber;
            if (branch) formDetails.branch = branch;
            
            try {
                const { data: newUserId, error } = await client.rpc('import_single_member', {
                    p_full_name: fullName,
                    p_email: email,
                    p_phone: phone || null,
                    p_status: 'active',
                    p_form_details: formDetails
                });
                
                if (error) throw error;
                
                // If a non-member role was selected, update it
                if (role && role !== 'member') {
                    await client.from('members').update({ role: role }).eq('id', newUserId);
                }
                
                msgDiv.className = 'admin-msg success';
                msgDiv.style.display = 'block';
                msgDiv.innerHTML = `<i class="fa-solid fa-check-circle"></i> Account created for <strong>${fullName}</strong>! Default password: <strong>12345678</strong>`;
                addMemberForm.reset();
                
                // Refresh the member lists
                loadAdminData();
                
            } catch (err) {
                msgDiv.className = 'admin-msg error';
                msgDiv.style.display = 'block';
                msgDiv.textContent = 'Error: ' + err.message;
            }
            
            submitBtn.disabled = false;
            submitBtn.innerHTML = '<i class="fa-solid fa-user-plus"></i> Create Account';
            setTimeout(() => { msgDiv.style.display = 'none'; msgDiv.className = 'admin-msg'; }, 8000);
        });
    }

    // Configure Custom Form Fields Event Listener
    const btnProcessSchema = document.getElementById('btnProcessSchema');
    const configSchemaFile = document.getElementById('configSchemaFile');
    const configMsg = document.getElementById('configMsg');
    
    if (btnProcessSchema && configSchemaFile) {
        btnProcessSchema.addEventListener('click', () => {
            if (!configSchemaFile.files || configSchemaFile.files.length === 0) {
                configMsg.textContent = "Please select an Excel or CSV file first.";
                configMsg.className = "admin-msg error";
                configMsg.style.display = "block";
                return;
            }

            btnProcessSchema.disabled = true;
            btnProcessSchema.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Processing...';
            
            const file = configSchemaFile.files[0];
            const reader = new FileReader();

            reader.onload = async (e) => {
                try {
                    const data = new Uint8Array(e.target.result);
                    const workbook = XLSX.read(data, { type: 'array' });
                    const firstSheetName = workbook.SheetNames[0];
                    const worksheet = workbook.Sheets[firstSheetName];
                    const json = XLSX.utils.sheet_to_json(worksheet, { defval: "" });
                    
                    if (json.length === 0) {
                        throw new Error("The selected sheet is empty.");
                    }

                    const headers = Object.keys(json[0]);
                    const ignoreHeaders = ['email', 'name', 'phone', 'full name', 'phone number', 'email address'];
                    
                    const fieldDefinitions = [];
                    
                    headers.forEach(h => {
                        const clean = h.trim();
                        const cleanLower = clean.toLowerCase();
                        if (ignoreHeaders.some(ignore => cleanLower.includes(ignore)) || clean === '') {
                            return;
                        }
                        
                        // Extract all unique values from this column to infer type
                        const values = json.map(row => row[h]).filter(v => v !== undefined && v !== null && String(v).trim() !== '');
                        const uniqueValues = [...new Set(values.map(v => String(v).trim()))];
                        
                        let type = 'text';
                        let options = [];
                        
                        const isYesNo = uniqueValues.length > 0 && uniqueValues.length <= 2 && uniqueValues.every(v => {
                            const lv = v.toLowerCase();
                            return lv === 'yes' || lv === 'no' || lv === 'true' || lv === 'false' || lv === 'y' || lv === 'n';
                        });
                        
                        if (isYesNo) {
                            type = 'boolean';
                        } else if (uniqueValues.length > 1 && uniqueValues.length <= 6) {
                            type = 'select';
                            options = uniqueValues;
                        } else if (values.some(v => String(v).length > 60)) {
                            type = 'textarea';
                        } else if (cleanLower.includes('date') || cleanLower.includes('dob')) {
                            type = 'date';
                        }
                        
                        fieldDefinitions.push({
                            name: clean,
                            type: type,
                            options: options
                        });
                    });

                    if (fieldDefinitions.length === 0) {
                        throw new Error("No custom fields (columns) found in the Excel sheet.");
                    }

                    const { error } = await client.from('form_schema').upsert({
                        key: 'profile_fields',
                        fields: fieldDefinitions,
                        updated_at: new Date().toISOString()
                    });

                    if (error) throw error;

                    configMsg.className = "admin-msg success";
                    configMsg.style.display = "block";
                    configMsg.innerHTML = `<i class="fa-solid fa-check-circle"></i> Successfully configured ${fieldDefinitions.length} custom fields!`;
                    configSchemaFile.value = '';
                } catch (err) {
                    console.error(err);
                    configMsg.textContent = "Error setting configuration: " + err.message;
                    configMsg.className = "admin-msg error";
                    configMsg.style.display = "block";
                } finally {
                    btnProcessSchema.disabled = false;
                    btnProcessSchema.innerHTML = '<i class="fa-solid fa-wand-magic-sparkles"></i> Configure Fields';
                }
            };
            reader.readAsArrayBuffer(file);
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
// PASSWORD UI LOGIC
// =============================================

window.togglePasswordVisibility = function(inputId, btn) {
    const input = document.getElementById(inputId);
    const icon = btn.querySelector('i');
    
    if (input.type === 'password') {
        input.type = 'text';
        icon.classList.remove('fa-eye');
        icon.classList.add('fa-eye-slash');
        icon.style.color = 'var(--color-blue)';
    } else {
        input.type = 'password';
        icon.classList.remove('fa-eye-slash');
        icon.classList.add('fa-eye');
        icon.style.color = '#9ca3af';
    }
}

// Password Strength Logic
const newPasswordInput = document.getElementById('newPassword');
const confirmPasswordInput = document.getElementById('confirmNewPassword');

if (newPasswordInput) {
    newPasswordInput.addEventListener('input', function() {
        const password = this.value;
        let strength = 0;
        
        if (password.length >= 6) strength += 1;
        if (password.length >= 10) strength += 1;
        if (/[A-Z]/.test(password)) strength += 1;
        if (/[0-9]/.test(password)) strength += 1;
        if (/[^A-Za-z0-9]/.test(password)) strength += 1;
        
        // Cap at 4
        if (strength > 4) strength = 4;
        
        // Reset classes
        for (let i = 1; i <= 4; i++) {
            const bar = document.getElementById(`strengthBar${i}`);
            if (bar) {
                bar.className = 'strength-bar';
                if (i <= strength) {
                    if (strength === 1) bar.classList.add('weak');
                    else if (strength === 2) bar.classList.add('fair');
                    else if (strength === 3) bar.classList.add('good');
                    else bar.classList.add('strong');
                }
            }
        }
        
        const label = document.getElementById('strengthLabel');
        if (label) {
            if (password.length === 0) label.textContent = '';
            else if (strength === 1) label.textContent = 'Weak';
            else if (strength === 2) label.textContent = 'Fair';
            else if (strength === 3) label.textContent = 'Good';
            else label.textContent = 'Strong';
            
            if (strength <= 1 && password.length > 0) label.style.color = '#ef4444';
            else if (strength === 2) label.style.color = '#eab308';
            else if (strength >= 3) label.style.color = '#22c55e';
        }
        
        checkPasswordMatch();
    });
}

if (confirmPasswordInput) {
    confirmPasswordInput.addEventListener('input', checkPasswordMatch);
}

function checkPasswordMatch() {
    if (!newPasswordInput || !confirmPasswordInput) return;
    
    const pwd1 = newPasswordInput.value;
    const pwd2 = confirmPasswordInput.value;
    const matchLabel = document.getElementById('passwordMatchLabel');
    
    if (!matchLabel) return;
    
    if (pwd2.length === 0) {
        matchLabel.style.display = 'none';
        return;
    }
    
    matchLabel.style.display = 'block';
    if (pwd1 === pwd2) {
        matchLabel.innerHTML = '<i class="fa-solid fa-check-circle"></i> Passwords match';
        matchLabel.style.color = '#22c55e';
    } else {
        matchLabel.innerHTML = '<i class="fa-solid fa-times-circle"></i> Passwords do not match';
        matchLabel.style.color = '#ef4444';
    }
}

function showPasswordResetForm() {
    if (loginFormContainer) loginFormContainer.style.display = 'none';
    if (resetPasswordFormContainer) resetPasswordFormContainer.style.display = 'block';
    if (loginView) loginView.style.display = 'block';
}

function showLoginForm() {
    if (resetPasswordFormContainer) resetPasswordFormContainer.style.display = 'none';
    if (loginFormContainer) loginFormContainer.style.display = 'block';
    if (loginView) loginView.style.display = 'block';
}

// =============================================
// SESSION RESUME HANDLING
// =============================================
function setupSessionResumeHandler() {
    window.addEventListener('focus', () => {
        if (currentSessionUser) {
            checkAuth();
        }
    });
}

// Open modal helper: saves scroll position, shows overlay, optionally fullscreen, and scrolls to top
function openModal(id, options = { fullscreen: true, scrollToTop: true }) {
    const el = document.getElementById(id);
    if (!el) return;
    // Save current scroll position so we can restore later
    try { el.dataset.prevScroll = String(window.pageYOffset || window.scrollY || 0); } catch (e) {}
    if (options.fullscreen) el.classList.add('fullscreen');
    el.style.display = 'flex';
    // Prevent background scrolling
    document.body.style.overflow = 'hidden';
    if (options.scrollToTop) {
        try { window.scrollTo({ top: 0, behavior: 'auto' }); } catch (e) { window.scrollTo(0,0); }
        try { document.documentElement.scrollTop = 0; document.body.scrollTop = 0; } catch(e) { }
    }
    // Ensure the overlay is visible in the viewport and the modal content starts at top
    try {
        el.scrollIntoView({ behavior: 'auto', block: 'start' });
        const mc = el.querySelector('.modal-content');
        if (mc) mc.scrollTop = 0;
    } catch (e) { }
}

// Close modal helper: hides overlay, removes fullscreen class, restores scroll and body overflow
function closeModal(id) {
    const el = document.getElementById(id);
    if (!el) return;
    el.style.display = 'none';
    el.classList.remove('fullscreen');
    // Restore body scrolling
    document.body.style.overflow = '';
    // Restore previous scroll position if available
    const prev = el.dataset.prevScroll;
    if (prev) {
        try { window.scrollTo({ top: parseInt(prev, 10) || 0, behavior: 'smooth' }); } catch (e) { window.scrollTo(parseInt(prev, 10) || 0, 0); }
    }
    try { delete el.dataset.prevScroll; } catch (e) { el.removeAttribute('data-prev-scroll'); }
}

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
function hideRegisterLinks() {
    const regLinks = document.querySelectorAll('a[href="register.html"], a[href="#register"]');
    regLinks.forEach(link => link.style.display = 'none');
}

function setupInviteSharing() {
    const shareInviteBtn = document.getElementById('shareInviteBtn');
    const inviteFeedback = document.getElementById('inviteFeedback');
    if (!shareInviteBtn) return;

    shareInviteBtn.addEventListener('click', async () => {
        const inviteUrl = new URL('register.html', window.location.href).href;
        const shareText = 'Join Glamorous Care Initiative — register now and become part of our community.';
        try {
            if (navigator.share) {
                await navigator.share({
                    title: 'Join Glamorous Care Initiative',
                    text: shareText,
                    url: inviteUrl
                });
            } else if (navigator.clipboard) {
                await navigator.clipboard.writeText(inviteUrl);
                if (inviteFeedback) inviteFeedback.textContent = 'Invite link copied to clipboard!';
            } else {
                if (inviteFeedback) inviteFeedback.textContent = `Copy this invite link to share: ${inviteUrl}`;
            }
        } catch (error) {
            if (inviteFeedback) inviteFeedback.textContent = 'Unable to share invite link. Please copy the link manually.';
            console.error('Invite share error:', error);
        }
        if (inviteFeedback) {
            setTimeout(() => { inviteFeedback.textContent = ''; }, 5000);
        }
    });
}

async function checkAuth() {
    const { data: { session } } = await client.auth.getSession();
    if (session) {
        currentSessionUser = session.user;
        hideRegisterLinks();
        setupInactivityHandlers();
        resetInactivityTimer();
        if (document.getElementById('portal')) {
            await checkUserAndLoadDashboard(session.user);
        }
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

    setupSessionResumeHandler();
    checkAuth();
    setupInviteSharing();
});

// =============================================
// NATIVE REGISTRATION LOGIC
// =============================================
const nativeRegForm = document.getElementById('nativeRegForm');
if (nativeRegForm) {
    nativeRegForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const btn = document.getElementById('regSubmitBtn');
        const errDiv = document.getElementById('regError');
        const succDiv = document.getElementById('regSuccess');
        
        btn.disabled = true;
        btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Registering...';
        errDiv.style.display = 'none';
        succDiv.style.display = 'none';

        const pwd1 = document.getElementById('regPassword').value;
        const pwd2 = document.getElementById('regConfirmPassword').value;
        if (pwd1 !== pwd2) {
            errDiv.textContent = "Passwords do not match.";
            errDiv.style.display = 'block';
            btn.disabled = false;
            btn.innerHTML = '<i class="fa-solid fa-user-plus"></i> Complete Registration';
            return;
        }

        const email = document.getElementById('regEmail').value;
        const fullName = document.getElementById('regFullName').value;
        
        // 1. Create Auth User
        const { data: authData, error: authError } = await client.auth.signUp({
            email: email,
            password: pwd1,
            options: {
                data: { full_name: fullName }
            }
        });

        if (authError) {
            errDiv.textContent = authError.message;
            errDiv.style.display = 'block';
            btn.disabled = false;
            btn.innerHTML = '<i class="fa-solid fa-user-plus"></i> Complete Registration';
            return;
        }

        const userId = authData.user.id;

        // 2. Build form details JSON
        const formDetails = {
            gender: document.getElementById('regGender').value,
            date_of_birth: document.getElementById('regDob').value,
            marital_status: document.getElementById('regMarital').value,
            id_number: document.getElementById('regIdNumber').value,
            branch: document.getElementById('regBranch').value,
            occupation: document.getElementById('regOccupation').value,
            next_of_kin_name: document.getElementById('regNokName').value,
            next_of_kin_phone: document.getElementById('regNokPhone').value,
            dependants: document.getElementById('regDependants').value,
            dependant_count: document.getElementById('regDependantCount').value
        };

        // 3. Insert into members table
        const { error: dbError } = await client.from('members').insert({
            id: userId,
            full_name: fullName,
            email: email,
            phone: document.getElementById('regPhone').value,
            role: 'member',
            status: 'active',
            requires_password_reset: false,
            form_details: formDetails
        });

        if (dbError) {
            errDiv.textContent = "Account created but failed to save details: " + dbError.message;
            errDiv.style.display = 'block';
            btn.disabled = false;
            btn.innerHTML = '<i class="fa-solid fa-user-plus"></i> Complete Registration';
            return;
        }

        succDiv.style.display = 'block';
        nativeRegForm.reset();
        
        // Redirect to portal after 2 seconds
        setTimeout(() => {
            window.location.hash = '#portal';
            location.reload();
        }, 2000);
    });
}

// =============================================
// MODAL & EDIT LOGIC (ADMIN)
// =============================================

// Helper: Populate Months Dropdown
function populateMonthDropdowns() {
    const selects = [document.getElementById('paymentMonth'), document.getElementById('editPaymentMonth')];
    
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const currentYear = new Date().getFullYear();
    const currentMonth = new Date().getMonth();
    
    // Generate months from 1 year ago to 1 year ahead
    let optionsHTML = '';
    for (let y = currentYear - 1; y <= currentYear + 1; y++) {
        for (let m = 0; m < 12; m++) {
            const val = `${months[m]} ${y}`;
            const selected = (y === currentYear && m === currentMonth) ? 'selected' : '';
            optionsHTML += `<option value="${val}" ${selected}>${val}</option>`;
        }
    }
    
    selects.forEach(sel => {
        if (sel) {
            sel.innerHTML = '<option value="">— Select Month —</option>' + optionsHTML;
        }
    });
}
populateMonthDropdowns();

// EDIT MEMBER
window.openEditMemberModal = function(id) {
    const member = allMembers.find(m => m.id === id);
    if (!member) return;
    
    document.getElementById('editMemberId').value = member.id;
    document.getElementById('editMemberName').value = member.full_name;
    document.getElementById('editMemberEmail').value = member.email;
    document.getElementById('editMemberPhone').value = member.phone || '';
    document.getElementById('editMemberRole').value = member.role;
    document.getElementById('editMemberStatus').value = member.status;
    
    const fd = member.form_details || {};
    document.getElementById('editMemberDob').value = fd.date_of_birth || '';
    document.getElementById('editMemberGender').value = fd.gender || '';
    document.getElementById('editMemberMarital').value = fd.marital_status || '';
    document.getElementById('editMemberIdNumber').value = fd.id_number || '';
    document.getElementById('editMemberNokName').value = fd.next_of_kin_name || '';
    document.getElementById('editMemberNokPhone').value = fd.next_of_kin_phone || '';
    
    document.getElementById('editMemberMsg').style.display = 'none';
    openModal('editMemberModal');
};

const editMemberForm = document.getElementById('editMemberForm');
if (editMemberForm) {
    editMemberForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const btn = editMemberForm.querySelector('button[type="submit"]');
        const msg = document.getElementById('editMemberMsg');
        btn.disabled = true;
        btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Saving...';
        
        const memberId = document.getElementById('editMemberId').value;
        const currentMemberData = allMembers.find(m => m.id === memberId);
        const formDetails = currentMemberData ? (currentMemberData.form_details || {}) : {};
        
        formDetails.date_of_birth = document.getElementById('editMemberDob').value;
        formDetails.gender = document.getElementById('editMemberGender').value;
        formDetails.marital_status = document.getElementById('editMemberMarital').value;
        formDetails.id_number = document.getElementById('editMemberIdNumber').value;
        formDetails.next_of_kin_name = document.getElementById('editMemberNokName').value;
        formDetails.next_of_kin_phone = document.getElementById('editMemberNokPhone').value;
        
        const updates = {
            full_name: document.getElementById('editMemberName').value,
            email: document.getElementById('editMemberEmail').value,
            phone: document.getElementById('editMemberPhone').value,
            role: document.getElementById('editMemberRole').value,
            status: document.getElementById('editMemberStatus').value,
            form_details: formDetails
        };
        
        const { error } = await client.from('members').update(updates).eq('id', memberId);
        
        if (error) {
            msg.textContent = error.message;
            msg.style.display = 'block';
            msg.className = 'auth-error';
        } else {
            closeModal('editMemberModal');
            // Refresh list
            loadAdminData();
        }
        
        btn.disabled = false;
        btn.innerHTML = '<i class="fa-solid fa-save"></i> Save Changes';
    });
}

// EDIT PAYMENT
window.openEditPaymentModal = async function(id) {
    if (!window.allPayments) window.allPayments = [];
    let payment = window.allPayments.find(p => String(p.id) === String(id));
    if (!payment) {
        try {
            const { data, error } = await client.from('payments').select('*').eq('id', id).single();
            if (error || !data) {
                console.error('Edit payment failed: payment not found', id, error);
                return;
            }
            payment = data;
            window.allPayments.push(payment);
        } catch (err) {
            console.error('Edit payment fetch error:', err);
            return;
        }
    }
    
    document.getElementById('editPaymentId').value = payment.id;
    document.getElementById('editPaymentMemberName').value = payment.member_name;
    document.getElementById('editPaymentAmount').value = payment.amount;
    document.getElementById('editPaymentMonth').value = payment.month;
    
    // Format date for input[type="date"]
    let dateStr = '';
    if (payment.payment_date) {
        const d = new Date(payment.payment_date);
        dateStr = d.toISOString().split('T')[0];
    }
    document.getElementById('editPaymentDate').value = dateStr;
    document.getElementById('editPaymentStatus').value = payment.status;
    document.getElementById('editPaymentType').value = payment.payment_type || 'saving';
    document.getElementById('editPaymentPayoutStatus').value = payment.payout_status || 'accumulating';
    togglePaymentPayoutField(payment.payment_type || 'saving', 'editPaymentPayoutStatusContainer', 'editPaymentPayoutStatus');
    document.getElementById('editPaymentRef').value = payment.reference || '';
    
    document.getElementById('editPaymentMsg').style.display = 'none';
    openModal('editPaymentModal');
};

const editPaymentForm = document.getElementById('editPaymentForm');
if (editPaymentForm) {
    editPaymentForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const btn = editPaymentForm.querySelector('button[type="submit"]');
        const msg = document.getElementById('editPaymentMsg');
        btn.disabled = true;
        btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Saving...';
        
        const paymentId = document.getElementById('editPaymentId').value;
        const editPaymentTypeValue = document.getElementById('editPaymentType').value;
        const editPayoutStatusValue = editPaymentTypeValue === 'registration' ? 'accumulating' : document.getElementById('editPaymentPayoutStatus').value;
        const updates = {
            amount: document.getElementById('editPaymentAmount').value,
            month: document.getElementById('editPaymentMonth').value,
            payment_date: document.getElementById('editPaymentDate').value,
            status: document.getElementById('editPaymentStatus').value,
            payment_type: editPaymentTypeValue,
            payout_status: editPayoutStatusValue,
            reference: document.getElementById('editPaymentRef').value
        };
        
        const { error } = await client.from('payments').update(updates).eq('id', paymentId);
        
        if (error) {
            msg.textContent = error.message;
            msg.style.display = 'block';
            msg.className = 'auth-error';
        } else {
            closeModal('editPaymentModal');
            // Refresh the admin payment viewer if a member is selected
            const viewSelect = document.getElementById('viewPaymentsMember');
            if (viewSelect && viewSelect.value) {
                window.loadMemberPaymentsAdmin(viewSelect.value);
            }
            // Refresh payments list for current user
            checkUserAndLoadDashboard(currentSessionUser);
        }
        
        btn.disabled = false;
        btn.innerHTML = '<i class="fa-solid fa-save"></i> Save Payment Update';
    });
}

// Delete a payment record
window.deletePaymentRecord = async function(paymentId) {
    // If called from modal without an argument, get the ID from the form
    if (!paymentId) {
        paymentId = document.getElementById('editPaymentId').value;
    }
    
    if (!paymentId) return;
    
    if (!confirm('Are you sure you want to permanently delete this payment record? This action cannot be undone.')) {
        return;
    }
    
    try {
        const { error } = await client.from('payments').delete().eq('id', paymentId);
        
        if (error) {
            alert('Error deleting payment: ' + error.message);
            return;
        }
        
        // Remove from local cache
        if (window.allPayments) {
            window.allPayments = window.allPayments.filter(p => p.id !== paymentId);
        }
        
        // Close the modal if it's open
        closeModal('editPaymentModal');
        
        // Refresh the admin payment viewer if a member is selected
        const viewSelect = document.getElementById('viewPaymentsMember');
        if (viewSelect && viewSelect.value) {
            window.loadMemberPaymentsAdmin(viewSelect.value);
        }
        
        // Also refresh the main dashboard
        if (currentSessionUser) {
            checkUserAndLoadDashboard(currentSessionUser);
        }
        
        alert('Payment record deleted successfully.');
    } catch (err) {
        console.error('Delete payment error:', err);
        alert('Error: ' + err.message);
    }
};

// =============================================
// EXCEL BULK IMPORT LOGIC
// =============================================
let scannedMembersToImport = [];

const btnScanFile = document.getElementById('btnScanFile');
const importFile = document.getElementById('importFile');
const importMsg = document.getElementById('importMsg');
const importResults = document.getElementById('importResults');
const importTableBody = document.getElementById('importTableBody');
const newMembersCount = document.getElementById('newMembersCount');
const btnProcessImport = document.getElementById('btnProcessImport');

if (btnScanFile) {
    btnScanFile.addEventListener('click', () => {
        if (!importFile.files || importFile.files.length === 0) {
            importMsg.textContent = "Please select an Excel or CSV file first.";
            importMsg.className = "admin-msg error";
            importMsg.style.display = "block";
            return;
        }

        const file = importFile.files[0];
        const reader = new FileReader();

        reader.onload = (e) => {
            try {
                const data = new Uint8Array(e.target.result);
                const workbook = XLSX.read(data, { type: 'array' });
                
                // Assuming first sheet is the one we want
                const firstSheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[firstSheetName];
                
                // Convert sheet to JSON array
                const json = XLSX.utils.sheet_to_json(worksheet, { defval: "" });
                
                if (json.length === 0) {
                    throw new Error("The selected sheet is empty.");
                }

                // Try to find the correct column headers (case-insensitive, fuzzy match)
                const headers = Object.keys(json[0]);
                const emailHeader = headers.find(h => h.toLowerCase().includes('email'));
                const nameHeader = headers.find(h => h.toLowerCase().includes('name'));
                const phoneHeader = headers.find(h => h.toLowerCase().includes('phone'));
                const genderHeader = headers.find(h => h.toLowerCase().includes('gender'));
                const dobHeader = headers.find(h => h.toLowerCase().includes('date of birth') || h.toLowerCase().includes('dob'));
                const maritalHeader = headers.find(h => h.toLowerCase().includes('marital'));
                const idHeader = headers.find(h => h.toLowerCase().includes('id number') || h.toLowerCase().includes('national id'));
                const branchHeader = headers.find(h => h.toLowerCase().includes('branch'));
                const occupationHeader = headers.find(h => h.toLowerCase().includes('occupation') || h.toLowerCase().includes('profession') || h.toLowerCase().includes('skill'));
                const nokNameHeader = headers.find(h => h.toLowerCase().includes('next of kin full name') || h.toLowerCase().includes('kin name') || h.toLowerCase().includes('kin full name'));
                const nokPhoneHeader = headers.find(h => h.toLowerCase().includes('next of kin phone') || h.toLowerCase().includes('kin phone'));
                const dependantsHeader = headers.find(h => h.toLowerCase().includes('dependants') || h.toLowerCase().includes('dependents'));
                const dependantCountHeader = headers.find(h => h.toLowerCase().includes('dependant count') || h.toLowerCase().includes('how many dependants'));

                if (!emailHeader) {
                    throw new Error("Could not find an 'Email' column in the spreadsheet.");
                }
                if (!nameHeader) {
                    throw new Error("Could not find a 'Name' column in the spreadsheet.");
                }

                // Identify potential payment columns (e.g. "Jan", "Feb", "March", "July 2026")
                const monthsShort = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
                const monthsFull = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
                
                const paymentCols = [];
                headers.forEach(h => {
                    const cleanH = h.trim().toLowerCase();
                    // Match if header matches month names
                    const matchedMonthIndex = monthsShort.findIndex(m => cleanH === m.toLowerCase()) !== -1 ? monthsShort.findIndex(m => cleanH === m.toLowerCase()) :
                                              monthsFull.findIndex(m => cleanH === m.toLowerCase());
                                              
                    if (matchedMonthIndex !== -1) {
                        paymentCols.push({
                            header: h,
                            monthName: monthsShort[matchedMonthIndex]
                        });
                    }
                });

                // Check against existing members
                const existingEmails = new Set((allMembers || []).map(m => m.email.toLowerCase()));
                
                scannedMembersToImport = [];
                
                json.forEach(row => {
                    const email = (row[emailHeader] || "").toString().trim();
                    const name = (row[nameHeader] || "").toString().trim();
                    const phone = phoneHeader ? (row[phoneHeader] || "").toString().trim() : "";
                    
                    if (email && name && !existingEmails.has(email.toLowerCase())) {
                        if (!scannedMembersToImport.find(m => m.email.toLowerCase() === email.toLowerCase())) {
                            // Extract payment values
                            const payments = [];
                            const currentYear = new Date().getFullYear();
                            
                            paymentCols.forEach(col => {
                                const amountVal = row[col.header];
                                if (amountVal) {
                                    const amount = parseInt(amountVal.toString().replace(/,/g, ''), 10);
                                    if (amount > 0) {
                                        payments.push({
                                            month: `${col.monthName} ${currentYear}`,
                                            amount: amount,
                                            status: 'paid'
                                        });
                                    }
                                }
                            });

                            // Extract form details dynamically from ALL columns in the sheet
                            const formDetails = {};
                            headers.forEach(h => {
                                const cleanH = h.trim().toLowerCase();
                                const isPayment = paymentCols.some(col => col.header === h);
                                
                                // Do not save the primary name/email/phone or payment columns inside form_details
                                if (cleanH !== emailHeader.toLowerCase() && 
                                    cleanH !== nameHeader.toLowerCase() && 
                                    (!phoneHeader || cleanH !== phoneHeader.toLowerCase()) && 
                                    !isPayment) {
                                    
                                    // Map known headers to database standard keys
                                    if (cleanH.includes('gender')) {
                                        formDetails.gender = (row[h] || "").toString().trim();
                                    } else if (cleanH.includes('date of birth') || cleanH.includes('dob')) {
                                        formDetails.date_of_birth = (row[h] || "").toString().trim();
                                    } else if (cleanH.includes('marital')) {
                                        formDetails.marital_status = (row[h] || "").toString().trim();
                                    } else if (cleanH.includes('id number') || cleanH.includes('national id')) {
                                        formDetails.id_number = (row[h] || "").toString().trim();
                                    } else if (cleanH.includes('branch')) {
                                        formDetails.branch = (row[h] || "").toString().trim();
                                    } else if (cleanH.includes('occupation') || cleanH.includes('profession') || cleanH.includes('skill')) {
                                        formDetails.occupation = (row[h] || "").toString().trim();
                                    } else if (cleanH.includes('kin name') || cleanH.includes('next of kin name')) {
                                        formDetails.next_of_kin_name = (row[h] || "").toString().trim();
                                    } else if (cleanH.includes('kin phone') || cleanH.includes('next of kin phone')) {
                                        formDetails.next_of_kin_phone = (row[h] || "").toString().trim();
                                    } else if (cleanH.includes('dependant count') || cleanH.includes('how many')) {
                                        formDetails.dependant_count = (row[h] || "").toString().trim();
                                    } else if (cleanH.includes('dependant') || cleanH.includes('dependent')) {
                                        formDetails.dependants = (row[h] || "").toString().trim();
                                    } else {
                                        // Save any other unknown/custom columns as-is
                                        formDetails[h] = (row[h] || "").toString().trim();
                                    }
                                }
                            });

                            scannedMembersToImport.push({
                                full_name: name,
                                email: email,
                                phone: phone,
                                form_details: formDetails,
                                payments: payments
                            });
                        }
                    }
                });

                if (scannedMembersToImport.length === 0) {
                    importMsg.textContent = "No new members found. All emails in the spreadsheet already exist in the system.";
                    importMsg.className = "admin-msg success";
                    importMsg.style.display = "block";
                    importResults.style.display = "none";
                } else {
                    importMsg.style.display = "none";
                    newMembersCount.textContent = scannedMembersToImport.length;
                    
                    importTableBody.innerHTML = scannedMembersToImport.map(m => `
                        <tr>
                            <td>${m.full_name}</td>
                            <td>${m.email}</td>
                            <td>${m.phone || '-'}</td>
                        </tr>
                    `).join('');
                    
                    importResults.style.display = "block";
                }

            } catch (err) {
                console.error(err);
                importMsg.textContent = "Error parsing file: " + err.message;
                importMsg.className = "admin-msg error";
                importMsg.style.display = "block";
            }
        };
        
        reader.readAsArrayBuffer(file);
    });
}

if (btnProcessImport) {
    btnProcessImport.addEventListener('click', async () => {
        if (scannedMembersToImport.length === 0) return;
        
        btnProcessImport.disabled = true;
        btnProcessImport.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Importing...';
        importMsg.style.display = "none";
        
        try {
            let importedCount = 0;
            let errorMessages = [];

            for (const m of scannedMembersToImport) {
                // 1. Call the secure RPC function to create the auth user and member profile
                const { data: newUserId, error: rpcError } = await client.rpc('import_single_member', {
                    p_full_name: m.full_name,
                    p_email: m.email,
                    p_phone: m.phone || null,
                    p_status: 'active',
                    p_form_details: m.form_details || {}
                });

                if (rpcError) {
                    console.error(`Error importing ${m.email}:`, rpcError);
                    errorMessages.push(`${m.full_name}: ${rpcError.message}`);
                    continue;
                }

                // 2. Insert payment records if any exist using the new user ID
                if (m.payments && m.payments.length > 0 && newUserId) {
                    const paymentRows = m.payments.map(p => ({
                        member_id: newUserId,
                        member_name: m.full_name,
                        month: p.month,
                        amount: p.amount,
                        status: p.status || 'paid',
                        payment_date: new Date().toISOString().split('T')[0],
                        reference: 'Excel Import'
                    }));

                    const { error: payError } = await client
                        .from('payments')
                        .insert(paymentRows);

                    if (payError) {
                        console.error(`Error inserting payments for ${m.email}:`, payError);
                        errorMessages.push(`${m.full_name} payments: ${payError.message}`);
                    }
                }

                importedCount++;
                // Update progress
                btnProcessImport.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Importing ${importedCount}/${scannedMembersToImport.length}...`;
            }

            if (importedCount > 0) {
                importMsg.innerHTML = `<i class="fa-solid fa-check-circle"></i> Successfully imported ${importedCount} of ${scannedMembersToImport.length} members.` + 
                    (errorMessages.length > 0 ? `<br><small style="color:#d97706;">${errorMessages.length} errors occurred.</small>` : '');
                importMsg.className = "admin-msg success";
                importMsg.style.display = "block";
                importResults.style.display = "none";
                scannedMembersToImport = [];
                importFile.value = '';
                
                // Refresh list
                loadAdminData();
            } else {
                throw new Error("No members were imported. " + errorMessages.join('; '));
            }
            
        } catch (err) {
            console.error("Import Error:", err);
            importMsg.textContent = "Error importing members: " + err.message;
            importMsg.className = "admin-msg error";
            importMsg.style.display = "block";
        } finally {
            btnProcessImport.disabled = false;
            btnProcessImport.innerHTML = '<i class="fa-solid fa-cloud-arrow-up"></i> Import All';
        }
    });
}

// =============================================
// ADMIN: VIEW MEMBER PAYMENTS
// =============================================
window.loadMemberPaymentsAdmin = async function(memberId) {
    const section = document.getElementById('adminMemberPaymentsSection');
    const tbody = document.getElementById('adminMemberPaymentsBody');
    const totalPaidEl = document.getElementById('adminMemberTotalPaid');
    const totalPendingEl = document.getElementById('adminMemberTotalPending');
    
    if (!memberId) {
        section.style.display = 'none';
        return;
    }
    
    section.style.display = 'block';
    tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;"><i class="fa-solid fa-spinner fa-spin"></i> Loading payments...</td></tr>';
    
    try {
        const { data: payments, error } = await client
            .from('payments')
            .select('*')
            .eq('member_id', memberId)
            .order('payment_date', { ascending: false });
            
        if (error) throw error;
        
        let totalPaid = 0;
        let totalPending = 0;
        
        if (!payments || payments.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" class="empty-state" style="text-align:center; padding: 20px;"><p style="color:#6b7280; margin:0;">No payment records found for this member.</p></td></tr>';
        } else {
            // Make sure these payments are also accessible for the edit modal
            window.allPayments = window.allPayments || [];
            payments.forEach(p => {
                if (!window.allPayments.find(existing => existing.id === p.id)) {
                    window.allPayments.push(p);
                }
            });

            tbody.innerHTML = payments.map(p => {
                let statusBadge = '';
                if (p.status === 'paid') {
                    statusBadge = '<span style="background:#dcfce7; color:#166534; padding:3px 8px; border-radius:12px; font-size:0.75rem; font-weight:600;">Paid</span>';
                    totalPaid += parseFloat(p.amount) || 0;
                } else if (p.status === 'pending') {
                    statusBadge = '<span style="background:#fef3c7; color:#92400e; padding:3px 8px; border-radius:12px; font-size:0.75rem; font-weight:600;">Pending</span>';
                    totalPending += parseFloat(p.amount) || 0;
                } else {
                    statusBadge = '<span style="background:#fee2e2; color:#b91c1c; padding:3px 8px; border-radius:12px; font-size:0.75rem; font-weight:600;">Overdue</span>';
                }
                
                return `
                    <tr>
                        <td><strong>${p.month}</strong></td>
                        <td>KES ${p.amount.toLocaleString()}</td>
                        <td>${new Date(p.payment_date).toLocaleDateString()}</td>
                        <td>${statusBadge}</td>
                        <td style="font-family:monospace; color:#6b7280;">${p.reference || '-'}</td>
                        <td>
                            <div style="display:flex; gap:5px; flex-wrap:wrap;">
                                <button type="button" class="admin-payment-action" data-action="edit-payment" data-payment-id="${p.id}" style="background:var(--color-purple); color:white; border:none; padding:5px 10px; border-radius:5px; cursor:pointer; font-size:0.75rem; display:flex; align-items:center; gap:4px;"><i class="fa-solid fa-pen"></i> Edit</button>
                                <button type="button" class="admin-payment-action" data-action="delete-payment" data-payment-id="${p.id}" style="background:#ef4444; color:white; border:none; padding:5px 10px; border-radius:5px; cursor:pointer; font-size:0.75rem; display:flex; align-items:center; gap:4px;"><i class="fa-solid fa-trash"></i> Del</button>
                            </div>
                        </td>
                    </tr>
                `;
            }).join('');
        }
        
        totalPaidEl.textContent = `KES ${totalPaid.toLocaleString()}`;
        totalPendingEl.textContent = `KES ${totalPending.toLocaleString()}`;
        
    } catch (err) {
        console.error("Error loading member payments:", err);
        tbody.innerHTML = `<tr><td colspan="6" style="text-align:center; color:red;">Error loading payments: ${err.message}</td></tr>`;
    }
};

// =============================================
// DYNAMIC PROFILE FORM & EXPORTS
// =============================================

// Canonical field definitions — these are the ONLY keys used for storage
const canonicalFields = {
    'phone':                    { label: "Phone Number",              key: "phone",                    type: "tel",    required: true, isFieldOnMember: true },
    'date_of_birth':            { label: "Date of Birth",             key: "date_of_birth",            type: "date",   required: true },
    'gender':                   { label: "Gender",                    key: "gender",                   type: "select", options: ["Male", "Female"], required: true },
    'marital_status':           { label: "Marital Status",            key: "marital_status",           type: "select", options: ["Married", "Single", "Divorced", "Widowed"], required: true },
    'national_id_number':       { label: "National ID Number",        key: "national_id_number",       type: "text",   required: true },
    'occupation':               { label: "Occupation / Profession",   key: "occupation",               type: "text",   required: true },
    'has_dependants':           { label: "Has Dependants",            key: "has_dependants",           type: "text",   required: false },
    'dependant_types':          { label: "Dependant Types",           key: "dependant_types",          type: "text",   required: false },
    'relatives':                { label: "Other Relatives",           key: "relatives",                type: "text",   required: false },
    'next_of_kin_full_name':    { label: "Next of Kin Full Name",     key: "next_of_kin_full_name",    type: "text",   required: true },
    'next_of_kin_national_id_number': { label: "Next of Kin National ID Number", key: "next_of_kin_national_id_number", type: "text", required: true },
    'next_of_kin_phone_number': { label: "Next of Kin Phone Number",  key: "next_of_kin_phone_number", type: "text",   required: true },
    'relationship_to_you':      { label: "Relationship to Next of Kin", key: "relationship_to_you",    type: "text",   required: true }
};

// Map legacy / display-name keys to canonical keys (all lowercase for matching)
const variationsMap = {
    'date_of_birth':            ['date of birth', 'dob', 'date_of_birth'],
    'gender':                   ['gender'],
    'marital_status':           ['marital status', 'marital_status'],
    'national_id_number':       ['national id number', 'id number', 'national id', 'id_number', 'national_id_number'],
    'occupation':               ['occupation', 'profession', 'occupation/profession', 'occupation / profession'],
    'has_dependants':           ['has dependants', 'dependants', 'has_dependants'],
    'dependant_types':          ['dependant types', 'dependants types', 'dependant_types'],
    'relatives':                ['relatives'],
    'next_of_kin_full_name':    ['next of kin full name', 'next of kin name', 'next_of_kin_name', 'next_of_kin_full_name'],
    'next_of_kin_national_id_number': ['next of kin national id number', 'next of kin national id', 'next_of_kin_id', 'next_of_kin_national_id_number'],
    'next_of_kin_phone_number': ['next of kin phone number', 'next of kin phone', 'next_of_kin_phone', 'next_of_kin_phone_number'],
    'relationship_to_you':      ['relationship to you', 'relationship_to_you', 'next of kin relationship', 'relationship', 'next_of_kin_relationship']
};

// Normalize any key string to a canonical key (returns null if no match)
const normalizeToCanonical = (raw) => {
    const clean = raw.toLowerCase().trim().replace(/\s+/g, ' ');
    for (const [canonical, variations] of Object.entries(variationsMap)) {
        if (canonical === clean) return canonical;
        if (variations.some(v => v.toLowerCase().trim() === clean)) return canonical;
    }
    return null;
};

// Read a value from form_details trying all known variations of a canonical key
const resolveFieldValue = (fd, canonicalKey) => {
    if (!fd) return undefined;
    
    let result = undefined;
    
    // Direct match first
    if (fd[canonicalKey] !== undefined && fd[canonicalKey] !== null && String(fd[canonicalKey]).trim() !== '') {
        result = fd[canonicalKey];
    } else {
        // Try all variations
        const variations = variationsMap[canonicalKey] || [];
        for (const fdKey of Object.keys(fd)) {
            const cleanFdKey = fdKey.toLowerCase().trim();
            if (cleanFdKey === canonicalKey || variations.some(v => v.toLowerCase().trim() === cleanFdKey)) {
                result = fd[fdKey];
                break;
            }
        }
    }
    
    // Format arrays and objects properly instead of returning [object Object]
    if (result && Array.isArray(result)) {
        if (result.length === 0) return '';
        // If it's an array of relative objects
        if (typeof result[0] === 'object') {
            return result.map(r => `${r.full_name || ''} (${r.relationship || ''}) - ${r.phone || ''}`).join(', ');
        }
        return result.join(', ');
    } else if (result && typeof result === 'object') {
        return JSON.stringify(result);
    }
    
    return result;
};

// Normalize a date value to YYYY-MM-DD for <input type="date">
const normalizeDateValue = (val) => {
    if (!val) return '';
    const str = String(val).trim();
    // Already YYYY-MM-DD
    if (/^\d{4}-\d{2}-\d{2}$/.test(str)) return str;
    // Excel serial number (a number > 25000 roughly)
    const num = Number(str);
    if (!isNaN(num) && num > 25000 && num < 60000) {
        const d = new Date((num - 25569) * 86400 * 1000);
        return d.toISOString().split('T')[0];
    }
    // DD/MM/YYYY
    const ddmmyyyy = str.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
    if (ddmmyyyy) return `${ddmmyyyy[3]}-${ddmmyyyy[2].padStart(2,'0')}-${ddmmyyyy[1].padStart(2,'0')}`;
    // Try native parse
    const parsed = new Date(str);
    if (!isNaN(parsed.getTime())) return parsed.toISOString().split('T')[0];
    return str;
};

// Build the ordered schema array (always all canonical fields)
const buildProfileSchema = () => {
    const ordered = [
        'phone', 'date_of_birth', 'gender', 'marital_status',
        'national_id_number', 'occupation', 'has_dependants', 'dependant_types', 'relatives',
        'next_of_kin_full_name', 'next_of_kin_national_id_number',
        'next_of_kin_phone_number', 'relationship_to_you'
    ];
    return ordered.map(k => ({ ...canonicalFields[k] }));
};

// Open the modal to allow members to edit their own profiles
window.openUpdateProfileModal = async function() {
    const container = document.getElementById('dynamicProfileFieldsContainer');
    const msg = document.getElementById('updateProfileMsg');
    if (!container) return;
    
    container.innerHTML = '<div style="grid-column: span 2; text-align:center;"><i class="fa-solid fa-spinner fa-spin"></i> Loading form fields...</div>';
    if (msg) msg.style.display = 'none';
    openModal('updateProfileModal');
    
    // Always use the canonical schema — show ALL fields
    const schema = buildProfileSchema();
    window.currentProfileSchema = schema;

    const fd = currentMember.form_details || {};
    const isMissing = (val) => !val || String(val).trim() === '';

    // Count how many required fields are missing
    const missingCount = schema.filter(f => {
        if (f.isFieldOnMember) return isMissing(currentMember[f.key]);
        return isMissing(resolveFieldValue(fd, f.key));
    }).length;
    
    let html = '';
    if (missingCount > 0) {
        html += `
            <div style="grid-column: span 2; background: #fffbeb; border: 1px solid #fef3c7; border-left: 4px solid #d97706; padding: 12px; border-radius: 8px; margin-bottom: 10px;">
                <p style="margin: 0; color: #92400e; font-size: 0.9rem; font-weight: 600;">
                    <i class="fa-solid fa-circle-exclamation"></i> You have ${missingCount} missing field${missingCount > 1 ? 's' : ''}. Please fill in the highlighted fields below.
                </p>
            </div>
        `;
    } else {
        html += `
            <div style="grid-column: span 2; background: #f0fdf4; border: 1px solid #dcfce7; border-left: 4px solid #16a34a; padding: 12px; border-radius: 8px; margin-bottom: 10px;">
                <p style="margin: 0; color: #166534; font-size: 0.9rem; font-weight: 600;">
                    <i class="fa-solid fa-circle-check"></i> Your profile is complete! You can update your details below:
                </p>
            </div>
        `;
    }

    // Render ALL fields with existing values pre-filled
    schema.forEach((field, index) => {
        let val = '';
        if (field.isFieldOnMember) {
            val = currentMember[field.key] || '';
        } else {
            val = resolveFieldValue(fd, field.key) || '';
        }

        const inputId = `member_up_${field.key}`;
        const reqAttr = field.required ? 'required' : '';
        const fieldIsMissing = field.required && isMissing(val);
        const highlightStyle = fieldIsMissing ? 'border: 2px solid #d97706; background: #fffbeb;' : '';
        
        let inputHtml = '';
        if (field.type === 'select') {
            const selectOptions = (field.options || []).map(opt => {
                const selected = String(val).toLowerCase() === opt.toLowerCase() ? 'selected' : '';
                return `<option value="${opt}" ${selected}>${opt}</option>`;
            }).join('');
            inputHtml = `
                <select id="${inputId}" ${reqAttr} style="${highlightStyle}">
                    <option value="">— Select —</option>
                    ${selectOptions}
                </select>
            `;
        } else if (field.type === 'boolean') {
            const cleanVal = String(val).toLowerCase();
            const isYes = cleanVal === 'yes' || cleanVal === 'true' || cleanVal === 'y';
            const isNo = cleanVal === 'no' || cleanVal === 'false' || cleanVal === 'n';
            inputHtml = `
                <div style="display: flex; gap: 20px; align-items: center; padding: 10px 0;">
                    <label style="display: inline-flex; align-items: center; gap: 6px; font-weight: normal; margin: 0; cursor: pointer;">
                        <input type="radio" name="${inputId}_bool" id="${inputId}_yes" value="Yes" ${isYes ? 'checked' : ''}> Yes
                    </label>
                    <label style="display: inline-flex; align-items: center; gap: 6px; font-weight: normal; margin: 0; cursor: pointer;">
                        <input type="radio" name="${inputId}_bool" id="${inputId}_no" value="No" ${isNo ? 'checked' : ''}> No
                    </label>
                </div>
            `;
        } else if (field.type === 'date') {
            const dateVal = normalizeDateValue(val);
            inputHtml = `<input type="date" id="${inputId}" ${reqAttr} value="${dateVal}" style="${highlightStyle}">`;
        } else {
            inputHtml = `<input type="${field.type || 'text'}" id="${inputId}" ${reqAttr} value="${val}" placeholder="${field.label}" style="${highlightStyle}">`;
        }
        
        html += `
            <div class="form-group" style="grid-column: span 1;">
                <label style="font-weight: 600; color: #374151;">${field.label} ${field.required ? '<span style="color:red;">*</span>' : ''} ${fieldIsMissing ? '<span style="color:#d97706; font-size:0.75rem;">(missing)</span>' : ''}</label>
                ${inputHtml}
            </div>
        `;
    });
    
    container.innerHTML = html;
};

// Handle submission of the update profile form
const updateProfileForm = document.getElementById('updateProfileForm');
if (updateProfileForm) {
    updateProfileForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const msg = document.getElementById('updateProfileMsg');
        const submitBtn = updateProfileForm.querySelector('button[type="submit"]');
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Saving...';
        if (msg) msg.style.display = 'none';
        
        const schema = window.currentProfileSchema || buildProfileSchema();
        
        // Start from existing form_details and MERGE (never remove existing keys)
        const mergedFormDetails = { ...(currentMember.form_details || {}) };
        let phone = currentMember.phone;

        schema.forEach((field) => {
            const inputId = `member_up_${field.key}`;
            let val = '';
            
            if (field.type === 'boolean') {
                const yesEl = document.getElementById(`${inputId}_yes`);
                const noEl = document.getElementById(`${inputId}_no`);
                if (yesEl && yesEl.checked) val = 'Yes';
                else if (noEl && noEl.checked) val = 'No';
            } else {
                const inputEl = document.getElementById(inputId);
                if (inputEl) val = inputEl.value.trim();
            }
            
            if (field.isFieldOnMember) {
                if (field.key === 'phone') phone = val;
            } else {
                // Always save using the CANONICAL key, even if empty (allows clearing corrupted data)
                mergedFormDetails[field.key] = val;
            }
        });

        try {
            const { error } = await client
                .from('members')
                .update({
                    phone: phone || null,
                    form_details: mergedFormDetails
                })
                .eq('id', currentMember.id);
                
            if (error) throw error;
            
            // IMPORTANT: Refetch the member from database to get fresh data
            const { data: freshMember, error: fetchErr } = await client
                .from('members')
                .select('*')
                .eq('id', currentMember.id)
                .single();
            
            if (!fetchErr && freshMember) {
                // Replace local state with fresh database record
                currentMember = freshMember;
                window.currentMember = freshMember;
            }
            
            // Close modal
            closeModal('updateProfileModal');
            alert('Your profile has been updated successfully!');
            
            // Re-render the full dashboard with fresh data
            checkUserAndLoadDashboard(currentSessionUser);
            
        } catch (err) {
            if (msg) {
                msg.textContent = err.message;
                msg.style.display = 'block';
                msg.className = 'auth-error';
            }
        } finally {
            submitBtn.disabled = false;
            submitBtn.innerHTML = '<i class="fa-solid fa-save"></i> Save Profile Details';
        }
    });
}

// Export all members' data to an Excel file
// Export all members' data to an Excel file
window.exportMembersToExcel = async function() {
    try {
        const { data: members, error } = await client
            .from('members')
            .select('*')
            .order('full_name');
            
        if (error) throw error;
        
        const schema = typeof buildProfileSchema === 'function' ? buildProfileSchema() : [];
        
        const flattened = members.map(m => {
            const row = {
                "Full Name": m.full_name,
                "Email": m.email,
                "Phone": m.phone || '',
                "Role": m.role.toUpperCase(),
                "Status": m.status,
                "Join Date": m.join_date ? new Date(m.join_date).toLocaleDateString() : ''
            };
            
            const fd = m.form_details || {};
            schema.forEach(field => {
                if (field.key === 'phone') return;
                const val = typeof resolveFieldValue === 'function' ? resolveFieldValue(fd, field.key) : fd[field.key];
                row[field.label] = val || '';
            });
            
            return row;
        });
        
        const wsData = [
            ["GLAMOROUS CARE INITIATIVE - MEMBERS DIRECTORY"],
            ["Generated on " + new Date().toLocaleDateString()],
            []
        ];
        
        const headers = Object.keys(flattened[0] || {});
        wsData.push(headers);
        
        flattened.forEach(rowObj => {
            wsData.push(headers.map(h => rowObj[h]));
        });
        
        const worksheet = XLSX.utils.aoa_to_sheet(wsData);
        
        if(!worksheet['!merges']) worksheet['!merges'] = [];
        worksheet['!merges'].push({ s: {r:0, c:0}, e: {r:0, c:headers.length-1} });
        worksheet['!merges'].push({ s: {r:1, c:0}, e: {r:1, c:headers.length-1} });
        
        const colWidths = headers.map(h => ({ wch: Math.max(15, h.length + 5) }));
        worksheet['!cols'] = colWidths;
        
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "GCI Members");
        XLSX.writeFile(workbook, "GCI_Members_Data.xlsx");
        
    } catch (err) {
        alert("Export failed: " + err.message);
    }
};

// Export all members' data as a printable PDF report
window.exportMembersToPDF = async function() {
    try {
        const { data: members, error } = await client
            .from('members')
            .select('*')
            .order('full_name');
            
        if (error) throw error;
        
        const schema = typeof buildProfileSchema === 'function' ? buildProfileSchema() : [];
        const printWindow = window.open('', '_blank');
        
        // Get Logo Base64
        let logoBase64 = '';
        try {
            const response = await fetch('assets/logo.png');
            const blob = await response.blob();
            logoBase64 = await new Promise((resolve) => {
                const reader = new FileReader();
                reader.onloadend = () => resolve(reader.result);
                reader.readAsDataURL(blob);
            });
        } catch(e) {
            console.warn("Could not load logo for PDF", e);
        }
        
        let cardsHTML = '';
        members.forEach(m => {
            const fd = m.form_details || {};
            
            let detailsHTML = `
                <div class="field-row"><strong>Email:</strong> <span>${m.email}</span></div>
                <div class="field-row"><strong>Phone:</strong> <span>${m.phone || 'N/A'}</span></div>
                <div class="field-row"><strong>Role:</strong> <span>${m.role.toUpperCase()}</span></div>
                <div class="field-row"><strong>Status:</strong> <span class="status-${m.status}">${m.status}</span></div>
            `;
            
            schema.forEach(field => {
                if (field.key === 'phone') return;
                const val = typeof resolveFieldValue === 'function' ? resolveFieldValue(fd, field.key) : fd[field.key];
                if (val) {
                    detailsHTML += `<div class="field-row"><strong>${field.label}:</strong> <span>${val}</span></div>`;
                }
            });
            
            cardsHTML += `
                <div class="card">
                    <div class="card-header">${m.full_name}</div>
                    <div class="card-body">
                        ${detailsHTML}
                    </div>
                </div>
            `;
        });
        
        const logoHTML = logoBase64 ? `<img src="${logoBase64}" class="logo">` : '';
        
        const html = `
            <html>
            <head>
                <title>GCI Members Directory Report</title>
                <style>
                    body { font-family: 'Segoe UI', Arial, sans-serif; color: #333; margin: 0; padding: 20px; background: white; }
                    .header { text-align: center; border-bottom: 3px solid #1e3a8a; padding-bottom: 20px; margin-bottom: 30px; }
                    .logo { width: 80px; height: auto; margin-bottom: 10px; }
                    .title { font-size: 26px; font-weight: bold; color: #1e3a8a; margin: 0; text-transform: uppercase; }
                    .subtitle { font-size: 16px; color: #555; margin: 5px 0 0 0; }
                    .meta { font-size: 13px; color: #666; margin-top: 10px; }
                    
                    .cards-container { display: grid; grid-template-columns: repeat(2, 1fr); gap: 20px; }
                    
                    .card { border: 1px solid #ccc; border-radius: 8px; break-inside: avoid; background: #fff; }
                    .card-header { background: #1e3a8a; color: white; padding: 10px 15px; font-weight: bold; font-size: 16px; border-top-left-radius: 7px; border-top-right-radius: 7px; }
                    .card-body { padding: 15px; display: flex; flex-direction: column; gap: 8px; font-size: 12px; }
                    .field-row { display: flex; justify-content: space-between; border-bottom: 1px dashed #eee; padding-bottom: 4px; }
                    .field-row strong { color: #555; width: 45%; }
                    .field-row span { width: 55%; text-align: right; font-weight: 500; }
                    
                    .status-active { color: #16a34a; font-weight: bold; }
                    .status-probation { color: #d97706; font-weight: bold; }
                    
                    @media print {
                        body { padding: 0; margin: 15px; }
                        .card { box-shadow: none; }
                    }
                </style>
            </head>
            <body>
                <div class="header">
                    ${logoHTML}
                    <div class="title">GLAMOROUS CARE INITIATIVE</div>
                    <div class="subtitle">Official Members Directory & Records</div>
                    <div class="meta">
                        Total Members: ${members.length} | Generated On: ${new Date().toLocaleDateString()}
                    </div>
                </div>
                <div class="cards-container">
                    ${cardsHTML}
                </div>
                <div style="margin-top: 40px; text-align: center; font-size: 11px; color: #999; border-top: 1px solid #eee; padding-top: 10px; break-inside: avoid;">
                    This is an officially generated system report for GCI Administration. &copy; ${new Date().getFullYear()} GCI
                </div>
                <script>
                    window.onload = function() {
                        setTimeout(function() {
                            window.print();
                            setTimeout(function() { window.close(); }, 500);
                        }, 500); // Give time for images to fully render
                    };
                </script>
            </body>
            </html>
        `;
        
        printWindow.document.write(html);
        printWindow.document.close();
        
    } catch (err) {
        alert("Export failed: " + err.message);
    }
};

// Export all members' data to a Word Document
window.exportMembersToWord = async function() {
    try {
        // Lazy-load docx library on first use (avoids Chrome background tab throttling)
        if (!window.docx) {
            await new Promise((resolve, reject) => {
                const script = document.createElement('script');
                script.src = 'https://unpkg.com/docx@8.2.3/build/index.umd.js';
                script.onload = resolve;
                script.onerror = () => reject(new Error('Failed to load Word export library'));
                document.head.appendChild(script);
            });
        }
        
        const { data: members, error } = await client
            .from('members')
            .select('*')
            .order('full_name');
            
        if (error) throw error;
        
        const schema = typeof buildProfileSchema === 'function' ? buildProfileSchema() : [];
        const { Document, Packer, Paragraph, TextRun, HeadingLevel, ImageRun, Table, TableRow, TableCell, BorderStyle, WidthType, AlignmentType, PageBreak } = window.docx;

        let logoImage = null;
        try {
            const response = await fetch('assets/logo.png');
            const blob = await response.blob();
            logoImage = await blob.arrayBuffer();
        } catch (e) {
            console.warn('Could not load logo for Word export', e);
        }

        const children = [];

        // Cover / Header
        if (logoImage) {
            children.push(
                new Paragraph({
                    alignment: AlignmentType.CENTER,
                    children: [
                        new ImageRun({
                            data: logoImage,
                            transformation: { width: 100, height: 100 },
                        }),
                    ],
                })
            );
        }

        children.push(
            new Paragraph({
                text: "GLAMOROUS CARE INITIATIVE",
                heading: HeadingLevel.TITLE,
                alignment: AlignmentType.CENTER,
            }),
            new Paragraph({
                text: "Official Members Directory",
                heading: HeadingLevel.HEADING_1,
                alignment: AlignmentType.CENTER,
            }),
            new Paragraph({
                text: `Generated on ${new Date().toLocaleDateString()}  |  Total Members: ${members.length}`,
                alignment: AlignmentType.CENTER,
            }),
            new Paragraph({ text: "", spacing: { after: 400 } })
        );

        // Members Loop
        members.forEach((m, index) => {
            const fd = m.form_details || {};
            
            // Member Name Header
            children.push(
                new Paragraph({
                    text: m.full_name,
                    heading: HeadingLevel.HEADING_2,
                    spacing: { before: 400, after: 100 }
                })
            );

            // Table for member details
            const tableRows = [];
            
            // Add basic fields
            const addRow = (label, value) => {
                tableRows.push(
                    new TableRow({
                        children: [
                            new TableCell({
                                children: [new Paragraph({ children: [new TextRun({ text: label, bold: true })] })],
                                width: { size: 30, type: WidthType.PERCENTAGE },
                            }),
                            new TableCell({
                                children: [new Paragraph({ text: value || 'N/A' })],
                                width: { size: 70, type: WidthType.PERCENTAGE },
                            }),
                        ],
                    })
                );
            };

            addRow("Email", m.email);
            addRow("Phone", m.phone);
            addRow("Role", m.role.toUpperCase());
            addRow("Status", m.status);

            // Add schema fields
            schema.forEach(field => {
                if (field.key === 'phone') return;
                const val = typeof resolveFieldValue === 'function' ? resolveFieldValue(fd, field.key) : fd[field.key];
                if (val) {
                    addRow(field.label, String(val));
                }
            });

            const table = new Table({
                rows: tableRows,
                width: { size: 100, type: WidthType.PERCENTAGE },
            });
            children.push(table);
            
            // Spacing after each member
            children.push(new Paragraph({ text: "", spacing: { after: 200 } }));
        });

        const doc = new Document({
            sections: [{
                properties: {},
                children: children
            }]
        });

        const blob = await Packer.toBlob(doc);
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "GCI_Members_Directory.docx";
        a.click();
        URL.revokeObjectURL(url);
        
    } catch (err) {
        console.error(err);
        alert("Word Export failed: " + err.message);
    }
};

// =============================================
// RELATIVE CARD ADD/REMOVE
// =============================================
let currentRelativeCount = 1;

window.addRelativeCard = function() {
    if (currentRelativeCount >= 3) return;
    currentRelativeCount++;
    document.getElementById('relative' + currentRelativeCount + 'Card').style.display = 'block';
    
    if (currentRelativeCount >= 3) {
        document.getElementById('btnAddRelative').style.display = 'none';
    }
    document.getElementById('btnRemoveRelative').style.display = 'inline-flex';
};

window.removeRelativeCard = function() {
    if (currentRelativeCount <= 1) return;
    document.getElementById('relative' + currentRelativeCount + 'Card').style.display = 'none';
    // Clear the hidden card's fields
    document.getElementById('rel' + currentRelativeCount + 'Type').value = '';
    document.getElementById('rel' + currentRelativeCount + 'Name').value = '';
    document.getElementById('rel' + currentRelativeCount + 'Id').value = '';
    document.getElementById('rel' + currentRelativeCount + 'Phone').value = '';
    currentRelativeCount--;
    
    if (currentRelativeCount <= 1) {
        document.getElementById('btnRemoveRelative').style.display = 'none';
    }
    document.getElementById('btnAddRelative').style.display = 'inline-flex';
};

// =============================================
// REGISTRATION FORM HANDLER
// =============================================
const registrationForm = document.getElementById('registrationForm');
if (registrationForm) {
    registrationForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const msgDiv = document.getElementById('registerMsg');
        const submitBtn = document.getElementById('btnSubmitRegistration');
        
        const fullName = document.getElementById('regFullName').value.trim();
        const email = document.getElementById('regEmail').value.trim().toLowerCase();
        const phone = document.getElementById('regPhone').value.trim();
        const dob = document.getElementById('regDob').value;
        const gender = document.getElementById('regGender').value;
        const maritalStatus = document.getElementById('regMaritalStatus').value;
        const idNumber = document.getElementById('regIdNumber').value.trim();
        const occupation = document.getElementById('regOccupation').value.trim();
        
        // Dependants
        const hasDependants = document.querySelector('input[name="regHasDependants"]:checked')?.value || 'No';
        const depTypes = Array.from(document.querySelectorAll('input[name="regDepTypes"]:checked')).map(cb => cb.value);
        
        // Relatives
        const relatives = [];
        for (let i = 1; i <= 3; i++) {
            const card = document.getElementById('relative' + i + 'Card');
            if (card && card.style.display !== 'none') {
                const relType = document.getElementById('rel' + i + 'Type').value;
                const relName = document.getElementById('rel' + i + 'Name').value.trim();
                const relId = document.getElementById('rel' + i + 'Id').value.trim();
                const relPhone = document.getElementById('rel' + i + 'Phone').value.trim();
                if (relName || relType) {
                    relatives.push({
                        relationship: relType,
                        full_name: relName,
                        id_number: relId,
                        phone: relPhone
                    });
                }
            }
        }
        
        // Next of Kin
        const nokName = document.getElementById('regNokName').value.trim();
        const nokId = document.getElementById('regNokId').value.trim();
        const nokPhone = document.getElementById('regNokPhone').value.trim();
        const nokRelationship = document.getElementById('regNokRelationship').value.trim();
        
        if (!fullName || !email || !phone) {
            msgDiv.className = 'admin-msg error';
            msgDiv.style.display = 'block';
            msgDiv.textContent = 'Please fill in all required fields.';
            msgDiv.scrollIntoView({ behavior: 'smooth', block: 'center' });
            return;
        }
        
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Submitting...';
        
        const formDetails = {
            'date_of_birth': dob,
            'gender': gender,
            'marital_status': maritalStatus,
            'national_id_number': idNumber,
            'occupation': occupation,
            'Has Dependants': hasDependants,
            'Dependant Types': depTypes.join(', '),
            'Relatives': relatives,
            'next_of_kin_full_name': nokName,
            'next_of_kin_national_id_number': nokId,
            'next_of_kin_phone_number': nokPhone,
            'relationship_to_you': nokRelationship
        };
        
        try {
            const { data: newUserId, error } = await client.rpc('import_single_member', {
                p_full_name: fullName,
                p_email: email,
                p_phone: phone,
                p_status: 'active',
                p_form_details: formDetails
            });
            
            if (error) throw error;
            
            msgDiv.className = 'admin-msg success';
            msgDiv.style.display = 'block';
            msgDiv.innerHTML = `
                <div style="text-align: center;">
                    <i class="fa-solid fa-circle-check" style="font-size: 2rem; color: #16a34a; display: block; margin-bottom: 10px;"></i>
                    <h4 style="margin: 0 0 10px; color: #166534;">Registration Successful!</h4>
                    <p style="margin: 0 0 5px;">Welcome to Glamorous Care Initiative, <strong>${fullName}</strong>!</p>
                    <p style="margin: 0 0 15px;">Your account has been created. You can now log in using:</p>
                    <div style="background: #f0fdf4; padding: 15px; border-radius: 10px; display: inline-block; text-align: left;">
                        <p style="margin: 0 0 5px;"><strong>Email:</strong> ${email}</p>
                        <p style="margin: 0;"><strong>Password:</strong> 12345678</p>
                    </div>
                    <p style="margin: 15px 0 0; font-size: 0.85rem; color: #6b7280;">You will be asked to change your password on first login.</p>
                    <a href="#portal" class="btn btn-primary" style="margin-top: 15px; display: inline-block;"><i class="fa-solid fa-right-to-bracket"></i> Go to Login</a>
                </div>
            `;
            registrationForm.reset();
            registrationForm.style.display = 'none';
            msgDiv.scrollIntoView({ behavior: 'smooth', block: 'center' });
            
        } catch (err) {
            msgDiv.className = 'admin-msg error';
            msgDiv.style.display = 'block';
            msgDiv.textContent = 'Registration Error: ' + err.message;
        }
        
        submitBtn.disabled = false;
        submitBtn.innerHTML = '<i class="fa-solid fa-paper-plane"></i> Submit Registration';
        msgDiv.scrollIntoView({ behavior: 'smooth', block: 'center' });
    });
}
