
let currentUser = null;
let isAdmin = false;

// referencia a la base de datos
let usersDB = JSON.parse(localStorage.getItem('sa_users') || '[]');
let userDataDB = JSON.parse(localStorage.getItem('sa_userdata') || '{}');

// funciones helper para manejar la base de datos
function getUD(email) {
    if (!userDataDB[email]) {
        userDataDB[email] = {
            points: 0,
            streak: 0,
            level: 1,
            completedActivities: [],
            lastActiveDate: null,
            studyTime: '18:00',
            activeDays: ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes']
        };
    }
    return userDataDB[email];
}

function saveDB() {
    localStorage.setItem('sa_users', JSON.stringify(usersDB));
    localStorage.setItem('sa_userdata', JSON.stringify(userDataDB));
}

function todayKey() {
    return new Date().toISOString().slice(0, 10);
}

function getTodayDone(email) {
    return (getUD(email).completedActivities || []).filter(c => c.date === todayKey()).length;
}

function getLevel(pts) {
    if (pts < 100) return { level: 1, label: 'Principiante' };
    if (pts < 250) return { level: 2, label: 'Estudiante' };
    if (pts < 500) return { level: 3, label: 'Dedicado' };
    if (pts < 800) return { level: 4, label: 'Avanzado' };
    return { level: 5, label: 'Maestro' };
}

function toast(msg, type = 'info') {
    const tc = document.getElementById('toast-container');
    const t = document.createElement('div');
    t.className = `toast ${type}`;
    t.innerHTML = `<span>${type === 'success' ? '✓' : type === 'error' ? '✗' : 'ℹ'}</span> ${msg}`;
    tc.appendChild(t);
    setTimeout(() => t.remove(), 3500);
}

// funciones de navegación
function toggleMobileNav() {
    document.getElementById('mobile-nav').classList.toggle('open');
}

function closeMobileNav() {
    document.getElementById('mobile-nav').classList.remove('open');
}

function hideMainNav() {
    document.getElementById('main-nav').classList.add('hidden');
}

function showMainNav() {
    document.getElementById('main-nav').classList.remove('hidden');
}

// autenticación y registro
function switchTab(tab) {
    document.querySelectorAll('.auth-tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.auth-form').forEach(f => f.classList.remove('active'));

    const map = { login: 0, register: 1, admin: 2 };
    const tabs = document.querySelectorAll('.auth-tab');
    if (tabs[map[tab]]) tabs[map[tab]].classList.add('active');

    const form = document.getElementById(`form-${tab}`);
    if (form) form.classList.add('active');
}

function clearErrors() {
    document.querySelectorAll('.form-error').forEach(e => e.classList.remove('show'));
}

function showErr(id) {
    const el = document.getElementById(id);
    if (el) el.classList.add('show');
}

// funciones de inicio de sesión
function doLogin() {
    clearErrors();

    const email = document.getElementById('login-email').value.trim();
    const pass = document.getElementById('login-pass').value;

    let ok = true;
    if (!email || !email.includes('@')) {
        showErr('err-login-email');
        ok = false;
    }
    if (!pass) {
        showErr('err-login-pass');
        ok = false;
    }
    if (!ok) return;

    const user = usersDB.find(u => u.email === email && u.password === pass);
    if (!user) {
        toast('Credenciales incorrectas', 'error');
        return;
    }

    // limpiar imputs
    document.getElementById('login-email').value = '';
    document.getElementById('login-pass').value = '';

    currentUser = user;
    isAdmin = false;

    // actualizar última conexión
    user.lastAccess = new Date().toISOString();
    saveDB();

    toast(`¡Bienvenido de vuelta, ${user.name}! 🔥`, 'success');
    loadDashboard();
}

// función de registro
function doRegister() {
    clearErrors();

    const name = document.getElementById('reg-name').value.trim();
    const last = document.getElementById('reg-lastname').value.trim();
    const carne = document.getElementById('reg-carne').value.trim();
    const career = document.getElementById('reg-career').value;
    const email = document.getElementById('reg-email').value.trim();
    const pass = document.getElementById('reg-pass').value;
    const time = document.getElementById('reg-time').value;

    let ok = true;

    if (!name) {
        showErr('err-reg-name');
        ok = false;
    }
    if (!last) {
        showErr('err-reg-lastname');
        ok = false;
    }
    if (!carne) {
        showErr('err-reg-carne');
        ok = false;
    }
    if (!career) {
        showErr('err-reg-career');
        ok = false;
    }
    if (!email || !email.includes('@')) {
        showErr('err-reg-email');
        ok = false;
    }
    if (!pass || pass.length < 6) {
        showErr('err-reg-pass');
        ok = false;
    }
    if (!ok) return;

    if (usersDB.find(u => u.email === email)) {
        toast('Este correo ya está registrado', 'error');
        return;
    }

    const user = {
        name,
        lastname: last,
        carne,
        career,
        email,
        password: pass,
        registeredAt: new Date().toISOString()
    };

    usersDB.push(user);
    getUD(email).studyTime = time;
    saveDB();

    document.getElementById('reg-name').value = '';
    document.getElementById('reg-lastname').value = '';
    document.getElementById('reg-carne').value = '';
    document.getElementById('reg-career').value = '';
    document.getElementById('reg-email').value = '';
    document.getElementById('reg-pass').value = '';
    document.getElementById('reg-time').value = '18:00';

    currentUser = user;
    isAdmin = false;

    toast(`¡Cuenta creada! Bienvenido, ${name}! 🎉`, 'success');
    loadDashboard();
}

// login administrativo
function doAdminLogin() {
    clearErrors();

    const code = document.getElementById('admin-code').value.trim();
    const pass = document.getElementById('admin-pass').value;

    if (!code) {
        showErr('err-admin-code');
        return;
    }
    if (!pass) {
        showErr('err-admin-pass');
        return;
    }

    if (code === 'UMES2026' && pass === 'admin123') {
        document.getElementById('admin-code').value = '';
        document.getElementById('admin-pass').value = '';

        isAdmin = true;
        currentUser = { name: 'Administrador', email: 'admin' };

        toast('Acceso administrativo concedido ✓', 'success');
        loadAdminPanel();
    } else {
        if (code !== 'UMES2026') showErr('err-admin-code');
        if (pass !== 'admin123') showErr('err-admin-pass');
        toast('Código o contraseña incorrectos', 'error');
    }
}

// cierre de sesión
function doLogout() {
    currentUser = null;
    isAdmin = false;

    if (window.blockerInterval) clearInterval(window.blockerInterval);


    const blocker = document.getElementById('screen-blocker');
    if (blocker) blocker.classList.remove('active');

    const dashboard = document.getElementById('dashboard');
    const adminPanel = document.getElementById('admin-panel');
    const mainSite = document.getElementById('main-site');
    const mainFooter = document.getElementById('main-footer');
    const quizOverlay = document.getElementById('quiz-overlay');

    if (dashboard) dashboard.style.display = 'none';
    if (adminPanel) adminPanel.style.display = 'none';
    if (mainSite) mainSite.style.display = 'block';
    if (mainFooter) mainFooter.style.display = 'block';
    if (quizOverlay) quizOverlay.classList.remove('open');

    showMainNav();
    toast('Sesión cerrada', 'info');

    switchTab('login');
}