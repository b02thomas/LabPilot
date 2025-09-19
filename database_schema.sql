-- LabPilot Database Schema
-- PostgreSQL 16

-- Create uuid extension if not exists
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table
CREATE TABLE IF NOT EXISTS users (
    id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::text,
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    name VARCHAR(255) NOT NULL,
    role VARCHAR(50) DEFAULT 'analyst' CHECK (role IN ('admin', 'lab_manager', 'technician', 'analyst')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Projects table
CREATE TABLE IF NOT EXISTS projects (
    id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::text,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'completed', 'on_hold', 'archived')),
    client_name VARCHAR(255),
    client_contact VARCHAR(255),
    deadline DATE,
    created_by VARCHAR(36) NOT NULL REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Reports table for storing data agent JSON output
CREATE TABLE IF NOT EXISTS reports (
    id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::text,
    experiment_id VARCHAR(36) NOT NULL,
    project_id VARCHAR(36) REFERENCES projects(id) ON DELETE CASCADE,
    user_id VARCHAR(36) NOT NULL REFERENCES users(id),
    title VARCHAR(255) NOT NULL,
    summary TEXT,
    full_analysis JSONB NOT NULL,  -- Complete JSON output from data agent
    flags JSONB,                    -- Array of analysis flags
    recommendations JSONB,          -- Array of recommendations
    status VARCHAR(50) DEFAULT 'draft' CHECK (status IN ('draft', 'review', 'approved', 'rejected')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Create indexes for better performance
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_projects_status ON projects(status);
CREATE INDEX idx_projects_created_by ON projects(created_by);
CREATE INDEX idx_reports_experiment_id ON reports(experiment_id);
CREATE INDEX idx_reports_project_id ON reports(project_id);
CREATE INDEX idx_reports_user_id ON reports(user_id);
CREATE INDEX idx_reports_status ON reports(status);

-- Create a trigger to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply the trigger to all tables
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_projects_updated_at BEFORE UPDATE ON projects
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_reports_updated_at BEFORE UPDATE ON reports
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Sample data for testing
INSERT INTO users (id, email, password, name, role) VALUES 
('550e8400-e29b-41d4-a716-446655440001', 'admin@labpilot.com', '$2b$10$YourHashedPasswordHere', 'Admin User', 'admin'),
('550e8400-e29b-41d4-a716-446655440002', 'analyst@labpilot.com', '$2b$10$YourHashedPasswordHere', 'Test Analyst', 'analyst')
ON CONFLICT (id) DO NOTHING;

INSERT INTO projects (id, name, description, status, created_by) VALUES
('650e8400-e29b-41d4-a716-446655440001', 'Sample Chemistry Analysis', 'Initial test project for chemical compound analysis', 'active', '550e8400-e29b-41d4-a716-446655440001')
ON CONFLICT (id) DO NOTHING;