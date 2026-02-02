import { supabase, updateGroupNickname, generateUniqueNickname } from '../supabase.js';
import { getState, setCurrentView, setCurrentRoom, setCurrentGroup, setDrinkTypes, setRoomState, setCurrentParticipant, loadAdminToken, updateAdminStatus } from '../state.js';

let currentTab = 'active'; // 'active' | 'finished' | 'ranking'

export async function render() {
    console.log('[group-detail.js] render() called');
    const state = getState();
    console.log('[group-detail.js] render() state:', {
        currentView: state.currentView,
        hasCurrentGroup: !!state.currentGroup,
        currentGroupId: state.currentGroup?.id,
        hasCurrentRoom: !!state.currentRoom,
        currentRoomId: state.currentRoom?.id
    });
    
    // Don't render if we're not in group-detail view
    if (state.currentView !== 'group-detail') {
        console.log('[group-detail.js] Not in group-detail view, skipping render. Current view:', state.currentView);
        return;
    }
    
    const app = document.getElementById('app');
    
    if (!state.currentGroup) {
        console.log('[group-detail.js] No currentGroup, redirecting to groups');
        setCurrentView('groups');
        return;
    }

    // Load rooms, ranking, and user's group nickname
    const [activeRooms, finishedRooms, globalRanking, groupMember] = await Promise.all([
        loadActiveRooms(),
        loadFinishedRooms(),
        loadGlobalRanking(),
        loadGroupMember()
    ]);
    
    // Get user's nickname for this group (default to email with unique suffix if needed)
    let userNickname = groupMember?.nickname;
    if (!userNickname) {
        const baseName = state.currentUser?.email?.split('@')[0] || 'Usuario';
        // Generate unique nickname if not set
        userNickname = await generateUniqueNickname(state.currentGroup.id, baseName);
    }

    app.innerHTML = `
        <div class="min-h-screen bg-gray-900 text-white pb-24">
            <!-- Header -->
            <div class="px-4 pt-4 pb-4 border-b border-gray-800 space-y-3">
                <div class="flex items-center justify-between">
                    <div class="flex items-center gap-4">
                        <button id="back-btn" class="text-white hover:text-gray-300">
                            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"></path>
                            </svg>
                        </button>
                        <div>
                            <h1 class="text-lg font-bold">${state.currentGroup.name}</h1>
                            <p class="text-xs text-gray-400">Código: ${state.currentGroup.code}</p>
                        </div>
                    </div>
                </div>
                
                <!-- User Nickname for this group -->
                <div class="bg-gray-800 border border-gray-700 rounded-lg p-3">
                    <label class="block text-xs font-semibold text-gray-400 uppercase mb-2">Tu nombre en este grupo</label>
                    <div class="flex items-center gap-2">
                        <input 
                            type="text" 
                            id="group-nickname-input" 
                            value="${userNickname}"
                            placeholder="Tu nombre"
                            class="flex-1 px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                        />
                        <button 
                            id="save-nickname-btn" 
                            class="px-4 py-2 bg-orange-500 hover:bg-orange-600 rounded-lg text-white text-sm font-semibold transition"
                        >
                            Guardar
                        </button>
                    </div>
                    <p class="text-xs text-gray-500 mt-1">Este será tu nombre en las salas y clasificaciones de este grupo</p>
                </div>
            </div>

            <!-- Tabs -->
            <div class="flex border-b border-gray-800 px-4">
                <button 
                    class="tab-btn flex-1 py-3 text-center font-semibold border-b-2 transition ${currentTab === 'active' ? 'border-orange-500 text-orange-500' : 'border-transparent text-gray-400'}"
                    data-tab="active"
                >
                    Salas Activas (${activeRooms.length})
                </button>
                <button 
                    class="tab-btn flex-1 py-3 text-center font-semibold border-b-2 transition ${currentTab === 'finished' ? 'border-orange-500 text-orange-500' : 'border-transparent text-gray-400'}"
                    data-tab="finished"
                >
                    Finalizadas (${finishedRooms.length})
                </button>
                <button 
                    class="tab-btn flex-1 py-3 text-center font-semibold border-b-2 transition ${currentTab === 'ranking' ? 'border-orange-500 text-orange-500' : 'border-transparent text-gray-400'}"
                    data-tab="ranking"
                >
                    Clasificación
                </button>
            </div>

            <!-- Tab Content -->
            <div class="px-4 py-6">
                <!-- Active Rooms Tab -->
                <div id="active-tab" class="tab-content ${currentTab === 'active' ? '' : 'hidden'}">
                    ${activeRooms.length === 0 ? `
                        <div class="text-center py-12">
                            <div class="text-6xl mb-4">🏠</div>
                            <p class="text-gray-400 mb-6">No hay salas activas</p>
                        </div>
                    ` : `
                        <div class="space-y-3">
                            ${activeRooms.map(room => `
                                <button 
                                    class="room-card w-full p-4 bg-gray-800 border border-gray-700 rounded-lg hover:bg-gray-750 transition text-left"
                                    data-room-id="${room.id}"
                                >
                                    <div class="flex items-center justify-between">
                                        <div class="flex-1">
                                            <h3 class="text-lg font-bold mb-1">${room.name}</h3>
                                            <p class="text-sm text-gray-400">Código: ${room.code}</p>
                                        </div>
                                        <div class="flex items-center gap-2">
                                            <span class="px-2 py-1 bg-orange-500 text-white text-xs font-bold rounded-full">ACTIVA</span>
                                            <svg class="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path>
                                            </svg>
                                        </div>
                                    </div>
                                </button>
                            `).join('')}
                        </div>
                    `}
                </div>

                <!-- Finished Rooms Tab -->
                <div id="finished-tab" class="tab-content ${currentTab === 'finished' ? '' : 'hidden'}">
                    ${finishedRooms.length === 0 ? `
                        <div class="text-center py-12">
                            <div class="text-6xl mb-4">🏁</div>
                            <p class="text-gray-400 mb-6">No hay salas finalizadas</p>
                        </div>
                    ` : `
                        <div class="space-y-3">
                            ${finishedRooms.map(room => `
                                <button 
                                    class="room-card w-full p-4 bg-gray-800 border border-gray-700 rounded-lg hover:bg-gray-750 transition text-left"
                                    data-room-id="${room.id}"
                                >
                                    <div class="flex items-center justify-between">
                                        <div class="flex-1">
                                            <h3 class="text-lg font-bold mb-1">${room.name}</h3>
                                            <p class="text-sm text-gray-400">Código: ${room.code}</p>
                                        </div>
                                        <div class="flex items-center gap-2">
                                            <span class="px-2 py-1 bg-gray-600 text-white text-xs font-bold rounded-full">FINALIZADA</span>
                                            <svg class="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path>
                                            </svg>
                                        </div>
                                    </div>
                                </button>
                            `).join('')}
                        </div>
                    `}
                </div>

                <!-- Global Ranking Tab -->
                <div id="ranking-tab" class="tab-content ${currentTab === 'ranking' ? '' : 'hidden'}">
                    ${globalRanking.length === 0 ? `
                        <div class="text-center py-12">
                            <div class="text-6xl mb-4">📊</div>
                            <p class="text-gray-400 mb-6">No hay clasificación aún</p>
                        </div>
                    ` : `
                        <div class="space-y-2 mb-6">
                            ${globalRanking.map((score, index) => {
                                const rank = index + 1;
                                const rankIcon = rank === 1 ? '🏆' : rank === 2 ? '📊' : rank === 3 ? '📈' : '#';
                                const isCurrentUser = state.currentUser && score.user_id === state.currentUser.id;
                                const bgClass = isCurrentUser ? 'bg-orange-500/20 border-orange-500' : 'bg-gray-800 border-gray-700';
                                const textClass = isCurrentUser ? 'text-orange-500 font-bold' : 'text-white';
                                
                                return `
                                    <div class="flex justify-between items-center p-3 border rounded-lg ${bgClass}">
                                        <div class="flex items-center gap-3">
                                            <span class="text-lg font-bold w-8 flex items-center justify-center">${rankIcon}</span>
                                            <div class="flex items-center gap-2">
                                                <span class="text-base ${textClass}">Usuario #${score.user_id.toString().substring(0, 8)}</span>
                                                ${isCurrentUser ? '<span class="text-xs text-orange-500">(Tú)</span>' : ''}
                                            </div>
                                        </div>
                                        <span class="text-lg font-bold ${textClass}">${score.total_points} PTS</span>
                                    </div>
                                `;
                            }).join('')}
                        </div>
                        ${state.isGroupAdmin ? `
                            <button 
                                id="reset-ranking-btn" 
                                class="w-full py-3 bg-red-600 hover:bg-red-700 active:bg-red-800 rounded-lg text-white font-bold transition transform active:scale-95 flex items-center justify-center gap-2"
                            >
                                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path>
                                </svg>
                                Resetear Clasificación Global
                            </button>
                        ` : ''}
                    `}
                </div>
            </div>

            <!-- Create Room Button (Fixed at bottom) -->
            <div class="fixed bottom-0 left-0 right-0 p-4 bg-gray-900 border-t border-gray-800">
                <button 
                    id="create-room-btn" 
                    class="w-full py-4 bg-orange-500 hover:bg-orange-600 active:bg-orange-700 rounded-lg text-white text-lg font-bold transition transform active:scale-95 flex items-center justify-center gap-2"
                >
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path>
                    </svg>
                    Crear Nueva Sala
                </button>
            </div>
        </div>
    `;

    attachEventListeners();
    console.log('[group-detail.js] render() completed');
}

