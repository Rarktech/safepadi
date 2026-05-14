import { supabase } from '@safepal/shared';

export interface InlineImagePart {
    inlineData: { data: string; mimeType: string };
}

export async function downloadAttachmentsAsInlineParts(attachments: any[]): Promise<InlineImagePart[]> {
    const parts: InlineImagePart[] = [];

    for (const att of attachments) {
        if (!att.type?.startsWith('image/')) continue;
        try {
            const urlParts = att.url.split('/public/dispute-evidence/');
            if (urlParts.length < 2) continue;
            const path = urlParts[1];

            const { data, error } = await supabase.storage
                .from('dispute-evidence')
                .download(path);

            if (error || !data) throw error || new Error('Download failed');

            const buffer = await data.arrayBuffer();
            parts.push({
                inlineData: {
                    data: Buffer.from(buffer).toString('base64'),
                    mimeType: att.type
                }
            });
        } catch (err) {
            console.error('Failed to download attachment for AI:', att.url, err);
        }
    }

    return parts;
}
