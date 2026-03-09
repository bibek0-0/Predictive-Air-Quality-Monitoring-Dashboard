// ============================================
// Auth Module - Login, Signup, Google OAuth
// ============================================

(function () {
    const API_BASE = window.location.origin;
    const TOKEN_KEY = 'airktm_token';
    const USER_KEY = 'airktm_user';

    // ---- State ----
    let currentUser = null;

    // ---- DOM References (lazy) ----
    function getEl(id) { return document.getElementById(id); }

    // ---- Token helpers ----
    function getToken() { return localStorage.getItem(TOKEN_KEY); }
    function setToken(token) { localStorage.setItem(TOKEN_KEY, token); }
    function removeToken() { localStorage.removeItem(TOKEN_KEY); localStorage.removeItem(USER_KEY); }

    function setUser(user) {
        currentUser = user;
        localStorage.setItem(USER_KEY, JSON.stringify(user));
    }

    function getCachedUser() {
        try {
            const u = localStorage.getItem(USER_KEY);
            return u ? JSON.parse(u) : null;
        } catch { return null; }
    }

    // ---- API Helpers ----
    async function apiPost(path, body) {
        const res = await fetch(`${API_BASE}${path}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.msg || 'Something went wrong');
        return data;
    }

    async function apiGet(path) {
        const token = getToken();
        const res = await fetch(`${API_BASE}${path}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.msg || 'Something went wrong');
        return data;
    }

    // ---- Modal logic ----
    function openModal() {
        const overlay = getEl('authModalOverlay');
        if (overlay) overlay.classList.add('active');
        clearMessages();
    }

    function closeModal() {
        const overlay = getEl('authModalOverlay');
        if (overlay) overlay.classList.remove('active');
        clearMessages();
    }

    function switchTab(tab) {
        // Tabs
        document.querySelectorAll('.auth-tab').forEach(t => t.classList.remove('active'));
        document.querySelectorAll('.auth-form').forEach(f => f.classList.remove('active'));

        if (tab === 'login') {
            getEl('authTabLogin')?.classList.add('active');
            getEl('authFormLogin')?.classList.add('active');
            const titleEl = getEl('authModalTitle');
            if (titleEl) titleEl.textContent = 'Welcome back';
            const subtitleEl = getEl('authModalSubtitle');
            if (subtitleEl) subtitleEl.textContent = 'Login to your account';
        } else {
            getEl('authTabSignup')?.classList.add('active');
            getEl('authFormSignup')?.classList.add('active');
            const titleEl = getEl('authModalTitle');
            if (titleEl) titleEl.textContent = 'Create account';
            const subtitleEl = getEl('authModalSubtitle');
            if (subtitleEl) subtitleEl.textContent = 'Sign up to get started';
        }
        clearMessages();
    }

    function showMessage(formId, msg, type) {
        const el = document.querySelector(`#${formId} .auth-message`);
        if (!el) return;
        el.textContent = msg;
        el.className = `auth-message ${type}`;
    }

    function clearMessages() {
        document.querySelectorAll('.auth-message').forEach(el => {
            el.className = 'auth-message';
            el.textContent = '';
        });
    }

    // ---- Registration ----
    async function handleSignup(e) {
        e.preventDefault();
        const name = getEl('signupName')?.value.trim();
        const email = getEl('signupEmail')?.value.trim();
        const password = getEl('signupPassword')?.value;

        if (!name || !email || !password) {
            return showMessage('authFormSignup', 'Please fill in all fields', 'error');
        }
        if (password.length < 6) {
            return showMessage('authFormSignup', 'Password must be at least 6 characters', 'error');
        }

        const btn = document.querySelector('#authFormSignup .auth-submit-btn');
        btn.disabled = true;
        btn.textContent = 'Creating account...';

        try {
            const data = await apiPost('/api/auth/register', { name, email, password });
            setToken(data.token);
            setUser(data.user);
            showMessage('authFormSignup', 'Account created successfully!', 'success');
            setTimeout(() => {
                closeModal();
                updateNavbar();
            }, 700);
        } catch (err) {
            showMessage('authFormSignup', err.message, 'error');
        } finally {
            btn.disabled = false;
            btn.textContent = 'Create Account';
        }
    }

    // ---- Login ----
    async function handleLogin(e) {
        e.preventDefault();
        const email = getEl('loginEmail')?.value.trim();
        const password = getEl('loginPassword')?.value;

        if (!email || !password) {
            return showMessage('authFormLogin', 'Please fill in all fields', 'error');
        }

        const btn = document.querySelector('#authFormLogin .auth-submit-btn');
        btn.disabled = true;
        btn.textContent = 'Logging in...';

        try {
            const data = await apiPost('/api/auth/login', { email, password });
            setToken(data.token);
            setUser(data.user);
            showMessage('authFormLogin', 'Logged in successfully!', 'success');
            setTimeout(() => {
                closeModal();
                updateNavbar();
            }, 700);
        } catch (err) {
            showMessage('authFormLogin', err.message, 'error');
        } finally {
            btn.disabled = false;
            btn.textContent = 'Log In';
        }
    }

    // ---- Google OAuth ----
    function handleGoogleLogin() {
        window.location.href = `${API_BASE}/api/auth/google`;
    }

    // ---- Logout ----
    function handleLogout() {
        removeToken();
        currentUser = null;
        updateNavbar();
        // Close dropdown
        document.querySelector('.user-menu-container')?.classList.remove('open');
    }

    // ---- Navbar update ----
    function updateNavbar() {
        const authBtnContainer = getEl('authBtnContainer');
        const userMenuContainer = getEl('userMenuContainer');
        if (!authBtnContainer || !userMenuContainer) return;

        const user = currentUser || getCachedUser();

        if (user) {
            authBtnContainer.style.display = 'none';
            userMenuContainer.style.display = 'block';

            // Avatar
            const avatarArea = userMenuContainer.querySelector('.user-avatar-area');
            if (avatarArea) {
                if (user.avatar) {
                    avatarArea.innerHTML = `<img src="${user.avatar}" alt="${user.name}" class="user-avatar-img" referrerpolicy="no-referrer">`;
                } else {
                    const initial = user.name ? user.name.charAt(0).toUpperCase() : '?';
                    avatarArea.innerHTML = `<span class="user-avatar-placeholder">${initial}</span>`;
                }
            }

            // Name
            const nameEl = userMenuContainer.querySelector('.user-avatar-name');
            if (nameEl) nameEl.textContent = user.name || 'User';

            // Dropdown info
            const ddName = userMenuContainer.querySelector('.user-dropdown-name');
            if (ddName) ddName.textContent = user.name || 'User';
            const ddEmail = userMenuContainer.querySelector('.user-dropdown-email');
            if (ddEmail) ddEmail.textContent = user.email || '';
        } else {
            authBtnContainer.style.display = '';
            userMenuContainer.style.display = 'none';
        }
    }

    // ---- Check for token from Google OAuth redirect ----
    function checkForOAuthToken() {
        const urlParams = new URLSearchParams(window.location.search);
        const token = urlParams.get('token');
        if (token) {
            setToken(token);
            // Clean URL
            const url = new URL(window.location);
            url.searchParams.delete('token');
            window.history.replaceState({}, document.title, url.pathname + url.search);
            // Fetch user info
            fetchCurrentUser();
        }
    }

    // ---- Fetch current user from API ----
    async function fetchCurrentUser() {
        const token = getToken();
        if (!token) return;

        try {
            const user = await apiGet('/api/auth/user');
            setUser(user);
            updateNavbar();
        } catch (err) {
            // Token might be expired
            removeToken();
            updateNavbar();
        }
    }

    // ---- Password visibility toggle ----
    function setupPasswordToggles() {
        document.querySelectorAll('.auth-password-toggle').forEach(btn => {
            btn.addEventListener('click', function () {
                const input = this.parentElement.querySelector('.auth-input');
                if (!input) return;
                const isPassword = input.type === 'password';
                input.type = isPassword ? 'text' : 'password';
                // Toggle icon
                this.innerHTML = isPassword
                    ? '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>'
                    : '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>';
            });
        });
    }

    // ---- Init ----
    function init() {
        // Tab switching
        getEl('authTabLogin')?.addEventListener('click', () => switchTab('login'));
        getEl('authTabSignup')?.addEventListener('click', () => switchTab('signup'));

        // Open modal
        getEl('authNavBtn')?.addEventListener('click', openModal);

        // Close modal
        getEl('authModalClose')?.addEventListener('click', closeModal);
        getEl('authModalOverlay')?.addEventListener('click', (e) => {
            if (e.target === e.currentTarget) closeModal();
        });

        // Escape key closes modal
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') closeModal();
        });

        // Form submissions
        getEl('authFormLogin')?.addEventListener('submit', handleLogin);
        getEl('authFormSignup')?.addEventListener('submit', handleSignup);

        // Google login buttons
        document.querySelectorAll('.auth-google-btn').forEach(btn => {
            btn.addEventListener('click', handleGoogleLogin);
        });

        // Logout
        getEl('authLogoutBtn')?.addEventListener('click', handleLogout);

        // User menu toggle
        const userBtn = document.querySelector('.user-avatar-btn');
        if (userBtn) {
            userBtn.addEventListener('click', () => {
                document.querySelector('.user-menu-container')?.classList.toggle('open');
            });
        }

        // Close dropdown on outside click
        document.addEventListener('click', (e) => {
            const container = document.querySelector('.user-menu-container');
            if (container && !container.contains(e.target)) {
                container.classList.remove('open');
            }
        });

        // Password toggles
        setupPasswordToggles();

        // Check for Google OAuth redirect token
        checkForOAuthToken();

        // Load existing user
        const cached = getCachedUser();
        if (cached) {
            currentUser = cached;
            updateNavbar();
            // Refresh user from API in background
            fetchCurrentUser();
        } else if (getToken()) {
            fetchCurrentUser();
        } else {
            updateNavbar();
        }
    }

    // Wait for DOM
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
