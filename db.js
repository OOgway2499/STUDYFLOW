/* ========================================
   StudyFlow — Database Module (Supabase)
   All CRUD operations for subjects, tasks, reflections.
   Maintains a local in-memory cache for fast UI rendering.
   ======================================== */

// ==================== LOCAL CACHE ====================
let cachedSubjects = [];
let cachedTasks = {};   // { 'YYYY-MM-DD': [task, ...] }
let cachedReflections = {};  // { 'YYYY-MM-DD': { went_well, needs_improvement } }

function getUserId() {
    return currentUser?.id;
}

// ==================== SUBJECTS ====================
async function dbFetchSubjects() {
    const { data, error } = await supabaseClient
        .from('subjects')
        .select('*')
        .eq('user_id', getUserId())
        .order('sort_order', { ascending: true });
    if (error) { console.error('Fetch subjects error:', error); return []; }
    cachedSubjects = data || [];
    return cachedSubjects;
}

async function dbAddSubject(subject) {
    const row = {
        user_id: getUserId(),
        name: subject.name,
        category: subject.category || 'custom',
        schedule_type: subject.scheduleType || 'scheduled',
        start_date: subject.startDate || null,
        end_date: subject.endDate || null,
        color_index: subject.colorIndex ?? 0,
        sort_order: cachedSubjects.length,
    };
    const { data, error } = await supabaseClient
        .from('subjects')
        .insert([row])
        .select()
        .single();
    if (error) { console.error('Add subject error:', error); throw error; }
    cachedSubjects.push(data);
    return data;
}

async function dbUpdateSubject(id, updates) {
    const row = {};
    if (updates.name !== undefined) row.name = updates.name;
    if (updates.category !== undefined) row.category = updates.category;
    if (updates.scheduleType !== undefined) row.schedule_type = updates.scheduleType;
    if (updates.startDate !== undefined) row.start_date = updates.startDate;
    if (updates.endDate !== undefined) row.end_date = updates.endDate;
    if (updates.colorIndex !== undefined) row.color_index = updates.colorIndex;

    const { data, error } = await supabaseClient
        .from('subjects')
        .update(row)
        .eq('id', id)
        .eq('user_id', getUserId())
        .select()
        .single();
    if (error) { console.error('Update subject error:', error); throw error; }
    const idx = cachedSubjects.findIndex(s => s.id === id);
    if (idx >= 0) cachedSubjects[idx] = data;
    return data;
}

async function dbDeleteSubject(id) {
    const { error } = await supabaseClient
        .from('subjects')
        .delete()
        .eq('id', id)
        .eq('user_id', getUserId());
    if (error) { console.error('Delete subject error:', error); throw error; }
    cachedSubjects = cachedSubjects.filter(s => s.id !== id);
}

