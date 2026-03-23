const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();
const fs = require('fs');
const s = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
s.from('admin_users').select('*').then(r => {
    fs.writeFileSync('db_check.txt', JSON.stringify(r.data, null, 2));
    console.log('✅ Wrote to db_check.txt');
});
