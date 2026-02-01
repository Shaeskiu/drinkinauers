import { subscribe, setCurrentView, loadAdminToken, loadCurrentUser, getState } from './state.js';
import { render as renderHome } from './views/home.js';
import { render as renderLogin } from './views/login.js';
import { render as renderGroups } from './views/groups.js';
import { render as renderCreateGroup } from './views/create-group.js';
import { render as renderJoinGroup } from './views/join-group.js';
import { render as renderGroupDetail } from './views/group-detail.js';
import { render as renderCreateRoom } from './views/create-room.js';
import { render as renderJoinRoom } from './views/join-room.js';
import { render as renderRoom, cleanup as cleanupRoom, loadInitialParticipants } from './views/room.js';
import { render as renderFinished } from './views/finished.js';
// Importar componentes de notificaciones y modales
import { toast } from './components/notifications.js';
import { showConfirm } from './components/confirm-modal.js';

// Hacer disponibles globalmente para fácil acceso
window.toast = toast;
window.showConfirm = showConfirm;

// Load admin token and current user from localStorage
loadAdminToken();
loadCurrentUser();

let currentRenderedView = null;

// Track if we're already in a view to prevent unnecessary re-renders
let lastRenderedView = null;
let isRenderingView = false;

// Subscribe to state changes and render appropriate view
subscribe((state) => {
    // Check if view actually changed
    const viewChanged = lastRenderedView !== state.currentView;
    
    // Debug log
    if (viewChanged) {
        console.log('[app.js] View changed from', lastRenderedView, 'to', state.currentView);
        console.log('[app.js] State at view change:', {
            currentView: state.currentView,
            hasCurrentRoom: !!state.currentRoom,
            currentRoomId: state.currentRoom?.id,
            hasDrinkTypes: !!state.drinkTypes,
            drinkTypesCount: state.drinkTypes?.length || 0,
            hasCurrentGroup: !!state.currentGroup,
            currentGroupId: state.currentGroup?.id
        });
    } else {
        console.log('[app.js] State change notification (view unchanged):', {
            currentView: state.currentView,
            isRenderingView: isRenderingView,
            hasCurrentRoom: !!state.currentRoom,
            currentRoomId: state.currentRoom?.id
        });
    }
    
    // If view didn't change and we're already rendering, skip
    if (!viewChanged && isRenderingView) {
        console.log('[app.js] Skipping: view unchanged and already rendering');
        return;
    }
    
    // Only skip re-render for room view if we're already in room view and view didn't change
    if (!viewChanged && state.currentView === 'room') {
        console.log('[app.js] Skipping: already in room view and view unchanged');
        // For room view, don't re-render on every state change
        // The leaderboard will be updated separately when needed
        return;
    }
    
    // For groups view, only skip if view didn't change AND we're not currently rendering
    if (!viewChanged && state.currentView === 'groups' && isRenderingView) {
        console.log('[app.js] Skipping: already in groups view and rendering');
        return;
    }
    
    // If view changed, we MUST render (even if currently rendering)
    // This ensures navigation always works
    isRenderingView = true;
    console.log('[app.js] Starting render, isRenderingView set to true');
    
    // Cleanup previous view if switching away from room
    if (currentRenderedView === 'room' && state.currentView !== 'room') {
        console.log('[app.js] WARNING: Switching away from room view!');
        console.log('[app.js] Previous view was room, new view is:', state.currentView);
        console.log('[app.js] State at switch:', {
            currentView: state.currentView,
            hasCurrentRoom: !!state.currentRoom,
            currentRoomId: state.currentRoom?.id,
            hasDrinkTypes: !!state.drinkTypes,
            drinkTypesCount: state.drinkTypes?.length || 0
        });
        console.log('[app.js] Cleaning up room view');
        cleanupRoom();
    }
    
    // Store the previous view before updating
    const previousView = lastRenderedView;
    currentRenderedView = state.currentView;
    lastRenderedView = state.currentView;

    // Render current view
    switch (state.currentView) {
        case 'home':
            renderHome();
            break;
        case 'login':
            renderLogin();
            break;
        case 'groups':
            renderGroups().catch(console.error);
            break;
        case 'create-group':
            renderCreateGroup().catch(console.error);
            break;
        case 'join-group':
            renderJoinGroup();
            break;
        case 'group-detail':
            console.log('[app.js] Calling renderGroupDetail()');
            renderGroupDetail().catch((error) => {
                console.error('[app.js] Error rendering group-detail:', error);
            });
            break;
        case 'create-room':
            renderCreateRoom();
            break;
        case 'join-room':
            renderJoinRoom();
            break;
        case 'room':
            console.log('[app.js] Rendering room view, previousView:', previousView);
            renderRoom();
            // Load participants only when entering the room view (not on every state change)
            if (previousView !== 'room') {
                console.log('[app.js] Loading initial participants');
                loadInitialParticipants();
            }
            break;
        case 'finished':
            renderFinished().catch(console.error);
            break;
        default:
            renderHome();
    }
    
    // Use setTimeout to allow render to complete before allowing next render
    setTimeout(() => {
        console.log('[app.js] Render complete, isRenderingView set to false');
        isRenderingView = false;
    }, 0);
});

// Initial render - check authentication and redirect
const state = getState();
if (!state.currentUser) {
    setCurrentView('login');
} else {
    setCurrentView('groups');
}
