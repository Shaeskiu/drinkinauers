import { supabase } from '../supabase.js';
import { getState, setCurrentView, setCurrentRoom, setDrinkTypes, setCurrentParticipant } from '../state.js';

let codeInputs = [];

export function render() {
    const app = document.getElementById('app');
    app.innerHTML = `
        <div class="min-h-screen bg-gray-900 text-white pb-6">
            <!-- Header -->
            <div class="flex items-center gap-4 px-4 pt-4 pb-6">
                <button id="back-btn" class="text-white hover:text-gray-300">
                    <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"></path>
                    </svg>
                </button>
                <h1 class="text-xl font-bold">Unirse a la sala</h1>
            </div>

            <div class="px-4 space-y-6">
                <!-- Sección Código de la sala -->
                <div>
                    <label class="block text-xs font-semibold text-gray-400 uppercase mb-2">Código de la sala</label>
                    <p class="text-xs text-gray-500 mb-4">Pide al anfitrión el código de 6 dígitos para entrar en la competición.</p>
                    <div id="code-inputs" class="flex gap-2 justify-center">
                        ${Array.from({ length: 6 }, (_, i) => `
                            <input 
                                type="text" 
                                maxlength="1"
                                class="code-input w-12 h-14 text-center text-2xl font-bold bg-gray-800 border-b-2 border-gray-700 text-white focus:outline-none focus:border-orange-500 uppercase"
                                data-index="${i}"
                            />
                        `).join('')}
                    </div>
                </div>

                <!-- Sección Apodos existentes (se mostrará después de validar el código) -->
                <div id="existing-participants-section" class="hidden">
                    <label class="block text-xs font-semibold text-gray-400 uppercase mb-2">Continuar con un apodo existente</label>
                    <p class="text-xs text-gray-500 mb-3">Si te saliste sin querer, puedes continuar con tu puntuación anterior:</p>
                    <div id="existing-participants-list" class="space-y-2 mb-4"></div>
                    <div class="text-center text-gray-400 text-sm mb-4">o</div>
                </div>

                <!-- Sección Tu apodo -->
                <div>
                    <label class="block text-xs font-semibold text-gray-400 uppercase mb-2">Tu apodo</label>
                    <div class="relative">
                        <input 
                            type="text" 
                            id="nickname" 
                            placeholder="Ej. ElReyDeCopas"
                            class="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white text-base focus:outline-none focus:ring-2 focus:ring-orange-500"
                        />
                        <button class="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white">
                            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"></path>
                            </svg>
                        </button>
                    </div>
                    <p class="text-xs text-gray-500 mt-2">Crea un nuevo apodo para esta competición</p>
                </div>

                <!-- Botón Unirse -->
                <button 
                    id="join-room-btn" 
                    class="w-full py-4 bg-orange-500 hover:bg-orange-600 active:bg-orange-700 rounded-lg text-white text-lg font-bold transition transform active:scale-95 flex items-center justify-center gap-2"
                >
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path>
                    </svg>
                    Unirse
                </button>
            </div>
        </div>
    `;

    attachEventListeners();
    setupCodeInputs();
}

function setupCodeInputs() {
    codeInputs = Array.from(document.querySelectorAll('.code-input'));
    
    codeInputs.forEach((input, index) => {
        // Only allow alphanumeric characters
        input.addEventListener('input', async (e) => {
            const value = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '');
            e.target.value = value;
            
            // Move to next input if value entered
            if (value && index < codeInputs.length - 1) {
                codeInputs[index + 1].focus();
            }
            
            // Check if code is complete (6 characters)
            const roomCode = getRoomCode();
            if (roomCode.length === 6) {
                await checkRoomAndLoadParticipants(roomCode);
            } else {
                // Hide participants section if code is incomplete
                const section = document.getElementById('existing-participants-section');
                if (section) {
                    section.classList.add('hidden');
                }
            }
        });
        
        // Handle backspace
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Backspace' && !e.target.value && index > 0) {
                codeInputs[index - 1].focus();
            }
        });
        
        // Handle paste
        input.addEventListener('paste', async (e) => {
            e.preventDefault();
            const pasted = e.clipboardData.getData('text').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6);
            pasted.split('').forEach((char, i) => {
                if (codeInputs[index + i]) {
                    codeInputs[index + i].value = char;
                }
            });
            const lastIndex = Math.min(index + pasted.length - 1, codeInputs.length - 1);
            if (codeInputs[lastIndex]) {
                codeInputs[lastIndex].focus();
            }
            
            // Check if code is complete after paste
            const roomCode = getRoomCode();
            if (roomCode.length === 6) {
                await checkRoomAndLoadParticipants(roomCode);
            }
        });
    });
}

async function checkRoomAndLoadParticipants(roomCode) {
    // Find room by code
    const { data: room, error: roomError } = await supabase
        .from('rooms')
        .select('*')
        .eq('code', roomCode)
        .single();

    if (roomError || !room) {
        // Hide participants section if room not found
        const section = document.getElementById('existing-participants-section');
        if (section) {
            section.classList.add('hidden');
        }
        return;
    }

    // Validate that room belongs to user's current group
    const state = getState();
    if (state.currentGroup && room.group_id !== state.currentGroup.id) {
        const section = document.getElementById('existing-participants-section');
        if (section) {
            section.classList.add('hidden');
        }
        return;
    }

    if (!room.is_active) {
        // Hide participants section if room is inactive
        const section = document.getElementById('existing-participants-section');
        if (section) {
            section.classList.add('hidden');
        }
        return;
    }

    // Get existing participants
    const { data: existingParticipants, error: participantsError } = await supabase
        .from('participants')
        .select('*')
        .eq('room_id', room.id)
        .order('total_points', { ascending: false });

    if (participantsError) {
        console.error('Error fetching participants:', participantsError);
        return;
    }

    // If there are existing participants, show them
    if (existingParticipants && existingParticipants.length > 0) {
        showExistingParticipants(existingParticipants, room);
    } else {
        // Hide section if no participants
        const section = document.getElementById('existing-participants-section');
        if (section) {
            section.classList.add('hidden');
        }
    }
}

