// =============================================
// GLAMOROUS CARE INITIATIVE - MEMBER PORTAL
// Supabase Integration
// =============================================

const SUPABASE_URL = 'https://wbprrsuhkmdreuzhzmkq.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndicHJyc3Voa21kcmV1emh6bWtxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODMwMTAwMDYsImV4cCI6MjA5ODU4NjAwNn0.UI-hCP649fmYMV8Srnv0ARbG3Lvdgd260bcJ0RUt0N8';

// Initialize Supabase client
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// DOM Elements
const loginView = document.getElementById('portalLogin');
const dashboardView = document.getElementById('portalDashboard');
const loginForm = document.getElementById('loginForm');
const signupForm = document.getElementById('signupForm');
const loginError = document.getElementById('loginError');
const signupError = document.getElementById('signupError');
const logoutBtn = document.getElementById('logoutBtn');
const showSignupLink = document.getElementById('showSignup');
const showLoginLink = document.getElementById('showLogin');
const loginFormContainer = document.getElementById('loginFormContainer');
const signupFormContainer = document.getElementById('signupFormContainer');

// Dashboard Elements
const profileName = document.getElementById('profileName');
const profileEmail = document.getElementById('profileEmail');
const profilePhone = document.getElementById('profilePhone');
const profileStatus = document.getElementById('profileStatus');
const profileJoinDate = document.getElementById('profileJoinDate');
const profileAvatar = document.getElementById('profileAvatar');
const paymentsTableBody = document.getElementById('paymentsTableBody');
const totalContributions = document.getElementById('totalContributions');
const totalPayments = document.getElementById('totalPayments');
const pendingPayments = document.getElementById('pendingPayments');

// Toggle between Login and Signup forms
if (showSignupLink) {
    showSignupLink.addEventListener('click', (e) => {
        e.preventDefault();
        loginFormContainer.style.display = 'none';
        signupFormContainer.style.display = 'block';
    });
}

if (showLoginLink) {
    showLoginLink.addEventListener('click', (e) => {
        e.preventDefault();
        signupFormContainer.style.display = 'none';
        loginFormContainer.style.display = 'block';
    });
}

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

        const { data, error } = await supabase.auth.signInWithPassword({
            email: email,
            password: password
        });

        if (error) {
            loginError.textContent = error.message;
            loginError.style.display = 'block';
            submitBtn.disabled = false;
            submitBtn.innerHTML = '<i class="fa-solid fa-right-to-bracket"></i> Sign In';
        } else {
            await loadDashboard(data.user);
        }
    });
}

// Signup Handler
if (signupForm) {
    signupForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const fullName = document.getElementById('signupName').value;
        const email = document.getElementById('signupEmail').value;
        const phone = document.getElementById('signupPhone').value;
        const password = document.getElementById('signupPassword').value;
        const confirmPassword = document.getElementById('signupConfirmPassword').value;
        const submitBtn = signupForm.querySelector('button[type="submit"]');

        signupError.style.display = 'none';

        if (password !== confirmPassword) {
            signupError.textContent = 'Passwords do not match.';
            signupError.style.display = 'block';
            return;
        }

        if (password.length < 6) {
            signupError.textContent = 'Password must be at least 6 characters.';
            signupError.style.display = 'block';
            return;
        }

        submitBtn.disabled = true;
        submitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Creating account...';

        // Sign up user
        const { data, error } = await supabase.auth.signUp({
            email: email,
            password: password
        });

        if (error) {
            signupError.textContent = error.message;
            signupError.style.display = 'block';
            submitBtn.disabled = false;
            submitBtn.innerHTML = '<i class="fa-solid fa-user-plus"></i> Create Account';
            return;
        }

        // Create member profile
        const { error: profileError } = await supabase
            .from('members')
            .insert({
                id: data.user.id,
                full_name: fullName,
                email: email,
                phone: phone,
                status: 'probation',
                role: 'member'
            });

        if (profileError) {
            signupError.textContent = 'Account created but profile setup failed. Please contact admin.';
            signupError.style.display = 'block';
            submitBtn.disabled = false;
            submitBtn.innerHTML = '<i class="fa-solid fa-user-plus"></i> Create Account';
            return;
        }

        // Auto-login after signup
        await loadDashboard(data.user);
    });
}

// Logout Handler
if (logoutBtn) {
    logoutBtn.addEventListener('click', async () => {
        await supabase.auth.signOut();
        dashboardView.style.display = 'none';
        loginView.style.display = 'block';
        loginFormContainer.style.display = 'block';
        signupFormContainer.style.display = 'none';
        // Reset forms
        if (loginForm) loginForm.reset();
        if (signupForm) signupForm.reset();
        const submitBtn = loginForm.querySelector('button[type="submit"]');
        submitBtn.disabled = false;
        submitBtn.innerHTML = '<i class="fa-solid fa-right-to-bracket"></i> Sign In';
    });
}

// Load Dashboard
async function loadDashboard(user) {
    loginView.style.display = 'none';
    dashboardView.style.display = 'block';

    // Fetch member profile
    const { data: member, error: memberError } = await supabase
        .from('members')
        .select('*')
        .eq('id', user.id)
        .single();

    if (memberError || !member) {
        profileName.textContent = user.email;
        profileEmail.textContent = user.email;
        profilePhone.textContent = 'N/A';
        profileStatus.textContent = 'New';
        profileStatus.className = 'status-badge status-probation';
        profileJoinDate.textContent = 'N/A';
    } else {
        profileName.textContent = member.full_name;
        profileEmail.textContent = member.email;
        profilePhone.textContent = member.phone || 'N/A';
        profileJoinDate.textContent = formatDate(member.join_date);
        
        // Generate avatar initials
        const initials = member.full_name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
        profileAvatar.textContent = initials;

        // Status badge
        profileStatus.textContent = member.status.charAt(0).toUpperCase() + member.status.slice(1);
        profileStatus.className = `status-badge status-${member.status}`;
    }

    // Fetch payments
    const { data: payments, error: paymentsError } = await supabase
        .from('payments')
        .select('*')
        .eq('member_id', user.id)
        .order('payment_date', { ascending: false });

    // Render payments table
    renderPayments(payments || []);
}

// Render Payments Table
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

// Format date helper
function formatDate(dateStr) {
    if (!dateStr) return 'N/A';
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-KE', { year: 'numeric', month: 'short', day: 'numeric' });
}

// Check if user is already logged in on page load
async function checkAuth() {
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
        await loadDashboard(session.user);
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
