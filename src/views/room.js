import { supabase } from '../supabase.js';
import { getState, setCurrentView, setCurrentRoom, setParticipants, setDrinkTypes, updateAdminStatus, updateParticipantsSilently } from '../state.js';

let pollingInterval = null;
let isRendering = false;
let hasLoadedInitialParticipants = false;

// Función para obtener el icono de la bebida (usa el campo icon de la BD o un default)
function getDrinkIcon(drinkType) {
    return drinkType.icon || '🥤';
}

// Iconos para ranking
const rankIcons = {
    1: '🏆',
    2: '📊',
    3: '📈',
    default: '#'
};

function getRankIcon(rank) {
    return rankIcons[rank] || rankIcons.default;
}

export function render() {
    console.log('[room.js] render() called, isRendering:', isRendering);
    
    // Prevent infinite render loops
    if (isRendering) {
        console.log('[room.js] Already rendering, skipping');
        return;
    }
    isRendering = true;
    
    const state = getState();
    console.log('[room.js] Current state:', {
        currentView: state.currentView,
        hasCurrentRoom: !!state.currentRoom,
        currentRoomId: state.currentRoom?.id,
        currentRoomName: state.currentRoom?.name,
        hasDrinkTypes: !!state.drinkTypes,
        drinkTypesCount: state.drinkTypes?.length || 0,
        hasCurrentGroup: !!state.currentGroup,
        currentGroupId: state.currentGroup?.id
    });
    
    const app = document.getElementById('app');
    
    // Validate that we have the required state
    if (!state.currentRoom) {
        console.error('[room.js] Cannot render room: currentRoom is missing');
        console.log('[room.js] Redirecting back...');
        isRendering = false;
        // Redirect back to group detail if we have a group, otherwise to groups
        if (state.currentGroup) {
            console.log('[room.js] Redirecting to group-detail');
            setCurrentView('group-detail');
        } else {
            console.log('[room.js] Redirecting to groups');
            setCurrentView('groups');
        }
        return;
    }
    
    if (!state.drinkTypes || state.drinkTypes.length === 0) {
        console.error('[room.js] Cannot render room: drinkTypes is missing or empty');
        console.log('[room.js] Redirecting back...');
        isRendering = false;
        // Redirect back to group detail if we have a group, otherwise to groups
        if (state.currentGroup) {
            console.log('[room.js] Redirecting to group-detail');
            setCurrentView('group-detail');
        } else {
            console.log('[room.js] Redirecting to groups');
            setCurrentView('groups');
        }
        return;
    }
    
    console.log('[room.js] Validation passed, rendering room view');
    
    // DO NOT load participants automatically - only update leaderboard with existing data
    // Participants will be loaded only when:
    // 1. User clicks refresh button
    // 2. User adds a drink
    // 3. Explicitly called from outside
    
    const isActive = state.currentRoom?.is_active ?? true;
    const drinkButtons = state.drinkTypes.map(dt => `
        <button 
            class="drink-btn w-full aspect-square bg-gray-800 border border-gray-700 rounded-xl hover:bg-gray-750 active:bg-gray-600 transition transform active:scale-95 flex flex-col items-center justify-center gap-2 ${!isActive ? 'opacity-50 cursor-not-allowed' : ''}"
            data-drink-type-id="${dt.id}"
            data-points="${dt.points}"
            ${!isActive ? 'disabled' : ''}
        >
            <span class="text-4xl">${getDrinkIcon(dt)}</span>
            <span class="text-base font-semibold">${dt.name}</span>
            <span class="text-sm text-gray-400">${dt.points} ${dt.points === 1 ? 'PT' : 'PTS'}</span>
        </button>
    `).join('');

    app.innerHTML = `
        <div class="min-h-screen bg-gray-900 text-white pb-24">
            <!-- Header -->
            <div class="flex items-center justify-between px-4 pt-4 pb-4">
                <div class="flex items-center gap-4">
                    <button id="back-btn" class="text-white hover:text-gray-300">
                        <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"></path>
                        </svg>
                    </button>
                    <div>
                        <h1 class="text-lg font-bold">${state.currentRoom?.name || 'Sala'}</h1>
                    </div>
                </div>
                ${isActive ? `
                    <span class="px-3 py-1 bg-orange-500 text-white text-xs font-bold rounded-full">EN CURSO</span>
                ` : ''}
            </div>

            <div class="px-4 space-y-6">
                ${isActive ? `
                    <!-- Sección Registrar ronda -->
                    <div>
                        <label class="block text-xs font-semibold text-gray-400 uppercase mb-2">Registrar ronda</label>
                        <p class="text-xs text-gray-500 mb-4">Pulsa para añadir puntos al instante</p>
                        <div class="grid grid-cols-2 gap-3" id="drink-buttons">
                            ${drinkButtons}
                        </div>
                    </div>
                ` : ''}

                <!-- Sección Clasificación -->
                <div>
                    <div class="flex justify-between items-center mb-2">
                        <label class="block text-xs font-semibold text-gray-400 uppercase">Clasificación</label>
                        <div class="flex items-center gap-3">
                            <span class="text-xs text-gray-500" id="participant-count">0 Jugadores</span>
                            <button 
                                id="refresh-btn" 
                                class="p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition"
                                title="Actualizar clasificación"
                            >
                                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path>
                                </svg>
                            </button>
                        </div>
                    </div>
                    <div id="leaderboard" class="space-y-2">
                        <!-- Leaderboard will be populated here -->
                    </div>
                </div>

                ${state.isAdmin ? `
                    <!-- Botón Finalizar Sala -->
                    <button 
                        id="end-competition-btn" 
                        class="w-full py-4 ${isActive ? 'bg-red-600 hover:bg-red-700 active:bg-red-800' : 'bg-gray-600 cursor-not-allowed opacity-50'} rounded-lg text-white text-lg font-bold transition transform ${isActive ? 'active:scale-95' : ''} flex items-center justify-center gap-2"
                        ${!isActive ? 'disabled' : ''}
                    >
                        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                        </svg>
                        ${isActive ? 'FINALIZAR SALA' : 'SALA FINALIZADA'}
                    </button>
                ` : ''}
            </div>
        </div>
    `;

    attachEventListeners();
    // Update admin status to ensure isAdmin is set correctly
    updateAdminStatus();
    // Only update leaderboard with existing data, don't fetch automatically
    updateLeaderboard();
    
    console.log('[room.js] Room view rendered successfully');
    console.log('[room.js] Admin status:', {
        isAdmin: getState().isAdmin,
        hasAdminToken: !!getState().adminToken,
        roomAdminToken: state.currentRoom?.admin_token,
        stateAdminToken: getState().adminToken
    });
    isRendering = false;
}