async function loadActiveRooms() {
    const state = getState();
    if (!state.currentGroup) return [];

    const { data: rooms, error } = await supabase
        .from('rooms')
        .select('*')
        .eq('group_id', state.currentGroup.id)
        .eq('is_active', true)
        .order('created_at', { ascending: false });

    if (error) {
        console.error('Error loading active rooms:', error);
        return [];
    }

    return rooms || [];
}

async function loadFinishedRooms() {
    const state = getState();
    if (!state.currentGroup) return [];

    const { data: rooms, error } = await supabase
        .from('rooms')
        .select('*')
        .eq('group_id', state.currentGroup.id)
        .eq('is_active', false)
        .order('created_at', { ascending: false });

    if (error) {
        console.error('Error loading finished rooms:', error);
        return [];
    }

    return rooms || [];
}

async function loadGlobalRanking() {
    const state = getState();
    if (!state.currentGroup) return [];

    // Load scores
    const { data: scores, error } = await supabase
        .from('user_global_scores')
        .select('*')
        .eq('group_id', state.currentGroup.id)
        .order('total_points', { ascending: false });

    if (error) {
        console.error('Error loading global ranking:', error);
        return [];
    }

    if (!scores || scores.length === 0) {
        return [];
    }

    // Load group member nicknames
    const userIds = scores.map(s => s.user_id);
    
    const { data: members } = await supabase
        .from('group_members')
        .select('user_id, nickname')
        .eq('group_id', state.currentGroup.id)
        .in('user_id', userIds);

    // Map nicknames
    const nicknameMap = {};
    if (members) {
        members.forEach(m => {
            nicknameMap[m.user_id] = m.nickname;
        });
    }

    // Add display name to each score (use nickname or fallback to user ID)
    return scores.map(score => ({
        ...score,
        displayName: nicknameMap[score.user_id] || `Usuario #${score.user_id.toString().substring(0, 8)}`
    }));
}

