import { getState, setCurrentView } from '../state.js';

export function render() {
    const state = getState();
    
    // Redirect based on authentication
    if (!state.currentUser) {
        setCurrentView('login');
        return;
    } else {
        setCurrentView('groups');
        return;
    }
    
    const app = document.getElementById('app');
    app.innerHTML = `
        <div class="h-screen bg-gray-900 flex justify-center px-4">
            <div class="w-full max-w-md bg-gray-900 rounded-2xl shadow-2xl overflow-hidden flex flex-col h-full">
                <!-- Header -->
                <div class="flex items-center justify-between px-6 py-4 border-b border-gray-800">
                    <div class="flex items-center gap-2">
                        <span class="text-2xl">🍷🏆</span>
                        <h1 class="text-lg font-bold text-white">Copas & Competición</h1>
                    </div>
                    <button class="text-gray-400 hover:text-white">
                        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"></path>
                        </svg>
                    </button>
                </div>

                <!-- Main Content -->
                <div class="px-6 py-8 text-center flex-1 flex flex-col justify-center">
                    <!-- Trophy Icon -->
                    <div class="mb-6 flex justify-center">
                        <div class="w-32 h-32 rounded-full border-4 border-yellow-500 flex items-center justify-center bg-yellow-500/10">
                            <span class="text-6xl">🏆</span>
                        </div>
                    </div>

                    <!-- Question -->
                    <h2 class="text-3xl font-bold text-white mb-4">
                        ¿Listos para la competición?
                    </h2>

                    <!-- Description -->
                    <p class="text-gray-400 text-base mb-8 px-4">
                        La noche es joven. Elige tu modo de juego y que empiece el rastreo.
                    </p>

                    <!-- Action Buttons -->
                    <div class="space-y-4">
                        <!-- Create Room Button -->
                        <button 
                            id="create-room-btn" 
                            class="w-full py-4 bg-orange-500 hover:bg-orange-600 active:bg-orange-700 rounded-lg text-white text-lg font-bold transition transform active:scale-95 flex items-center justify-center gap-2"
                        >
                            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path>
                            </svg>
                            CREAR NUEVA SALA
                        </button>

                        <!-- Join Room Button -->
                        <button 
                            id="join-room-btn" 
                            class="w-full py-3 bg-gray-900 border-2 border-yellow-500 hover:bg-gray-800 rounded-lg text-yellow-500 font-semibold transition flex items-center justify-center gap-2"
                        >
                            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"></path>
                            </svg>
                            UNIRSE A UNA SALA
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `;

    attachEventListeners();
}

function attachEventListeners() {
    document.getElementById('create-room-btn').addEventListener('click', () => {
        setCurrentView('create-room');
    });

    document.getElementById('join-room-btn').addEventListener('click', () => {
        setCurrentView('join-room');
    });
}
