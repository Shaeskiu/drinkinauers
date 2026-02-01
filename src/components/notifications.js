// Sistema de notificaciones toast mobile-first

let toastContainer = null;
let toastIdCounter = 0;

// Inicializar contenedor de toasts
function initToastContainer() {
    if (!toastContainer) {
        toastContainer = document.getElementById('toast-container');
        if (!toastContainer) {
            toastContainer = document.createElement('div');
            toastContainer.id = 'toast-container';
            toastContainer.className = 'fixed top-0 left-0 right-0 z-50 pointer-events-none px-4 pt-4 sm:pt-6';
            document.body.appendChild(toastContainer);
        }
    }
    return toastContainer;
}

// Tipos de toast y sus estilos
const toastTypes = {
    success: {
        bg: 'bg-green-600',
        border: 'border-green-500',
        icon: '✓'
    },
    error: {
        bg: 'bg-red-600',
        border: 'border-red-500',
        icon: '✕'
    },
    info: {
        bg: 'bg-blue-600',
        border: 'border-blue-500',
        icon: 'ℹ'
    },
    warning: {
        bg: 'bg-yellow-600',
        border: 'border-yellow-500',
        icon: '⚠'
    }
};

/**
 * Muestra una notificación toast
 * @param {string} message - Mensaje a mostrar
 * @param {string} type - Tipo de toast: 'success', 'error', 'info', 'warning'
 * @param {number} duration - Duración en milisegundos (default: 4000)
 */
export function showToast(message, type = 'info', duration = 4000) {
    initToastContainer();
    
    const toastId = `toast-${toastIdCounter++}`;
    const toastType = toastTypes[type] || toastTypes.info;
    
    // Crear elemento toast
    const toast = document.createElement('div');
    toast.id = toastId;
    toast.className = `toast-notification mb-3 max-w-md mx-auto w-full bg-gray-800 ${toastType.border} border-l-4 rounded-lg shadow-lg pointer-events-auto transform transition-all duration-300 ease-out opacity-0 translate-y-[-20px]`;
    
    toast.innerHTML = `
        <div class="flex items-start gap-3 p-4">
            <div class="flex-shrink-0 w-8 h-8 ${toastType.bg} rounded-full flex items-center justify-center text-white font-bold text-sm">
                ${toastType.icon}
            </div>
            <div class="flex-1 min-w-0">
                <p class="text-white text-sm font-medium leading-relaxed break-words">${message}</p>
            </div>
            <button 
                class="toast-close flex-shrink-0 w-11 h-11 min-w-[44px] min-h-[44px] flex items-center justify-center text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition-colors touch-manipulation"
                aria-label="Cerrar"
            >
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                </svg>
            </button>
        </div>
    `;
    
    // Agregar al contenedor
    toastContainer.appendChild(toast);
    
    // Animar entrada
    requestAnimationFrame(() => {
        toast.classList.remove('opacity-0', 'translate-y-[-20px]');
        toast.classList.add('opacity-100', 'translate-y-0');
    });
    
    // Función para cerrar
    const closeToast = () => {
        toast.classList.remove('opacity-100', 'translate-y-0');
        toast.classList.add('opacity-0', 'translate-y-[-20px]');
        setTimeout(() => {
            if (toast.parentNode) {
                toast.parentNode.removeChild(toast);
            }
        }, 300);
    };
    
    // Botón de cierre
    const closeBtn = toast.querySelector('.toast-close');
    closeBtn.addEventListener('click', closeToast);
    
    // Auto-cierre
    if (duration > 0) {
        const timeoutId = setTimeout(closeToast, duration);
        // Pausar auto-cierre al hacer hover (solo en desktop)
        toast.addEventListener('mouseenter', () => clearTimeout(timeoutId));
    }
    
    return toastId;
}

// Funciones helper para facilitar el uso
export const toast = {
    success: (message, duration) => showToast(message, 'success', duration),
    error: (message, duration) => showToast(message, 'error', duration),
    info: (message, duration) => showToast(message, 'info', duration),
    warning: (message, duration) => showToast(message, 'warning', duration)
};