// Function to load drink types from database
async function loadDrinkTypes() {
    const state = getState();
    if (!state.currentRoom) return;

    const { data: drinkTypes, error } = await supabase
        .from('drink_types')
        .select('*')
        .eq('room_id', state.currentRoom.id)
        .order('name');

    if (error) {
        console.error('Error loading drink types:', error);
        return;
    }

    if (drinkTypes && drinkTypes.length > 0) {
        setDrinkTypes(drinkTypes);
    }
}

// Function to load participants when entering the view (called explicitly from outside)
export function loadInitialParticipants() {
    console.log('[room.js] loadInitialParticipants called');
    const state = getState();
    console.log('[room.js] loadInitialParticipants state:', {
        hasLoadedInitialParticipants: hasLoadedInitialParticipants,
        hasCurrentRoom: !!state.currentRoom,
        currentRoomId: state.currentRoom?.id,
        hasDrinkTypes: !!state.drinkTypes,
        drinkTypesCount: state.drinkTypes?.length || 0
    });
    
    if (!hasLoadedInitialParticipants && state.currentRoom) {
        hasLoadedInitialParticipants = true;
        console.log('[room.js] Loading initial participants');
        // Only load drink types if they're not already set
        if (!state.drinkTypes || state.drinkTypes.length === 0) {
            console.log('[room.js] Drink types missing, loading them first');
            loadDrinkTypes().then(() => {
                console.log('[room.js] Drink types loaded, now loading participants');
                loadParticipants();
            });
        } else {
            console.log('[room.js] Drink types already loaded, just loading participants');
            // Drink types already loaded, just load participants
            loadParticipants();
        }
    } else {
        console.log('[room.js] Skipping loadInitialParticipants:', {
            reason: !hasLoadedInitialParticipants ? 'already loaded' : 'no currentRoom'
        });
    }
}

