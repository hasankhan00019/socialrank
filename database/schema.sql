
-- SociaLearn Index Database Schema
-- Generated: 2025-10-04 06:19:06

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table (Admin dashboard users)
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    name VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL DEFAULT 'analyst', -- super_admin, admin, editor, analyst
    permissions JSONB DEFAULT '{}',
    is_active BOOLEAN DEFAULT true,
    two_factor_enabled BOOLEAN DEFAULT false,
    two_factor_secret VARCHAR(255),
    last_login TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Countries table
CREATE TABLE countries (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) UNIQUE NOT NULL,
    code VARCHAR(3) UNIQUE NOT NULL,
    region VARCHAR(100) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Institution types table  
CREATE TABLE institution_types (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) UNIQUE NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Institutions table
CREATE TABLE institutions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(500) NOT NULL,
    short_name VARCHAR(100),
    country_id INTEGER REFERENCES countries(id),
    type_id INTEGER REFERENCES institution_types(id),
    website VARCHAR(500),
    logo_url VARCHAR(500),
    description TEXT,
    founded_year INTEGER,
    student_count INTEGER,
    staff_count INTEGER,
    is_verified BOOLEAN DEFAULT false,
    is_published BOOLEAN DEFAULT true,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Social platforms table
CREATE TABLE social_platforms (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) UNIQUE NOT NULL,
    display_name VARCHAR(100) NOT NULL,
    color_hex VARCHAR(7) NOT NULL,
    icon_name VARCHAR(100),
    base_url VARCHAR(255),
    is_active BOOLEAN DEFAULT true,
    weight DECIMAL(5,2) DEFAULT 1.0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Social media accounts table
CREATE TABLE social_accounts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    institution_id UUID REFERENCES institutions(id) ON DELETE CASCADE,
    platform_id INTEGER REFERENCES social_platforms(id),
    handle VARCHAR(255) NOT NULL,
    url VARCHAR(500) NOT NULL,
    is_verified BOOLEAN DEFAULT false,
    is_official BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(institution_id, platform_id)
);

-- Social media metrics table (historical data)
CREATE TABLE social_metrics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    account_id UUID REFERENCES social_accounts(id) ON DELETE CASCADE,
    followers_count INTEGER NOT NULL DEFAULT 0,
    following_count INTEGER DEFAULT 0,
    posts_count INTEGER DEFAULT 0,
    engagement_rate DECIMAL(5,2) DEFAULT 0.00,
    avg_likes DECIMAL(10,2) DEFAULT 0.00,
    avg_comments DECIMAL(10,2) DEFAULT 0.00,
    avg_shares DECIMAL(10,2) DEFAULT 0.00,
    monthly_growth DECIMAL(5,2) DEFAULT 0.00,
    total_engagement INTEGER DEFAULT 0,
    data_date DATE NOT NULL,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(account_id, data_date)
);

-- Rankings table (calculated rankings)
CREATE TABLE rankings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    institution_id UUID REFERENCES institutions(id) ON DELETE CASCADE,
    platform_id INTEGER REFERENCES social_platforms(id),
    ranking_type VARCHAR(100) NOT NULL, -- 'combined', 'platform_specific', 'monthly_growth', etc.
    rank_position INTEGER NOT NULL,
    score DECIMAL(8,2) NOT NULL,
    follower_score DECIMAL(8,2) DEFAULT 0.00,
    engagement_score DECIMAL(8,2) DEFAULT 0.00,
    growth_score DECIMAL(8,2) DEFAULT 0.00,
    calculation_date DATE NOT NULL,
    is_published BOOLEAN DEFAULT false,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(institution_id, platform_id, ranking_type, calculation_date)
);

-- Blog posts/articles table (CMS)
CREATE TABLE blog_posts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(500) NOT NULL,
    slug VARCHAR(500) UNIQUE NOT NULL,
    content TEXT NOT NULL,
    excerpt TEXT,
    featured_image VARCHAR(500),
    author_id UUID REFERENCES users(id),
    status VARCHAR(50) DEFAULT 'draft', -- draft, published, archived
    tags TEXT[],
    meta_title VARCHAR(255),
    meta_description TEXT,
    published_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Media files table
