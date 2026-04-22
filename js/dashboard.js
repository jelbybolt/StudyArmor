function loadDashboard() {
    const mainSite = document.getElementById('main-site');
    const mainFooter = document.getElementById('main-footer');
    const adminPanel = document.getElementById('admin-panel');
    const dashboard = document.getElementById('dashboard');

    if (mainSite) mainSite.style.display = 'none';
    if (mainFooter) mainFooter.style.display = 'none';
    if (adminPanel) adminPanel.style.display = 'none';
    if (dashboard) dashboard.style.display = 'block';

    showMainNav();

    const d = getUD(currentUser.email);
    const lvl = getLevel(d.points);

    // racha reset si no ha sido activo hoy ni ayer
    const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
    if (d.lastActiveDate && d.lastActiveDate !== todayKey() && d.lastActiveDate !== yesterday) {
        d.streak = 0;
        saveDB();
    }

    const initials = (currentUser.name[0] + (currentUser.lastname ? currentUser.lastname[0] : '')).toUpperCase();
    const nameElement = document.getElementById('dash-avatar-initials');
    const userNameElement = document.getElementById('dash-user-name');
    const firstNameElement = document.getElementById('dash-first-name');
    const sidebarStreak = document.getElementById('sidebar-streak');
    const dateElement = document.getElementById('dash-date');

    if (nameElement) nameElement.textContent = initials;
    if (userNameElement) userNameElement.textContent = currentUser.name + ' ' + (currentUser.lastname || '');
    if (firstNameElement) firstNameElement.textContent = currentUser.name;
    if (sidebarStreak) sidebarStreak.textContent = d.streak;

    if (dateElement) {
        const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
        dateElement.textContent = new Date().toLocaleDateString('es-GT', options);
    }

    // actualizar KPIs
    const kpiPoints = document.getElementById('kpi-points');
    const kpiStreak = document.getElementById('kpi-streak');
    const kpiToday = document.getElementById('kpi-today');
    const kpiLevel = document.getElementById('kpi-level');
    const kpiLevelLabel = document.getElementById('kpi-level-label');
    const todayBadge = document.getElementById('today-badge');

    if (kpiPoints) kpiPoints.textContent = d.points;
    if (kpiStreak) kpiStreak.textContent = d.streak;
    if (kpiToday) kpiToday.textContent = `${getTodayDone(currentUser.email)}/5`;
    if (kpiLevel) kpiLevel.textContent = lvl.level;
    if (kpiLevelLabel) kpiLevelLabel.textContent = lvl.label;
    if (todayBadge) todayBadge.textContent = `${getTodayDone(currentUser.email)}/5`;

    renderTodayActivities();
    renderWeeklyProgress();
    renderDailyFeedback();
    renderAllActivities();
    renderRewards();
    renderProgressAreas();
    renderStreakHistory();
    renderImprovementTips();
    renderSchedule();

    if (window.saveSession) window.saveSession(currentUser.email, false);
}

function showDashTab(tab) {
    const tabs = ['overview', 'activities', 'rewards', 'schedule', 'progress'];
    tabs.forEach(t => {
        const element = document.getElementById(`tab-${t}`);
        if (element) element.classList.add('hide');
    });

    const activeTab = document.getElementById(`tab-${tab}`);
    if (activeTab) activeTab.classList.remove('hide');

    const navItems = document.querySelectorAll('.dash-nav-item');
    navItems.forEach((el, index) => {
        el.classList.remove('active');
        if (tabs[index] === tab) el.classList.add('active');
    });
}

function renderTodayActivities() {
    const d = getUD(currentUser.email);
    const done = (d.completedActivities || []).filter(c => c.date === todayKey()).map(c => c.actId);
    const container = document.getElementById('today-activities-list');

    if (!container) return;

    container.innerHTML = ACTIVITIES.map(a => {
        const isDone = done.includes(a.id);
        return `<div class="activity-item">
            <div class="act-checkbox ${isDone ? 'done' : ''}" onclick="startActivity(${a.id})">${isDone ? '✓' : ''}</div>
            <div class="act-body">
                <div class="act-title ${isDone ? 'done-text' : ''}">${a.title}</div>
                <div class="act-meta">${a.category} · ${a.points} XP</div>
            </div>
            <div class="act-points">+${a.points}</div>
        </div>`;
    }).join('');
}

