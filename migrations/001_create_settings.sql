-- Settings table for admin panel configuration
-- This stores general site settings (non-sensitive data only)
-- Sensitive data (API keys, credentials) remain in .env

CREATE TABLE IF NOT EXISTS settings (
  id INTEGER PRIMARY KEY DEFAULT 1 CHECK (id = 1), -- Single row constraint
  
  -- General
  site_name TEXT NOT NULL DEFAULT '4CIMA',
  site_description TEXT,
  
  -- Features
  maintenance_mode BOOLEAN DEFAULT FALSE,
  registration_open BOOLEAN DEFAULT TRUE,
  
  -- Metadata
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Insert default row
INSERT OR IGNORE INTO settings (id, site_name, site_description)
VALUES (1, '4CIMA', 'موقع 4CIMA لمشاهدة أحدث الأفلام والمسلسلات المترجمة والمدبلجة بجودة عالية.');