CREATE TABLE media_files (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    filename VARCHAR(500) NOT NULL,
    original_name VARCHAR(500) NOT NULL,
    file_type VARCHAR(100) NOT NULL,
    file_size INTEGER NOT NULL,
    mime_type VARCHAR(100) NOT NULL,
    storage_path VARCHAR(1000) NOT NULL,
    uploaded_by UUID REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Site settings table (for homepage content, methodology, etc.)
CREATE TABLE site_settings (
    id SERIAL PRIMARY KEY,
    setting_key VARCHAR(255) UNIQUE NOT NULL,
    setting_value TEXT,
    setting_type VARCHAR(50) DEFAULT 'text', -- text, json, boolean, number
    description TEXT,
    is_public BOOLEAN DEFAULT false,
    updated_by UUID REFERENCES users(id),
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- API keys table (for future social media API integrations)
CREATE TABLE api_keys (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    platform_id INTEGER REFERENCES social_platforms(id),
    key_name VARCHAR(255) NOT NULL,
    encrypted_key TEXT NOT NULL,
    is_active BOOLEAN DEFAULT true,
    usage_count INTEGER DEFAULT 0,
    rate_limit_per_day INTEGER DEFAULT 1000,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better performance
CREATE INDEX idx_institutions_country ON institutions(country_id);
CREATE INDEX idx_institutions_type ON institutions(type_id);
CREATE INDEX idx_institutions_published ON institutions(is_published);
CREATE INDEX idx_social_accounts_institution ON social_accounts(institution_id);
CREATE INDEX idx_social_metrics_account_date ON social_metrics(account_id, data_date);
CREATE INDEX idx_rankings_institution ON rankings(institution_id);
CREATE INDEX idx_rankings_type_date ON rankings(ranking_type, calculation_date);
CREATE INDEX idx_rankings_published ON rankings(is_published);
CREATE INDEX idx_blog_posts_status ON blog_posts(status);
CREATE INDEX idx_blog_posts_slug ON blog_posts(slug);

-- Create updated_at triggers
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_institutions_updated_at BEFORE UPDATE ON institutions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_blog_posts_updated_at BEFORE UPDATE ON blog_posts FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_site_settings_updated_at BEFORE UPDATE ON site_settings FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert initial data
INSERT INTO countries (name, code, region) VALUES
('United States', 'USA', 'North America'),
('United Kingdom', 'GBR', 'Europe'),
('Canada', 'CAN', 'North America'), 
('Australia', 'AUS', 'Oceania'),
('Germany', 'DEU', 'Europe'),
('France', 'FRA', 'Europe'),
('Switzerland', 'CHE', 'Europe'),
('Singapore', 'SGP', 'Asia'),
('Japan', 'JPN', 'Asia'),
('China', 'CHN', 'Asia');

INSERT INTO institution_types (name, description) VALUES
('Public University', 'State-funded public higher education institution'),
('Private University', 'Privately funded higher education institution'),
('Technical Institute', 'Specialized technical and engineering institution'),
('Community College', 'Two-year post-secondary institution'),
('Liberal Arts College', 'Undergraduate-focused liberal arts institution');

INSERT INTO social_platforms (name, display_name, color_hex, icon_name, base_url, weight) VALUES
('facebook', 'Facebook', '#1877F2', 'facebook', 'https://facebook.com/', 1.0),
('instagram', 'Instagram', '#E4405F', 'instagram', 'https://instagram.com/', 1.2),
('twitter', 'X (Twitter)', '#000000', 'twitter', 'https://x.com/', 0.8),
('tiktok', 'TikTok', '#000000', 'music', 'https://tiktok.com/@', 1.3),
('youtube', 'YouTube', '#FF0000', 'youtube', 'https://youtube.com/', 1.1),
('linkedin', 'LinkedIn', '#0A66C2', 'linkedin', 'https://linkedin.com/school/', 0.9);

INSERT INTO site_settings (setting_key, setting_value, setting_type, description, is_public) VALUES
('site_name', 'SociaLearn Index', 'text', 'Main site name', true),
('site_tagline', 'The Global Benchmark for Digital Influence in Higher Education', 'text', 'Site tagline', true),
('hero_title', 'Ranking Universities by Social Media Influence', 'text', 'Homepage hero title', true),
('hero_description', 'Transparent, data-backed rankings of universities based on social media presence, engagement, and digital influence across all major platforms.', 'text', 'Homepage hero description', true),
('total_institutions', '500+', 'text', 'Total institutions tracked', true),
('methodology_content', '{"algorithm": "Combined Index Formula", "factors": ["Follower Count", "Engagement Rate", "Growth Trends", "Platform Diversity"]}', 'json', 'Methodology explanation', true),
('contact_email', 'hello@sociallearn-index.com', 'text', 'Contact email', true),
('analytics_enabled', 'true', 'boolean', 'Google Analytics enabled', false);
