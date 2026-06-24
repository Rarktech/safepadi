import { Router } from 'express';
import { supabase } from '@safepal/shared';
import multer from 'multer';
import { track } from '../lib/posthog';

// Use memory storage for fast transit to Supabase Bucket
const upload = multer({ storage: multer.memoryStorage() });

const router = Router();

// ==========================================
// CREATE A NEW LISTING (w/ Images)
// ==========================================
router.post('/', upload.array('images', 5), async (req, res) => {
    try {
        console.log('📦 Received new marketplace listing request');
        const files = req.files as Express.Multer.File[];
        
        // Parse incoming JSON data (which comes as a string in FormData)
        const payload = JSON.parse(req.body.payload);
        
        // Ensure profile exists (Basic validation)
        if (!payload.profile_id) {
            return res.status(400).json({ error: 'Missing profile_id' });
        }

        const uploadedImageUrls: string[] = [];

        // 1. Upload Images to Supabase Storage
        if (files && files.length > 0) {
            console.log(`🖼️ Uploading ${files.length} images to Supabase...`);
            
            for (const file of files) {
                // Generate secure random filename
                const fileExt = file.originalname.split('.').pop();
                const fileName = `${payload.profile_id}/${Date.now()}-${Math.round(Math.random() * 1e9)}.${fileExt}`;

                const { data: storageData, error: storageError } = await supabase.storage
                    .from('marketplace-images')
                    .upload(fileName, file.buffer, {
                        contentType: file.mimetype,
                        upsert: false
                    });

                if (storageError) {
                    console.error('❌ Supabase Storage Error:', storageError);
                    throw storageError;
                }

                // Get public URL
                const { data: publicUrlData } = supabase.storage
                    .from('marketplace-images')
                    .getPublicUrl(fileName);

                uploadedImageUrls.push(publicUrlData.publicUrl);
            }
        }

        // 2. Insert into marketplace_listings table
        console.log('💾 Saving listing to database...');
        const { data: listing, error: dbError } = await supabase
            .from('marketplace_listings')
            .insert({
                profile_id: payload.profile_id,
                category_type: payload.category_type, // 'product', 'service', 'job'
                product_type: payload.product_type || 'physical', // 'physical' or 'digital'
                intent: payload.intent,               // 'hiring', 'offering', 'selling'
                title: payload.title,
                description: payload.description,
                price: parseFloat(payload.price) || 0.00,
                currency: payload.currency || 'USD',
                fee_handling: payload.fee_handling,
                images: uploadedImageUrls,
                features: payload.features || [],
                tags: payload.tags || [],
                
                // Job/Service Specific
                job_role: payload.job_role || null,
                location_type: payload.location_type || null,
                employment_type: payload.employment_type || null,
                
                // Geolocation
                origin_country: payload.origin_country || 'Worldwide',
                geo_scope: payload.geo_scope || 'GLOBAL',
                restricted_countries: payload.restricted_countries || []
            })
            .select()
            .single();

        if (dbError) throw dbError;

        console.log('✅ Listing perfectly created:', listing.id);

        const { data: listingOwner } = await supabase.from('profiles').select('safetag').eq('id', payload.profile_id).maybeSingle();
        if (listingOwner?.safetag) {
            track(listingOwner.safetag, 'listing_created', {
                listing_id: listing.id,
                category: payload.category_type,
                price: listing.price,
                currency: listing.currency,
                image_count: uploadedImageUrls.length,
            });
        }

        res.status(201).json(listing);

    } catch (err: any) {
        console.error('❌ Error creating listing:', err.message || err);
        res.status(500).json({ error: err.message || 'Internal server error while creating listing' });
    }
});


// ==========================================
// EDIT AN EXISTING LISTING
// ==========================================
router.put('/:id', upload.array('images', 5), async (req, res) => {
    try {
        console.log(`📝 Received edit request for listing: ${req.params.id}`);
        // Basic payload processing (no new images for now to simplify update logic)
        const payload = JSON.parse(req.body.payload);
        
        const { data: updatedListing, error: dbError } = await supabase
            .from('marketplace_listings')
            .update({
                category_type: payload.category_type,
                product_type: payload.product_type || 'physical',
                intent: payload.intent,               
                title: payload.title,
                description: payload.description,
                price: parseFloat(payload.price) || 0.00,
                currency: payload.currency || 'USD',
                fee_handling: payload.fee_handling,
                features: payload.features || [],
                tags: payload.tags || [],
                job_role: payload.job_role || null,
                location_type: payload.location_type || null,
                employment_type: payload.employment_type || null,
                origin_country: payload.origin_country || 'Worldwide',
                geo_scope: payload.geo_scope || 'GLOBAL',
                restricted_countries: payload.restricted_countries || []
            })
            .eq('id', req.params.id)
            .select()
            .single();

        if (dbError) throw dbError;

        console.log('✅ Listing successfully updated:', updatedListing.id);
        res.status(200).json(updatedListing);

    } catch (err: any) {
        console.error('❌ Error updating listing:', err.message || err);
        res.status(500).json({ error: err.message || 'Internal server error while updating listing' });
    }
});


