import { signIn, signUp } from '../supabase.js';
import { setCurrentUser, setCurrentView } from '../state.js';

export function render() {
    const app = document.getElementById('app');
    app.innerHTML = `
        <div class="min-h-screen bg-gray-900 text-white flex items-center justify-center px-4">
            <div class="w-full max-w-md bg-gray-800 rounded-2xl shadow-2xl p-8">
                <!-- Header -->
                <div class="text-center mb-8">
                    <div class="flex justify-center mb-4">
                        <div class="w-20 h-20 rounded-full border-4 border-orange-500 flex items-center justify-center bg-orange-500/10">
                            <span class="text-4xl">🍷🏆</span>
                        </div>
                    </div>
                    <h1 class="text-3xl font-bold mb-2">Copas & Competición</h1>
                    <p class="text-gray-400">Inicia sesión o regístrate para continuar</p>
                </div>

                <!-- Error message -->
                <div id="error-message" class="hidden mb-4 p-3 bg-red-500/20 border border-red-500 rounded-lg text-red-400 text-sm"></div>

                <!-- Login Form -->
                <form id="login-form" class="space-y-4">
                    <div>
                        <label class="block text-sm font-semibold text-gray-400 uppercase mb-2">Email</label>
                        <input 
                            type="email" 
                            id="email-input" 
                            required
                            placeholder="tu@email.com"
                            class="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                        />
                    </div>
                    <div>
                        <label class="block text-sm font-semibold text-gray-400 uppercase mb-2">Contraseña</label>
                        <input 
                            type="password" 
                            id="password-input" 
                            required
                            placeholder="••••••••"
                            class="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                        />
                    </div>
                    <button 
                        type="submit"
                        class="w-full py-3 bg-orange-500 hover:bg-orange-600 active:bg-orange-700 rounded-lg text-white text-lg font-bold transition transform active:scale-95"
                    >
                        Iniciar Sesión
                    </button>
                </form>

                <div class="my-6 flex items-center">
                    <div class="flex-1 border-t border-gray-700"></div>
                    <span class="px-4 text-sm text-gray-500">o</span>
                    <div class="flex-1 border-t border-gray-700"></div>
                </div>

                <!-- Sign Up Form -->
                <form id="signup-form" class="space-y-4">
                    <div>
                        <label class="block text-sm font-semibold text-gray-400 uppercase mb-2">Nombre</label>
                        <input 
                            type="text" 
                            id="signup-name-input" 
                            required
                            placeholder="Tu nombre o apodo"
                            class="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                        />
                        <p class="text-xs text-gray-500 mt-1">Este será tu nombre en la aplicación</p>
                    </div>
                    <div>
                        <label class="block text-sm font-semibold text-gray-400 uppercase mb-2">Email</label>
                        <input 
                            type="email" 
                            id="signup-email-input" 
                            required
                            placeholder="tu@email.com"
                            class="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                        />
                    </div>
                    <div>
                        <label class="block text-sm font-semibold text-gray-400 uppercase mb-2">Contraseña</label>
                        <input 
                            type="password" 
                            id="signup-password-input" 
                            required
                            minlength="6"
                            placeholder="Mínimo 6 caracteres"
                            class="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                        />
                    </div>
                    <button 
                        type="submit"
                        class="w-full py-3 bg-gray-700 hover:bg-gray-600 border-2 border-orange-500 rounded-lg text-orange-500 text-lg font-bold transition transform active:scale-95"
                    >
                        Registrarse
                    </button>
                </form>
            </div>
        </div>
    `;

    attachEventListeners();
}

function attachEventListeners() {
    const loginForm = document.getElementById('login-form');
    const signupForm = document.getElementById('signup-form');
    const errorMessage = document.getElementById('error-message');

    function showError(message) {
        errorMessage.textContent = message;
        errorMessage.classList.remove('hidden');
        setTimeout(() => {
            errorMessage.classList.add('hidden');
        }, 5000);
    }

    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('email-input').value;
        const password = document.getElementById('password-input').value;

        const { data: user, error } = await signIn(email, password);
        
        if (error) {
            showError(error.message || 'Error al iniciar sesión');
            return;
        }

        if (user) {
            setCurrentUser(user);
            setCurrentView('groups');
        }
    });

    signupForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const displayName = document.getElementById('signup-name-input').value.trim();
        const email = document.getElementById('signup-email-input').value;
        const password = document.getElementById('signup-password-input').value;

        if (!displayName) {
            showError('Por favor, introduce un nombre');
            return;
        }

        if (password.length < 6) {
            showError('La contraseña debe tener al menos 6 caracteres');
            return;
        }

        const { data: user, error } = await signUp(email, password, displayName);
        
        if (error) {
            if (error.code === '23505') { // Unique constraint violation
                showError('Este email ya está registrado');
            } else {
                showError('Error al registrarse. Por favor, inténtalo de nuevo.');
            }
            return;
        }

        if (user) {
            setCurrentUser(user);
            setCurrentView('groups');
        }
    });
}