function renderWeeklyProgress() {
    const d = getUD(currentUser.email);
    const todayDone = getTodayDone(currentUser.email);
    const container = document.getElementById('weekly-progress');

    if (!container) return;

    const areas = [
        { label: 'Organización', pct: Math.min(100, todayDone * 20) },
        { label: 'Técnicas de Estudio', pct: Math.min(100, d.points > 50 ? 40 : 10) },
        { label: 'Planificación', pct: Math.min(100, d.streak * 15) },
        { label: 'Constancia', pct: Math.min(100, d.streak * 10 + todayDone * 5) }
    ];

    container.innerHTML = areas.map(a => `
        <div class="progress-item">
            <div class="prog-header"><span>${a.label}</span><span>${a.pct}%</span></div>
            <div class="prog-bar"><div class="prog-fill" style="width: ${a.pct}%"></div></div>
        </div>
    `).join('');
}

function renderDailyFeedback() {
    const n = getTodayDone(currentUser.email);
    const msgs = [
        'Aún no has comenzado tus actividades del día. Recuerda: cada gran hábito empieza con una acción pequeña. ¡Empieza ahora!',
        '¡Buen inicio! Completaste 1 actividad. La constancia es más valiosa que la intensidad.',
        '¡Vas por buen camino! 2 de 5 actividades listas. El momentum está contigo.',
        '¡Excelente progreso! 3 actividades completadas. Tu disciplina está dando frutos.',
        '¡Casi lo logras! Solo te falta 1 actividad para completar el día. ¡No te detengas!',
        '¡COMPLETASTE TODAS LAS ACTIVIDADES! Hoy eres un ejemplo de disciplina académica. ¡Mañana, hazlo de nuevo!'
    ];

    const d = getUD(currentUser.email);
    const container = document.getElementById('daily-feedback');

    if (!container) return;

    const pointsToday = (d.completedActivities || [])
        .filter(c => c.date === todayKey())
        .reduce((s, c) => s + c.points, 0);

    container.innerHTML = `
        <p style="font-style:italic;color:var(--cream);line-height:1.7">"${msgs[Math.min(n, 5)]}"</p>
        <div style="margin-top:1rem;display:flex;gap:1rem;flex-wrap:wrap">
            <div style="font-family:'Space Mono',monospace;font-size:.65rem;color:rgba(245,237,216,.35)">PUNTOS HOY: +${pointsToday} XP</div>
            <div style="font-family:'Space Mono',monospace;font-size:.65rem;color:rgba(245,237,216,.35)">RACHA ACTUAL: ${d.streak} DÍAS</div>
        </div>
    `;
}

function renderAllActivities() {
    const d = getUD(currentUser.email);
    const done = (d.completedActivities || []).filter(c => c.date === todayKey()).map(c => c.actId);
    const container = document.getElementById('all-activities-list');

    if (!container) return;

    container.innerHTML = ACTIVITIES.map(a => {
        const isDone = done.includes(a.id);
        return `<div class="activity-item">
            <div class="act-checkbox ${isDone ? 'done' : ''}">${isDone ? '✓' : ''}</div>
            <div class="act-body">
                <div class="act-title ${isDone ? 'done-text' : ''}">${a.title}</div>
                <div class="act-meta">${a.category} · ${a.points} XP · 3 preguntas de comprensión</div>
            </div>
            <div>
                ${!isDone
                    ? `<button class="btn btn-solid" onclick="startActivity(${a.id})" style="font-size:.75rem;padding:.4rem 1rem">Iniciar →</button>`
                    : '<span style="color:#00c864;font-family:Oswald,sans-serif;font-size:.8rem;letter-spacing:.05em">✓ COMPLETADA</span>'}
            </div>
        </div>`;
    }).join('');
}

function renderRewards() {
    const container = document.getElementById('rewards-grid');
    if (!container) return;

    container.innerHTML = REWARDS_DEF.map(r => {
        const unlocked = r.condition(currentUser.email);
        return `<div class="reward-item ${unlocked ? 'unlocked' : ''}">
            <div class="reward-icon">${r.icon}</div>
            <div class="reward-name">${r.name}</div>
            ${!unlocked ? '<div class="reward-locked-overlay">🔒</div>' : ''}
        </div>`;
    }).join('');
}