async function loadGroupMember() {
    const state = getState();
    if (!state.currentGroup || !state.currentUser) return null;

    const { data: member, error } = await supabase
        .from('group_members')
        .select('*')
        .eq('group_id', state.currentGroup.id)
        .eq('user_id', state.currentUser.id)
        .single();

    if (error) {
        console.error('Error loading group member:', error);
        return null;
    }

    return member;
}

function attachEventListeners() {
    // Back button
    document.getElementById('back-btn').addEventListener('click', () => {
        setCurrentView('groups');
    });

    // Tab buttons
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const tab = btn.dataset.tab;
            currentTab = tab;
            
            // Update tab buttons
            document.querySelectorAll('.tab-btn').forEach(b => {
                if (b.dataset.tab === tab) {
                    b.classList.add('border-orange-500', 'text-orange-500');
                    b.classList.remove('border-transparent', 'text-gray-400');
                } else {
                    b.classList.remove('border-orange-500', 'text-orange-500');
                    b.classList.add('border-transparent', 'text-gray-400');
                }
            });
            
            // Update tab content
            document.querySelectorAll('.tab-content').forEach(content => {
                content.classList.add('hidden');
            });
            document.getElementById(`${tab}-tab`).classList.remove('hidden');
            
            // Reload data if needed
            if (tab === 'ranking') {
                loadGlobalRanking().then(scores => {
                    updateRankingTab(scores);
                });
            }
        });
    });

    // Room cards - use event delegation on tab content containers
    const activeTab = document.getElementById('active-tab');
    const finishedTab = document.getElementById('finished-tab');
    
    [activeTab, finishedTab].forEach(container => {
        if (container) {
            container.addEventListener('click', async (e) => {
                const roomCard = e.target.closest('.room-card');
                if (roomCard) {
                    e.preventDefault();
                    e.stopPropagation();
                    const roomId = roomCard.dataset.roomId;
                    
                    if (!roomId) {
                        console.error('No room ID found on card');
                        return;
                    }
                    
                    // Load room
                    const { data: room, error: roomError } = await supabase
                        .from('rooms')
                        .select('*')
                        .eq('id', roomId)
                        .single();
                    
                    if (roomError || !room) {
                        console.error('Error loading room:', roomError);
                        window.toast.error('Error al cargar la sala. Por favor, inténtalo de nuevo.');
                        return;
                    }
                    
                    // Load drink types for the room
                    const { data: drinkTypes, error: drinkTypesError } = await supabase
                        .from('drink_types')
                        .select('*')
                        .eq('room_id', room.id)
                        .order('name');
                    
                    if (drinkTypesError) {
                        console.error('Error loading drink types:', drinkTypesError);
                        window.toast.error('Error al cargar los tipos de bebida. Por favor, inténtalo de nuevo.');
                        return;
                    }
                    
                    if (!drinkTypes || drinkTypes.length === 0) {
                        window.toast.error('La sala no tiene tipos de bebida configurados.');
                        return;
                    }
                    
                    // Get user's nickname for this group
                    const state = getState();
                    let userNickname = state.currentUser?.email?.split('@')[0] || 'Usuario';
                    
                    // Try to get group-specific nickname
                    if (state.currentGroup && state.currentUser) {
                        const { data: member } = await supabase
                            .from('group_members')
                            .select('nickname')
                            .eq('group_id', state.currentGroup.id)
                            .eq('user_id', state.currentUser.id)
                            .single();
                        
                        if (member?.nickname) {
                            userNickname = member.nickname;
                        }
                    }
                    
                    // Auto-register user as participant if not already registered
                    let participant = null;
                    if (state.currentUser) {
                        // Check if participant already exists
                        const { data: existingParticipant } = await supabase
                            .from('participants')
                            .select('*')
                            .eq('room_id', room.id)
                            .eq('user_id', state.currentUser.id)
                            .maybeSingle();
                        
                        if (existingParticipant) {
                            participant = existingParticipant;
                        } else {
                            // Auto-register user
                            const { data: newParticipant, error: participantError } = await supabase
                                .from('participants')
                                .insert({
                                    room_id: room.id,
                                    user_id: state.currentUser.id,
                                    nickname: userNickname,
                                    total_points: 0
                                })
                                .select()
                                .single();
                            
                            if (participantError) {
                                console.error('Error auto-registering participant:', participantError);
                                window.toast.error('Error al registrarte en la sala. Por favor, inténtalo de nuevo.');
                                return;
                            }
                            
                            participant = newParticipant;
                        }
                    }
                    
                    // Set state atomically using batch update
                    console.log('[group-detail.js] Setting room state:', room.id);
                    console.log('[group-detail.js] Room data:', { id: room.id, name: room.name, code: room.code, is_active: room.is_active });
                    console.log('[group-detail.js] Drink types count:', drinkTypes.length);
                    
                    // Load admin token from localStorage (if user created this room before)
                    loadAdminToken();
                    
                    // Set room state and drink types (this also updates admin status in batch)
                    setRoomState(room, drinkTypes);
                    
                    // Verify state was set
                    const stateAfterSet = getState();
                    console.log('[group-detail.js] State after setRoomState:', {
                        hasCurrentRoom: !!stateAfterSet.currentRoom,
                        currentRoomId: stateAfterSet.currentRoom?.id,
                        hasDrinkTypes: !!stateAfterSet.drinkTypes,
                        drinkTypesCount: stateAfterSet.drinkTypes?.length || 0,
                        isAdmin: stateAfterSet.isAdmin,
                        adminToken: !!stateAfterSet.adminToken
                    });
                    
                    console.log('[group-detail.js] State set, changing view to room');
                    // Change view after state is fully set
                    setCurrentView('room');
                    console.log('[group-detail.js] View changed to room');
                    
                    // Set participant after view change to avoid triggering group-detail re-render
                    if (participant) {
                        // Use setTimeout to ensure view change is processed first
                        setTimeout(() => {
                            console.log('[group-detail.js] Setting participant after view change:', participant.id);
                            setCurrentParticipant(participant);
                        }, 10);
                    }
                }
            });
        }
    });

    // Create room button
    document.getElementById('create-room-btn').addEventListener('click', () => {
        setCurrentView('create-room');
    });

    // Save nickname button
    document.getElementById('save-nickname-btn').addEventListener('click', async () => {
        const state = getState();
        if (!state.currentGroup || !state.currentUser) return;

        const nicknameInput = document.getElementById('group-nickname-input');
        const nickname = nicknameInput.value.trim();

        if (!nickname) {
            window.toast.error('El nombre no puede estar vacío');
            return;
        }

        // Check if nickname is already taken in this group
        const { data: existing } = await supabase
            .from('group_members')
            .select('id, user_id')
            .eq('group_id', state.currentGroup.id)
            .eq('nickname', nickname)
            .maybeSingle();

        if (existing && existing.user_id !== state.currentUser.id) {
            window.toast.error('Este nombre ya está en uso en este grupo. Por favor, elige otro.');
            return;
        }

        const { data, error } = await updateGroupNickname(state.currentGroup.id, state.currentUser.id, nickname);

        if (error) {
            console.error('Error updating nickname:', error);
            window.toast.error('Error al guardar el nombre. Por favor, inténtalo de nuevo.');
            return;
        }

        if (!data) {
            console.error('No data returned from update');
            window.toast.error('Error al guardar el nombre. Por favor, inténtalo de nuevo.');
            return;
        }

        // Update the input value to reflect the saved nickname
        nicknameInput.value = data.nickname || nickname;

        // Visual feedback
        const btn = document.getElementById('save-nickname-btn');
        const originalText = btn.textContent;
        btn.textContent = '✓ Guardado';
        btn.classList.add('bg-green-600', 'hover:bg-green-700');
        setTimeout(() => {
            btn.textContent = originalText;
            btn.classList.remove('bg-green-600', 'hover:bg-green-700');
        }, 2000);
    });

    // Reset ranking button
    const resetBtn = document.getElementById('reset-ranking-btn');
    if (resetBtn) {
        resetBtn.addEventListener('click', async () => {
            const state = getState();
            if (!state.isGroupAdmin || !state.currentGroup || !state.currentUser) return;

            const confirmed = await window.showConfirm(
                'Resetear clasificación',
                '¿Estás seguro de que quieres resetear la clasificación global? Esta acción no se puede deshacer.',
                { confirmText: 'Aceptar', cancelText: 'Cancelar', confirmColor: 'red' }
            );
            
            if (!confirmed) {
                return;
            }

            const { data, error } = await supabase.rpc('reset_global_ranking', {
                group_id_param: state.currentGroup.id,
                user_id_param: state.currentUser.id
            });

            if (error || !data) {
                window.toast.error('Error al resetear la clasificación. Solo el creador del grupo puede hacer esto.');
                return;
            }

            // Reload ranking
            const scores = await loadGlobalRanking();
            updateRankingTab(scores);
            window.toast.success('Clasificación global reseteada correctamente');
        });
    }
}

