-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Create roles for PostgREST
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'anon') THEN
    CREATE ROLE anon NOLOGIN NOINHERIT;
  END IF;
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'authenticator') THEN
    CREATE ROLE authenticator NOINHERIT LOGIN PASSWORD 'postgres';
    GRANT anon TO authenticator;
  END IF;
END
$$;

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO anon;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO anon;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO anon;

-- Rooms table
CREATE TABLE rooms (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    is_active BOOLEAN DEFAULT true,
    admin_token TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Drink types table
CREATE TABLE drink_types (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    room_id UUID NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    points INTEGER NOT NULL DEFAULT 1,
    icon TEXT DEFAULT '🥤',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Participants table
CREATE TABLE participants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    room_id UUID NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
    nickname TEXT NOT NULL,
    total_points INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(room_id, nickname)
);

-- Drink events table
CREATE TABLE drink_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    participant_id UUID NOT NULL REFERENCES participants(id) ON DELETE CASCADE,
    drink_type_id UUID NOT NULL REFERENCES drink_types(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Function to update participant total_points
CREATE OR REPLACE FUNCTION update_participant_points()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE participants
    SET total_points = (
        SELECT COALESCE(SUM(dt.points), 0)
        FROM drink_events de
        JOIN drink_types dt ON de.drink_type_id = dt.id
        WHERE de.participant_id = NEW.participant_id
    )
    WHERE id = NEW.participant_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to end competition (validates admin token)
CREATE OR REPLACE FUNCTION end_competition(room_id_param UUID, admin_token_param TEXT)
RETURNS BOOLEAN AS $$
DECLARE
    is_valid BOOLEAN;
BEGIN
    SELECT admin_token = admin_token_param INTO is_valid
    FROM rooms
    WHERE id = room_id_param;
    
    IF is_valid THEN
        UPDATE rooms
        SET is_active = false
        WHERE id = room_id_param;
        RETURN true;
    ELSE
        RETURN false;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to update points on drink event insert
CREATE TRIGGER update_points_on_drink
AFTER INSERT ON drink_events
FOR EACH ROW
EXECUTE FUNCTION update_participant_points();

-- Row Level Security Policies

-- Users table (for authentication - fallback if auth.users doesn't exist)
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email TEXT UNIQUE NOT NULL,
    encrypted_password TEXT NOT NULL,
    display_name TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Groups table
CREATE TABLE groups (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    code TEXT UNIQUE NOT NULL,
    created_by UUID NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    global_ranking_reset_at TIMESTAMPTZ
);

-- Group members table
CREATE TABLE group_members (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
    user_id UUID NOT NULL,
    nickname TEXT, -- Nickname for this specific group (can be different from display_name)
    joined_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(group_id, user_id)
);

-- User global scores table
CREATE TABLE user_global_scores (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
    user_id UUID NOT NULL,
    total_points INTEGER DEFAULT 0,
    last_updated TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(group_id, user_id)
);

-- Modify rooms table to add group_id
ALTER TABLE rooms ADD COLUMN IF NOT EXISTS group_id UUID REFERENCES groups(id) ON DELETE CASCADE;

-- Modify participants table to add user_id
ALTER TABLE participants ADD COLUMN IF NOT EXISTS user_id UUID;

-- Update unique constraint on participants to handle both user_id and nickname
-- Drop old constraint if exists
ALTER TABLE participants DROP CONSTRAINT IF EXISTS participants_room_id_nickname_key;
-- Add new constraint that allows either user_id or nickname to be unique per room
-- We'll handle this with a partial unique index
CREATE UNIQUE INDEX IF NOT EXISTS participants_room_user_unique 
    ON participants(room_id, user_id) 
    WHERE user_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS participants_room_nickname_unique 
    ON participants(room_id, nickname) 
    WHERE user_id IS NULL;

-- Function to generate unique group code
CREATE OR REPLACE FUNCTION generate_group_code()
RETURNS TEXT AS $$
DECLARE
    new_code TEXT;
    code_exists BOOLEAN;
BEGIN
    LOOP
        new_code := UPPER(SUBSTRING(MD5(RANDOM()::TEXT) FROM 1 FOR 6));
        SELECT EXISTS(SELECT 1 FROM groups WHERE code = new_code) INTO code_exists;
        EXIT WHEN NOT code_exists;
    END LOOP;
    RETURN new_code;
END;
$$ LANGUAGE plpgsql;

-- Function to update user global scores when participant points change
CREATE OR REPLACE FUNCTION update_user_global_scores()
RETURNS TRIGGER AS $$
DECLARE
    room_group_id UUID;
    participant_user_id UUID;
BEGIN
    -- Get the group_id from the room and user_id from participant (NEW is the participant row)
    SELECT r.group_id, NEW.user_id INTO room_group_id, participant_user_id
    FROM rooms r
    WHERE r.id = NEW.room_id;
    
    -- Only update if we have both group_id and user_id
    IF room_group_id IS NOT NULL AND participant_user_id IS NOT NULL THEN
        -- Insert or update the global score
        INSERT INTO user_global_scores (group_id, user_id, total_points, last_updated)
        VALUES (
            room_group_id,
            participant_user_id,
            (
                SELECT COALESCE(SUM(p2.total_points), 0)
                FROM participants p2
                JOIN rooms r2 ON p2.room_id = r2.id
                WHERE r2.group_id = room_group_id
                AND p2.user_id = participant_user_id
            ),
            NOW()
        )
        ON CONFLICT (group_id, user_id) 
        DO UPDATE SET 
            total_points = (
                SELECT COALESCE(SUM(p2.total_points), 0)
                FROM participants p2
                JOIN rooms r2 ON p2.room_id = r2.id
                WHERE r2.group_id = room_group_id
                AND p2.user_id = participant_user_id
            ),
            last_updated = NOW();
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to update global scores when participant points change
CREATE TRIGGER update_global_scores_on_participant_update
AFTER UPDATE OF total_points ON participants
FOR EACH ROW
WHEN (OLD.total_points IS DISTINCT FROM NEW.total_points)
EXECUTE FUNCTION update_user_global_scores();

-- Also trigger on insert to initialize scores
CREATE TRIGGER initialize_global_scores_on_participant_insert
AFTER INSERT ON participants
FOR EACH ROW
EXECUTE FUNCTION update_user_global_scores();

-- Function to reset global ranking (only group creator can call this)
CREATE OR REPLACE FUNCTION reset_global_ranking(group_id_param UUID, user_id_param UUID)
RETURNS BOOLEAN AS $$
DECLARE
    is_creator BOOLEAN;
BEGIN
    -- Check if user is the creator of the group
    SELECT created_by = user_id_param INTO is_creator
    FROM groups
    WHERE id = group_id_param;
    
    IF NOT is_creator THEN
        RETURN false;
    END IF;
    
    -- Reset all scores to 0
    UPDATE user_global_scores
    SET total_points = 0,
        last_updated = NOW()
    WHERE group_id = group_id_param;
    
    -- Update reset timestamp
    UPDATE groups
    SET global_ranking_reset_at = NOW()
    WHERE id = group_id_param;
    
    RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE drink_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE drink_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_global_scores ENABLE ROW LEVEL SECURITY;

-- Rooms: Anyone can read, only admin can update
CREATE POLICY "Anyone can read rooms" ON rooms
    FOR SELECT USING (true);

CREATE POLICY "Anyone can insert rooms" ON rooms
    FOR INSERT WITH CHECK (true);

-- Allow updates (we use a function for secure admin updates)
CREATE POLICY "Anyone can update rooms" ON rooms
    FOR UPDATE USING (true);

-- Drink types: Anyone can read, only admin can insert/update
CREATE POLICY "Anyone can read drink_types" ON drink_types
    FOR SELECT USING (true);

-- Allow anyone to insert/update drink_types (admin check done in app)
-- In production, you'd want stricter RLS, but for simplicity we allow it
CREATE POLICY "Anyone can manage drink_types" ON drink_types
    FOR ALL USING (true);

-- Participants: Anyone can read, anyone can insert, allow updates for triggers
CREATE POLICY "Anyone can read participants" ON participants
    FOR SELECT USING (true);

CREATE POLICY "Anyone can insert participants" ON participants
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow updates to participants" ON participants
    FOR UPDATE USING (true);

-- Drink events: Anyone can read, but can only insert if room is active
CREATE POLICY "Anyone can read drink_events" ON drink_events
    FOR SELECT USING (true);

CREATE POLICY "Can only insert drink_events if room is active" ON drink_events
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM participants p
            JOIN rooms r ON p.room_id = r.id
            WHERE p.id = drink_events.participant_id
            AND r.is_active = true
        )
    );

-- RLS Policies for new tables

-- Users: Users can read their own data, anyone can insert (for registration)
CREATE POLICY "Users can read own data" ON users
    FOR SELECT USING (true); -- Simplified for now, can be enhanced with auth.uid()

CREATE POLICY "Anyone can insert users" ON users
    FOR INSERT WITH CHECK (true);

-- Groups: Anyone can read, authenticated users can create, only creator can update
CREATE POLICY "Anyone can read groups" ON groups
    FOR SELECT USING (true);

CREATE POLICY "Authenticated users can create groups" ON groups
    FOR INSERT WITH CHECK (true); -- Will be enhanced with auth check

CREATE POLICY "Only creator can update groups" ON groups
    FOR UPDATE USING (true); -- Simplified for now - validation done in app

-- Group members: Members can read their groups, users can join, only creator can remove
CREATE POLICY "Members can read group members" ON group_members
    FOR SELECT USING (true); -- Simplified for now - validation done in app

CREATE POLICY "Users can join groups" ON group_members
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can update their own nickname" ON group_members
    FOR UPDATE USING (true); -- Simplified for now - validation done in app

CREATE POLICY "Only creator can remove members" ON group_members
    FOR DELETE USING (true); -- Simplified for now - validation done in app

-- User global scores: Members can read scores of their groups
CREATE POLICY "Members can read global scores" ON user_global_scores
    FOR SELECT USING (true); -- Simplified for now - validation done in app

-- Update rooms policies to check group membership
DROP POLICY IF EXISTS "Anyone can read rooms" ON rooms;
CREATE POLICY "Group members can read rooms" ON rooms
    FOR SELECT USING (true); -- Simplified for now - validation done in app

DROP POLICY IF EXISTS "Anyone can insert rooms" ON rooms;
CREATE POLICY "Group members can create rooms" ON rooms
    FOR INSERT WITH CHECK (true); -- Simplified for now - validation done in app

-- Create indexes for performance
CREATE INDEX idx_drink_types_room_id ON drink_types(room_id);
CREATE INDEX idx_participants_room_id ON participants(room_id);
CREATE INDEX idx_drink_events_participant_id ON drink_events(participant_id);
CREATE INDEX idx_drink_events_drink_type_id ON drink_events(drink_type_id);
CREATE INDEX idx_rooms_code ON rooms(code);
CREATE INDEX idx_rooms_group_id ON rooms(group_id);
CREATE INDEX idx_group_members_group_id ON group_members(group_id);
CREATE INDEX idx_group_members_user_id ON group_members(user_id);
CREATE INDEX idx_user_global_scores_group_id ON user_global_scores(group_id);
CREATE INDEX idx_user_global_scores_user_id ON user_global_scores(user_id);
CREATE INDEX idx_groups_code ON groups(code);
CREATE INDEX idx_groups_created_by ON groups(created_by);