function getRoomCode() {
    return codeInputs.map(input => input.value).join('').toUpperCase();
}

function attachEventListeners() {
    document.getElementById('join-room-btn').addEventListener('click', async () => {
        const roomCode = getRoomCode();
        const nicknameInput = document.getElementById('nickname');
        const nickname = nicknameInput.value.trim();

        if (roomCode.length !== 6) {
            window.toast.error('Por favor, introduce el código completo de 6 dígitos');
            return;
        }

        if (!nickname) {
            window.toast.error('Por favor, introduce tu apodo');
            return;
        }

        // Find room by code
        const { data: room, error: roomError } = await supabase
            .from('rooms')
            .select('*')
            .eq('code', roomCode)
            .single();

        if (roomError || !room) {
            window.toast.error('Sala no encontrada. Por favor, verifica el código.');
            return;
        }

        // Validate that room belongs to user's current group
        const state = getState();
        if (state.currentGroup && room.group_id !== state.currentGroup.id) {
            window.toast.error('Esta sala no pertenece a tu grupo actual.');
            return;
        }

        if (!room.is_active) {
            window.toast.error('Esta competición ha finalizado.');
            return;
        }

        // Get drink types for the room
        const { data: drinkTypes, error: drinkTypesError } = await supabase
            .from('drink_types')
            .select('*')
            .eq('room_id', room.id)
            .order('name');

        if (drinkTypesError) {
            console.error('Error fetching drink types:', drinkTypesError);
            window.toast.error('Error al cargar la sala. Por favor, inténtalo de nuevo.');
            return;
        }

        if (!drinkTypes || drinkTypes.length === 0) {
            window.toast.error('La sala no tiene tipos de bebida configurados.');
            return;
        }

        // Create participant and join
        await createParticipantAndJoin(room, drinkTypes, nickname);
    });
    
    document.getElementById('back-btn').addEventListener('click', () => {
        const state = getState();
        if (state.currentGroup) {
            setCurrentView('group-detail');
        } else {
            setCurrentView('groups');
        }
    });
}


function showExistingParticipants(participants, room) {
    const section = document.getElementById('existing-participants-section');
    const list = document.getElementById('existing-participants-list');
    
    list.innerHTML = participants.map(p => `
        <button 
            class="existing-participant-btn w-full px-4 py-3 bg-gray-800 border border-gray-700 hover:bg-gray-750 rounded-lg text-white text-left transition flex items-center justify-between"
            data-participant-id="${p.id}"
        >
            <div>
                <div class="font-semibold">${p.nickname}</div>
                <div class="text-xs text-gray-400">${p.total_points} puntos</div>
            </div>
            <svg class="w-5 h-5 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path>
            </svg>
        </button>
    `).join('');

    section.classList.remove('hidden');

    // Attach event listeners to participant buttons
    document.querySelectorAll('.existing-participant-btn').forEach(btn => {
        btn.addEventListener('click', async () => {
            const participantId = btn.dataset.participantId;
            const participant = participants.find(p => p.id === participantId);
            
            if (participant) {
                // Get drink types for the room
                const { data: drinkTypes, error: drinkTypesError } = await supabase
                    .from('drink_types')
                    .select('*')
                    .eq('room_id', room.id)
                    .order('name');

                if (drinkTypesError) {
                    console.error('Error fetching drink types:', drinkTypesError);
                    window.toast.error('Error al cargar la sala. Por favor, inténtalo de nuevo.');
                    return;
                }

                if (!drinkTypes || drinkTypes.length === 0) {
                    window.toast.error('La sala no tiene tipos de bebida configurados.');
                    return;
                }

                // Set state and join with existing participant
                setCurrentRoom(room);
                setDrinkTypes(drinkTypes);
                setCurrentParticipant(participant);
                setCurrentView('room');
            }
        });
    });
}

async function createParticipantAndJoin(room, drinkTypes, nickname) {
    const state = getState();
    
    // Check if participant already exists (by user_id if authenticated, or by nickname)
    let existingParticipant = null;
    if (state.currentUser) {
        const { data } = await supabase
            .from('participants')
            .select('*')
            .eq('room_id', room.id)
            .eq('user_id', state.currentUser.id)
            .maybeSingle();
        existingParticipant = data;
    }
    
    // If no participant by user_id, check by nickname
    if (!existingParticipant) {
        const { data } = await supabase
            .from('participants')
            .select('*')
            .eq('room_id', room.id)
            .eq('nickname', nickname)
            .maybeSingle();
        existingParticipant = data;
    }

    let participant;
    if (existingParticipant) {
        participant = existingParticipant;
    } else {
        // Create new participant
        const participantData = {
            room_id: room.id,
            nickname: nickname,
            total_points: 0
        };
        
        // Add user_id if user is authenticated
        if (state.currentUser) {
            participantData.user_id = state.currentUser.id;
        }
        
        const { data: newParticipant, error: participantError } = await supabase
            .from('participants')
            .insert(participantData)
            .select()
            .single();

        if (participantError) {
            console.error('Error creating participant:', participantError);
            window.toast.error('Error al unirse a la sala. Por favor, inténtalo de nuevo.');
            return;
        }

        participant = newParticipant;
    }

    // Set state
    setCurrentRoom(room);
    setDrinkTypes(drinkTypes);
    setCurrentParticipant(participant);
    
    // Switch to room view
    setCurrentView('room');
}
