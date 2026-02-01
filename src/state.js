// Application state management
let currentState = {
    currentView: 'home', // 'home' | 'login' | 'groups' | 'create-group' | 'join-group' | 'group-detail' | 'create-room' | 'join-room' | 'room' | 'finished'
    currentUser: null,
    currentGroup: null,
    userGroups: [],
    currentRoom: null,
    currentParticipant: null,
    adminToken: null,
    drinkTypes: [],
    participants: [],
    isAdmin: false,
    isGroupAdmin: false
};

// State getters
export function getState() {
    return { ...currentState };
}

// State setters
export function setCurrentView(view) {
    currentState.currentView = view;
    notifyListeners();
}

export function setCurrentRoom(room) {
    currentState.currentRoom = room;
    if (!batchUpdates) {
        notifyListeners();
    } else {
        pendingNotifications = true;
    }
}

export function setCurrentParticipant(participant) {
    currentState.currentParticipant = participant;
    notifyListeners();
}

export function setAdminToken(token) {
    currentState.adminToken = token;
    if (token) {
        localStorage.setItem('admin_token', token);
    } else {
        localStorage.removeItem('admin_token');
    }
    updateAdminStatus();
    notifyListeners();
}

export function setDrinkTypes(drinkTypes) {
    currentState.drinkTypes = drinkTypes;
    if (!batchUpdates) {
        notifyListeners();
    } else {
        pendingNotifications = true;
    }
}

export function setParticipants(participants) {
    currentState.participants = participants;
    notifyListeners();
}

// Update participants without triggering listeners (for internal updates)
export function updateParticipantsSilently(participants) {
    currentState.participants = participants;
    // Don't call notifyListeners() to avoid re-render loops
}

export function setCurrentUser(user) {
    currentState.currentUser = user;
    if (user) {
        localStorage.setItem('current_user', JSON.stringify(user));
    } else {
        localStorage.removeItem('current_user');
    }
    notifyListeners();
}

export function setCurrentGroup(group) {
    currentState.currentGroup = group;
    updateGroupAdminStatus();
    notifyListeners();
}

export function setUserGroups(groups) {
    // Only update if groups actually changed to avoid unnecessary re-renders
    const currentGroups = currentState.userGroups;
    
    // Deep comparison to check if groups really changed
    let groupsChanged = true;
    if (currentGroups && currentGroups.length === groups.length) {
        const currentIds = new Set(currentGroups.map(g => g.id).sort());
        const newIds = new Set(groups.map(g => g.id).sort());
        groupsChanged = currentIds.size !== newIds.size || 
            Array.from(currentIds).some(id => !newIds.has(id));
    }
    
    currentState.userGroups = groups;
    
    // Only notify if groups actually changed
    if (groupsChanged) {
        notifyListeners();
    }
}

export function updateAdminStatus() {
    if (currentState.currentRoom && currentState.adminToken) {
        currentState.isAdmin = currentState.currentRoom.admin_token === currentState.adminToken;
    } else {
        currentState.isAdmin = false;
    }
    notifyListeners();
}

export function updateGroupAdminStatus() {
    if (currentState.currentGroup && currentState.currentUser) {
        currentState.isGroupAdmin = currentState.currentGroup.created_by === currentState.currentUser.id;
    } else {
        currentState.isGroupAdmin = false;
    }
    notifyListeners();
}

// Load admin token from localStorage
export function loadAdminToken() {
    const token = localStorage.getItem('admin_token');
    if (token) {
        currentState.adminToken = token;
        // Don't update admin status here - it will be updated when setRoomState is called
        // This avoids unnecessary notifications
    }
}

// Load current user from localStorage
export function loadCurrentUser() {
    const userStr = localStorage.getItem('current_user');
    if (userStr) {
        try {
            currentState.currentUser = JSON.parse(userStr);
        } catch (e) {
            currentState.currentUser = null;
        }
    }
}

// Clear state (for logout/reset)
export function clearState() {
    currentState = {
        currentView: 'home',
        currentUser: null,
        currentGroup: null,
        userGroups: [],
        currentRoom: null,
        currentParticipant: null,
        adminToken: null,
        drinkTypes: [],
        participants: [],
        isAdmin: false,
        isGroupAdmin: false
    };
    localStorage.removeItem('admin_token');
    localStorage.removeItem('current_user');
    notifyListeners();
}

// Listeners for state changes
const listeners = [];

export function subscribe(listener) {
    listeners.push(listener);
    return () => {
        const index = listeners.indexOf(listener);
        if (index > -1) {
            listeners.splice(index, 1);
        }
    };
}

function notifyListeners() {
    listeners.forEach(listener => listener(getState()));
}

// Batch state updates - set multiple values without notifying until all are set
let batchUpdates = false;
let pendingNotifications = false;

export function startBatchUpdate() {
    batchUpdates = true;
    pendingNotifications = false;
}

export function endBatchUpdate() {
    batchUpdates = false;
    if (pendingNotifications) {
        notifyListeners();
        pendingNotifications = false;
    }
}

export function setRoomState(room, drinkTypes) {
    console.log('[state.js] setRoomState called:', {
        roomId: room?.id,
        roomName: room?.name,
        drinkTypesCount: drinkTypes?.length || 0
    });
    startBatchUpdate();
    currentState.currentRoom = room;
    currentState.drinkTypes = drinkTypes;
    // Update admin status within batch update to avoid extra notifications
    if (currentState.currentRoom && currentState.adminToken) {
        currentState.isAdmin = currentState.currentRoom.admin_token === currentState.adminToken;
    } else {
        currentState.isAdmin = false;
    }
    console.log('[state.js] State updated in batch:', {
        hasCurrentRoom: !!currentState.currentRoom,
        currentRoomId: currentState.currentRoom?.id,
        hasDrinkTypes: !!currentState.drinkTypes,
        drinkTypesCount: currentState.drinkTypes?.length || 0,
        isAdmin: currentState.isAdmin
    });
    endBatchUpdate();
    console.log('[state.js] Batch update ended, listeners notified');
}
