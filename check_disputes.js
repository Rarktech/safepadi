
const { supabase } = require('./packages/shared/dist/index');
const dotenv = require('dotenv');
const path = require('path');
dotenv.config({ path: path.resolve(__dirname, '.env') });

async function checkDisputes() {
    console.log('🔍 Checking Disputes...');
    const { data: disputes, error } = await supabase
        .from('disputes')
        .select(`
            *,
            transaction:transaction_id (
                product_name,
                txn_code
            )
        `);
    
    if (error) {
        console.error('❌ Error:', error);
        return;
    }

    console.log(`✅ Found ${disputes.length} disputes.`);
    if (disputes.length === 0) {
        console.log('💡 No disputes found. Creating a test dispute...');
        
        // Find a transaction to dispute
        const { data: txns } = await supabase
            .from('transactions')
            .select('id, buyer_id')
            .neq('status', 'CANCELLED')
            .limit(1);
        
        if (txns && txns.length > 0) {
            const txn = txns[0];
            const { data: newDispute, error: insError } = await supabase
                .from('disputes')
                .insert({
                    transaction_id: txn.id,
                    raised_by: txn.buyer_id,
                    reason: 'Test dispute: The seller did not deliver the service as promised in the initial agreement. I have tried reaching out but no response.',
                    status: 'OPEN'
                })
                .select()
                .single();
            
            if (insError) {
                console.error('❌ Insertion Error:', insError);
            } else {
                console.log('🎉 Created test dispute:', newDispute.id);
                
                // Add an AI message for testing
                await supabase.from('dispute_messages').insert({
                    dispute_id: newDispute.id,
                    sender_type: 'AI',
                    content: "Hello. I am the Safeeely AI Mediator. I have analyzed this transaction. It appears the buyer has raised a concern regarding delivery. Seller, do you have any evidence of shipment or completion?"
                });
            }
        } else {
            console.log('❌ No valid transactions found to dispute.');
        }
    } else {
        disputes.forEach(d => {
            console.log(`- [${d.status}] ${d.transaction?.product_name || 'Unknown'} (ID: ${d.id})`);
        });
    }
}

checkDisputes();
