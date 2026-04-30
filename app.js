/* ========================================
   AI Study Dashboard — Application Logic
   Parakram 2.0 2027 ESE + GATE + PSUs
   Supabase-backed with cloud sync
   ======================================== */

// ==================== COLOR PALETTE ====================
const COLOR_PALETTE = [
    '#60a5fa', '#4ade80', '#facc15', '#f472b6', '#a78bfa', '#fb923c',
    '#2dd4bf', '#f87171', '#38bdf8', '#34d399', '#e879f9', '#fbbf24',
    '#818cf8', '#22d3ee', '#a3e635', '#c084fc', '#f97316', '#14b8a6',
    '#8b5cf6', '#ef4444', '#06b6d4', '#84cc16', '#d946ef', '#eab308',
    '#10b981', '#6366f1', '#ec4899', '#f59e0b', '#0ea5e9', '#7c3aed',
];

function colorBg(hex, alpha = 0.1) {
    const r = parseInt(hex.slice(1, 3), 16), g = parseInt(hex.slice(3, 5), 16), b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r},${g},${b},${alpha})`;
}

const CATEGORY_LABELS = {
    'core-ee': 'Core Electrical',
    'math-aptitude': 'Math & Aptitude',
    'general': 'General Studies',
    'custom': 'Custom / Other',
};

const CATEGORY_ICONS = {
    'core-ee': '⚡',
    'math-aptitude': '📐',
    'general': '📖',
    'custom': '📌',
};

// ==================== MOTIVATIONAL QUOTES ====================
const MOTIVATIONAL_QUOTES = [
    "Success is the sum of small efforts, repeated day in and day out. — Robert Collier",
    "The expert in anything was once a beginner. — Helen Hayes",
    "Don't watch the clock; do what it does. Keep going. — Sam Levenson",
    "Learning never exhausts the mind. — Leonardo da Vinci",
    "Discipline is choosing between what you want now and what you want most.",
    "Consistency is more important than intensity.",
    "Every expert was once a beginner. Keep learning.",
    "Small daily improvements lead to stunning results. — Robin Sharma",
    "The beautiful thing about learning is no one can take it away from you. — B.B. King",
    "Hard work beats talent when talent doesn't work hard.",
    "Your future self will thank you for the work you put in today.",
    "GATE is not just an exam, it's a journey of self-improvement.",
    "One subject at a time. One concept at a time. One problem at a time.",
    "The pain of studying is temporary. The pride of cracking GATE is permanent.",
    "Focus on understanding, not memorizing. Concepts stay, facts fade.",
    "Revision is the mother of all learning. Review what you studied yesterday.",
    "Practice doesn't make perfect. Perfect practice makes perfect.",
    "The difference between ordinary and extraordinary is that little extra.",
    "Dream big, start small, act now.",
    "Today's effort is tomorrow's result.",
];

// ==================== BADGES ====================
const BADGES = [
    { id: 'first_task', emoji: '🌟', name: 'First Step', desc: 'Complete your first task', check: () => getTotalCompleted() >= 1 },
    { id: 'streak_3', emoji: '🔥', name: 'On Fire', desc: '3-day streak', check: () => getStreak() >= 3 },
    { id: 'streak_7', emoji: '⚡', name: 'Unstoppable', desc: '7-day streak', check: () => getStreak() >= 7 },
    { id: 'streak_14', emoji: '💎', name: 'Diamond Will', desc: '14-day streak', check: () => getStreak() >= 14 },
    { id: 'perfect_day', emoji: '🏆', name: 'Perfect Day', desc: '100% in one day', check: () => hasPerfectDay() },
    { id: 'ten_tasks', emoji: '🎯', name: 'Focused', desc: '10 tasks completed', check: () => getTotalCompleted() >= 10 },
    { id: 'fifty_tasks', emoji: '🚀', name: 'Rocketeer', desc: '50 tasks completed', check: () => getTotalCompleted() >= 50 },
    { id: 'hundred_tasks', emoji: '👑', name: 'Centurion', desc: '100 tasks completed', check: () => getTotalCompleted() >= 100 },
    { id: 'five_days', emoji: '🌅', name: 'Dedicated', desc: 'Study 5 different days', check: () => getDaysStudied() >= 5 },
    { id: 'twenty_days', emoji: '🏅', name: 'Consistent', desc: 'Study 20 different days', check: () => getDaysStudied() >= 20 },
];

// ==================== STATE ====================
let currentDate = new Date();
let currentView = 'dashboard';
let currentAddSubject = null;
let editingSubjectId = null;
let scheduleFilter = 'all';
let selectedColorIndex = 0;
let allUserTasks = []; // flat array for analytics (fetched once)

// ==================== HELPERS ====================
function getDateKey(date) {
    const d = date instanceof Date ? date : new Date(date);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
function formatDateFull(d) { return d.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }); }
function escapeHtml(t) { const d = document.createElement('div'); d.textContent = t; return d.innerHTML; }
function getSubjectColor(subj) { return COLOR_PALETTE[(subj.color_index ?? 0) % COLOR_PALETTE.length]; }

// ==================== SUBJECT STATUS (uses cache) ====================
function getSubjectScheduleStatus(subj, dateKey) {
    if (subj.schedule_type === 'recorded') return 'recorded';
    if (subj.schedule_type === 'notify') return 'notify';
    if (!subj.start_date || !subj.end_date) return 'notify';
    const d = dateKey || getDateKey(new Date());
    if (d < subj.start_date) return 'upcoming';
    if (d > subj.end_date) return 'completed';
    return 'active';
}

function getActiveSubjects(dateKey) {
    const key = dateKey || getDateKey(new Date());
    return getCachedSubjects().filter(s => {
        const status = getSubjectScheduleStatus(s, key);
        return status === 'active' || status === 'recorded';
    });
}

function getScheduleProgress(subj) {
    if (subj.schedule_type !== 'scheduled' || !subj.start_date || !subj.end_date) return -1;
    const start = new Date(subj.start_date + 'T00:00:00');
    const end = new Date(subj.end_date + 'T00:00:00');
    const now = new Date();
    const total = (end - start) / (1000 * 60 * 60 * 24);
    const elapsed = (now - start) / (1000 * 60 * 60 * 24);
    return Math.max(0, Math.min(100, Math.round((elapsed / total) * 100)));
}

// ==================== ANALYTICS (from cache) ====================
function getDayStats(dateKey) {
    const tasks = getCachedDayTasks(dateKey);
    const total = tasks.length;
    const completed = tasks.filter(t => t.completed).length;
    const pending = total - completed;
    const percent = total > 0 ? Math.round((completed / total) * 100) : 0;
    const timeLogged = tasks.reduce((s, t) => s + (t.estimated_time || 0), 0);
    return { total, completed, pending, percent, timeLogged };
}

function getSubjectDayStats(dateKey, subjectId) {
    const tasks = getCachedDayTasks(dateKey).filter(t => t.subject_id === subjectId);
    const total = tasks.length;
    const completed = tasks.filter(t => t.completed).length;
    const percent = total > 0 ? Math.round((completed / total) * 100) : 0;
    return { total, completed, percent };
}

function getWeekDates() {
    const today = new Date();
    const dow = today.getDay();
    const mon = new Date(today);
    mon.setDate(today.getDate() - (dow === 0 ? 6 : dow - 1));
    return Array.from({ length: 7 }, (_, i) => { const d = new Date(mon); d.setDate(mon.getDate() + i); return d; });
}

function getStreak() {
    let streak = 0;
    const today = new Date();
    const check = new Date(today);
    while (true) {
        const key = getDateKey(check);
        const tasks = getCachedDayTasks(key);
        if (tasks.length > 0) {
            const stats = getDayStats(key);
            if (stats.percent >= 50) { streak++; check.setDate(check.getDate() - 1); }
            else break;
        } else {
            if (key !== getDateKey(today)) break;
            check.setDate(check.getDate() - 1);
        }
    }
    return streak;
}

function getTotalCompleted() {
    return allUserTasks.filter(t => t.completed).length;
}

function getDaysStudied() {
    const days = new Set();
    allUserTasks.filter(t => t.completed).forEach(t => days.add(t.date));
    return days.size;
}

function hasPerfectDay() {
    const byDay = {};
    allUserTasks.forEach(t => {
        if (!byDay[t.date]) byDay[t.date] = { total: 0, completed: 0 };
        byDay[t.date].total++;
        if (t.completed) byDay[t.date].completed++;
    });
    return Object.values(byDay).some(d => d.total > 0 && d.total === d.completed);
}

function getWeeklySubjectStats() {
    const weekDates = getWeekDates();
    const stats = {};
    getCachedSubjects().forEach(s => { stats[s.id] = { total: 0, completed: 0 }; });
    weekDates.forEach(date => {
        const key = getDateKey(date);
        const tasks = getCachedDayTasks(key);
        tasks.forEach(task => {
            if (stats[task.subject_id]) { stats[task.subject_id].total++; if (task.completed) stats[task.subject_id].completed++; }
        });
    });
    return stats;
}

function getWeekTrend() {
    const percents = getWeekDates().map(d => getDayStats(getDateKey(d))).filter(s => s.total > 0).map(s => s.percent);
    if (percents.length < 2) return 'stable';
    const h1 = percents.slice(0, Math.ceil(percents.length / 2));
    const h2 = percents.slice(Math.ceil(percents.length / 2));
    const a1 = h1.reduce((a, b) => a + b, 0) / h1.length;
    const a2 = h2.reduce((a, b) => a + b, 0) / h2.length;
    if (a2 > a1 + 5) return 'improving';
    if (a2 < a1 - 5) return 'declining';
    return 'stable';
}

function getAISuggestion() {
    const todayKey = getDateKey(new Date());
    const todayStats = getDayStats(todayKey);
    const active = getActiveSubjects(todayKey);
    const todayTasks = getCachedDayTasks(todayKey);
    const todaySubjects = new Set(todayTasks.map(t => t.subject_id));
    const customSubj = getCachedSubjects().find(s => s.category === 'custom');
    const customId = customSubj ? customSubj.id : null;
    const missing = active.filter(s => !todaySubjects.has(s.id) && s.id !== customId);

    if (todayStats.total === 0) return "🎯 Start your day by adding tasks! Go to Daily Plan and add tasks for your active subjects.";
    if (todayStats.percent === 100) return "🎉 Amazing! All tasks done. Consider revising yesterday's topics or adding stretch goals.";
    if (missing.length > 0 && missing.length <= 3) return `📝 You haven't added tasks for ${missing.map(s => s.name).join(', ')} today.`;
    if (todayStats.pending > todayStats.completed) return `💪 ${todayStats.pending} tasks remaining. Use Pomodoro — 25 min focus, 5 min break.`;
    return "🌟 Great progress! Consistency is the key to cracking GATE. Keep going!";
}

