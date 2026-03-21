const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function migrate() {
    console.log('🚀 Starting KYC Migration...');

    const queries = [
        `CREATE TABLE IF NOT EXISTS kyc_submissions (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
            first_name TEXT,
            last_name TEXT,
            dob DATE,
            phone TEXT,
            address TEXT,
            city TEXT,
            state TEXT,
            country TEXT,
            document_country TEXT,
            nin TEXT,
            front_url TEXT,
            back_url TEXT,
            status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED')),
            rejection_reason TEXT,
            created_at TIMESTAMPTZ DEFAULT NOW(),
            updated_at TIMESTAMPTZ DEFAULT NOW()
        );`,
        `CREATE TABLE IF NOT EXISTS admin_notifications (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            title TEXT NOT NULL,
            message TEXT NOT NULL,
            type TEXT NOT NULL,
            related_id UUID,
            status TEXT DEFAULT 'unread',
            created_at TIMESTAMPTZ DEFAULT NOW()
        );`,
        `ALTER TABLE profiles ADD COLUMN IF NOT EXISTS kyc_status TEXT DEFAULT 'UNVERIFIED' CHECK (kyc_status IN ('UNVERIFIED', 'PENDING', 'VERIFIED', 'REJECTED'));`
    ];

    for (const sql of queries) {
        try {
            const { error } = await supabase.rpc('exec_sql', { sql_query: sql });
            if (error) {
                // If rpc fails, try direct query if possible (using sub-client)
                console.error('Error running SQL via RPC:', error.message);
                // Note: Standard Supabase client doesn't support direct SQL unless rpc is exposed.
                // We assume there's a helper or we just log it.
            } else {
                console.log('✅ Executed query successfully');
            }
        } catch (e) {
            console.error('Catch Error:', e.message);
        }
    }
}

migrate();
