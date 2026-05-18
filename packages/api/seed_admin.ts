import { createClient } from '@supabase/supabase-js';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(__dirname, '../../.env') });

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY!;

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function seed() {
    const seedPassword = process.env.SEED_ADMIN_PASSWORD;
    if (!seedPassword || seedPassword.length < 16) {
        console.error('FATAL: SEED_ADMIN_PASSWORD env var must be set and at least 16 characters. Refusing to seed.');
        process.exit(1);
    }
    console.log('Seeding initial Super Admin...');
    const password_hash = await bcrypt.hash(seedPassword, 12);
    
    // Check if exists
    const { data: existing } = await supabase.from('admin_users').select('id').eq('email', 'admin@safepadi.com').single();
    if (existing) {
        console.log('Super admin already exists! Aborting seed.');
        return;
    }

    const { error } = await supabase.from('admin_users').insert([{
        name: 'Super Admin',
        email: 'admin@safepadi.com',
        role: 'SUPER_ADMIN',
        password_hash,
        status: 'ACTIVE'
    }]);

    if (error) {
        console.error('Error seeding admin:', error);
    } else {
        console.log('Successfully seeded Super Admin. Email: admin@safepadi.com / Password: [see SEED_ADMIN_PASSWORD env]');
    }
}

seed();
