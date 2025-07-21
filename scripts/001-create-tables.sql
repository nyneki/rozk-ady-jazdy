-- Create train_schedules table
CREATE TABLE IF NOT EXISTS train_schedules (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    train_number TEXT NOT NULL,
    route TEXT NOT NULL,
    departure TEXT NOT NULL,
    arrival TEXT NOT NULL,
    stations TEXT,
    notes TEXT,
    pdf_file TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create server_links table
CREATE TABLE IF NOT EXISTS server_links (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    url TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_train_schedules_created_at ON train_schedules(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_server_links_created_at ON server_links(created_at DESC);
