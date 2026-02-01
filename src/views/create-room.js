import { supabase, generateAdminToken, generateRoomCode, generateUniqueNickname } from '../supabase.js';
import { getState, setCurrentView, setCurrentRoom, setAdminToken, setDrinkTypes, setCurrentParticipant } from '../state.js';

let drinkTypes = [];
let roomName = '';

// Emojis disponibles para bebidas
const availableEmojis = [
    '🍺', '🍻', '🍷', '🍸', '🍹', '🥃', '🥤', '🧃', '☕', '🍵',
    '🥛', '🍼', '🍾', '🍶', '🥂', '🍻', '🧉', '🧊', '🥥', '🍋',
    '🍊', '🍉', '🍇', '🍓', '🍒', '🍑', '🍍', '🥭', '🥝', '🍌'
];

// Emoji por defecto
const defaultEmoji = '🥤';

export function render() {
    const state = getState();
    
    // Check if user has a current group
    if (!state.currentGroup) {
        setCurrentView('groups');
        return;
    }
    
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
                <h1 class="text-xl font-bold">Crear competición</h1>
            </div>

            <div class="px-4 space-y-6">
                <!-- Sección IDENTIDAD -->
                <div>
                    <label class="block text-xs font-semibold text-gray-400 uppercase mb-2">IDENTIDAD</label>
                    <div class="relative">
                        <input 
                            type="text" 
                            id="room-name" 
                            placeholder="Ej: Locura de Viernes Noche"
                            class="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white text-base focus:outline-none focus:ring-2 focus:ring-orange-500"
                        />
                        <button class="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white">
                            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"></path>
                            </svg>
                        </button>
                    </div>
                    <p class="text-xs text-gray-500 mt-2">Dale a tu competición un nombre que todos recuerden.</p>
                </div>

                <!-- Sección Bebidas y puntos -->
                <div>
                    <div class="flex justify-between items-center mb-2">
                        <label class="block text-xs font-semibold text-gray-400 uppercase">Bebidas y puntos</label>
                        <button id="rules-btn" class="text-xs text-orange-500 font-semibold hover:text-orange-400">REGLAS</button>
                    </div>
                    <div id="drink-types-list" class="space-y-3 mb-4"></div>
                    <button 
                        id="add-drink-type" 
                        class="w-full py-3 bg-gray-800 border border-gray-700 rounded-lg text-white font-medium hover:bg-gray-750 transition flex items-center justify-center gap-2"
                    >
                        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path>
                        </svg>
                        Añadir bebida
                    </button>
                    <div class="mt-4 p-3 bg-gray-800 border border-gray-700 rounded-lg flex gap-3">
                        <div class="text-orange-500 text-lg">ℹ</div>
                        <p class="text-xs text-gray-400">A mayor puntuación, más intensa será la competición. Siempre puedes ajustar estos valores cuando la sala esté activa.</p>
                    </div>
                </div>

                <!-- Botón crear sala -->
                <button 
                    id="create-room-btn" 
                    class="w-full py-4 bg-orange-500 hover:bg-orange-600 active:bg-orange-700 rounded-lg text-white text-lg font-bold transition transform active:scale-95"
                >
                    Crear sala
                </button>
            </div>
        </div>
    `;

    attachEventListeners();
    addDrinkType(); // Add one initial drink type
}

function attachEventListeners() {
    document.getElementById('add-drink-type').addEventListener('click', addDrinkType);
    document.getElementById('create-room-btn').addEventListener('click', createRoom);
    document.getElementById('back-btn').addEventListener('click', () => {
        const state = getState();
        if (state.currentGroup) {
            setCurrentView('group-detail');
        } else {
            setCurrentView('groups');
        }
    });
    document.getElementById('rules-btn').addEventListener('click', () => {
        window.toast.info('Las reglas de la competición se configuran aquí. A mayor puntuación, más intensa será la competición.');
    });
}

function addDrinkType() {
    const drinkTypesList = document.getElementById('drink-types-list');
    const drinkTypeId = `drink-${Date.now()}-${Math.random()}`;
    
    const drinkTypeHtml = `
        <div class="drink-type-item flex gap-2 items-center bg-gray-800 border border-gray-700 p-3 rounded-lg" data-id="${drinkTypeId}">
            <button class="emoji-selector-btn text-xl cursor-pointer hover:scale-110 transition flex-shrink-0" data-id="${drinkTypeId}" data-emoji="${defaultEmoji}">
                ${defaultEmoji}
            </button>
            <input 
                type="text" 
                placeholder="Nombre de la bebida"
                class="flex-1 min-w-0 px-2 py-2 bg-gray-700 border border-gray-600 rounded text-white text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                data-name
            />
            <div class="flex items-center bg-gray-700 rounded-lg flex-shrink-0">
                <button class="decrease-points px-2 py-1.5 text-white hover:bg-gray-600 rounded-l-lg text-sm" data-id="${drinkTypeId}">−</button>
                <input 
                    type="number" 
                    value="1"
                    min="1"
                    class="w-8 px-1 py-1.5 bg-transparent text-white text-center text-xs focus:outline-none"
                    data-points
                    readonly
                />
                <button class="increase-points px-2 py-1.5 text-white hover:bg-gray-600 rounded-r-lg text-sm" data-id="${drinkTypeId}">+</button>
            </div>
            <button 
                class="remove-drink-type p-2 text-red-400 hover:text-red-300 hover:bg-gray-700 rounded-lg transition flex-shrink-0"
                data-id="${drinkTypeId}"
            >
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                </svg>
            </button>
        </div>
    `;
    
    drinkTypesList.insertAdjacentHTML('beforeend', drinkTypeHtml);
    
    // Attach listeners
    const item = document.querySelector(`[data-id="${drinkTypeId}"]`);
    const pointsInput = item.querySelector('[data-points]');
    const emojiBtn = item.querySelector('.emoji-selector-btn');
    
    // Emoji selector
    emojiBtn.addEventListener('click', () => {
        showEmojiPicker(emojiBtn, drinkTypeId);
    });
    
    // Increase/decrease points
    item.querySelector('.increase-points').addEventListener('click', () => {
        const current = parseInt(pointsInput.value) || 1;
        pointsInput.value = current + 1;
    });
    
    item.querySelector('.decrease-points').addEventListener('click', () => {
        const current = parseInt(pointsInput.value) || 1;
        if (current > 1) {
            pointsInput.value = current - 1;
        }
    });
    
    // Remove button
    item.querySelector('.remove-drink-type').addEventListener('click', () => {
        item.remove();
    });
}

function showEmojiPicker(emojiBtn, drinkTypeId) {
    // Remove existing picker if any
    const existingPicker = document.getElementById('emoji-picker');
    if (existingPicker) {
        existingPicker.remove();
    }
    
    // Create emoji picker
    const picker = document.createElement('div');
    picker.id = 'emoji-picker';
    picker.className = 'fixed inset-0 bg-black/50 flex items-center justify-center z-50';
    picker.innerHTML = `
        <div class="bg-gray-800 border border-gray-700 rounded-xl p-6 max-w-sm w-full mx-4">
            <div class="flex justify-between items-center mb-4">
                <h3 class="text-lg font-bold">Seleccionar emoji</h3>
                <button class="close-picker text-gray-400 hover:text-white">
                    <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                    </svg>
                </button>
            </div>
            <div class="grid grid-cols-6 gap-3 max-h-64 overflow-y-auto">
                ${availableEmojis.map(emoji => `
                    <button class="emoji-option text-3xl hover:scale-125 transition p-2 rounded-lg hover:bg-gray-700" data-emoji="${emoji}">
                        ${emoji}
                    </button>
                `).join('')}
            </div>
        </div>
    `;
    
    document.body.appendChild(picker);
    
    // Close picker
    picker.querySelector('.close-picker').addEventListener('click', () => {
        picker.remove();
    });
    
    picker.addEventListener('click', (e) => {
        if (e.target === picker) {
            picker.remove();
        }
    });
    
    // Select emoji
    picker.querySelectorAll('.emoji-option').forEach(btn => {
        btn.addEventListener('click', () => {
            const selectedEmoji = btn.dataset.emoji;
            emojiBtn.textContent = selectedEmoji;
            emojiBtn.dataset.emoji = selectedEmoji;
            picker.remove();
        });
    });
}

async function createRoom() {
    const roomNameInput = document.getElementById('room-name');
    roomName = roomNameInput.value.trim();
    
    if (!roomName) {
        window.toast.error('Por favor, introduce un nombre para la competición');
        return;
    }

    // Get current group from state
    const state = getState();
    if (!state.currentGroup) {
        window.toast.error('Error: No hay grupo seleccionado');
        setCurrentView('groups');
        return;
    }

    // Get user's nickname for this group
    let nickname = state.currentUser?.display_name || 'Usuario';
    
    // Try to get group-specific nickname
    if (state.currentUser) {
        const { data: member } = await supabase
            .from('group_members')
            .select('nickname')
            .eq('group_id', state.currentGroup.id)
            .eq('user_id', state.currentUser.id)
            .maybeSingle();
        
        if (member?.nickname) {
            nickname = member.nickname;
        } else {
            // Generate unique nickname if not set
            const baseName = state.currentUser?.display_name || 'Usuario';
            nickname = await generateUniqueNickname(state.currentGroup.id, baseName);
        }
    }

    // Collect drink types
    const drinkTypeItems = document.querySelectorAll('.drink-type-item');
    drinkTypes = [];
    
    for (const item of drinkTypeItems) {
        const nameInput = item.querySelector('[data-name]');
        const pointsInput = item.querySelector('[data-points]');
        const emojiBtn = item.querySelector('.emoji-selector-btn');
        const name = nameInput.value.trim();
        const points = parseInt(pointsInput.value) || 1;
        const icon = emojiBtn.dataset.emoji || defaultEmoji;
        
        if (name) {
            drinkTypes.push({ name, points, icon });
        }
    }

    if (drinkTypes.length === 0) {
        window.toast.error('Por favor, añade al menos un tipo de bebida');
        return;
    }

    // Generate admin token and room code
    const adminToken = generateAdminToken();
    let roomCode = generateRoomCode();
    
    // Ensure unique room code
    let codeExists = true;
    while (codeExists) {
        const { data, error } = await supabase
            .from('rooms')
            .select('id')
            .eq('code', roomCode)
            .maybeSingle();
        
        if (error) {
            console.error('Error checking room code:', error);
            // If there's an error, assume code is available and break
            codeExists = false;
        } else if (!data) {
            codeExists = false;
        } else {
            roomCode = generateRoomCode();
        }
    }

    // Create room
    const { data: room, error: roomError } = await supabase
        .from('rooms')
        .insert({
            code: roomCode,
            name: roomName,
            admin_token: adminToken,
            is_active: true,
            group_id: state.currentGroup.id
        })
        .select()
        .single();

    if (roomError) {
        console.error('Error creating room:', roomError);
        window.toast.error('Error al crear la sala. Por favor, inténtalo de nuevo.');
        return;
    }

    // Create drink types
    const drinkTypesToInsert = drinkTypes.map(dt => ({
        room_id: room.id,
        name: dt.name,
        points: dt.points,
        icon: dt.icon
    }));

    const { data: createdDrinkTypes, error: drinkTypesError } = await supabase
        .from('drink_types')
        .insert(drinkTypesToInsert)
        .select();

    if (drinkTypesError) {
        console.error('Error creating drink types:', drinkTypesError);
        window.toast.error('Sala creada pero falló al añadir tipos de bebida. Por favor, inténtalo de nuevo.');
        return;
    }

    // Create participant for the creator
    const participantData = {
        room_id: room.id,
        nickname: nickname,
        total_points: 0
    };
    
    // Add user_id if user is authenticated
    if (state.currentUser) {
        participantData.user_id = state.currentUser.id;
    }
    
    const { data: participant, error: participantError } = await supabase
        .from('participants')
        .insert(participantData)
        .select()
        .single();

    if (participantError) {
        console.error('Error creating participant:', participantError);
        window.toast.error('Sala creada pero falló al añadirte como participante. Por favor, únete manualmente a la sala.');
        return;
    }

    // Set state first
    setAdminToken(adminToken);
    setCurrentRoom(room);
    setDrinkTypes(createdDrinkTypes);
    setCurrentParticipant(participant);
    
    // Switch to room view - use setTimeout to ensure state is set first
    setTimeout(() => {
        setCurrentView('room');
    }, 0);
}
