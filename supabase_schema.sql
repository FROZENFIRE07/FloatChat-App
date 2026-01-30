-- ARGO Database Schema for Supabase
-- Run this in Supabase SQL Editor first

-- Drop existing tables if they exist
DROP TABLE IF EXISTS argo_profiles CASCADE;
DROP TABLE IF EXISTS argo_floats CASCADE;

-- Create argo_floats table
CREATE TABLE argo_floats (
    float_id TEXT PRIMARY KEY,
    first_timestamp TEXT,
    last_timestamp TEXT,
    last_latitude DOUBLE PRECISION,
    last_longitude DOUBLE PRECISION,
    total_profiles INTEGER
);

-- Create argo_profiles table
CREATE TABLE argo_profiles (
    id BIGINT,
    float_id TEXT,
    timestamp TEXT,
    latitude DOUBLE PRECISION,
    longitude DOUBLE PRECISION,
    depth DOUBLE PRECISION,
    temperature DOUBLE PRECISION,
    salinity DOUBLE PRECISION,
    pressure DOUBLE PRECISION
);

-- Create indexes for better query performance
CREATE INDEX idx_profiles_float_id ON argo_profiles(float_id);
CREATE INDEX idx_profiles_timestamp ON argo_profiles(timestamp);
CREATE INDEX idx_profiles_lat ON argo_profiles(latitude);
CREATE INDEX idx_profiles_lon ON argo_profiles(longitude);
CREATE INDEX idx_profiles_location ON argo_profiles(latitude, longitude);

-- Verify tables created
SELECT table_name FROM information_schema.tables 
WHERE table_name IN ('argo_profiles', 'argo_floats');