// ==================== AUTH UI ====================
function switchAuthTab(tab) {
    document.getElementById('tab-login').classList.toggle('active', tab === 'login');
    document.getElementById('tab-register').classList.toggle('active', tab === 'register');
    document.getElementById('login-form').classList.toggle('hidden', tab !== 'login');
    document.getElementById('register-form').classList.toggle('hidden', tab !== 'register');
    document.getElementById('login-error').classList.add('hidden');
    document.getElementById('register-error').classList.add('hidden');
}

function showAuthScreen() {
    document.getElementById('auth-screen').classList.remove('hidden');
    document.getElementById('loading-screen').classList.add('hidden');
    document.getElementById('app').classList.add('hidden');
}

function showLoadingScreen(text) {
    document.getElementById('auth-screen').classList.add('hidden');
    document.getElementById('loading-screen').classList.remove('hidden');
    document.getElementById('app').classList.add('hidden');
    document.getElementById('loading-text').textContent = text || 'Loading your dashboard...';
}

function showApp() {
    document.getElementById('auth-screen').classList.add('hidden');
    document.getElementById('loading-screen').classList.add('hidden');
    document.getElementById('app').classList.remove('hidden');
}

function setAuthLoading(formId, loading) {
    const btn = document.querySelector(`#${formId} .auth-submit-btn`);
    const text = btn.querySelector('.auth-btn-text');
    const loader = btn.querySelector('.auth-btn-loader');
    btn.disabled = loading;
    text.style.opacity = loading ? '0' : '1';
    loader.classList.toggle('hidden', !loading);
}

async function handleLogin(e) {
    e.preventDefault();
    const username = document.getElementById('login-username').value.trim();
    const password = document.getElementById('login-password').value;
    const errorEl = document.getElementById('login-error');
    errorEl.classList.add('hidden');

    if (!username || !password) { errorEl.textContent = 'Please fill in all fields'; errorEl.classList.remove('hidden'); return; }

    setAuthLoading('login-form', true);
    try {
        await authSignIn(username, password);
        showLoadingScreen('Loading your study data...');
        await loadUserDataAndStart();
    } catch (err) {
        errorEl.textContent = err.message === 'Invalid login credentials' ? 'Invalid username or password' : err.message;
        errorEl.classList.remove('hidden');
        setAuthLoading('login-form', false);
    }
}

async function handleRegister(e) {
    e.preventDefault();
    const name = document.getElementById('register-name').value.trim();
    const username = document.getElementById('register-username').value.trim();
    const password = document.getElementById('register-password').value;
    const seedSubjects = document.getElementById('register-seed').checked;
    const errorEl = document.getElementById('register-error');
    errorEl.classList.add('hidden');

    if (!name || !username || !password) { errorEl.textContent = 'Please fill in all fields'; errorEl.classList.remove('hidden'); return; }
    if (password.length < 6) { errorEl.textContent = 'Password must be at least 6 characters'; errorEl.classList.remove('hidden'); return; }

    setAuthLoading('register-form', true);
    try {
        await authSignUp(username, password, name);
        showLoadingScreen(seedSubjects ? 'Setting up your subjects...' : 'Creating your dashboard...');
        if (seedSubjects) {
            await dbSeedParakramSubjects();
        }
        await loadUserDataAndStart();
    } catch (err) {
        let msg = err.message;
        if (msg.includes('already registered')) msg = 'This username is already taken. Try logging in.';
        errorEl.textContent = msg;
        errorEl.classList.remove('hidden');
        setAuthLoading('register-form', false);
    }
}

