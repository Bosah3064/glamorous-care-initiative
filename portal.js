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
        const missingFields = [];
        const fd = member.form_details || {};
        
        const isMissing = (val) => !val || String(val).trim() === '';
        
        if (isMissing(member.phone)) missingFields.push('<li><strong>Phone Number</strong></li>');
        if (isMissing(fd.date_of_birth)) missingFields.push('<li><strong>Date of Birth</strong></li>');
        if (isMissing(fd.gender)) missingFields.push('<li><strong>Gender</strong></li>');
        if (isMissing(fd.marital_status)) missingFields.push('<li><strong>Marital Status</strong></li>');
        if (isMissing(fd.id_number)) missingFields.push('<li><strong>National ID Number</strong></li>');
        if (isMissing(fd.occupation)) missingFields.push('<li><strong>Occupation / Profession</strong></li>');
        if (isMissing(fd.next_of_kin_name)) missingFields.push('<li><strong>Next of Kin Name</strong></li>');
        if (isMissing(fd.next_of_kin_phone)) missingFields.push('<li><strong>Next of Kin Phone</strong></li>');

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
}

// =============================================
// RENDER FORM DETAILS
// =============================================
function renderFormDetails(member) {
    const grid = document.getElementById('profileDetailsGrid');
    if (!grid) return;
    
    let html = `
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

    const iconMap = {
        'id_number': 'fa-id-card',
        'id number': 'fa-id-card',
        'national id': 'fa-id-card',
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

    const details = member.form_details || {};

    for (const [key, value] of Object.entries(details)) {
        if (!value || String(value).trim() === '') continue;
        
        let displayValue = value;
        const formattedKey = key.replace(/_/g, ' ').split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
        
        // Format date of birth professionally
        const lowerKey = key.toLowerCase();
        if (lowerKey.includes('date of birth') || lowerKey.includes('dob') || lowerKey.includes('date_of_birth')) {
            if (!isNaN(value) && String(value).trim() !== '') {
               const excelEpoch = new Date(1899, 11, 31);
               const dob = new Date(excelEpoch.getTime() + Number(value) * 86400000);
               if (!isNaN(dob)) {
                   displayValue = dob.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
               }
            } else {
               const dob = new Date(value);
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

        html += `
            <div class="detail-item">
                <i class="fa-solid ${icon}"></i>
                <div>
                    <small>${formattedKey}</small>
                    <p>${displayValue}</p>
                </div>
            </div>
        `;
    }

    grid.innerHTML = html;
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
                <td><strong>KES ${payment.amount.toLocaleString()}</strong></td>
                <td>${formatDate(payment.payment_date)}</td>
                <td><span class="status-badge ${statusClass}"><i class="fa-solid ${statusIcon}"></i> ${payment.status.charAt(0).toUpperCase() + payment.status.slice(1)}</span></td>
                <td>${payment.reference || '—'}</td>
                ${isAdmin ? `<td>${editBtn}</td>` : ''}
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
    renderMembersList(allMembers, ""); // pass empty string to hide by default
    populateMemberDropdown(allMembers);
    setupAdminEventListeners();
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
}

// Setup admin event listeners (only once)
let adminListenersAttached = false;
function setupAdminEventListeners() {
    if (adminListenersAttached) return;
    adminListenersAttached = true;

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
                    const customFields = headers.filter(h => {
                        const clean = h.trim().toLowerCase();
                        return !ignoreHeaders.some(ignore => clean.includes(ignore)) && clean !== '';
                    });

                    if (customFields.length === 0) {
                        throw new Error("No custom fields (columns) found in the Excel sheet.");
                    }

                    const { error } = await client.from('form_schema').upsert({
                        key: 'profile_fields',
                        fields: customFields,
                        updated_at: new Date().toISOString()
                    });

                    if (error) throw error;

                    configMsg.className = "admin-msg success";
                    configMsg.style.display = "block";
                    configMsg.innerHTML = `<i class="fa-solid fa-check-circle"></i> Successfully configured ${customFields.length} custom fields!`;
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

// =============================================
// DOM LOADED INIT
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
    document.getElementById('editMemberModal').style.display = 'flex';
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
            document.getElementById('editMemberModal').style.display = 'none';
            // Refresh list
            loadAdminData();
        }
        
        btn.disabled = false;
        btn.innerHTML = '<i class="fa-solid fa-save"></i> Save Changes';
    });
}

// EDIT PAYMENT
window.openEditPaymentModal = function(id) {
    const payment = window.allPayments.find(p => p.id === id);
    if (!payment) return;
    
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
    document.getElementById('editPaymentRef').value = payment.reference || '';
    
    document.getElementById('editPaymentMsg').style.display = 'none';
    document.getElementById('editPaymentModal').style.display = 'flex';
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
        const updates = {
            amount: document.getElementById('editPaymentAmount').value,
            month: document.getElementById('editPaymentMonth').value,
            payment_date: document.getElementById('editPaymentDate').value,
            status: document.getElementById('editPaymentStatus').value,
            reference: document.getElementById('editPaymentRef').value
        };
        
        const { error } = await client.from('payments').update(updates).eq('id', paymentId);
        
        if (error) {
            msg.textContent = error.message;
            msg.style.display = 'block';
            msg.className = 'auth-error';
        } else {
            document.getElementById('editPaymentModal').style.display = 'none';
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
        const modal = document.getElementById('editPaymentModal');
        if (modal) modal.style.display = 'none';
        
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
                                <button onclick="openEditPaymentModal('${p.id}')" style="background:var(--color-purple); color:white; border:none; padding:5px 10px; border-radius:5px; cursor:pointer; font-size:0.75rem; display:flex; align-items:center; gap:4px;"><i class="fa-solid fa-pen"></i> Edit</button>
                                <button onclick="deletePaymentRecord('${p.id}')" style="background:#ef4444; color:white; border:none; padding:5px 10px; border-radius:5px; cursor:pointer; font-size:0.75rem; display:flex; align-items:center; gap:4px;"><i class="fa-solid fa-trash"></i> Del</button>
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

const defaultProfileFields = [
    "Date of Birth", "Gender", "Marital Status", "National ID Number", 
    "Branch", "Occupation", "Next of Kin Name", "Next of Kin Phone", 
    "Dependants", "Dependant Count"
];

// Open the modal to allow members to edit their own profiles
window.openUpdateProfileModal = async function() {
    const container = document.getElementById('dynamicProfileFieldsContainer');
    const msg = document.getElementById('updateProfileMsg');
    if (!container) return;
    
    container.innerHTML = '<div style="grid-column: span 2; text-align:center;"><i class="fa-solid fa-spinner fa-spin"></i> Loading form fields...</div>';
    msg.style.display = 'none';
    document.getElementById('updateProfileModal').style.display = 'flex';
    
    let fields = defaultProfileFields;
    try {
        const { data, error } = await client
            .from('form_schema')
            .select('fields')
            .eq('key', 'profile_fields')
            .single();
            
        if (!error && data && data.fields) {
            fields = data.fields;
        }
    } catch (err) {
        console.warn("Failed to load schema from database, using defaults.", err);
    }
    
    // Always insert Phone Number as a standard field
    let html = `
        <div class="form-group" style="grid-column: span 2;">
            <label>Phone Number</label>
            <input type="tel" id="member_up_phone" required value="${currentMember.phone || ''}" placeholder="0712345678">
        </div>
    `;
    
    const fd = currentMember.form_details || {};
    
    fields.forEach((field, index) => {
        const cleanName = field.trim();
        const inputId = `member_up_${index}`;
        const val = fd[cleanName] || '';
        
        let inputHtml = '';
        const lowerName = cleanName.toLowerCase();
        
        if (lowerName.includes('gender')) {
            inputHtml = `
                <select id="${inputId}">
                    <option value="">— Select —</option>
                    <option value="Male" ${val === 'Male' ? 'selected' : ''}>Male</option>
                    <option value="Female" ${val === 'Female' ? 'selected' : ''}>Female</option>
                    <option value="Other" ${val === 'Other' ? 'selected' : ''}>Other</option>
                </select>
            `;
        } else if (lowerName.includes('marital')) {
            inputHtml = `
                <select id="${inputId}">
                    <option value="">— Select —</option>
                    <option value="Single" ${val === 'Single' ? 'selected' : ''}>Single</option>
                    <option value="Married" ${val === 'Married' ? 'selected' : ''}>Married</option>
                    <option value="Divorced" ${val === 'Divorced' ? 'selected' : ''}>Divorced</option>
                    <option value="Widowed" ${val === 'Widowed' ? 'selected' : ''}>Widowed</option>
                </select>
            `;
        } else if (lowerName.includes('date of birth') || lowerName.includes('dob')) {
            // Check if val is formatted as YYYY-MM-DD
            let dateVal = val;
            if (val && !val.includes('-') && !isNaN(Date.parse(val))) {
                dateVal = new Date(val).toISOString().split('T')[0];
            }
            inputHtml = `<input type="date" id="${inputId}" value="${dateVal}">`;
        } else if (lowerName.includes('phone') || lowerName.includes('number') || lowerName.includes('count')) {
            inputHtml = `<input type="text" id="${inputId}" value="${val}">`;
        } else {
            inputHtml = `<input type="text" id="${inputId}" value="${val}">`;
        }
        
        html += `
            <div class="form-group" style="grid-column: ${fields.length === 1 ? 'span 2' : 'span 1'};">
                <label>${cleanName}</label>
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
        
        // Fetch current schema to map inputs back to keys
        let fields = defaultProfileFields;
        try {
            const { data } = await client
                .from('form_schema')
                .select('fields')
                .eq('key', 'profile_fields')
                .single();
            if (data && data.fields) fields = data.fields;
        } catch(err) {}
        
        const phone = document.getElementById('member_up_phone').value.trim();
        const formDetails = {};
        
        fields.forEach((field, index) => {
            const cleanName = field.trim();
            const inputEl = document.getElementById(`member_up_${index}`);
            if (inputEl) {
                formDetails[cleanName] = inputEl.value.trim();
            }
        });
        
        try {
            const { error } = await client
                .from('members')
                .update({
                    phone: phone || null,
                    form_details: formDetails
                })
                .eq('id', currentMember.id);
                
            if (error) throw error;
            
            // Update local state
            currentMember.phone = phone;
            currentMember.form_details = formDetails;
            
            document.getElementById('updateProfileModal').style.display = 'none';
            alert('Your profile has been updated successfully!');
            
            // Re-render and re-verify profile completeness
            checkUserAndLoadDashboard(currentSessionUser);
            
        } catch (err) {
            msg.textContent = err.message;
            msg.style.display = 'block';
            msg.className = 'auth-error';
        } finally {
            submitBtn.disabled = false;
            submitBtn.innerHTML = '<i class="fa-solid fa-save"></i> Save Profile Details';
        }
    });
}