// ==================== SEED PARAKRAM 2.0 TEMPLATE ====================
async function dbSeedParakramSubjects() {
    const template = [
        { name: 'Network Theory', category: 'core-ee', schedule_type: 'scheduled', start_date: '2026-04-04', end_date: '2026-07-12', color_index: 0 },
        { name: 'Measurement', category: 'core-ee', schedule_type: 'scheduled', start_date: '2026-04-13', end_date: '2026-05-14', color_index: 1 },
        { name: 'Power System', category: 'core-ee', schedule_type: 'scheduled', start_date: '2026-05-15', end_date: '2026-07-10', color_index: 2 },
        { name: 'Microprocessors', category: 'core-ee', schedule_type: 'scheduled', start_date: '2026-07-13', end_date: '2026-08-08', color_index: 3 },
        { name: 'Electromagnetic Field Theory', category: 'core-ee', schedule_type: 'scheduled', start_date: '2026-07-13', end_date: '2026-08-07', color_index: 4 },
        { name: 'Digital Electronics (Morning)', category: 'core-ee', schedule_type: 'scheduled', start_date: '2026-08-10', end_date: '2026-10-09', color_index: 5 },
        { name: 'Power Electronics', category: 'core-ee', schedule_type: 'scheduled', start_date: '2026-08-10', end_date: '2026-10-10', color_index: 6 },
        { name: 'Electrical Machine', category: 'core-ee', schedule_type: 'scheduled', start_date: '2026-08-12', end_date: '2026-11-30', color_index: 7 },
        { name: 'Communication System', category: 'core-ee', schedule_type: 'scheduled', start_date: '2026-08-10', end_date: '2026-09-12', color_index: 8 },
        { name: 'Analog Electronics', category: 'core-ee', schedule_type: 'scheduled', start_date: '2026-10-12', end_date: '2026-12-18', color_index: 9 },
        { name: 'Basic Electronics', category: 'core-ee', schedule_type: 'scheduled', start_date: '2026-11-30', end_date: '2026-12-22', color_index: 10 },
        { name: 'Signal and System', category: 'core-ee', schedule_type: 'notify', start_date: null, end_date: null, color_index: 11 },
        { name: 'Control System', category: 'core-ee', schedule_type: 'notify', start_date: null, end_date: null, color_index: 12 },
        { name: 'Foundation of Engineering Math', category: 'math-aptitude', schedule_type: 'recorded', start_date: null, end_date: null, color_index: 13 },
        { name: 'Physics', category: 'math-aptitude', schedule_type: 'recorded', start_date: null, end_date: null, color_index: 14 },
        { name: 'General Aptitude', category: 'math-aptitude', schedule_type: 'scheduled', start_date: '2026-06-03', end_date: '2026-06-28', color_index: 15 },
        { name: 'Verbal Aptitude', category: 'math-aptitude', schedule_type: 'scheduled', start_date: '2026-07-01', end_date: '2026-07-05', color_index: 16 },
        { name: 'Engineering Mathematics', category: 'math-aptitude', schedule_type: 'scheduled', start_date: '2026-09-02', end_date: '2026-12-08', color_index: 17 },
        { name: 'Current Affairs', category: 'general', schedule_type: 'scheduled', start_date: '2026-12-02', end_date: '2026-12-20', color_index: 18 },
        { name: 'Material Science & Eng (Mech)', category: 'general', schedule_type: 'scheduled', start_date: '2026-06-20', end_date: '2026-06-26', color_index: 19 },
        { name: 'Standards & Quality Practices', category: 'general', schedule_type: 'scheduled', start_date: '2026-06-27', end_date: '2026-07-03', color_index: 20 },
        { name: 'Project Management', category: 'general', schedule_type: 'scheduled', start_date: '2026-07-04', end_date: '2026-07-11', color_index: 21 },
        { name: 'Engineering Ethics', category: 'general', schedule_type: 'scheduled', start_date: '2026-07-12', end_date: '2026-07-18', color_index: 22 },
        { name: 'Design, Drawing, and Safety', category: 'general', schedule_type: 'scheduled', start_date: '2026-07-19', end_date: '2026-07-25', color_index: 23 },
        { name: 'Energy and Environment', category: 'general', schedule_type: 'scheduled', start_date: '2026-07-26', end_date: '2026-08-01', color_index: 24 },
        { name: 'Material Science & Eng (Elec)', category: 'general', schedule_type: 'scheduled', start_date: '2026-08-02', end_date: '2026-08-08', color_index: 25 },
        { name: 'ICT', category: 'general', schedule_type: 'scheduled', start_date: '2026-08-09', end_date: '2026-08-16', color_index: 26 },
        { name: 'Custom / Daily Tasks', category: 'custom', schedule_type: 'recorded', start_date: null, end_date: null, color_index: 27 },
    ];

    const rows = template.map((s, i) => ({
        user_id: getUserId(),
        ...s,
        sort_order: i,
    }));

    const { data, error } = await supabaseClient
        .from('subjects')
        .insert(rows)
        .select();
    if (error) { console.error('Seed subjects error:', error); throw error; }
    cachedSubjects = data || [];
    return cachedSubjects;
}

// ==================== TASKS ====================
async function dbFetchDayTasks(dateKey) {
    if (cachedTasks[dateKey]) return cachedTasks[dateKey];

    const { data, error } = await supabaseClient
        .from('tasks')
        .select('*')
        .eq('user_id', getUserId())
        .eq('date', dateKey)
        .order('sort_order', { ascending: true })
        .order('created_at', { ascending: true });
    if (error) { console.error('Fetch tasks error:', error); return []; }
    cachedTasks[dateKey] = data || [];
    return cachedTasks[dateKey];
}

async function dbFetchDateRangeTasks(startDate, endDate) {
    const { data, error } = await supabaseClient
        .from('tasks')
        .select('*')
        .eq('user_id', getUserId())
        .gte('date', startDate)
        .lte('date', endDate)
        .order('date', { ascending: true });
    if (error) { console.error('Fetch range tasks error:', error); return []; }
    // Update cache
    const grouped = {};
    (data || []).forEach(t => {
        if (!grouped[t.date]) grouped[t.date] = [];
        grouped[t.date].push(t);
    });
    Object.assign(cachedTasks, grouped);
    return data || [];
}

