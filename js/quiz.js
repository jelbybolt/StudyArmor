let activeAct = null;
let qCurrent = 0;
let qAttempts = 0;

function startActivity(id) {
    const activity = ACTIVITIES.find(x => x.id === id);
    if (!activity) return;

    const d = getUD(currentUser.email);
    const todayDone = (d.completedActivities || []).filter(c => c.date === todayKey()).map(c => c.actId);

    if (todayDone.includes(id)) {
        toast('Esta actividad ya está completada hoy ✓', 'success');
        return;
    }

    activeAct = activity;
    qCurrent = 0;
    qAttempts = 0;


    const activityName = document.getElementById('q-activity-name');
    const categoryTag = document.getElementById('q-category');
    const readTitle = document.getElementById('q-read-title');
    const readBody = document.getElementById('q-read-body');
    const attemptsDisplay = document.getElementById('q-attempts-display');

    if (activityName) activityName.textContent = activity.title.toUpperCase();
    if (categoryTag) categoryTag.textContent = activity.category;
    if (readTitle) readTitle.textContent = activity.title;
    if (readBody) readBody.textContent = activity.reading;
    if (attemptsDisplay) attemptsDisplay.textContent = '0';


    const phaseRead = document.getElementById('quiz-phase-read');
    const phaseQuestions = document.getElementById('quiz-phase-questions');
    const phaseSuccess = document.getElementById('quiz-phase-success');

    if (phaseRead) phaseRead.classList.remove('hide');
    if (phaseQuestions) phaseQuestions.classList.add('hide');
    if (phaseSuccess) {
        phaseSuccess.classList.remove('show');
        phaseSuccess.classList.add('hide');
    }

    hideMainNav();

    const quizOverlay = document.getElementById('quiz-overlay');
    if (quizOverlay) quizOverlay.classList.add('open');

    window.scrollTo(0, 0);
}

function startQuizPhase() {
    const phaseRead = document.getElementById('quiz-phase-read');
    const phaseQuestions = document.getElementById('quiz-phase-questions');

    if (phaseRead) phaseRead.classList.add('hide');
    if (phaseQuestions) phaseQuestions.classList.remove('hide');

    renderQuestion();
}

function renderQuestion() {
    if (!activeAct) return;

    const q = activeAct.questions[qCurrent];
    const total = activeAct.questions.length;

    const progBar = document.getElementById('q-prog-bar');
    if (progBar) {
        progBar.innerHTML = activeAct.questions.map((_, i) =>
            `<div class="qpb-dot ${i < qCurrent ? 'done' : i === qCurrent ? 'current' : ''}"></div>`
        ).join('');
    }

    const progText = document.getElementById('q-prog-text');
    const qNum = document.getElementById('q-num');
    const qText = document.getElementById('q-text');
    const optionsContainer = document.getElementById('q-options');
    const attemptsText = document.getElementById('q-attempts-text');

    if (progText) progText.textContent = `${qCurrent + 1} / ${total}`;
    if (qNum) qNum.textContent = `Pregunta ${qCurrent + 1} de ${total}`;
    if (qText) qText.textContent = q.q;

    if (optionsContainer) {
        optionsContainer.innerHTML = q.opts.map((opt, i) =>
            `<li class="quiz-option" onclick="selectOpt(${i})" id="qopt-${i}">
                <span class="quiz-opt-letter">${String.fromCharCode(65 + i)}</span>${opt}
            </li>`
        ).join('');
    }

    const feedback = document.getElementById('q-feedback');
    if (feedback) {
        feedback.className = 'quiz-feedback-bar';
        feedback.textContent = '';
    }

    const nextBtn = document.getElementById('q-next-btn');
    const finishBtn = document.getElementById('q-finish-btn');

    if (nextBtn) nextBtn.style.display = 'none';
    if (finishBtn) finishBtn.style.display = 'none';
    if (attemptsText) attemptsText.textContent = qAttempts > 0 ? `Intentos fallidos: ${qAttempts}` : '';
}

