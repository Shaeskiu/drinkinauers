import { supabase, generateGroupCode, generateUniqueNickname } from '../supabase.js';
import { getState, setCurrentView, setCurrentGroup, setUserGroups } from '../state.js';

export async function render() {
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
                <h1 class="text-xl font-bold">Crear grupo</h1>
            </div>

            <div class="px-4 space-y-6">
                <!-- Group Name -->
                <div>
                    <label class="block text-xs font-semibold text-gray-400 uppercase mb-2">Nombre del grupo</label>
                    <input 
                        type="text" 
                        id="group-name" 
                        placeholder="Ej: Equipo de Fútbol"
                        class="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white text-base focus:outline-none focus:ring-2 focus:ring-orange-500"
                    />
                    <p class="text-xs text-gray-500 mt-2">Dale un nombre único a tu grupo</p>
                </div>

                <!-- Group Code Preview -->
                <div class="bg-gray-800 border border-gray-700 rounded-lg p-4">
                    <label class="block text-xs font-semibold text-gray-400 uppercase mb-2">Código del grupo</label>
                    <div class="flex items-center justify-between gap-4">
                        <div class="flex-1">
                            <div class="flex gap-2 items-center">
                                <span class="text-3xl font-bold text-orange-500 tracking-wider" id="group-code-display">Generando...</span>
                            </div>
                            <p class="text-xs text-gray-500 mt-2">Comparte este código para que otros se unan</p>
                        </div>
                        <button 
                            id="copy-code-btn" 
                            class="px-4 py-2 bg-orange-500 hover:bg-orange-600 active:bg-orange-700 rounded-lg text-white text-sm font-semibold transition transform active:scale-95 flex items-center gap-2"
                            title="Copiar código"
                        >
                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"></path>
                            </svg>
                            Copiar
                        </button>
                    </div>
                </div>

                <!-- Create Button -->
                <button 
                    id="create-group-btn" 
                    class="w-full py-4 bg-orange-500 hover:bg-orange-600 active:bg-orange-700 rounded-lg text-white text-lg font-bold transition transform active:scale-95"
                >
                    Crear grupo
                </button>
            </div>
        </div>
    `;

    // Generate code
    const groupCode = await generateGroupCode();
    document.getElementById('group-code-display').textContent = groupCode;
    
    attachEventListeners(groupCode);
}

function attachEventListeners(groupCode) {
    document.getElementById('back-btn').addEventListener('click', () => {
        setCurrentView('groups');
    });

    document.getElementById('copy-code-btn').addEventListener('click', async () => {
        try {
            await navigator.clipboard.writeText(groupCode);
            const btn = document.getElementById('copy-code-btn');
            const originalText = btn.innerHTML;
            btn.innerHTML = `
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
                </svg>
                ¡Copiado!
            `;
            btn.classList.add('bg-green-600', 'hover:bg-green-700');
            setTimeout(() => {
                btn.innerHTML = originalText;
                btn.classList.remove('bg-green-600', 'hover:bg-green-700');
            }, 2000);
        } catch (err) {
            window.toast.info('Código del grupo: ' + groupCode);
        }
    });

    document.getElementById('create-group-btn').addEventListener('click', async () => {
        const groupName = document.getElementById('group-name').value.trim();
        const state = getState();

        if (!groupName) {
            window.toast.error('Por favor, introduce un nombre para el grupo');
            return;
        }

        if (!state.currentUser) {
            window.toast.error('Error: No hay usuario autenticado');
            return;
        }

        // Create group
        const { data: group, error: groupError } = await supabase
            .from('groups')
            .insert({
                name: groupName,
                code: groupCode,
                created_by: state.currentUser.id
            })
            .select()
            .single();

        if (groupError) {
            console.error('Error creating group:', groupError);
            window.toast.error('Error al crear el grupo. Por favor, inténtalo de nuevo.');
            return;
        }

        // Add creator as member with unique default nickname
        const baseName = state.currentUser.email?.split('@')[0] || 'Usuario';
        const uniqueNickname = await generateUniqueNickname(group.id, baseName);
        
        const { error: memberError } = await supabase
            .from('group_members')
            .insert({
                group_id: group.id,
                user_id: state.currentUser.id,
                nickname: uniqueNickname
            });

        if (memberError) {
            console.error('Error adding member:', memberError);
            window.toast.error('Grupo creado pero falló al añadirte como miembro. Por favor, únete manualmente.');
            return;
        }

        // Set current group and add to userGroups without triggering full reload
        setCurrentGroup(group);
        
        // Add the new group to the userGroups list silently
        // Get fresh state after setting current group
        const updatedState = getState();
        if (updatedState.userGroups && !updatedState.userGroups.find(g => g.id === group.id)) {
            const updatedGroups = [...updatedState.userGroups, group];
            setUserGroups(updatedGroups);
        }
        
        // Navigate to group detail
        setCurrentView('group-detail');
    });
}