async function dbAddTask(dateKey, subjectId, title, notes, estimatedTime) {
    const existing = cachedTasks[dateKey] || [];
    const row = {
        user_id: getUserId(),
        subject_id: subjectId,
        date: dateKey,
        title: title,
        notes: notes || '',
        estimated_time: parseInt(estimatedTime) || 0,
        completed: false,
        sort_order: existing.length,
    };
    const { data, error } = await supabaseClient
        .from('tasks')
        .insert([row])
        .select()
        .single();
    if (error) { console.error('Add task error:', error); throw error; }
    if (!cachedTasks[dateKey]) cachedTasks[dateKey] = [];
    cachedTasks[dateKey].push(data);
    return data;
}

async function dbToggleTask(taskId, dateKey) {
    const tasks = cachedTasks[dateKey] || [];
    const task = tasks.find(t => t.id === taskId);
    if (!task) return null;

    const newCompleted = !task.completed;
    const updates = {
        completed: newCompleted,
        completed_at: newCompleted ? new Date().toISOString() : null,
    };

    const { data, error } = await supabaseClient
        .from('tasks')
        .update(updates)
        .eq('id', taskId)
        .eq('user_id', getUserId())
        .select()
        .single();
    if (error) { console.error('Toggle task error:', error); throw error; }

    // Update cache
    const idx = tasks.findIndex(t => t.id === taskId);
    if (idx >= 0) tasks[idx] = data;
    return data;
}

async function dbDeleteTask(taskId, dateKey) {
    const { error } = await supabaseClient
        .from('tasks')
        .delete()
        .eq('id', taskId)
        .eq('user_id', getUserId());
    if (error) { console.error('Delete task error:', error); throw error; }
    if (cachedTasks[dateKey]) {
        cachedTasks[dateKey] = cachedTasks[dateKey].filter(t => t.id !== taskId);
    }
}

// ==================== REFLECTIONS ====================
async function dbFetchReflection(dateKey) {
    if (cachedReflections[dateKey] !== undefined) return cachedReflections[dateKey];

    const { data, error } = await supabaseClient
        .from('reflections')
        .select('*')
        .eq('user_id', getUserId())
        .eq('date', dateKey)
        .maybeSingle();
    if (error) { console.error('Fetch reflection error:', error); return null; }
    cachedReflections[dateKey] = data;
    return data;
}

async function dbSaveReflection(dateKey, wentWell, needsImprovement) {
    const existing = await dbFetchReflection(dateKey);

    let result;
    if (existing) {
        const { data, error } = await supabaseClient
            .from('reflections')
            .update({ went_well: wentWell, needs_improvement: needsImprovement, saved_at: new Date().toISOString() })
            .eq('id', existing.id)
            .eq('user_id', getUserId())
            .select()
            .single();
        if (error) throw error;
        result = data;
    } else {
        const { data, error } = await supabaseClient
            .from('reflections')
            .insert([{ user_id: getUserId(), date: dateKey, went_well: wentWell, needs_improvement: needsImprovement }])
            .select()
            .single();
        if (error) throw error;
        result = data;
    }
    cachedReflections[dateKey] = result;
    return result;
}

async function dbFetchRecentReflections(limit = 7) {
    const { data, error } = await supabaseClient
        .from('reflections')
        .select('*')
        .eq('user_id', getUserId())
        .order('date', { ascending: false })
        .limit(limit);
    if (error) { console.error('Fetch reflections error:', error); return []; }
    (data || []).forEach(r => { cachedReflections[r.date] = r; });
    return data || [];
}

// ==================== ANALYTICS HELPERS ====================
async function dbFetchAllUserTasks() {
    const { data, error } = await supabaseClient
        .from('tasks')
        .select('*')
        .eq('user_id', getUserId());
    if (error) { console.error('Fetch all tasks error:', error); return []; }
    // Update cache
    (data || []).forEach(t => {
        if (!cachedTasks[t.date]) cachedTasks[t.date] = [];
        const existing = cachedTasks[t.date].find(x => x.id === t.id);
        if (!existing) cachedTasks[t.date].push(t);
    });
    return data || [];
}

// ==================== CACHE HELPERS ====================
function clearCache() {
    cachedSubjects = [];
    cachedTasks = {};
    cachedReflections = {};
}

function getCachedDayTasks(dateKey) {
    return cachedTasks[dateKey] || [];
}

function getCachedSubjects() {
    return cachedSubjects;
}

function getSubjectById(id) {
    return cachedSubjects.find(s => s.id === id);
}
