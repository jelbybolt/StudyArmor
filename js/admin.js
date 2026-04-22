function loadAdminPanel() {
    const mainSite = document.getElementById('main-site');
    const mainFooter = document.getElementById('main-footer');
    const dashboard = document.getElementById('dashboard');
    const adminPanel = document.getElementById('admin-panel');

    if (mainSite) mainSite.style.display = 'none';
    if (mainFooter) mainFooter.style.display = 'none';
    if (dashboard) dashboard.style.display = 'none';
    if (adminPanel) adminPanel.style.display = 'block';

    hideMainNav();

    if (usersDB.length === 0) {
        loadDemoData();
    }

    renderAdminTable();

    if (window.saveSession) window.saveSession('admin', true);
}

function renderAdminTable() {
    const studentCountElement = document.getElementById('admin-student-count');
    if (studentCountElement) studentCountElement.textContent = usersDB.length;

    const totalPoints = usersDB.reduce((s, u) => s + getUD(u.email).points, 0);
    const avgStreak = usersDB.length ? Math.round(usersDB.reduce((s, u) => s + getUD(u.email).streak, 0) / usersDB.length) : 0;
    const activeToday = usersDB.filter(u => getTodayDone(u.email) > 0).length;

    const kpisContainer = document.getElementById('admin-kpis');
    if (kpisContainer) {
        kpisContainer.innerHTML = `
            <div class="kpi-card"><div class="kpi-label">Estudiantes</div><div class="kpi-value">${usersDB.length}</div><div class="kpi-sub">registrados</div></div>
            <div class="kpi-card"><div class="kpi-label">XP Total</div><div class="kpi-value">${totalPoints}</div><div class="kpi-sub">puntos acumulados</div></div>
            <div class="kpi-card"><div class="kpi-label">Racha Promedio</div><div class="kpi-value">${avgStreak}</div><div class="kpi-sub">días</div></div>
            <div class="kpi-card"><div class="kpi-label">Activos Hoy</div><div class="kpi-value">${activeToday}</div><div class="kpi-sub">estudiantes</div></div>
        `;
    }

    const tbody = document.getElementById('admin-tbody');
    if (!tbody) return;

    tbody.innerHTML = usersDB.map((u, i) => {
        const d = getUD(u.email);
        const lvl = getLevel(d.points);
        const todayDone = getTodayDone(u.email);
        let statusClass = 'badge-red';
        let statusLabel = 'Sin Actividad';

        if (todayDone >= 5) {
            statusClass = 'badge-green';
            statusLabel = 'Completado';
        } else if (todayDone > 0) {
            statusClass = 'badge-orange';
            statusLabel = 'En Progreso';
        }

        return `<tr>
            <td style="color:rgba(245,237,216,.3);font-family:'Space Mono',monospace;font-size:.65rem">${i + 1}</td>
            <td><strong style="color:var(--cream)">${u.name} ${u.lastname}</strong></td>
            <td style="font-family:'Space Mono',monospace;font-size:.75rem;color:var(--amber)">${u.carne}</td>
            <td>${u.career}</td>
            <td><span style="color:var(--orange);font-family:'Bebas Neue',sans-serif;font-size:1.3rem">${d.points}</span> <span style="font-size:.75rem;color:rgba(245,237,216,.4)">XP</span></td>
            <td>🔥 <strong style="color:var(--cream)">${d.streak}</strong> días</td>
            <td><span style="font-family:'Bebas Neue',sans-serif;font-size:1.2rem;color:${todayDone >= 5 ? '#00c864' : todayDone > 0 ? 'var(--orange)' : 'var(--red)'}">${todayDone}</span>/5</td>
            <td><span style="font-family:'Oswald',sans-serif;font-size:.8rem">Nv.${lvl.level} · ${lvl.label}</span></td>
            <td><span class="badge ${statusClass}">${statusLabel}</span></td>
        </tr>`;
    }).join('');

    // Render daily chart
    renderDailyChart();
}

function renderDailyChart() {
    const byDate = {};
    usersDB.forEach(u => {
        (getUD(u.email).completedActivities || []).forEach(c => {
            byDate[c.date] = (byDate[c.date] || 0) + 1;
        });
    });

    const dates = Object.keys(byDate).sort().slice(-5);
    const chartContainer = document.getElementById('admin-daily-chart');

    if (!chartContainer) return;

    if (!dates.length) {
        chartContainer.innerHTML = '<p style="font-size:.82rem;color:rgba(245,237,216,.3)">Sin actividad registrada aún.</p>';
        return;
    }

    const maxCount = Math.max(...Object.values(byDate));

    chartContainer.innerHTML = dates.map(date => {
        const count = byDate[date];
        const percentage = maxCount > 0 ? Math.round(count / maxCount * 100) : 0;
        const label = new Date(date + 'T12:00:00').toLocaleDateString('es-GT', { weekday: 'short', month: 'short', day: 'numeric' });

        return `<div style="display:flex;align-items:center;gap:1rem;margin-bottom:.75rem">
            <span style="font-family:'Space Mono',monospace;font-size:.6rem;color:rgba(245,237,216,.35);min-width:90px">${label}</span>
            <div style="flex:1;height:24px;background:rgba(245,237,216,.08);position:relative">
                <div style="width:${percentage}%;height:100%;background:var(--orange);transition:width 1s"></div>
            </div>
            <span style="font-family:'Bebas Neue',sans-serif;color:var(--orange);font-size:1rem;min-width:40px">${count}</span>
        </div>`;
    }).join('');
}

window.renderAdminTable = renderAdminTable;