function renderProgressAreas() {
    const d = getUD(currentUser.email);
    const total = d.completedActivities?.length || 0;
    const container = document.getElementById('progress-areas');

    if (!container) return;

    const areas = [
        { label: 'Organización del Tiempo', pct: Math.min(100, getTodayDone(currentUser.email) * 20 + d.streak * 3) },
        { label: 'Técnicas de Estudio', pct: Math.min(100, total * 12) },
        { label: 'Planificación Académica', pct: Math.min(100, d.streak * 12) },
        { label: 'Constancia y Disciplina', pct: Math.min(100, d.streak * 8 + d.points * 0.1) },
        { label: 'Memorización Efectiva', pct: Math.min(100, total * 10) }
    ];

    container.innerHTML = areas.map(a => `
        <div class="progress-item">
            <div class="prog-header"><span>${a.label}</span><span>${Math.round(a.pct)}%</span></div>
            <div class="prog-bar"><div class="prog-fill" style="width: ${a.pct}%"></div></div>
        </div>
    `).join('');
}

function renderStreakHistory() {
    const d = getUD(currentUser.email);
    const byDate = {};
    (d.completedActivities || []).forEach(c => {
        byDate[c.date] = (byDate[c.date] || 0) + 1;
    });

    const dates = Object.keys(byDate).sort().slice(-7);
    const container = document.getElementById('streak-history');

    if (!container) return;

    if (!dates.length) {
        container.innerHTML = '<p style="font-size:.82rem;color:rgba(245,237,216,.35);font-style:italic">No hay historial aún. ¡Completa tu primera actividad!</p>';
        return;
    }

    container.innerHTML = dates.map(date => {
        const count = byDate[date];
        const bars = '█'.repeat(count) + '░'.repeat(Math.max(0, 5 - count));
        const label = new Date(date + 'T12:00:00').toLocaleDateString('es-GT', { weekday: 'short', month: 'short', day: 'numeric' });
        return `<div style="display:flex;justify-content:space-between;align-items:center;border-bottom:1px solid rgba(245,237,216,.06);padding:.4rem 0;gap:.5rem">
            <span style="font-family:'Space Mono',monospace;font-size:.6rem;color:rgba(245,237,216,.35);min-width:80px">${label}</span>
            <span style="font-family:'Bebas Neue',sans-serif;color:var(--orange);letter-spacing:.1em;font-size:.9rem">${bars}</span>
            <span style="font-family:'Space Mono',monospace;font-size:.6rem;color:var(--amber)">${count}/5</span>
        </div>`;
    }).join('');
}

function renderImprovementTips() {
    const d = getUD(currentUser.email);
    const container = document.getElementById('improvement-tips');

    if (!container) return;

    const tips = [];
    if (d.streak < 3) tips.push({ icon: '🔥', title: 'Construye tu Racha', desc: 'Completa actividades 3 días seguidos para empezar a notar el cambio real en tus hábitos.' });
    if (getTodayDone(currentUser.email) < 5) tips.push({ icon: '✅', title: 'Completa el Día', desc: `Te faltan ${5 - getTodayDone(currentUser.email)} actividades para cerrar el día. ¡No dejes que la racha se rompa!` });
    if (d.points < 200) tips.push({ icon: '⚡', title: 'Meta: 200 XP', desc: 'Acumula 200 puntos para desbloquear la insignia "💎 200 XP". Sigue completando actividades.' });
    tips.push({ icon: '📖', title: 'Lee Antes de Responder', desc: 'El material de lectura tiene toda la información que necesitas para el quiz. Léelo con calma.' });
    tips.push({ icon: '⏰', title: 'Configura tu Horario', desc: 'Ve a "Mi Horario" y activa el bloqueador de pantalla para comprometerte con tu hora de estudio.' });

    container.innerHTML = tips.slice(0, 4).map(t => `
        <div style="display:flex;gap:1rem;padding:.85rem 0;border-bottom:1px solid rgba(245,237,216,.06)">
            <span style="font-size:1.5rem">${t.icon}</span>
            <div>
                <div style="font-family:Oswald,sans-serif;font-size:.9rem;font-weight:600;color:var(--cream);margin-bottom:.2rem">${t.title}</div>
                <div style="font-size:.82rem;line-height:1.6;color:rgba(245,237,216,.55)">${t.desc}</div>
            </div>
        </div>
    `).join('');
}

