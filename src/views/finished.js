import { getState, setCurrentView } from '../state.js';
import { supabase } from '../supabase.js';

export async function render() {
    const state = getState();
    const app = document.getElementById('app');
    
    // Load participants if not available
    let participants = state.participants;
    if (!participants || participants.length === 0) {
        if (state.currentRoom) {
            const { data, error } = await supabase
                .from('participants')
                .select('*')
                .eq('room_id', state.currentRoom.id)
                .order('total_points', { ascending: false });
            
            if (!error && data) {
                participants = data;
            }
        }
    }
    
    // Get winner (participant with most points)
    const sortedParticipants = [...(participants || [])].sort((a, b) => b.total_points - a.total_points);
    const winner = sortedParticipants[0];
    const otherParticipants = sortedParticipants.slice(1);
    
    // Roles for participants
    function getRole(rank, total) {
        if (rank === 1) return 'Campeón';
        if (rank === 2) return 'Finalista';
        if (rank === 3) return 'Podio';
        return 'Participante';
    }

    app.innerHTML = `
        <div class="min-h-screen bg-gray-900 text-white pb-6">
            <!-- Header -->
            <div class="flex items-center gap-4 px-4 pt-4 pb-6">
                <div class="text-3xl">🏆</div>
                <h1 class="text-xl font-bold">Competición finalizada</h1>
            </div>

            <div class="px-4 space-y-6">
                ${winner ? `
                    <!-- Ganador destacado -->
                    <div class="bg-gradient-to-br from-orange-500/20 to-orange-600/10 border border-orange-500 rounded-xl p-6">
                        <div class="flex flex-col items-center text-center">
                            <div class="relative mb-4">
                                <div class="w-24 h-24 bg-gray-700 rounded-full flex items-center justify-center text-4xl mb-2">
                                    👤
                                </div>
                                <div class="absolute -top-2 -right-2 text-3xl">👑</div>
                            </div>
                            <h2 class="text-2xl font-bold mb-1">1º Lugar: ${winner.nickname}</h2>
                            <p class="text-gray-400 mb-4">${winner.total_points} ${winner.total_points === 1 ? 'Punto' : 'Puntos'} • ${getRole(1, sortedParticipants.length)}</p>
                            <button class="px-6 py-2 bg-orange-500 text-white font-bold rounded-lg">
                                ¡GANADOR!
                            </button>
                        </div>
                    </div>
                ` : ''}

                <!-- Resultados finales -->
                <div>
                    <div class="flex justify-between items-center mb-4">
                        <label class="block text-xs font-semibold text-gray-400 uppercase">Resultados finales</label>
                        <span class="px-3 py-1 bg-orange-500 text-white text-xs font-bold rounded-full">SESIÓN FINALIZADA</span>
                    </div>
                    <div id="final-results" class="space-y-2">
                        ${otherParticipants.map((p, index) => {
                            const rank = index + 2;
                            return `
                                <div class="flex justify-between items-center p-3 bg-gray-800 border border-gray-700 rounded-lg">
                                    <div class="flex items-center gap-3">
                                        <span class="text-lg font-bold w-8">${rank}º</span>
                                        <div>
                                            <span class="text-base font-semibold">${p.nickname}</span>
                                            <span class="text-xs text-gray-400 block">${getRole(rank, sortedParticipants.length)}</span>
                                        </div>
                                    </div>
                                    <span class="text-sm text-gray-400">${p.total_points} ${p.total_points === 1 ? 'PT' : 'PTS'}</span>
                                </div>
                            `;
                        }).join('')}
                    </div>
                </div>

                <!-- Botón Salir -->
                <button 
                    id="exit-room-btn" 
                    class="w-full py-4 bg-gray-800 border border-gray-700 hover:bg-gray-750 rounded-lg text-white font-medium transition flex items-center justify-center gap-2"
                >
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"></path>
                    </svg>
                    Salir de la sala
                </button>
            </div>
        </div>
    `;

    attachEventListeners();
}

function attachEventListeners() {
    document.getElementById('exit-room-btn').addEventListener('click', () => {
        const state = getState();
        if (state.currentGroup) {
            setCurrentView('group-detail');
        } else {
            setCurrentView('groups');
        }
    });
}
