import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

// Supabase configuration
// For local development, nginx proxies /rest/v1/ to PostgREST on port 3000
// Supabase client automatically appends /rest/v1/ to the base URL
const SUPABASE_URL = window.SUPABASE_URL || 'http://localhost:8080';
const SUPABASE_ANON_KEY = window.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0';

// Create Supabase client
// Note: The client will automatically use /rest/v1/ path for API calls
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Authentication functions
// Since we're using a local setup without full Supabase Auth, we'll use the users table directly
export async function signUp(email, password, displayName) {
    if (!displayName || displayName.trim() === '') {
        return { data: null, error: { message: 'El nombre es requerido' } };
    }
    
    // Hash password (simple implementation - in production use proper hashing)
    const encoder = new TextEncoder();
    const data = encoder.encode(password);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const encryptedPassword = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    
    const { data: user, error } = await supabase
        .from('users')
        .insert({
            email: email,
            encrypted_password: encryptedPassword,
            display_name: displayName.trim()
        })
        .select()
        .single();
    
    if (error) {
        return { data: null, error };
    }
    
    // Store user in localStorage
    localStorage.setItem('current_user', JSON.stringify(user));
    
    return { data: user, error: null };
}

export async function signIn(email, password) {
    // Hash password to compare
    const encoder = new TextEncoder();
    const data = encoder.encode(password);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const encryptedPassword = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    
    const { data: user, error } = await supabase
        .from('users')
        .select('*')
        .eq('email', email)
        .eq('encrypted_password', encryptedPassword)
        .single();
    
    if (error || !user) {
        return { data: null, error: { message: 'Email o contraseña incorrectos' } };
    }
    
    // Store user in localStorage
    localStorage.setItem('current_user', JSON.stringify(user));
    
    return { data: user, error: null };
}

export async function signOut() {
    localStorage.removeItem('current_user');
    return { error: null };
}

export function getCurrentUser() {
    const userStr = localStorage.getItem('current_user');
    if (userStr) {
        try {
            return JSON.parse(userStr);
        } catch (e) {
            return null;
        }
    }
    return null;
}

// Update user display name
export async function updateUserDisplayName(userId, displayName) {
    const { data: user, error } = await supabase
        .from('users')
        .update({ 
            display_name: displayName.trim(),
            updated_at: new Date().toISOString()
        })
        .eq('id', userId)
        .select()
        .single();
    
    if (error) {
        return { data: null, error };
    }
    
    // Update localStorage
    localStorage.setItem('current_user', JSON.stringify(user));
    
    return { data: user, error: null };
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