async function handleLogout() {
    if (!confirm('Sign out of StudyFlow?')) return;
    clearCache();
    allUserTasks = [];
    await authSignOut();
    showAuthScreen();
}

// ==================== DATA LOADING ====================
async function loadUserDataAndStart() {
    // Fetch all user data in parallel
    const weekDates = getWeekDates();
    const weekStart = getDateKey(weekDates[0]);
    const weekEnd = getDateKey(weekDates[6]);
    const todayKey = getDateKey(new Date());
    const yesterday = new Date(); yesterday.setDate(yesterday.getDate() - 1);
    const yKey = getDateKey(yesterday);

    const [subjectsData, allTasks] = await Promise.all([
        dbFetchSubjects(),
        dbFetchAllUserTasks(),
    ]);

    // Populate allUserTasks and cache
    allUserTasks = allTasks;
    allTasks.forEach(t => {
        if (!cachedTasks[t.date]) cachedTasks[t.date] = [];
        if (!cachedTasks[t.date].find(x => x.id === t.id)) {
            cachedTasks[t.date].push(t);
        }
    });

    // Update user profile in sidebar
    if (currentProfile) {
        document.getElementById('user-name').textContent = currentProfile.display_name;
        document.getElementById('user-avatar').textContent = currentProfile.avatar_emoji || '🎓';
        document.getElementById('user-target').textContent = currentProfile.exam_target || 'GATE 2027';
    }

    showApp();
    switchView('dashboard');
}

// ==================== VIEW SWITCHING ====================
function switchView(viewName) {
    currentView = viewName;
    document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    const view = document.getElementById(`view-${viewName}`);
    const nav = document.querySelector(`.nav-item[data-view="${viewName}"]`);
    if (view) { view.classList.add('active'); view.style.animation = 'none'; view.offsetHeight; view.style.animation = ''; }
    if (nav) nav.classList.add('active');
    const titles = {
        dashboard: ['Dashboard', 'Your study command center'],
        daily: ['Daily Plan', formatDateFull(currentDate)],
        schedule: ['Subject Schedule', 'Parakram 2.0 — Yearly Planner'],
        weekly: ['Weekly Analytics', 'Track your weekly progress'],
        insights: ['Insights', 'AI-powered study analysis'],
    };
    const [title, subtitle] = titles[viewName] || ['', ''];
    document.getElementById('page-title').textContent = title;
    document.getElementById('page-subtitle').textContent = subtitle;
    document.querySelector('.sidebar').classList.remove('open');
    const bd = document.getElementById('sidebar-backdrop');
    if (bd) bd.classList.remove('active');
    refreshCurrentView();
}

async function refreshCurrentView() {
    switch (currentView) {
        case 'dashboard': renderDashboard(); break;
        case 'daily': await renderDailyView(); break;
        case 'schedule': renderScheduleView(); break;
        case 'weekly': await renderWeeklyView(); break;
        case 'insights': await renderInsightsView(); break;
    }
}

// ==================== DASHBOARD ====================
function renderDashboard() {
    const todayKey = getDateKey(new Date());
    const todayStats = getDayStats(todayKey);
    const streak = getStreak();
    const active = getActiveSubjects(todayKey);

    document.getElementById('dash-today-percent').textContent = todayStats.percent + '%';
    document.getElementById('dash-tasks-done').textContent = `${todayStats.completed}/${todayStats.total}`;
    document.getElementById('dash-streak').textContent = `${streak} day${streak !== 1 ? 's' : ''}`;
    document.getElementById('dash-active-subjects').textContent = active.length;

    const trend = getWeekTrend();
    document.getElementById('dash-today-trend').className = `stat-trend ${trend === 'declining' ? 'down' : 'up'}`;

    const circ = 2 * Math.PI * 85;
    const ring = document.getElementById('dash-progress-ring');
    const svg = ring.closest('svg');
    if (!svg.querySelector('#ring-gradient')) {
        const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
        const g = document.createElementNS('http://www.w3.org/2000/svg', 'linearGradient');
        g.setAttribute('id', 'ring-gradient');
        g.innerHTML = '<stop offset="0%" stop-color="#6C63FF"/><stop offset="50%" stop-color="#FF6584"/><stop offset="100%" stop-color="#00C9A7"/>';
        defs.appendChild(g); svg.insertBefore(defs, svg.firstChild);
    }
    ring.style.strokeDasharray = circ;
    requestAnimationFrame(() => { ring.style.strokeDashoffset = circ - (todayStats.percent / 100) * circ; });
    document.getElementById('dash-ring-value').textContent = todayStats.percent + '%';

    const breakdownEl = document.getElementById('dash-subject-breakdown');
    breakdownEl.innerHTML = active.slice(0, 6).map(s => {
        const st = getSubjectDayStats(todayKey, s.id);
        const color = getSubjectColor(s);
        return `<div class="subject-chip" style="background:${colorBg(color)};border-color:${color}20;"><span class="subject-chip-dot" style="background:${color}"></span>${s.name.length > 18 ? s.name.substring(0, 18) + '…' : s.name}: ${st.completed}/${st.total}</div>`;
    }).join('');

    document.getElementById('ai-suggestion-text').textContent = getAISuggestion();
    document.getElementById('streak-count').textContent = streak;

    const asgEl = document.getElementById('dash-active-subjects-list');
    if (active.length > 0) {
        asgEl.innerHTML = active.map(s => {
            const color = getSubjectColor(s);
            const status = getSubjectScheduleStatus(s, todayKey);
            return `<div class="active-subj-card" onclick="goToDateAndSubject('${todayKey}','${s.id}')">
                <span class="active-subj-dot" style="background:${color}"></span>
                <span class="active-subj-name">${s.name}</span>
                <span class="active-subj-status ${status === 'active' ? 'live' : 'recorded'}">${status === 'active' ? 'LIVE' : 'Self-Paced'}</span>
            </div>`;
        }).join('');
    } else {
        asgEl.innerHTML = '<div class="empty-state"><span class="empty-state-icon">📅</span><span class="empty-state-text">No active subjects for today</span></div>';
    }

    renderBadges();
}

function renderBadges() {
    document.getElementById('badges-grid').innerHTML = BADGES.map(b => {
        const earned = b.check();
        return `<div class="badge-item ${earned ? 'earned' : 'locked'}" title="${b.desc}"><span class="badge-emoji">${b.emoji}</span><span class="badge-name">${b.name}</span><span class="badge-desc">${b.desc}</span></div>`;
    }).join('');
}

