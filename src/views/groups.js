import { supabase, signOut } from '../supabase.js';
import { getState, setCurrentView, setUserGroups, setCurrentGroup, setCurrentUser, clearState } from '../state.js';

let hasRendered = false;
let lastUserId = null;

export async function render() {
    const state = getState();
    
    // Prevent re-rendering if already rendered and user hasn't changed
    const userIdChanged = state.currentUser?.id !== lastUserId;
    if (hasRendered && !userIdChanged && state.userGroups && state.userGroups.length > 0) {
        return; // Skip re-render if already rendered and nothing changed
    }
    
    const app = document.getElementById('app');
    
    // Only load groups if user changed or groups not loaded
    if (!hasRendered || userIdChanged || !state.userGroups || state.userGroups.length === 0) {
        await loadUserGroups();
        lastUserId = state.currentUser?.id;
    }
    const updatedState = getState();
    hasRendered = true;
    
    app.innerHTML = `
        <div class="min-h-screen bg-gray-900 text-white pb-24">
            <!-- Header -->
            <div class="flex items-center justify-between px-4 pt-4 pb-4 border-b border-gray-800">
                <div class="flex items-center gap-2">
                    <span class="text-2xl">🍷🏆</span>
                    <h1 class="text-lg font-bold">Mis Grupos</h1>
                </div>
                <div class="flex items-center gap-2">
                    <button id="logout-btn" class="p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition" title="Cerrar sesión">
                        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"></path>
                        </svg>
                    </button>
                </div>
            </div>

            <!-- Main Content -->
            <div class="px-4 py-6 space-y-4">
                ${updatedState.userGroups.length === 0 ? `
                    <div class="text-center py-12">
                        <div class="text-6xl mb-4">👥</div>
                        <h2 class="text-xl font-bold mb-2">No tienes grupos aún</h2>
                        <p class="text-gray-400 mb-6">Crea un grupo o únete a uno para comenzar</p>
                    </div>
                ` : `
                    <div class="space-y-3">
                        ${updatedState.userGroups.map(group => `
                            <button 
                                class="group-card w-full p-4 bg-gray-800 border border-gray-700 rounded-lg hover:bg-gray-750 transition text-left"
                                data-group-id="${group.id}"
                            >
                                <div class="flex items-center justify-between">
                                    <div class="flex-1">
                                        <h3 class="text-lg font-bold mb-1">${group.name}</h3>
                                        <p class="text-sm text-gray-400">Código: ${group.code}</p>
                                    </div>
                                    <svg class="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path>
                                    </svg>
                                </div>
                            </button>
                        `).join('')}
                    </div>
                `}

                <!-- Action Buttons -->
                <div class="space-y-3 pt-4">
                    <button 
                        id="create-group-btn" 
                        class="w-full py-4 bg-orange-500 hover:bg-orange-600 active:bg-orange-700 rounded-lg text-white text-lg font-bold transition transform active:scale-95 flex items-center justify-center gap-2"
                    >
                        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path>
                        </svg>
                        CREAR NUEVO GRUPO
                    </button>

                    <button 
                        id="join-group-btn" 
                        class="w-full py-3 bg-gray-800 border-2 border-orange-500 hover:bg-gray-750 rounded-lg text-orange-500 font-semibold transition flex items-center justify-center gap-2"
                    >
                        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z"></path>
                        </svg>
                        UNIRSE A UN GRUPO
                    </button>
                </div>
            </div>
        </div>
    `;

    attachEventListeners();
}

// Reset flag when leaving view or user changes
export function cleanup() {
    hasRendered = false;
    lastUserId = null;
}

async function loadUserGroups() {
    const state = getState();
    if (!state.currentUser) return;

    const { data: groups, error } = await supabase
        .from('group_members')
        .select(`
            group_id,
            groups (
                id,
                name,
                code,
                created_by,
                created_at,
                global_ranking_reset_at
            )
        `)
        .eq('user_id', state.currentUser.id);

    if (error) {
        console.error('Error loading groups:', error);
        return;
    }

    const userGroups = groups.map(gm => gm.groups).filter(Boolean);
    setUserGroups(userGroups);
}

function attachEventListeners() {
    // Logout button
    document.getElementById('logout-btn').addEventListener('click', async () => {
        const confirmed = await window.showConfirm(
            'Cerrar sesión',
            '¿Estás seguro de que quieres cerrar sesión?',
            { confirmText: 'Aceptar', cancelText: 'Cancelar', confirmColor: 'orange' }
        );
        
        if (confirmed) {
            await signOut();
            clearState();
            setCurrentView('login');
        }
    });

    // Create group button
    document.getElementById('create-group-btn').addEventListener('click', () => {
        setCurrentView('create-group');
    });

    // Join group button
    document.getElementById('join-group-btn').addEventListener('click', () => {
        setCurrentView('join-group');
    });

    // Group cards
    document.querySelectorAll('.group-card').forEach(card => {
        card.addEventListener('click', () => {
            const groupId = card.dataset.groupId;
            const state = getState();
            const group = state.userGroups.find(g => g.id === groupId);
            if (group) {
                setCurrentGroup(group);
                setCurrentView('group-detail');
            }
        });
    });
}
