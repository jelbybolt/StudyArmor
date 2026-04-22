document.addEventListener('DOMContentLoaded', function() {
    checkSession();
    setupEventListeners();
    updateDateDisplay();
    loadDemoData();
});

function checkSession() {
    // verificar si hay una sesión guardada en localStorage
    const savedSession = localStorage.getItem('sa_session');
    if (savedSession) {
        try {
            const session = JSON.parse(savedSession);
            const expiry = new Date(session.expiry);
            if (expiry > new Date()) {
                // Session is valid
                const user = usersDB.find(u => u.email === session.email);
                if (user) {
                    currentUser = user;
                    if (session.isAdmin) {
                        isAdmin = true;
                        loadAdminPanel();
                    } else {
                        isAdmin = false;
                        loadDashboard();
                    }
                    return;
                }
            }
        } catch (e) {
            console.error('Error parsing session:', e);
        }
    }
    // No valid session, show landing page
    showLandingPage();
}

function setupEventListeners() {
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function(e) {
            const href = this.getAttribute('href');
            if (href === '#') return;

            const target = document.querySelector(href);
            if (target) {
                e.preventDefault();
                target.scrollIntoView({ behavior: 'smooth' });
            }
        });
    });

    document.addEventListener('click', function(e) {
        const mobileNav = document.getElementById('mobile-nav');
        const hamburger = document.getElementById('hamburger');

        if (mobileNav && mobileNav.classList.contains('open')) {
            if (!mobileNav.contains(e.target) && !hamburger.contains(e.target)) {
                mobileNav.classList.remove('open');
            }
        }
    });
}

function updateDateDisplay() {
    const dateElement = document.getElementById('dash-date');
    if (dateElement) {
        const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
        dateElement.textContent = new Date().toLocaleDateString('es-GT', options);
    }
}

function loadDemoData() {
    if (usersDB.length === 0) {
        const demos = [
            { name: 'María', lastname: 'López', carne: '202608010', career: 'Ingeniería en Sistemas e Informática', email: 'maria@umes.edu.gt', password: 'demo123', registeredAt: new Date().toISOString() },
            { name: 'Carlos', lastname: 'Ajú', carne: '202608020', career: 'Ingeniería en Sistemas e Informática', email: 'carlos@umes.edu.gt', password: 'demo123', registeredAt: new Date().toISOString() },
            { name: 'Sofía', lastname: 'Coj', carne: '202608030', career: 'Ingeniería Civil', email: 'sofia@umes.edu.gt', password: 'demo123', registeredAt: new Date().toISOString() },
            { name: 'Diego', lastname: 'Saquil', carne: '202608040', career: 'Ingeniería Industrial', email: 'diego@umes.edu.gt', password: 'demo123', registeredAt: new Date().toISOString() },
            { name: 'Lucía', lastname: 'Pérez', carne: '202608050', career: 'Ingeniería en Sistemas e Informática', email: 'lucia@umes.edu.gt', password: 'demo123', registeredAt: new Date().toISOString() }
        ];

        demos.forEach(u => {
            usersDB.push(u);
            const d = getUD(u.email);
            d.points = Math.floor(Math.random() * 350);
            d.streak = Math.floor(Math.random() * 12);
            d.completedActivities = Array.from({ length: Math.floor(Math.random() * 10) }, (_, i) => ({
                actId: (i % 5) + 1,
                date: todayKey(),
                points: 50
            }));
        });
        saveDB();
    }
}

function showLandingPage() {
    const mainSite = document.getElementById('main-site');
    const mainFooter = document.getElementById('main-footer');
    const dashboard = document.getElementById('dashboard');
    const adminPanel = document.getElementById('admin-panel');

    if (mainSite) mainSite.style.display = 'block';
    if (mainFooter) mainFooter.style.display = 'block';
    if (dashboard) dashboard.style.display = 'none';
    if (adminPanel) adminPanel.style.display = 'none';

    showMainNav();
}

// guardar sesión
function saveSession(email, isAdminFlag = false) {
    const session = {
        email: email,
        isAdmin: isAdminFlag,
        expiry: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() // 7 days
    };
    localStorage.setItem('sa_session', JSON.stringify(session));
}

function clearSession() {
    localStorage.removeItem('sa_session');
}

window.saveSession = saveSession;
window.clearSession = clearSession;
window.showLandingPage = showLandingPage;
window.getUD = getUD;
window.saveDB = saveDB;
window.todayKey = todayKey;
window.getTodayDone = getTodayDone;
window.getLevel = getLevel;
window.toast = toast;