// ==================== DAILY VIEW ====================
async function renderDailyView() {
    const dateKey = getDateKey(currentDate);
    document.getElementById('date-day').textContent = currentDate.getDate();
    document.getElementById('date-month').textContent = currentDate.toLocaleDateString('en-US', { month: 'long' });
    document.getElementById('date-weekday').textContent = currentDate.toLocaleDateString('en-US', { weekday: 'long' });
    document.getElementById('page-subtitle').textContent = formatDateFull(currentDate);

    // Fetch tasks for this day if not cached
    const loader = document.getElementById('daily-loading');
    if (!cachedTasks[dateKey]) {
        loader.classList.remove('hidden');
        await dbFetchDayTasks(dateKey);
        loader.classList.add('hidden');
    }

    const stats = getDayStats(dateKey);
    document.getElementById('dp-completed-num').textContent = stats.completed;
    document.getElementById('dp-pending-num').textContent = stats.pending;
    document.getElementById('dp-total-num').textContent = stats.total;

    const bar = document.getElementById('daily-progress-bar');
    const pct = document.getElementById('daily-progress-percent');
    requestAnimationFrame(() => { bar.style.width = stats.percent + '%'; });
    pct.textContent = stats.percent + '%';
    if (stats.percent >= 70) { bar.style.background = 'linear-gradient(135deg,#00C9A7,#4ade80)'; pct.style.color = '#4ade80'; }
    else if (stats.percent >= 40) { bar.style.background = 'linear-gradient(135deg,#FFB347,#facc15)'; pct.style.color = '#facc15'; }
    else { bar.style.background = 'var(--gradient-primary)'; pct.style.color = 'var(--text-primary)'; }

    renderSubjectSections(dateKey);
    await loadReflection(dateKey);
}

function renderSubjectSections(dateKey) {
    const container = document.getElementById('subjects-container');
    const subjects = getCachedSubjects();
    const dayTasks = getCachedDayTasks(dateKey);
    const active = getActiveSubjects(dateKey);
    const taskedSubjectIds = new Set(dayTasks.map(t => t.subject_id));
    const extraSubjects = subjects.filter(s => taskedSubjectIds.has(s.id) && !active.find(a => a.id === s.id));
    const displaySubjects = [...active, ...extraSubjects];

    container.innerHTML = displaySubjects.map(subj => {
        const color = getSubjectColor(subj);
        const tasks = dayTasks.filter(t => t.subject_id === subj.id);
        const completed = tasks.filter(t => t.completed).length;
        const total = tasks.length;
        const spct = total > 0 ? Math.round((completed / total) * 100) : 0;
        const icon = CATEGORY_ICONS[subj.category] || '📌';

        return `<div class="subject-section" data-subject="${subj.id}" id="section-${subj.id}">
            <div class="subject-header" onclick="toggleSubjectSection('${subj.id}')">
                <div class="subject-header-left">
                    <div class="subject-color-bar" style="background:${color}"></div>
                    <span class="subject-icon">${icon}</span>
                    <span class="subject-name">${subj.name}</span>
                </div>
                <div class="subject-header-right">
                    <span class="subject-count" style="background:${colorBg(color)};color:${color}">${completed}/${total}</span>
                    <div class="subject-mini-progress"><div class="subject-mini-progress-fill" style="width:${spct}%;background:${color}"></div></div>
                    <svg class="subject-chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"/></svg>
                </div>
            </div>
            <div class="subject-tasks">
                ${tasks.map(task => renderTaskItem(task, dateKey, subj)).join('')}
                <button class="add-task-btn" onclick="openAddTask('${subj.id}')">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                    Add Task
                </button>
            </div>
        </div>`;
    }).join('');
}

function renderTaskItem(task, dateKey, subj) {
    const color = getSubjectColor(subj);
    const status = task.completed ? 'completed' : 'pending';
    return `<div class="task-item ${task.completed ? 'completed' : ''}" id="task-${task.id}">
        <div class="task-checkbox">
            <input type="checkbox" ${task.completed ? 'checked' : ''} onchange="handleTaskToggle('${dateKey}','${task.id}',this)" id="check-${task.id}">
            <span class="checkmark"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><polyline points="20 6 9 17 4 12"/></svg></span>
        </div>
        <div class="task-content">
            <span class="task-title">${escapeHtml(task.title)}</span>
            ${task.notes ? `<span class="task-notes">${escapeHtml(task.notes)}</span>` : ''}
        </div>
        <div class="task-meta">
            ${task.estimated_time ? `<span class="task-time">${task.estimated_time}m</span>` : ''}
            <span class="task-status ${status}">${status.charAt(0).toUpperCase() + status.slice(1)}</span>
        </div>
        <button class="task-delete" onclick="handleDeleteTask('${dateKey}','${task.id}')" title="Delete task">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
        </button>
    </div>`;
}