function attachEventListeners() {
    const state = getState();
    
    // Back button
    document.getElementById('back-btn').addEventListener('click', () => {
        cleanup();
        const state = getState();
        if (state.currentGroup) {
            setCurrentView('group-detail');
        } else {
            setCurrentView('groups');
        }
    });
    
    
    // Drink buttons
    document.querySelectorAll('.drink-btn').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            if (!state.currentRoom?.is_active) return;
            
            const target = e.currentTarget;
            if (!target) return;
            
            const drinkTypeId = target.dataset.drinkTypeId;
            const points = parseInt(target.dataset.points);
            
            // Visual feedback before adding drink
            if (target && target.classList) {
                target.classList.add('bg-green-600', 'border-green-500');
            }
            
            const success = await addDrink(drinkTypeId, points);
            
            // Remove visual feedback after delay
            if (target && target.classList) {
                setTimeout(() => {
                    if (target && target.classList) {
                        target.classList.remove('bg-green-600', 'border-green-500');
                    }
                }, 300);
            }
        });
    });

    // Refresh button
    const refreshBtn = document.getElementById('refresh-btn');
    if (refreshBtn) {
        refreshBtn.addEventListener('click', async () => {
            // Add visual feedback
            refreshBtn.classList.add('animate-spin');
            await refreshData();
            setTimeout(() => {
                refreshBtn.classList.remove('animate-spin');
            }, 500);
        });
    }

    // End competition button
    const endBtn = document.getElementById('end-competition-btn');
    if (endBtn) {
        endBtn.addEventListener('click', endCompetition);
    }
}

async function addDrink(drinkTypeId, points) {
    const state = getState();
    
    if (!state.currentParticipant) {
        window.toast.error('No estás registrado como participante. Por favor, únete a la sala primero.');
        return false;
    }
    
    if (!state.currentRoom?.is_active) {
        window.toast.error('La competición ha finalizado.');
        return false;
    }

    const { error } = await supabase
        .from('drink_events')
        .insert({
            participant_id: state.currentParticipant.id,
            drink_type_id: drinkTypeId
        });

    if (error) {
        console.error('Error adding drink:', error);
        if (error.message.includes('active')) {
            window.toast.error('La competición ha finalizado.');
        } else {
            window.toast.error('Error al añadir bebida. Por favor, inténtalo de nuevo.');
        }
        return false;
    } else {
        // Wait a bit for the database trigger to update points
        await new Promise(resolve => setTimeout(resolve, 100));
        
        // Reload participants after adding drink to get updated points
        await loadParticipants();
        
        // Also refresh room status in case it changed
        const state = getState();
        if (state.currentRoom) {
            const { data: room } = await supabase
                .from('rooms')
                .select('*')
                .eq('id', state.currentRoom.id)
                .single();
            if (room) {
                setCurrentRoom(room);
                updateAdminStatus();
            }
        }
        return true;
    }
}

async function loadParticipants() {
    console.log('[room.js] loadParticipants called');
    const state = getState();
    
    if (!state.currentRoom) {
        console.log('[room.js] loadParticipants: no currentRoom, returning');
        return;
    }

    console.log('[room.js] loadParticipants: loading from room_id:', state.currentRoom.id);
    const { data: participants, error } = await supabase
        .from('participants')
        .select('*')
        .eq('room_id', state.currentRoom.id)
        .order('total_points', { ascending: false });

    if (error) {
        console.error('[room.js] Error loading participants:', error);
        return;
    }

    console.log('[room.js] loadParticipants: loaded', participants?.length || 0, 'participants');
    // Update state without triggering full re-render to avoid infinite loops
    updateParticipantsSilently(participants || []);
    updateLeaderboard();
    console.log('[room.js] loadParticipants: completed, leaderboard updated');
}

