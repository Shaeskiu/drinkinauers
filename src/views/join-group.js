import { supabase, generateUniqueNickname } from '../supabase.js';
import { getState, setCurrentView, setCurrentGroup, setUserGroups } from '../state.js';

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
                <h1 class="text-xl font-bold">Unirse a un grupo</h1>
            </div>

            <div class="px-4 space-y-6">
                <!-- Error message -->
                <div id="error-message" class="hidden p-3 bg-red-500/20 border border-red-500 rounded-lg text-red-400 text-sm"></div>

                <!-- Group Code -->
                <div>
                    <label class="block text-xs font-semibold text-gray-400 uppercase mb-2">Código del grupo</label>
                    <p class="text-xs text-gray-500 mb-4">Pide al administrador el código de 6 caracteres para unirte al grupo.</p>
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

                <!-- Join Button -->
                <button 
                    id="join-group-btn" 
                    class="w-full py-4 bg-orange-500 hover:bg-orange-600 active:bg-orange-700 rounded-lg text-white text-lg font-bold transition transform active:scale-95 flex items-center justify-center gap-2"
                >
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z"></path>
                    </svg>
                    Unirse al grupo
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
        input.addEventListener('input', async (e) => {
            const value = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '');
            e.target.value = value;
            
            if (value && index < codeInputs.length - 1) {
                codeInputs[index + 1].focus();
            }
            
            const groupCode = getGroupCode();
            if (groupCode.length === 6) {
                await checkGroup(groupCode);
            } else {
                hideError();
            }
        });
        
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Backspace' && !e.target.value && index > 0) {
                codeInputs[index - 1].focus();
            }
        });
        
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
            
            const groupCode = getGroupCode();
            if (groupCode.length === 6) {
                await checkGroup(groupCode);
            }
        });
    });
}

function getGroupCode() {
    return codeInputs.map(input => input.value).join('').toUpperCase();
}

function showError(message) {
    const errorDiv = document.getElementById('error-message');
    errorDiv.textContent = message;
    errorDiv.classList.remove('hidden');
}

function hideError() {
    const errorDiv = document.getElementById('error-message');
    errorDiv.classList.add('hidden');
}

async function checkGroup(groupCode) {
    const { data: group, error } = await supabase
        .from('groups')
        .select('*')
        .eq('code', groupCode)
        .single();

    if (error || !group) {
        showError('Grupo no encontrado. Verifica el código.');
        return false;
    }

    hideError();
    return true;
}

function attachEventListeners() {
    document.getElementById('back-btn').addEventListener('click', () => {
        setCurrentView('groups');
    });

    document.getElementById('join-group-btn').addEventListener('click', async () => {
        const groupCode = getGroupCode();
        const state = getState();

        if (groupCode.length !== 6) {
            showError('Por favor, introduce el código completo de 6 caracteres');
            return;
        }

        if (!state.currentUser) {
            showError('Error: No hay usuario autenticado');
            return;
        }

        // Find group by code
        const { data: group, error: groupError } = await supabase
            .from('groups')
            .select('*')
            .eq('code', groupCode)
            .single();

        if (groupError || !group) {
            showError('Grupo no encontrado. Verifica el código.');
            return;
        }

        // Check if already a member
        const { data: existingMember } = await supabase
            .from('group_members')
            .select('*')
            .eq('group_id', group.id)
            .eq('user_id', state.currentUser.id)
            .single();

        if (existingMember) {
            // Already a member, just navigate
            setCurrentGroup(group);
            setCurrentView('group-detail');
            return;
        }

        // Join group with unique default nickname
        const baseName = state.currentUser.display_name || 'Usuario';
        const uniqueNickname = await generateUniqueNickname(group.id, baseName);
        
        const { error: memberError } = await supabase
            .from('group_members')
            .insert({
                group_id: group.id,
                user_id: state.currentUser.id,
                nickname: uniqueNickname
            });

        if (memberError) {
            console.error('Error joining group:', memberError);
            showError('Error al unirse al grupo. Por favor, inténtalo de nuevo.');
            return;
        }

        // Reload groups
        const { data: groups } = await supabase
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

        if (groups) {
            const userGroups = groups.map(gm => gm.groups).filter(Boolean);
            setUserGroups(userGroups);
        }

        setCurrentGroup(group);
        setCurrentView('group-detail');
    });
}
