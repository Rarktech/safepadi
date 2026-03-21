
const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function fixLinks() {
    console.log('🛠️ Fixing mock storage links in transaction_proofs...');
    
    // Fetch all proofs with mock-storage link
    const { data: proofs, error } = await supabase
        .from('transaction_proofs')
        .select('*')
        .ilike('file_url', '%mock-storage.safeeely.com%');
    
    if (error) {
        console.error('❌ Error fetching proofs:', error.message);
        return;
    }
    
    console.log(`📊 Found ${proofs.length} proofs to fix.`);
    
    for (const proof of proofs) {
        const id = proof.id.substring(0, 8); // Use part of UUID for seed
        const newUrl = `https://picsum.photos/seed/${id}/1200/800`;
        const { error: updateError } = await supabase
            .from('transaction_proofs')
            .update({ file_url: newUrl, file_size: 450000 }) // Also fix size to 0.43 MB
            .eq('id', proof.id);
        
        if (updateError) {
            console.error(`❌ Failed to fix proof ${proof.id}:`, updateError.message);
        } else {
            console.log(`✅ Fixed: ${proof.file_name}`);
        }
    }
    
    console.log('✨ All mock links replaced with real image placeholders.');
}

fixLinks();
