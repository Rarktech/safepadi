const { supabase } = require('./packages/shared/dist');

async function setup() {
    console.log('🔍 Checking database tables...');
    
    // Check auth_otps
    try {
        const { error } = await supabase.from('auth_otps').select('id').limit(1);
        if (error && error.code === 'PGRST116') {
            console.log('✅ auth_otps table exists (empty).');
        } else if (error && error.message.includes('does not exist')) {
            console.log('❌ auth_otps mapping missing. Please ensure the table exists in Supabase.');
            console.log('Required columns for auth_otps: id (uuid), profile_id (uuid), platform (text), platform_id (text), code (text), expires_at (timestamp)');
        } else {
            console.log('✅ auth_otps table verified.');
        }
    } catch (e) {
        console.error('Error checking auth_otps:', e.message);
    }

    // Check binding_bans
    try {
        const { error } = await supabase.from('binding_bans').select('id').limit(1);
        if (error && error.message.includes('does not exist')) {
             console.log('❌ binding_bans mapping missing. Please ensure the table exists in Supabase.');
             console.log('Required columns for binding_bans: id (uuid), profile_id (uuid), platform_id (text), created_at (timestamp)');
        } else {
            console.log('✅ binding_bans table verified.');
        }
    } catch (e) {
        console.error('Error checking binding_bans:', e.message);
    }
}

setup();
