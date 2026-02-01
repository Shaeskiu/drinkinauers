// Modal de confirmación mobile-first

let modalContainer = null;
let currentModal = null;

// Inicializar contenedor de modales
function initModalContainer() {
    if (!modalContainer) {
        modalContainer = document.getElementById('modal-container');
        if (!modalContainer) {
            modalContainer = document.createElement('div');
            modalContainer.id = 'modal-container';
            modalContainer.className = 'fixed inset-0 z-50 hidden';
            document.body.appendChild(modalContainer);
        }
    }
    return modalContainer;
}

/**
 * Muestra un modal de confirmación
 * @param {string} title - Título del modal
 * @param {string} message - Mensaje a mostrar
 * @param {Object} options - Opciones adicionales
 * @param {string} options.confirmText - Texto del botón de confirmar (default: 'Aceptar')
 * @param {string} options.cancelText - Texto del botón de cancelar (default: 'Cancelar')
 * @param {string} options.confirmColor - Color del botón de confirmar: 'orange', 'red', 'green' (default: 'orange')
 * @returns {Promise<boolean>} - Promise que se resuelve con true si se confirma, false si se cancela
 */
// Función helper para cerrar modal programáticamente
function closeExistingModal() {
    if (currentModal) {
        currentModal.closeModal(false);
        document.removeEventListener('keydown', currentModal.handleEscape);
        currentModal = null;
    }
}

export function showConfirm(title, message, options = {}) {
    initModalContainer();
    
    // Cerrar modal anterior si existe
    closeExistingModal();
    
    const {
        confirmText = 'Aceptar',
        cancelText = 'Cancelar',
        confirmColor = 'orange'
    } = options;
    
    const confirmColorClasses = {
        orange: 'bg-orange-500 hover:bg-orange-600 active:bg-orange-700',
        red: 'bg-red-600 hover:bg-red-700 active:bg-red-800',
        green: 'bg-green-600 hover:bg-green-700 active:bg-green-800'
    };
    
    const confirmBtnClass = confirmColorClasses[confirmColor] || confirmColorClasses.orange;
    
    return new Promise((resolve) => {
        // Crear backdrop
        const backdrop = document.createElement('div');
        backdrop.className = 'fixed inset-0 bg-black/70 backdrop-blur-sm transition-opacity duration-300 opacity-0';
        backdrop.id = 'modal-backdrop';
        
        // Crear modal
        const modal = document.createElement('div');
        modal.className = 'modal-dialog fixed inset-0 flex items-center justify-center p-4 pointer-events-none';
        modal.id = 'confirm-modal';
        
        modal.innerHTML = `
            <div class="modal-content bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md transform transition-all duration-300 scale-95 opacity-0 pointer-events-auto border border-gray-700">
                <div class="p-6">
                    <h2 class="text-xl font-bold text-white mb-3">${title}</h2>
                    <p class="text-gray-300 text-base leading-relaxed mb-6">${message}</p>
                    <div class="flex flex-col-reverse sm:flex-row gap-3 sm:justify-end">
                        <button 
                            id="modal-cancel-btn"
                            class="modal-btn-cancel w-full sm:w-auto min-h-[48px] px-6 py-3 bg-gray-700 hover:bg-gray-600 active:bg-gray-500 rounded-lg text-white font-semibold text-base transition transform active:scale-95 touch-manipulation"
                        >
                            ${cancelText}
                        </button>
                        <button 
                            id="modal-confirm-btn"
                            class="modal-btn-confirm w-full sm:w-auto min-h-[48px] px-6 py-3 ${confirmBtnClass} rounded-lg text-white font-semibold text-base transition transform active:scale-95 touch-manipulation"
                        >
                            ${confirmText}
                        </button>
                    </div>
                </div>
            </div>
        `;
        
        // Agregar al contenedor
        modalContainer.appendChild(backdrop);
        modalContainer.appendChild(modal);
        modalContainer.classList.remove('hidden');
        
        // Animar entrada
        requestAnimationFrame(() => {
            backdrop.classList.remove('opacity-0');
            backdrop.classList.add('opacity-100');
            
            const content = modal.querySelector('.modal-content');
            content.classList.remove('scale-95', 'opacity-0');
            content.classList.add('scale-100', 'opacity-100');
        });
        
        // Función para cerrar
        const closeModal = (result) => {
            const content = modal.querySelector('.modal-content');
            backdrop.classList.remove('opacity-100');
            backdrop.classList.add('opacity-0');
            content.classList.remove('scale-100', 'opacity-100');
            content.classList.add('scale-95', 'opacity-0');
            
            setTimeout(() => {
                if (backdrop.parentNode) backdrop.parentNode.removeChild(backdrop);
                if (modal.parentNode) modal.parentNode.removeChild(modal);
                modalContainer.classList.add('hidden');
                currentModal = null;
                resolve(result);
            }, 300);
        };
        
        // Event listeners
        const confirmBtn = modal.querySelector('#modal-confirm-btn');
        const cancelBtn = modal.querySelector('#modal-cancel-btn');
        
        confirmBtn.addEventListener('click', () => closeModal(true));
        cancelBtn.addEventListener('click', () => closeModal(false));
        
        // Cerrar al hacer clic en el backdrop
        backdrop.addEventListener('click', (e) => {
            if (e.target === backdrop) {
                closeModal(false);
            }
        });
        
        // Cerrar con Escape
        const handleEscape = (e) => {
            if (e.key === 'Escape') {
                closeModal(false);
                document.removeEventListener('keydown', handleEscape);
            }
        };
        document.addEventListener('keydown', handleEscape);
        
        currentModal = { modal, backdrop, closeModal, handleEscape };
    });
}

// Función helper para cerrar modal programáticamente (exportada)
export function closeModal() {
    closeExistingModal();
}
