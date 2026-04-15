/* ========================================
   StudyFlow — Authentication Module
   ======================================== */

const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

let currentUser = null;
let currentProfile = null;

// ==================== SESSION ====================
async function checkSession() {
    const { data: { session }, error } = await supabaseClient.auth.getSession();
    if (session && session.user) {
        currentUser = session.user;
        await loadProfile();
        return true;
    }
    return false;
}

async function loadProfile() {
    if (!currentUser) return;
    const { data, error } = await supabaseClient
        .from('profiles')
        .select('*')
        .eq('id', currentUser.id)
        .single();
    if (data) currentProfile = data;
}

// ==================== SIGN UP ====================
async function authSignUp(username, password, displayName) {
    const email = `${username.toLowerCase().trim()}@studyflow.local`;

    const { data, error } = await supabaseClient.auth.signUp({
        email: email,
        password: password,
        options: {
            data: { display_name: displayName || username }
        }
    });

    if (error) throw error;
    currentUser = data.user;

    // Wait a moment for the trigger to create the profile
    await new Promise(r => setTimeout(r, 500));
    await loadProfile();

    return data;
}

// ==================== SIGN IN ====================
async function authSignIn(username, password) {
    const email = `${username.toLowerCase().trim()}@studyflow.local`;

    const { data, error } = await supabaseClient.auth.signInWithPassword({
        email: email,
        password: password,
    });

    if (error) throw error;
    currentUser = data.user;
    await loadProfile();
    return data;
}

// ==================== SIGN OUT ====================
async function authSignOut() {
    await supabaseClient.auth.signOut();
    currentUser = null;
    currentProfile = null;
}

// ==================== AUTH STATE LISTENER ====================
supabaseClient.auth.onAuthStateChange((event, session) => {
    if (event === 'SIGNED_OUT') {
        currentUser = null;
        currentProfile = null;
        showAuthScreen();
    }
});
