import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

// Supabase configuration
// Detecta automáticamente si está en desarrollo local (Supabase local) o producción
const isLocalDev = window.location.hostname === 'localhost' || 
                   window.location.hostname === '127.0.0.1' ||
                   window.location.hostname === '';

// Para desarrollo local: usa Supabase local en http://127.0.0.1:54321
// Para producción: usa las variables inyectadas en el build
const SUPABASE_URL = window.SUPABASE_URL || (isLocalDev ? 'http://127.0.0.1:54321' : null);
const SUPABASE_ANON_KEY = window.SUPABASE_ANON_KEY || (isLocalDev ? 'sb_publishable_ACJWlzQHlZjBrEguHvfOxg_3BJgxAaH' : null);

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    console.error('❌ ERROR: Configuración de Supabase no encontrada');
    console.error('Para producción, configura SUPABASE_URL y SUPABASE_ANON_KEY en Cloudflare Pages');
    console.error('Para desarrollo local, asegúrate de que Supabase local esté corriendo: npx supabase start');
}

// Create Supabase client
// Note: The client will automatically use /rest/v1/ path for API calls
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Authentication functions using Supabase Auth
export async function signIn(email, password) {
    const { data, error } = await supabase.auth.signInWithPassword({
        email: email,
        password: password
    });
    
    if (error) {
        return { data: null, error: { message: error.message || 'Email o contraseña incorrectos' } };
    }
    
    // Return user object from auth session
    return { data: data.user, error: null };
}

export async function signOut() {
    const { error } = await supabase.auth.signOut();
    return { error };
}

export async function getCurrentUser() {
    const { data: { session } } = await supabase.auth.getSession();
    return session?.user || null;
}

// Update user group nickname
export async function updateGroupNickname(groupId, userId, nickname) {
    const trimmedNickname = nickname.trim() || null;
    
    // First get the member ID
    const { data: existing, error: findError } = await supabase
        .from('group_members')
        .select('id')
        .eq('group_id', groupId)
        .eq('user_id', userId)
        .maybeSingle();
    
    if (findError && findError.code !== 'PGRST116') { // PGRST116 is "not found"
        return { data: null, error: findError };
    }
    
    if (existing) {
        // Update using the ID directly - this avoids 406 errors
        const { data, error } = await supabase
            .from('group_members')
            .update({ nickname: trimmedNickname })
            .eq('id', existing.id)
            .select()
            .single();
        
        return { data, error };
    } else {
        // Insert new member (shouldn't happen, but handle it)
        const { data, error } = await supabase
            .from('group_members')
            .insert({
                group_id: groupId,
                user_id: userId,
                nickname: trimmedNickname
            })
            .select()
            .single();
        
        return { data, error };
    }
}

// Generate unique default nickname
export async function generateUniqueNickname(groupId, baseName) {
    let nickname = baseName;
    let counter = 1;
    let isUnique = false;
    
    while (!isUnique && counter < 1000) {
        // Check if nickname exists in this group
        const { data: existing } = await supabase
            .from('group_members')
            .select('id')
            .eq('group_id', groupId)
            .eq('nickname', nickname)
            .maybeSingle();
        
        if (!existing) {
            isUnique = true;
        } else {
            // Add random number to make it unique
            const randomNum = Math.floor(Math.random() * 10000);
            nickname = `${baseName}${randomNum}`;
            counter++;
        }
    }
    
    return nickname;
}

// Helper function to set admin token for RLS
export async function setAdminToken(adminToken) {
    if (adminToken) {
        await supabase.rpc('exec_sql', {
            sql: `SET LOCAL app.admin_token = '${adminToken}'`
        }).catch(() => {
            // RPC might not exist, we'll handle admin checks differently
        });
    }
}

// Generate a random admin token
export function generateAdminToken() {
    return Math.random().toString(36).substring(2, 15) + 
           Math.random().toString(36).substring(2, 15);
}

// Generate a room code
export function generateRoomCode() {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
}

// Generate a group code
export async function generateGroupCode() {
    let code = Math.random().toString(36).substring(2, 8).toUpperCase();
    let codeExists = true;
    
    while (codeExists) {
        const { data, error } = await supabase
            .from('groups')
            .select('id')
            .eq('code', code)
            .maybeSingle();
        
        if (error) {
            console.error('Error checking group code:', error);
            codeExists = false;
        } else if (!data) {
            codeExists = false;
        } else {
            code = Math.random().toString(36).substring(2, 8).toUpperCase();
        }
    }
    
    return code;
}