// ==================== SCHEDULE VIEW ====================
function renderScheduleView() {
    const todayKey = getDateKey(new Date());
    const subjects = getCachedSubjects();
    const customSubj = subjects.find(s => s.category === 'custom');

    const statusCounts = { active: 0, upcoming: 0, completed: 0, recorded: 0, notify: 0 };
    subjects.forEach(s => { if (s.category !== 'custom') { const st = getSubjectScheduleStatus(s, todayKey); statusCounts[st] = (statusCounts[st] || 0) + 1; } });

    document.getElementById('schedule-stats-row').innerHTML = `
        <div class="schedule-stat"><span class="schedule-stat-value" style="color:var(--accent-success)">${statusCounts.active}</span><span class="schedule-stat-label">Active Now</span></div>
        <div class="schedule-stat"><span class="schedule-stat-value" style="color:#60a5fa">${statusCounts.upcoming}</span><span class="schedule-stat-label">Upcoming</span></div>
        <div class="schedule-stat"><span class="schedule-stat-value" style="color:var(--accent-primary)">${statusCounts.completed}</span><span class="schedule-stat-label">Completed</span></div>
        <div class="schedule-stat"><span class="schedule-stat-value" style="color:var(--accent-warning)">${statusCounts.recorded + statusCounts.notify}</span><span class="schedule-stat-label">Recorded / TBA</span></div>
    `;

    let filtered = subjects.filter(s => s.category !== 'custom');
    if (scheduleFilter !== 'all') {
        filtered = filtered.filter(s => {
            const st = getSubjectScheduleStatus(s, todayKey);
            if (scheduleFilter === 'active') return st === 'active';
            if (scheduleFilter === 'upcoming') return st === 'upcoming';
            if (scheduleFilter === 'completed') return st === 'completed';
            if (scheduleFilter === 'recorded') return st === 'recorded' || st === 'notify';
            return true;
        });
    }

    const listEl = document.getElementById('schedule-list');
    if (filtered.length === 0) {
        listEl.innerHTML = '<div class="empty-state"><span class="empty-state-icon">📭</span><span class="empty-state-text">No subjects match this filter</span></div>';
        return;
    }

    listEl.innerHTML = filtered.map(s => {
        const color = getSubjectColor(s);
        const status = getSubjectScheduleStatus(s, todayKey);
        const progress = getScheduleProgress(s);
        let dateStr = '';
        if (s.schedule_type === 'scheduled' && s.start_date && s.end_date) {
            const sd = new Date(s.start_date + 'T00:00:00');
            const ed = new Date(s.end_date + 'T00:00:00');
            dateStr = `${sd.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} → ${ed.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
        } else if (s.schedule_type === 'recorded') { dateStr = 'Recorded — Available anytime'; }
        else { dateStr = 'To Be Announced'; }

        const statusLabel = { active: 'Active', upcoming: 'Upcoming', completed: 'Completed', recorded: 'Recorded', notify: 'TBA' }[status];
        const statusClass = status === 'completed' ? 'completed-status' : status;

        return `<div class="schedule-item">
            <div class="schedule-item-color" style="background:${color}"></div>
            <div class="schedule-item-info"><div class="schedule-item-name">${s.name}</div><div class="schedule-item-dates">${dateStr}</div></div>
            <span class="schedule-item-category">${CATEGORY_LABELS[s.category] || s.category}</span>
            ${progress >= 0 ? `<div class="schedule-item-progress-wrapper"><div class="schedule-item-progress-bar" style="width:${progress}%;background:${color}"></div></div>` : ''}
            <span class="schedule-item-status ${statusClass}">${statusLabel}</span>
            <div class="schedule-item-actions">
                <button onclick="editSubject('${s.id}')" title="Edit"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.12 2.12 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg></button>
                <button class="btn-delete-subj" onclick="deleteSubjectConfirm('${s.id}')" title="Delete"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg></button>
            </div>
        </div>`;
    }).join('');
}

function filterSchedule(filter) {
    scheduleFilter = filter;
    document.querySelectorAll('.filter-chip').forEach(c => c.classList.toggle('active', c.dataset.filter === filter));
    renderScheduleView();
}

// ==================== WEEKLY VIEW ====================
async function renderWeeklyView() {
    const weekDates = getWeekDates();
    const weekStart = getDateKey(weekDates[0]);
    const weekEnd = getDateKey(weekDates[6]);

    // Ensure week tasks are cached
    const loader = document.getElementById('weekly-loading');
    let needsFetch = false;
    weekDates.forEach(d => { if (!cachedTasks[getDateKey(d)]) needsFetch = true; });
    if (needsFetch) {
        loader.classList.remove('hidden');
        await dbFetchDateRangeTasks(weekStart, weekEnd);
        // Ensure empty days have empty arrays
        weekDates.forEach(d => { const k = getDateKey(d); if (!cachedTasks[k]) cachedTasks[k] = []; });
        loader.classList.add('hidden');
    }

    const todayKey = getDateKey(new Date());
    const dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

    document.getElementById('weekly-chart').innerHTML = weekDates.map((date, i) => {
        const key = getDateKey(date);
        const stats = getDayStats(key);
        const isToday = key === todayKey;
        const bColor = stats.percent >= 70 ? 'var(--accent-success)' : stats.percent >= 40 ? 'var(--accent-warning)' : 'var(--accent-primary)';
        return `<div class="weekly-bar-group"><span class="weekly-bar-value">${stats.percent}%</span><div class="weekly-bar-wrapper"><div class="weekly-bar" style="height:${Math.max(stats.percent, 4)}%;background:${bColor};${isToday ? 'box-shadow:0 0 12px ' + bColor + '60;' : ''}" onclick="goToDate(new Date('${date.toISOString()}'))"></div></div><span class="weekly-bar-label" style="${isToday ? 'color:var(--accent-primary);font-weight:700;' : ''}">${dayNames[i]}${isToday ? ' ●' : ''}</span></div>`;
    }).join('');

    document.getElementById('weekly-days-list').innerHTML = weekDates.map(date => {
        const key = getDateKey(date);
        const stats = getDayStats(key);
        const isToday = key === todayKey;
        const bColor = stats.percent >= 70 ? 'var(--accent-success)' : stats.percent >= 40 ? 'var(--accent-warning)' : stats.total > 0 ? 'var(--accent-danger)' : 'var(--accent-primary)';
        return `<div class="weekly-day-item ${isToday ? 'today' : ''}" onclick="goToDate(new Date('${date.toISOString()}'))"><span class="wdi-date">${date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}</span><div class="wdi-bar-wrapper"><div class="wdi-bar" style="width:${stats.percent}%;background:${bColor}"></div></div><span class="wdi-percent" style="color:${bColor}">${stats.total > 0 ? stats.percent + '%' : '—'}</span></div>`;
    }).join('');

    const trend = getWeekTrend();
    const tData = { improving: { i: '📈', t: 'Performance improving!', c: 'improving', d: 'Great momentum! Keep pushing.' }, declining: { i: '📉', t: 'Needs attention', c: 'declining', d: 'Try smaller, achievable tasks.' }, stable: { i: '📊', t: 'Consistent pace', c: 'stable', d: 'Steady progress. Push harder to level up.' } };
    const t = tData[trend];
    document.getElementById('trend-content').innerHTML = `<div class="trend-indicator ${t.c}"><span class="trend-icon">${t.i}</span><span class="trend-text">${t.t}</span></div><p class="trend-detail">${t.d}</p>
        <div style="display:flex;gap:12px;margin-top:8px;"><div style="flex:1;padding:12px;background:var(--bg-elevated);border-radius:8px;text-align:center;border:1px solid var(--border-subtle);"><span style="font-size:1.2rem;font-weight:800;font-family:'JetBrains Mono',monospace;color:var(--accent-primary);">${getStreak()}</span><br><span style="font-size:0.72rem;color:var(--text-muted);">Streak</span></div><div style="flex:1;padding:12px;background:var(--bg-elevated);border-radius:8px;text-align:center;border:1px solid var(--border-subtle);"><span style="font-size:1.2rem;font-weight:800;font-family:'JetBrains Mono',monospace;color:var(--accent-success);">${getTotalCompleted()}</span><br><span style="font-size:0.72rem;color:var(--text-muted);">Completed</span></div><div style="flex:1;padding:12px;background:var(--bg-elevated);border-radius:8px;text-align:center;border:1px solid var(--border-subtle);"><span style="font-size:1.2rem;font-weight:800;font-family:'JetBrains Mono',monospace;color:var(--accent-warning);">${getDaysStudied()}</span><br><span style="font-size:0.72rem;color:var(--text-muted);">Days Studied</span></div></div>`;

    const wStats = getWeeklySubjectStats();
    const subjects = getCachedSubjects();
    const withTasks = subjects.filter(s => wStats[s.id] && wStats[s.id].total > 0);
    document.getElementById('weekly-subject-stats').innerHTML = withTasks.length > 0 ? withTasks.map(s => {
        const st = wStats[s.id];
        const pct = Math.round((st.completed / st.total) * 100);
        const color = getSubjectColor(s);
        return `<div class="wss-item"><span class="wss-dot" style="background:${color}"></span><span class="wss-name">${s.name}</span><div class="wss-bar-wrapper"><div class="wss-bar" style="width:${pct}%;background:${color}"></div></div><span class="wss-percent" style="color:${pct >= 70 ? 'var(--accent-success)' : pct >= 40 ? 'var(--accent-warning)' : 'var(--accent-danger)'}">${pct}%</span></div>`;
    }).join('') : '<div class="empty-state"><span class="empty-state-icon">📊</span><span class="empty-state-text">No tasks this week yet</span></div>';
}

// ==================== INSIGHTS VIEW ====================
async function renderInsightsView() {
    const wStats = getWeeklySubjectStats();
    const subjects = getCachedSubjects();
    const perfs = subjects.map(s => {
        const st = wStats[s.id];
        const pct = (st && st.total > 0) ? Math.round((st.completed / st.total) * 100) : -1;
        return { ...s, ...st, percent: pct };
    }).filter(s => s.percent >= 0);

    const weak = perfs.filter(s => s.percent < 60).sort((a, b) => a.percent - b.percent);
    const strong = perfs.filter(s => s.percent >= 60).sort((a, b) => b.percent - a.percent);
    const icon = s => CATEGORY_ICONS[s.category] || '📌';

    document.getElementById('weak-areas-list').innerHTML = weak.length > 0 ?
        weak.map(s => `<div class="area-item weak"><span class="area-icon">${icon(s)}</span><div class="area-info"><span class="area-name">${s.name}</span><span class="area-detail">${s.completed}/${s.total} tasks this week</span></div><span class="area-percent" style="color:var(--accent-danger)">${s.percent}%</span></div>`).join('') :
        '<div class="empty-state"><span class="empty-state-icon">🎉</span><span class="empty-state-text">No weak areas detected!</span></div>';

    document.getElementById('strong-areas-list').innerHTML = strong.length > 0 ?
        strong.map(s => `<div class="area-item strong"><span class="area-icon">${icon(s)}</span><div class="area-info"><span class="area-name">${s.name}</span><span class="area-detail">${s.completed}/${s.total} tasks this week</span></div><span class="area-percent" style="color:var(--accent-success)">${s.percent}%</span></div>`).join('') :
        '<div class="empty-state"><span class="empty-state-icon">📝</span><span class="empty-state-text">Add tasks to see strong areas</span></div>';

    const suggestions = [];
    const active = getActiveSubjects();
    const todayTasks = getCachedDayTasks(getDateKey(new Date()));
    const todaySubjects = new Set(todayTasks.map(t => t.subject_id));
    const customSubj = subjects.find(s => s.category === 'custom');
    const missing = active.filter(s => !todaySubjects.has(s.id) && s.id !== customSubj?.id);
    if (missing.length > 0) suggestions.push(`You haven't added tasks for ${missing.slice(0, 3).map(s => s.name).join(', ')} today.`);
    if (weak.length > 0) suggestions.push(`${weak.map(s => s.name).join(', ')} ${weak.length > 1 ? 'have' : 'has'} below 60% completion. Break topics into smaller tasks.`);
    const streak = getStreak();
    if (streak === 0) suggestions.push("Start a study streak today! Complete at least 50% of daily tasks to build momentum.");
    else if (streak >= 3) suggestions.push(`${streak}-day streak! Keep going — 21 consecutive days forms a solid habit.`);
    suggestions.push("Use the 'teach-back' method: explain concepts aloud. It improves retention and exposes gaps.");
    if (suggestions.length < 4) suggestions.push("For numerical subjects like Network Theory and Power Systems, solve at least 10 problems daily.");

    document.getElementById('suggestions-list').innerHTML = suggestions.slice(0, 5).map((s, i) =>
        `<div class="suggestion-item"><span class="suggestion-num">${i + 1}</span><span class="suggestion-text">${s}</span></div>`
    ).join('');

    const refs = await dbFetchRecentReflections(7);
    document.getElementById('reflections-list').innerHTML = refs.length > 0 ?
        refs.map(r => {
            const d = new Date(r.date + 'T00:00:00');
            return `<div class="reflection-item"><span class="reflection-date">${d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}</span>${r.went_well ? `<div class="reflection-entry"><span class="reflection-entry-label">✅ Went well</span><p class="reflection-entry-text">${escapeHtml(r.went_well)}</p></div>` : ''} ${r.needs_improvement ? `<div class="reflection-entry"><span class="reflection-entry-label">🔄 Improve</span><p class="reflection-entry-text">${escapeHtml(r.needs_improvement)}</p></div>` : ''}</div>`;
        }).join('') :
        '<div class="empty-state"><span class="empty-state-icon">📝</span><span class="empty-state-text">No reflections yet</span></div>';
}

// ==================== EVENT HANDLERS ====================
async function handleTaskToggle(dateKey, taskId, checkbox) {
    try {
        const task = await dbToggleTask(taskId, dateKey);
        if (task) {
            // Update allUserTasks cache too
            const idx = allUserTasks.findIndex(t => t.id === taskId);
            if (idx >= 0) allUserTasks[idx] = task;
            else allUserTasks.push(task);

            const el = document.getElementById(`task-${taskId}`);
            if (task.completed) { el.classList.add('completed'); createConfettiAt(checkbox); showToast('✅ Task completed!', 'success'); }
            else el.classList.remove('completed');
            const statusEl = el.querySelector('.task-status');
            const status = task.completed ? 'completed' : 'pending';
            statusEl.className = `task-status ${status}`;
            statusEl.textContent = status.charAt(0).toUpperCase() + status.slice(1);
            updateDailyProgress(dateKey);
            const stats = getDayStats(dateKey);
            if (stats.percent === 100 && stats.total > 0) celebratePerfectDay();
        }
    } catch (err) {
        checkbox.checked = !checkbox.checked;
        showToast('❌ Failed to update task', 'error');
    }
}

async function handleDeleteTask(dateKey, taskId) {
    try {
        await dbDeleteTask(taskId, dateKey);
        allUserTasks = allUserTasks.filter(t => t.id !== taskId);
        showToast('🗑️ Task deleted', 'info');
        await renderDailyView();
    } catch (err) {
        showToast('❌ Failed to delete task', 'error');
    }
}

function openAddTask(subjectId) {
    currentAddSubject = subjectId;
    const sel = document.getElementById('task-subject-input');
    const active = getActiveSubjects(getDateKey(currentDate));
    const allSubjects = getCachedSubjects();
    const allIds = new Set(active.map(s => s.id));
    let options = active.map(s => `<option value="${s.id}">${s.name}</option>`);
    const others = allSubjects.filter(s => !allIds.has(s.id));
    if (others.length > 0) {
        options.push('<optgroup label="── Other Subjects ──">');
        others.forEach(s => options.push(`<option value="${s.id}">${s.name}</option>`));
        options.push('</optgroup>');
    }
    sel.innerHTML = options.join('');
    sel.value = subjectId;
    document.getElementById('task-title-input').value = '';
    document.getElementById('task-notes-input').value = '';
    document.getElementById('task-time-input').value = '';
    document.getElementById('add-task-modal-title').textContent = 'Add New Task';
    document.getElementById('add-task-modal').classList.remove('hidden');
    setTimeout(() => document.getElementById('task-title-input').focus(), 100);
}

async function saveNewTask() {
    const title = document.getElementById('task-title-input').value.trim();
    const subjectId = document.getElementById('task-subject-input').value;
    const notes = document.getElementById('task-notes-input').value.trim();
    const time = document.getElementById('task-time-input').value;
    if (!title) { showToast('⚠️ Task title is required', 'warning'); return; }

    try {
        const task = await dbAddTask(getDateKey(currentDate), subjectId, title, notes, time);
        allUserTasks.push(task);
        closeModal('add-task-modal');
        showToast('✅ Task added!', 'success');
        await renderDailyView();
    } catch (err) {
        showToast('❌ Failed to add task: ' + err.message, 'error');
    }
}

function closeModal(id) { document.getElementById(id).classList.add('hidden'); }
function changeDay(delta) { currentDate.setDate(currentDate.getDate() + delta); renderDailyView(); }
function goToToday() { currentDate = new Date(); renderDailyView(); }
function goToDate(date) { currentDate = new Date(date); switchView('daily'); }
function navigateToToday() { currentDate = new Date(); switchView('daily'); }
function goToDateAndSubject(dateKey, subjId) { currentDate = new Date(dateKey + 'T00:00:00'); switchView('daily'); }
function toggleSubjectSection(id) { document.getElementById(`section-${id}`)?.classList.toggle('collapsed'); }

function updateDailyProgress(dateKey) {
    const stats = getDayStats(dateKey);
    document.getElementById('dp-completed-num').textContent = stats.completed;
    document.getElementById('dp-pending-num').textContent = stats.pending;
    document.getElementById('dp-total-num').textContent = stats.total;
    const bar = document.getElementById('daily-progress-bar');
    const pct = document.getElementById('daily-progress-percent');
    bar.style.width = stats.percent + '%';
    pct.textContent = stats.percent + '%';
    if (stats.percent >= 70) { bar.style.background = 'linear-gradient(135deg,#00C9A7,#4ade80)'; pct.style.color = '#4ade80'; }
    else if (stats.percent >= 40) { bar.style.background = 'linear-gradient(135deg,#FFB347,#facc15)'; pct.style.color = '#facc15'; }
    else { bar.style.background = 'var(--gradient-primary)'; pct.style.color = 'var(--text-primary)'; }
    getCachedSubjects().forEach(s => {
        const sec = document.getElementById(`section-${s.id}`);
        if (sec) {
            const st = getSubjectDayStats(dateKey, s.id);
            sec.querySelector('.subject-count').textContent = `${st.completed}/${st.total}`;
            const fill = sec.querySelector('.subject-mini-progress-fill');
            if (fill) fill.style.width = `${st.percent}%`;
        }
    });
}

// ==================== SUBJECT MANAGEMENT ====================
function openAddSubjectModal() {
    editingSubjectId = null;
    document.getElementById('subject-modal-title').textContent = 'Add Subject';
    document.getElementById('subj-name-input').value = '';
    document.getElementById('subj-category-input').value = 'core-ee';
    document.getElementById('subj-schedule-type').value = 'scheduled';
    document.getElementById('subj-start-input').value = '';
    document.getElementById('subj-end-input').value = '';
    toggleSubjectDates();
    selectedColorIndex = getCachedSubjects().length % COLOR_PALETTE.length;
    renderColorPicker();
    document.getElementById('subject-modal').classList.remove('hidden');
}

function editSubject(id) {
    const s = getSubjectById(id);
    if (!s) return;
    editingSubjectId = id;
    document.getElementById('subject-modal-title').textContent = 'Edit Subject';
    document.getElementById('subj-name-input').value = s.name;
    document.getElementById('subj-category-input').value = s.category;
    document.getElementById('subj-schedule-type').value = s.schedule_type;
    document.getElementById('subj-start-input').value = s.start_date || '';
    document.getElementById('subj-end-input').value = s.end_date || '';
    toggleSubjectDates();
    selectedColorIndex = s.color_index;
    renderColorPicker();
    document.getElementById('subject-modal').classList.remove('hidden');
}

function toggleSubjectDates() {
    const type = document.getElementById('subj-schedule-type').value;
    document.getElementById('subj-dates-row').style.display = type === 'scheduled' ? 'flex' : 'none';
}

function renderColorPicker() {
    document.getElementById('color-picker-grid').innerHTML = COLOR_PALETTE.map((c, i) =>
        `<div class="color-swatch ${i === selectedColorIndex ? 'selected' : ''}" style="background:${c}" onclick="selectColor(${i})"></div>`
    ).join('');
}

function selectColor(i) {
    selectedColorIndex = i;
    document.querySelectorAll('.color-swatch').forEach((el, idx) => el.classList.toggle('selected', idx === i));
}

async function saveSubject() {
    const name = document.getElementById('subj-name-input').value.trim();
    if (!name) { showToast('⚠️ Subject name required', 'warning'); return; }
    const category = document.getElementById('subj-category-input').value;
    const scheduleType = document.getElementById('subj-schedule-type').value;
    const startDate = scheduleType === 'scheduled' ? document.getElementById('subj-start-input').value || null : null;
    const endDate = scheduleType === 'scheduled' ? document.getElementById('subj-end-input').value || null : null;

    try {
        if (editingSubjectId) {
            await dbUpdateSubject(editingSubjectId, { name, category, scheduleType, startDate, endDate, colorIndex: selectedColorIndex });
        } else {
            await dbAddSubject({ name, category, scheduleType, startDate, endDate, colorIndex: selectedColorIndex });
        }
        closeModal('subject-modal');
        showToast(editingSubjectId ? '✅ Subject updated!' : '✅ Subject added!', 'success');
        renderScheduleView();
    } catch (err) {
        showToast('❌ Failed: ' + err.message, 'error');
    }
}

async function deleteSubjectConfirm(id) {
    const s = getSubjectById(id);
    if (s && confirm(`Delete "${s.name}"? This will also delete all tasks for this subject.`)) {
        try {
            await dbDeleteSubject(id);
            showToast('🗑️ Subject deleted', 'info');
            renderScheduleView();
        } catch (err) {
            showToast('❌ Failed: ' + err.message, 'error');
        }
    }
}

// ==================== CARRY FORWARD ====================
async function carryForwardTasks() {
    const yesterday = new Date(); yesterday.setDate(yesterday.getDate() - 1);
    const yKey = getDateKey(yesterday);
    const tKey = getDateKey(new Date());

    await dbFetchDayTasks(yKey);
    await dbFetchDayTasks(tKey);

    const yTasks = getCachedDayTasks(yKey);
    const tTasks = getCachedDayTasks(tKey);
    const pending = yTasks.filter(t => !t.completed);

    if (pending.length === 0) { showToast('✅ No pending tasks from yesterday!', 'info'); return; }

    const existing = new Set(tTasks.map(t => t.title));
    let carried = 0;

    for (const t of pending) {
        if (!existing.has(t.title)) {
            try {
                const newTask = await dbAddTask(tKey, t.subject_id, t.title, t.notes, t.estimated_time);
                allUserTasks.push(newTask);
                carried++;
            } catch (err) { console.error('Carry forward failed for:', t.title); }
        }
    }

    if (carried > 0) {
        showToast(`🔄 Carried ${carried} task${carried > 1 ? 's' : ''} forward`, 'success');
        if (currentView === 'daily') await renderDailyView();
    } else {
        showToast('Tasks already carried forward', 'info');
    }
}

// ==================== REFLECTIONS ====================
async function saveReflection() {
    const good = document.getElementById('reflection-good').value.trim();
    const improve = document.getElementById('reflection-improve').value.trim();
    if (!good && !improve) { showToast('⚠️ Write at least one reflection', 'warning'); return; }
    try {
        await dbSaveReflection(getDateKey(currentDate), good, improve);
        showToast('✅ Reflection saved!', 'success');
    } catch (err) {
        showToast('❌ Failed to save reflection', 'error');
    }
}

async function loadReflection(dateKey) {
    const r = await dbFetchReflection(dateKey);
    document.getElementById('reflection-good').value = r?.went_well || '';
    document.getElementById('reflection-improve').value = r?.needs_improvement || '';
}

function openReflection() { currentDate = new Date(); switchView('daily'); setTimeout(() => document.getElementById('reflection-card')?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 500); }

// ==================== VISUAL EFFECTS ====================
function createConfettiAt(el) {
    const r = el.getBoundingClientRect();
    const colors = ['#6C63FF', '#FF6584', '#00C9A7', '#FFB347', '#facc15', '#4ade80', '#c084fc'];
    for (let i = 0; i < 12; i++) {
        const p = document.createElement('div'); p.className = 'confetti';
        p.style.left = (r.left + r.width / 2 + (Math.random() - 0.5) * 60) + 'px';
        p.style.top = (r.top + (Math.random() - 0.5) * 20) + 'px';
        p.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
        p.style.animationDuration = (0.8 + Math.random() * 0.6) + 's';
        document.body.appendChild(p);
        setTimeout(() => p.remove(), 1500);
    }
}

function celebratePerfectDay() {
    showToast('🎉🎉 Perfect Day! All tasks completed!', 'success');
    const colors = ['#6C63FF', '#FF6584', '#00C9A7', '#FFB347', '#facc15', '#4ade80'];
    for (let i = 0; i < 50; i++) {
        setTimeout(() => {
            const p = document.createElement('div'); p.className = 'confetti';
            p.style.left = Math.random() * window.innerWidth + 'px';
            p.style.top = Math.random() * window.innerHeight * 0.3 + 'px';
            p.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
            p.style.width = (6 + Math.random() * 8) + 'px'; p.style.height = (6 + Math.random() * 8) + 'px';
            p.style.animationDuration = (1 + Math.random() * 1.5) + 's';
            document.body.appendChild(p);
            setTimeout(() => p.remove(), 3000);
        }, i * 30);
    }
}

function showToast(message, type = 'info') {
    const c = document.getElementById('toast-container');
    const t = document.createElement('div'); t.className = `toast ${type}`;
    const icons = { success: '✅', error: '❌', warning: '⚠️', info: 'ℹ️' };
    t.innerHTML = `<span class="toast-icon">${icons[type] || '📌'}</span><span class="toast-message">${message}</span>`;
    c.appendChild(t);
    setTimeout(() => { t.style.opacity = '0'; t.style.transform = 'translateX(40px)'; t.style.transition = 'all 0.3s ease'; setTimeout(() => t.remove(), 300); }, 3000);
}

// ==================== PARTICLES ====================
function initParticles() {
    const canvas = document.getElementById('particles-canvas');
    const ctx = canvas.getContext('2d');
    function resize() { canvas.width = window.innerWidth; canvas.height = window.innerHeight; }
    resize(); window.addEventListener('resize', resize);
    const particles = Array.from({ length: 35 }, () => ({ x: Math.random() * canvas.width, y: Math.random() * canvas.height, vx: (Math.random() - 0.5) * 0.3, vy: (Math.random() - 0.5) * 0.3, radius: Math.random() * 2 + 0.5, opacity: Math.random() * 0.3 + 0.1 }));
    function animate() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        particles.forEach(p => {
            p.x += p.vx; p.y += p.vy;
            if (p.x < 0) p.x = canvas.width; if (p.x > canvas.width) p.x = 0;
            if (p.y < 0) p.y = canvas.height; if (p.y > canvas.height) p.y = 0;
            ctx.beginPath(); ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(108,99,255,${p.opacity})`; ctx.fill();
        });
        for (let i = 0; i < particles.length; i++) {
            for (let j = i + 1; j < particles.length; j++) {
                const dx = particles[i].x - particles[j].x, dy = particles[i].y - particles[j].y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                if (dist < 150) { ctx.beginPath(); ctx.moveTo(particles[i].x, particles[i].y); ctx.lineTo(particles[j].x, particles[j].y); ctx.strokeStyle = `rgba(108,99,255,${0.05 * (1 - dist / 150)})`; ctx.stroke(); }
            }
        }
        requestAnimationFrame(animate);
    }
    animate();
}

// ==================== HELPERS ====================
function setRandomQuote() { document.getElementById('quote-text').textContent = MOTIVATIONAL_QUOTES[Math.floor(Math.random() * MOTIVATIONAL_QUOTES.length)]; }

// ==================== KEYBOARD ====================
document.addEventListener('keydown', e => {
    if (e.key === 'Escape') document.querySelectorAll('.modal-overlay').forEach(m => m.classList.add('hidden'));
    if (e.key === 'Enter' && !e.shiftKey) {
        if (!document.getElementById('add-task-modal').classList.contains('hidden') && document.activeElement.tagName !== 'TEXTAREA') { e.preventDefault(); saveNewTask(); }
        if (!document.getElementById('subject-modal').classList.contains('hidden') && document.activeElement.tagName !== 'TEXTAREA') { e.preventDefault(); saveSubject(); }
    }
});

// ==================== INITIALIZATION ====================
async function init() {
    initParticles();
    setRandomQuote();
    setInterval(setRandomQuote, 60000);

    // Create sidebar backdrop for mobile
    const backdrop = document.createElement('div');
    backdrop.className = 'sidebar-backdrop';
    backdrop.id = 'sidebar-backdrop';
    document.body.appendChild(backdrop);

    const sidebar = document.querySelector('.sidebar');

    // Make sidebar closeSidebar globally accessible
    window._openSidebar = function() {
        sidebar.classList.add('open');
        backdrop.classList.add('active');
    };

    window._closeSidebar = function() {
        sidebar.classList.remove('open');
        backdrop.classList.remove('active');
    };

    // Sidebar nav — explicitly close sidebar AFTER switching view
    document.querySelectorAll('.nav-item').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation(); // Prevent backdrop from intercepting
            const view = btn.dataset.view;
            if (view) {
                switchView(view);
                window._closeSidebar();
            }
        });
        // Also handle touch explicitly for mobile
        btn.addEventListener('touchend', (e) => {
            e.preventDefault(); // Prevent ghost click
            e.stopPropagation();
            const view = btn.dataset.view;
            if (view) {
                switchView(view);
                window._closeSidebar();
            }
        });
    });

    document.getElementById('sidebar-toggle').addEventListener('click', () => {
        if (sidebar.classList.contains('open')) window._closeSidebar();
        else window._openSidebar();
    });

    // Backdrop only closes sidebar (won't fire for sidebar content due to stopPropagation)
    backdrop.addEventListener('click', window._closeSidebar);

    // Swipe left on sidebar to close
    let touchStartX = 0;
    sidebar.addEventListener('touchstart', e => { touchStartX = e.touches[0].clientX; }, { passive: true });
    sidebar.addEventListener('touchend', e => {
        // Only close on swipe if not tapping a nav item (handled above)
        if (e.target.closest('.nav-item')) return;
        const dx = e.changedTouches[0].clientX - touchStartX;
        if (dx < -50) window._closeSidebar();
    }, { passive: true });

    // Logout button in sidebar
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('touchend', (e) => {
            e.preventDefault();
            e.stopPropagation();
            handleLogout();
        });
    }

    document.querySelectorAll('.modal-overlay').forEach(o => o.addEventListener('click', e => { if (e.target === o) o.classList.add('hidden'); }));

    // Check for existing session
    showLoadingScreen('Checking your session...');
    try {
        const hasSession = await checkSession();
        if (hasSession) {
            showLoadingScreen('Loading your study data...');
            await loadUserDataAndStart();
        } else {
            showAuthScreen();
        }
    } catch (err) {
        console.error('Init error:', err);
        showAuthScreen();
    }
}

document.addEventListener('DOMContentLoaded', init);

