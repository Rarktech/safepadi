import { Router } from 'express';
import { supabase } from '@safepal/shared';

const router = Router();

router.post('/', async (req, res) => {
    try {
        const { phone } = req.body;

        if (!phone) {
            return res.status(400).json({ error: 'Phone number is required.' });
        }

        const { data, error } = await supabase
            .from('waitlist')
            .insert([{ phone_number: phone }])
            .select();

        if (error) {
            console.error('Waitlist Insert Error:', error);
            // Ignore unique constraint errors gracefully if we added one later
            if (error.code === '23505') {
                return res.json({ success: true, message: 'You are already on the waitlist!' });
            }
            throw new Error('Database Error');
        }

        res.json({ success: true, message: 'Successfully joined waitlist!' });
    } catch (err: any) {
        console.error('Waitlist Error:', err.message);
        res.status(500).json({ error: 'An error occurred while joining the waitlist.' });
    }
});

export default router;
