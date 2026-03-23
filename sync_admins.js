const { createClient } = require('@supabase/supabase-js');
const bcrypt = require('bcryptjs');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function syncAdmins() {
    const jsonPath = path.resolve(__dirname, 'packages/api/src/data/admin_users.json');
    const admins = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
    
    console.log(`🔄 Syncing ${admins.length} admins from JSON to database...`);
    
    for (const admin of admins) {
        // We'll check by email
        const { data: existing } = await supabase.from('admin_users').select('id').eq('email', admin.email).maybeSingle();
        
        if (!existing) {
            console.log(`➕ Adding missing admin: ${admin.email}`);
            // Generate a random initial password for new users if not specified
            const tempPassword = 'InitialPass123!';
            const hash = await bcrypt.hash(tempPassword, 10);
            
            const { error } = await supabase.from('admin_users').insert([{
                id: admin.id,
                name: admin.name,
                email: admin.email,
                role: admin.role,
                status: admin.status || 'ACTIVE',
                password_hash: hash
            }]);
            
            if (error) {
                console.error(`❌ Error adding ${admin.email}:`, error.message);
            } else {
                console.log(`✅ Added ${admin.email} successfully.`);
            }
        } else {
            console.log(`✅ Admin ${admin.email} already exists.`);
            // Optionally update existing info (except password hash unless requested)
            const { error } = await supabase.from('admin_users').update({
                name: admin.name,
                role: admin.role,
                status: admin.status || 'ACTIVE'
            }).eq('email', admin.email);
            
            if (error) {
                console.error(`❌ Error updating ${admin.email}:`, error.message);
            }
        }
    }
}

syncAdmins();
