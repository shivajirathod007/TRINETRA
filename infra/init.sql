-- TRINETRA — PostgreSQL initialization
-- Runs once when the container is first created

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";  -- for fast text search on domains

-- Grant all privileges to app user
GRANT ALL PRIVILEGES ON DATABASE trinetra TO trinetra;