// Export all members' data to an Excel file
window.exportMembersToExcel = async function() {
    try {
        const { data: members, error } = await client
            .from('members')
            .select('*')
            .order('full_name');
            
        if (error) throw error;
        
        const flattened = members.map(m => {
            const row = {
                "Full Name": m.full_name,
                "Email": m.email,
                "Phone": m.phone || '',
                "Role": m.role,
                "Status": m.status,
                "Join Date": m.join_date || ''
            };
            
            // Inline all custom form details
            if (m.form_details) {
                for (const key in m.form_details) {
                    row[key] = m.form_details[key] || '';
                }
            }
            
            return row;
        });
        
        const worksheet = XLSX.utils.json_to_sheet(flattened);
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
        
        const printWindow = window.open('', '_blank');
        
        let tableRows = '';
        members.forEach(m => {
            const phone = m.phone || 'N/A';
            const statusLabel = m.status === 'active' ? 'Active' : m.status;
            const branch = m.form_details?.Branch || m.form_details?.branch || 'N/A';
            const idNo = m.form_details?.['National ID Number'] || m.form_details?.id_number || 'N/A';
            const occupation = m.form_details?.Occupation || m.form_details?.occupation || 'N/A';
            
            tableRows += `
                <tr>
                    <td><strong>${m.full_name}</strong></td>
                    <td>${m.email}</td>
                    <td>${phone}</td>
                    <td>${idNo}</td>
                    <td>${branch}</td>
                    <td>${occupation}</td>
                    <td>${m.role.toUpperCase()}</td>
                    <td><span class="status-${m.status}">${statusLabel}</span></td>
                </tr>
            `;
        });
        
        const html = `
            <html>
            <head>
                <title>GCI Members Directory Report</title>
                <style>
                    body { font-family: 'Segoe UI', Arial, sans-serif; color: #333; margin: 30px; }
                    .header { text-align: center; border-bottom: 3px double #3b82f6; padding-bottom: 20px; margin-bottom: 30px; }
                    .title { font-size: 24px; font-weight: bold; color: #1e3a8a; margin: 0; }
                    .subtitle { font-size: 14px; color: #555; margin: 5px 0 0 0; }
                    .meta { display: flex; justify-content: space-between; font-size: 12px; color: #666; margin-top: 15px; }
                    table { width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 11px; }
                    th, td { border: 1px solid #ddd; padding: 10px; text-align: left; }
                    th { background-color: #f3f4f6; color: #1e3a8a; font-weight: bold; }
                    tr:nth-child(even) { background-color: #fafafa; }
                    .status-active { color: #16a34a; font-weight: bold; }
                    .status-probation { color: #d97706; font-weight: bold; }
                    @media print {
                        body { margin: 15px; }
                        .no-print { display: none; }
                    }
                </style>
            </head>
            <body>
                <div class="header">
                    <div class="title">GLAMOROUS CARE INITIATIVE</div>
                    <div class="subtitle">Official Members Directory & Records Report</div>
                    <div class="meta">
                        <span><strong>Total Members:</strong> ${members.length}</span>
                        <span><strong>Generated On:</strong> ${new Date().toLocaleDateString('en-KE')}</span>
                    </div>
                </div>
                <table>
                    <thead>
                        <tr>
                            <th>Full Name</th>
                            <th>Email Address</th>
                            <th>Phone</th>
                            <th>ID Number</th>
                            <th>Branch</th>
                            <th>Occupation</th>
                            <th>Role</th>
                            <th>Status</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${tableRows}
                    </tbody>
                </table>
                <div style="margin-top: 50px; text-align: center; font-size: 10px; color: #999; border-top: 1px solid #eee; padding-top: 10px;">
                    This is an officially generated system report for GCI Administration. &copy; ${new Date().getFullYear()} GCI
                </div>
                <script>
                    window.onload = function() {
                        window.print();
                        setTimeout(function() { window.close(); }, 500);
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