function updateRankingTab(scores) {
    const state = getState();
    const rankingTab = document.getElementById('ranking-tab');
    
    if (scores.length === 0) {
        rankingTab.innerHTML = `
            <div class="text-center py-12">
                <div class="text-6xl mb-4">📊</div>
                <p class="text-gray-400 mb-6">No hay clasificación aún</p>
            </div>
        `;
        return;
    }

    rankingTab.innerHTML = `
        <div class="space-y-2 mb-6">
            ${scores.map((score, index) => {
                const rank = index + 1;
                const rankIcon = rank === 1 ? '🏆' : rank === 2 ? '📊' : rank === 3 ? '📈' : '#';
                const isCurrentUser = state.currentUser && score.user_id === state.currentUser.id;
                const bgClass = isCurrentUser ? 'bg-orange-500/20 border-orange-500' : 'bg-gray-800 border-gray-700';
                const textClass = isCurrentUser ? 'text-orange-500 font-bold' : 'text-white';
                const displayName = score.displayName || `Usuario #${score.user_id.toString().substring(0, 8)}`;
                
                return `
                    <div class="flex justify-between items-center p-3 border rounded-lg ${bgClass}">
                        <div class="flex items-center gap-3">
                            <span class="text-lg font-bold w-8 flex items-center justify-center">${rankIcon}</span>
                            <div class="flex items-center gap-2">
                                <span class="text-base ${textClass}">${displayName}</span>
                                ${isCurrentUser ? '<span class="text-xs text-orange-500">(Tú)</span>' : ''}
                            </div>
                        </div>
                        <span class="text-lg font-bold ${textClass}">${score.total_points} PTS</span>
                    </div>
                `;
            }).join('')}
        </div>
        ${state.isGroupAdmin ? `
            <button 
                id="reset-ranking-btn" 
                class="w-full py-3 bg-red-600 hover:bg-red-700 active:bg-red-800 rounded-lg text-white font-bold transition transform active:scale-95 flex items-center justify-center gap-2"
            >
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path>
                </svg>
                Resetear Clasificación Global
            </button>
        ` : ''}
    `;

    // Re-attach reset button listener
    const resetBtn = document.getElementById('reset-ranking-btn');
    if (resetBtn) {
        resetBtn.addEventListener('click', async () => {
            const state = getState();
            if (!state.isGroupAdmin || !state.currentGroup || !state.currentUser) return;

            const confirmed = await window.showConfirm(
                'Resetear clasificación',
                '¿Estás seguro de que quieres resetear la clasificación global? Esta acción no se puede deshacer.',
                { confirmText: 'Aceptar', cancelText: 'Cancelar', confirmColor: 'red' }
            );
            
            if (!confirmed) {
                return;
            }

            const { data, error } = await supabase.rpc('reset_global_ranking', {
                group_id_param: state.currentGroup.id,
                user_id_param: state.currentUser.id
            });

            if (error || !data) {
                window.toast.error('Error al resetear la clasificación. Solo el creador del grupo puede hacer esto.');
                return;
            }

            // Reload ranking
            const scores = await loadGlobalRanking();
            updateRankingTab(scores);
            window.toast.success('Clasificación global reseteada correctamente');
        });
    }
}