function selectOpt(idx) {

    if (document.querySelector('.quiz-option.correct')) return;

    const q = activeAct.questions[qCurrent];
    const optionElement = document.getElementById(`qopt-${idx}`);

    if (idx === q.ans) {
        if (optionElement) optionElement.classList.add('correct');

        document.querySelectorAll('.quiz-option').forEach(o => o.style.pointerEvents = 'none');

        const feedback = document.getElementById('q-feedback');
        if (feedback) {
            feedback.textContent = '✓ ¡Correcto! Muy bien.';
            feedback.className = 'quiz-feedback-bar show success';
        }

        const nextBtn = document.getElementById('q-next-btn');
        const finishBtn = document.getElementById('q-finish-btn');

        if (qCurrent < activeAct.questions.length - 1) {
            if (nextBtn) nextBtn.style.display = 'block';
        } else {
            if (finishBtn) finishBtn.style.display = 'block';
        }
    } else {
        qAttempts++;

        const attemptsDisplay = document.getElementById('q-attempts-display');
        if (attemptsDisplay) attemptsDisplay.textContent = qAttempts;

        if (optionElement) optionElement.classList.add('wrong');

        const feedback = document.getElementById('q-feedback');
        if (feedback) {
            feedback.textContent = `✗ Incorrecto. Vuelve a intentarlo — lee el material si es necesario. (Intento #${qAttempts})`;
            feedback.className = 'quiz-feedback-bar show error';
        }

        setTimeout(() => {
            if (optionElement) optionElement.classList.remove('wrong');
            if (feedback) {
                feedback.className = 'quiz-feedback-bar';
                feedback.textContent = '';
            }
            const attemptsText = document.getElementById('q-attempts-text');
            if (attemptsText) attemptsText.textContent = `Intentos fallidos: ${qAttempts}`;
        }, 1800);
    }
}

function quizNext() {
    qCurrent++;
    renderQuestion();
}

function quizFinish() {
    const d = getUD(currentUser.email);

    if (!d.completedActivities) d.completedActivities = [];

    d.completedActivities.push({
        actId: activeAct.id,
        date: todayKey(),
        points: activeAct.points
    });

    d.points += activeAct.points;
    d.lastActiveDate = todayKey();

    // Update streak if all activities done today
    if (getTodayDone(currentUser.email) >= 5) {
        const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
        if (d.lastActiveDate === yesterday || d.streak === 0) {
            d.streak++;
        } else if (d.lastActiveDate !== todayKey() && d.streak > 0) {
            // Streak continues
        } else if (d.streak < 1) {
            d.streak = 1;
        }
        if (d.streak < 1) d.streak = 1;
    }

    d.level = getLevel(d.points).level;
    saveDB();

    const phaseQuestions = document.getElementById('quiz-phase-questions');
    const phaseSuccess = document.getElementById('quiz-phase-success');
    const successSub = document.getElementById('q-success-sub');
    const pointsEarned = document.getElementById('q-points-earned');

    if (phaseQuestions) phaseQuestions.classList.add('hide');
    if (phaseSuccess) {
        phaseSuccess.classList.remove('hide');
        phaseSuccess.classList.add('show');
    }
    if (successSub) successSub.textContent = `Completaste "${activeAct.title}" con ${qAttempts} intento(s) fallido(s).`;
    if (pointsEarned) pointsEarned.textContent = `+${activeAct.points} XP`;
}

function closeQuiz() {
    const quizOverlay = document.getElementById('quiz-overlay');
    if (quizOverlay) quizOverlay.classList.remove('open');

    showMainNav();
    activeAct = null;

    loadDashboard();
    showDashTab('activities');
}

window.startActivity = startActivity;
window.startQuizPhase = startQuizPhase;
window.selectOpt = selectOpt;
window.quizNext = quizNext;
window.quizFinish = quizFinish;
window.closeQuiz = closeQuiz;