// ==========================================
// GET LIVE LISTINGS (WITH SEARCH & GEO FILTERS & PAGINATION)
// ==========================================
router.get('/', async (req, res) => {
    try {
        const { q, loc, c, intent, type, limit, offset } = req.query;

        const pageSize = parseInt(limit as string) || 9;
        const pageOffset = parseInt(offset as string) || 0;

        // Start base query fetching active listings with count
        let query = supabase
            .from('marketplace_listings')
            .select(`
                *,
                profiles ( safetag, first_name, last_name )
            `, { count: 'exact' })
            .eq('status', 'active');

        // 1. Intent / Type filters
        if (intent && intent !== 'all') query = query.eq('intent', intent);
        if (type && type !== 'all') query = query.eq('category_type', type);

        // 2. Keyword Search
        if (q && typeof q === 'string') {
            query = query.or(`title.ilike.%${q}%,description.ilike.%${q}%`);
        }

        // 3. Geolocation Filtering (Otimized: moved to DB level)
        const activeCountry = (c as string) || 'GLOBAL';
        if (activeCountry !== 'GLOBAL') {
            query = query.or(`geo_scope.eq.GLOBAL,restricted_countries.cs.["${activeCountry}"],origin_country.eq.${activeCountry}`);
        }

        // 4. Pagination & Ordering
        query = query.order('created_at', { ascending: false })
                     .range(pageOffset, pageOffset + pageSize - 1);

        // Execute query
        const { data, error, count } = await query;
        if (error) throw error;

        res.status(200).json({ 
            listings: data || [], 
            total: count || 0 
        });
    } catch (err: any) {
        console.error('❌ Error fetching listings:', err.message || err);
        res.status(500).json({ error: 'Failed to fetch marketplace feed' });
    }
});


// ==========================================
// GET SPECIFIC LISTING BY ID
// ==========================================
router.get('/:id', async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('marketplace_listings')
            .select(`
                *,
                profiles ( safetag, first_name, last_name )
            `)
            .eq('id', req.params.id)
            .maybeSingle();

        if (error) throw error;
        if (!data) return res.status(404).json({ error: 'Listing not found' });

        // Increment view count asynchronously natively avoiding RPC constraints
        supabase.from('marketplace_listings')
            .update({ views_count: (data.views_count || 0) + 1 })
            .eq('id', data.id)
            .then();

        res.status(200).json(data);
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

// ==========================================
// DELETE A LISTING
// ==========================================
router.delete('/:id', async (req, res) => {
    try {
        const profileId = (req.query.profile_id as string) || req.body?.profile_id;
        if (!profileId) {
            return res.status(400).json({ error: 'Missing profile_id' });
        }

        const { data: listing, error: fetchError } = await supabase
            .from('marketplace_listings')
            .select('id, profile_id')
            .eq('id', req.params.id)
            .maybeSingle();

        if (fetchError) throw fetchError;
        if (!listing) return res.status(404).json({ error: 'Listing not found' });
        if (listing.profile_id !== profileId) {
            return res.status(403).json({ error: 'You do not own this listing' });
        }

        const { error: deleteError } = await supabase
            .from('marketplace_listings')
            .delete()
            .eq('id', req.params.id);

        if (deleteError) throw deleteError;

        res.status(200).json({ ok: true });
    } catch (err: any) {
        console.error('❌ Error deleting listing:', err.message || err);
        res.status(500).json({ error: err.message || 'Internal server error while deleting listing' });
    }
});

// ==========================================
// GET LISTINGS FOR A SPECIFIC PROFILE
// ==========================================
router.get('/user/:profileId', async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('marketplace_listings')
            .select(`
                *,
                profiles ( safetag, first_name, last_name )
            `)
            .eq('profile_id', req.params.profileId)
            .order('created_at', { ascending: false });

        if (error) throw error;
        res.status(200).json(data);
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

export default router;