function renderSchedule() {
    const d = getUD(currentUser.email);
    const studyTimeInput = document.getElementById('study-time');
    if (studyTimeInput) studyTimeInput.value = d.studyTime || '18:00';

    const dayNames = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
    const userDays = d.activeDays || ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes'];
    const dayToggles = document.getElementById('day-toggles');

    if (dayToggles) {
        dayToggles.innerHTML = dayNames.map(day => {
            const active = userDays.includes(day);
            const dayId = day.replace(/[éí]/g, function(match) {
                return { 'é': 'e', 'í': 'i' }[match];
            });
            return `<button onclick="toggleDay('${day}')" id="day-${dayId}" class="btn ${active ? 'btn-solid' : 'btn-outline'}" style="font-size:.7rem;padding:.35rem .75rem">${day}</button>`;
        }).join('');
    }
}

function saveStudyTime() {
    const d = getUD(currentUser.email);
    const timeInput = document.getElementById('study-time');
    if (timeInput) {
        d.studyTime = timeInput.value;
        saveDB();
        toast(`Horario guardado: ${d.studyTime} ✓`, 'success');
    }
}

function toggleDay(day) {
    const d = getUD(currentUser.email);
    if (!d.activeDays) d.activeDays = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes'];

    const index = d.activeDays.indexOf(day);
    if (index >= 0) {
        d.activeDays.splice(index, 1);
    } else {
        d.activeDays.push(day);
    }
    saveDB();
    renderSchedule();
}

// Blocker funcional
let blockerEnabled = false;
let blockerInterval = null;
let blockerTimer = null;

function toggleBlocker() {
    blockerEnabled = !blockerEnabled;
    const toggleBtn = document.getElementById('blocker-toggle-btn');
    const statusSpan = document.getElementById('blocker-status');

    if (toggleBtn) toggleBtn.textContent = blockerEnabled ? 'Desactivar Bloqueador' : 'Activar Bloqueador';
    if (statusSpan) statusSpan.textContent = blockerEnabled ? '● Activo — monitoreando' : 'Inactivo';

    if (blockerEnabled) {
        toast('Bloqueador activado. Se activará en tu hora de estudio.', 'success');
        if (blockerInterval) clearInterval(blockerInterval);
        blockerInterval = setInterval(checkBlockerTime, 60000);
    } else {
        if (blockerInterval) clearInterval(blockerInterval);
        toast('Bloqueador desactivado', 'info');
    }
}

function checkBlockerTime() {
    if (!currentUser || !blockerEnabled) return;

    const d = getUD(currentUser.email);
    const [hour, minute] = (d.studyTime || '18:00').split(':').map(Number);
    const now = new Date();

    if (now.getHours() === hour && now.getMinutes() === minute && getTodayDone(currentUser.email) < 5) {
        activateBlocker();
    }
}

function activateBlocker() {
    let blockerCount = 25 * 60;
    const blockerOverlay = document.getElementById('screen-blocker');
    const timerElement = document.getElementById('blocker-timer');

    if (blockerOverlay) blockerOverlay.classList.add('active');

    if (blockerTimer) clearInterval(blockerTimer);

    blockerTimer = setInterval(() => {
        blockerCount--;
        const minutes = String(Math.floor(blockerCount / 60)).padStart(2, '0');
        const seconds = String(blockerCount % 60).padStart(2, '0');
        if (timerElement) timerElement.textContent = `${minutes}:${seconds}`;

        if (blockerCount <= 0 || getTodayDone(currentUser?.email || '') >= 5) {
            clearInterval(blockerTimer);
            if (blockerOverlay) blockerOverlay.classList.remove('active');
        }
    }, 1000);
}

function dismissBlocker() {
    const blockerOverlay = document.getElementById('screen-blocker');
    if (blockerOverlay) blockerOverlay.classList.remove('active');
    if (blockerTimer) clearInterval(blockerTimer);
    toast('Pospuesto — incumplimiento registrado 📝', 'error');
}

window.showDashTab = showDashTab;
window.saveStudyTime = saveStudyTime;
window.toggleDay = toggleDay;
window.toggleBlocker = toggleBlocker;
window.dismissBlocker = dismissBlocker;