function updateLeaderboard() {
    const state = getState();
    const leaderboard = document.getElementById('leaderboard');
    const participantCount = document.getElementById('participant-count');
    
    if (!leaderboard) return;

    const sortedParticipants = [...state.participants].sort((a, b) => b.total_points - a.total_points);
    
    // Update participant count
    if (participantCount) {
        participantCount.textContent = `${sortedParticipants.length} ${sortedParticipants.length === 1 ? 'Jugador' : 'Jugadores'}`;
    }
    
    leaderboard.innerHTML = sortedParticipants.map((p, index) => {
        const isCurrentUser = state.currentParticipant && p.id === state.currentParticipant.id;
        const rank = index + 1;
        const bgClass = isCurrentUser ? 'bg-orange-500/20 border-orange-500' : 'bg-gray-800 border-gray-700';
        const textClass = isCurrentUser ? 'text-orange-500 font-bold' : 'text-white';
        
        return `
            <div class="flex justify-between items-center p-3 border rounded-lg ${bgClass}">
                <div class="flex items-center gap-3">
                    <span class="text-lg font-bold w-8 flex items-center justify-center">${getRankIcon(rank)}</span>
                    <div class="flex items-center gap-2">
                        <span class="text-base ${textClass}">${p.nickname}</span>
                        ${isCurrentUser ? '<span class="text-xs text-orange-500">(Tú)</span>' : ''}
                    </div>
                </div>
                <span class="text-lg font-bold ${textClass}">${p.total_points} PTS</span>
            </div>
        `;
    }).join('') || '<p class="text-gray-500 text-center py-4">No hay participantes aún</p>';
}

async function refreshData() {
    const state = getState();
    
    if (!state.currentRoom) return;

    // Reload participants to get updated points
    await loadParticipants();
    
    // Check if room status changed
    const { data: room } = await supabase
        .from('rooms')
        .select('*')
        .eq('id', state.currentRoom.id)
        .single();
    
    if (room) {
        setCurrentRoom(room);
        updateAdminStatus();
        // If competition ended, load participants first then show finished view
        if (!room.is_active && state.currentRoom?.is_active) {
            await loadParticipants();
            setCurrentView('finished');
        }
    }
}

async function endCompetition() {
    const state = getState();
    
    if (!state.isAdmin || !state.currentRoom || !state.adminToken) return;
    
    // No permitir finalizar si ya está finalizada
    if (!state.currentRoom.is_active) {
        return;
    }

    const confirmed = await window.showConfirm(
        'Finalizar sala',
        '¿Estás seguro de que quieres finalizar la sala?',
        { confirmText: 'Aceptar', cancelText: 'Cancelar', confirmColor: 'red' }
    );
    
    if (!confirmed) {
        return;
    }

    // Update room to inactive
    const { error } = await supabase
        .from('rooms')
        .update({ is_active: false })
        .eq('id', state.currentRoom.id)
        .eq('admin_token', state.adminToken);

    if (error) {
        console.error('Error ending competition:', error);
        window.toast.error('Error al finalizar la competición. Por favor, inténtalo de nuevo.');
        return;
    }

    // Reload room to get updated state
    const { data: updatedRoom } = await supabase
        .from('rooms')
        .select('*')
        .eq('id', state.currentRoom.id)
        .single();

    if (updatedRoom) {
        setCurrentRoom(updatedRoom);
        // Load participants before showing finished view
        await loadParticipants();
        setCurrentView('finished');
    }
}

export function cleanup() {
    // Cleanup function - no polling to clean up anymore
    if (pollingInterval) {
        clearInterval(pollingInterval);
        pollingInterval = null;
    }
    // Reset flag when leaving the view
    hasLoadedInitialParticipants = false;
}
