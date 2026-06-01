-- ============================================
-- DDGRS Supabase Database Schema
-- Run this in Supabase SQL Editor
-- ============================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- TABLES
-- ============================================

-- Grievances table
CREATE TABLE IF NOT EXISTS grievances (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  grievance_id TEXT UNIQUE,
  category TEXT NOT NULL CHECK (category IN (
    'Academics - Teaching',
    'Academics - Examination',
    'Academics - Internal Assessment',
    'Office and Administration - Fee',
    'Office and Administration - Scholarships',
    'Office and Administration - Certificates',
    'Behavioral - Bullying / Ragging',
    'Behavioral - Threat / Intimidation',
    'Behavioral - Defamation',
    'Behavioral - Substance Abuse',
    'Behavioral - Sexual / Verbal Harassment',
    'Facilities - Library',
    'Facilities - Canteen',
    'Facilities - Laboratory',
    'Facilities - Computer Lab',
    'Facilities - Counselling Centre',
    'Facilities - Hostel',
    'Facilities - Washroom',
    'Facilities - Sports Amenities',
    'Campus - Cleanliness',
    'Campus - Building',
    'Campus - Electrical / Plumbing'
  )),
  description TEXT NOT NULL,
  is_anonymous BOOLEAN DEFAULT FALSE,
  user_id TEXT,
  user_name TEXT,
  user_role TEXT,
  user_department TEXT,
  image_url TEXT,
  video_url TEXT,
  status TEXT DEFAULT 'Submitted' CHECK (status IN (
    'Submitted', 'Acknowledged', 'Under Review', 'In Progress',
    'Awaiting Confirmation', 'Resolved', 'Closed', 'Rejected'
  )),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Grievance actions table
CREATE TABLE IF NOT EXISTS grievance_actions (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  grievance_id UUID REFERENCES grievances(id) ON DELETE CASCADE,
  admin_name TEXT NOT NULL,
  remarks TEXT,
  new_status TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- AUTO-GENERATE grievance_id (GRV-000001)
-- ============================================

CREATE OR REPLACE FUNCTION generate_grievance_id()
RETURNS TRIGGER AS $$
DECLARE
  next_id INTEGER;
BEGIN
  SELECT COALESCE(MAX(CAST(SUBSTRING(grievance_id FROM 5) AS INTEGER)), 0) + 1
  INTO next_id
  FROM grievances;
  NEW.grievance_id := 'GRV-' || LPAD(next_id::TEXT, 6, '0');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_grievance_id ON grievances;
CREATE TRIGGER set_grievance_id
BEFORE INSERT ON grievances
FOR EACH ROW
WHEN (NEW.grievance_id IS NULL)
EXECUTE FUNCTION generate_grievance_id();

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_grievances_updated_at ON grievances;
CREATE TRIGGER update_grievances_updated_at
BEFORE UPDATE ON grievances
FOR EACH ROW
EXECUTE FUNCTION update_updated_at();

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================

ALTER TABLE grievances ENABLE ROW LEVEL SECURITY;
ALTER TABLE grievance_actions ENABLE ROW LEVEL SECURITY;

-- Allow anon to insert (for WhatsApp bot)
DROP POLICY IF EXISTS "Allow anon insert grievances" ON grievances;
CREATE POLICY "Allow anon insert grievances"
ON grievances FOR INSERT
TO anon
WITH CHECK (true);

-- Allow anon to select (for tracking)
DROP POLICY IF EXISTS "Allow anon select grievances" ON grievances;
CREATE POLICY "Allow anon select grievances"
ON grievances FOR SELECT
TO anon
USING (true);

-- Allow authenticated to do everything
DROP POLICY IF EXISTS "Authenticated full access grievances" ON grievances;
CREATE POLICY "Authenticated full access grievances"
ON grievances FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

DROP POLICY IF EXISTS "Authenticated full access actions" ON grievance_actions;
CREATE POLICY "Authenticated full access actions"
ON grievance_actions FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

-- ============================================
-- INDEXES
-- ============================================

CREATE INDEX IF NOT EXISTS idx_grievances_status ON grievances(status);
CREATE INDEX IF NOT EXISTS idx_grievances_category ON grievances(category);
CREATE INDEX IF NOT EXISTS idx_grievances_created_at ON grievances(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_grievance_actions_grievance_id ON grievance_actions(grievance_id);
