import * as dotenv from 'dotenv';
import path from 'path';
import { createClient } from '@supabase/supabase-js';
import bcrypt from 'bcryptjs';

dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

const supabase = createClient(
    process.env.SUPABASE_URL || '',
    process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

async function resetAdmin() {
    const email = 'admin@safepadi.com';
    const newPassword = 'AdminSafe123!';
    
    console.log(`🔐 Resetting password for ${email}...`);
    
    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash(newPassword, salt);
    
    const { data, error } = await supabase
        .from('admin_users')
        .update({ password_hash: hash })
        .eq('email', email)
        .select();
        
    if (error) {
        console.error('❌ Error resetting password:', error.message);
    } else if (data && data.length > 0) {
        console.log(`✅ Success! Password for ${email} has been reset to: ${newPassword}`);
    } else {
        console.log(`⚠️ Admin user ${email} not found in database. Please check the email.`);
    }
}

resetAdmin();
