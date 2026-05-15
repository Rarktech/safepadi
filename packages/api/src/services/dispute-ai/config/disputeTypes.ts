export type DisputeTypeCode =
    | 'INSTAGRAM_ACCOUNT'
    | 'DISCORD_ACCOUNT'
    | 'TELEGRAM_ACCOUNT'
    | 'GMAIL_ACCOUNT'
    | 'TWITTER_ACCOUNT'
    | 'TIKTOK_ACCOUNT'
    | 'YOUTUBE_CHANNEL'
    | 'FACEBOOK_ACCOUNT'
    | 'FREELANCE_CODE'
    | 'FREELANCE_DESIGN'
    | 'FREELANCE_WRITING'
    | 'FREELANCE_VIDEO'
    | 'FREELANCE_MUSIC'
    | 'FREELANCE_CONSULTING'
    | 'CRYPTO_TO_GOODS'
    | 'PHYSICAL_GOODS'
    | 'ELECTRONICS_GADGET'
    | 'VEHICLE_SALE'
    | 'LUXURY_GOODS'
    | 'FASHION_GOODS'
    | 'SOCIAL_SERVICE'
    | 'DIGITAL_DOWNLOAD'
    | 'GAMING_ACCOUNT'
    | 'DOMAIN_WEBSITE'
    | 'INFLUENCER_DEAL'
    | 'EVENT_BOOKING'
    | 'TICKET_RESERVATION'
    | 'DISPATCH_DELIVERY'
    | 'EDUCATION_SERVICE'
    | 'REAL_ESTATE'
    | 'CONSTRUCTION_SERVICE'
    | 'GENERIC';

export interface DisputeTypeConfig {
    domain: string;
    tier1Evidence: string[];
    defaultBurden: 'BUYER' | 'SELLER' | 'BOTH';
    burdenReason: string;
    irreversibleAsset: boolean;
}

export const DISPUTE_TYPES: Record<DisputeTypeCode, DisputeTypeConfig> = {
    // ── Social media accounts ────────────────────────────────────────────────
    INSTAGRAM_ACCOUNT: {
        domain: 'Instagram handle/account sale',
        tier1Evidence: ['LOGIN_CSV', 'OGE_EMAIL', 'ACTIVE_SESSIONS'],
        defaultBurden: 'BUYER',
        burdenReason: 'Digital handover is irreversible — buyer must prove non-utility, not seller.',
        irreversibleAsset: true
    },
    DISCORD_ACCOUNT: {
        domain: 'Discord account or server sale',
        tier1Evidence: ['AUDIT_LOG', 'ACCOUNT_STANDING', 'ACTIVE_SESSIONS'],
        defaultBurden: 'SELLER',
        burdenReason: 'Password reset is reversible in a short window — seller must prove full credential handover.',
        irreversibleAsset: false
    },
    TELEGRAM_ACCOUNT: {
        domain: 'Telegram channel, group, or account sale',
        tier1Evidence: ['ACTIVE_SESSIONS', 'FORWARDED_META', 'ADMIN_LOG'],
        defaultBurden: 'SELLER',
        burdenReason: 'Seller can retain a second active session — must prove all sessions terminated post-sale.',
        irreversibleAsset: false
    },
    GMAIL_ACCOUNT: {
        domain: 'Google/Gmail account sale',
        tier1Evidence: ['LAST_ACCOUNT_ACTIVITY', 'SECURITY_EVENT_LOG', 'RECOVERY_EMAIL_PROOF'],
        defaultBurden: 'SELLER',
        burdenReason: 'Google recovery options retained by seller can reverse access — highest burden on seller.',
        irreversibleAsset: false
    },
    TWITTER_ACCOUNT: {
        domain: 'Twitter/X account sale',
        tier1Evidence: ['LOGIN_HISTORY', 'EMAIL_CONFIRMATION', 'ACTIVE_SESSIONS'],
        defaultBurden: 'BUYER',
        burdenReason: 'Account handover is irreversible — buyer must prove no access was received.',
        irreversibleAsset: true
    },
    TIKTOK_ACCOUNT: {
        domain: 'TikTok account or page sale',
        tier1Evidence: ['LOGIN_ACTIVITY', 'LINKED_EMAIL_PROOF', 'ACCOUNT_STATS_SCREENSHOT'],
        defaultBurden: 'BUYER',
        burdenReason: 'Account handover is irreversible — buyer must prove they were locked out.',
        irreversibleAsset: true
    },
    YOUTUBE_CHANNEL: {
        domain: 'YouTube channel sale',
        tier1Evidence: ['ANALYTICS_SCREENSHOT', 'CHANNEL_OWNERSHIP_EMAIL', 'STUDIO_ACCESS_LOG'],
        defaultBurden: 'SELLER',
        burdenReason: 'Seller must prove full channel ownership was transferred to the buyer.',
        irreversibleAsset: true
    },
    FACEBOOK_ACCOUNT: {
        domain: 'Facebook account or page sale',
        tier1Evidence: ['LOGIN_HISTORY', 'PAGE_ADMIN_PROOF', 'SECURITY_LOG'],
        defaultBurden: 'SELLER',
        burdenReason: 'Seller must prove admin rights and login credentials were fully handed over.',
        irreversibleAsset: true
    },
    // ── Freelance & services ─────────────────────────────────────────────────
    FREELANCE_CODE: {
        domain: 'Code or software delivery',
        tier1Evidence: ['GIT_COMMIT_HASH', 'REPO_COLLABORATOR_PROOF', 'DEPLOY_LOGS'],
        defaultBurden: 'BUYER',
        burdenReason: 'Buyer claiming defect must demonstrate it; seller already delivered.',
        irreversibleAsset: false
    },
    FREELANCE_DESIGN: {
        domain: 'Design file delivery',
        tier1Evidence: ['FIGMA_VERSION_HISTORY', 'FILE_METADATA', 'ORIGINAL_BRIEF'],
        defaultBurden: 'BOTH',
        burdenReason: 'Scope disputes require both parties to produce the original brief.',
        irreversibleAsset: false
    },
    FREELANCE_WRITING: {
        domain: 'Article or copy delivery',
        tier1Evidence: ['DOCUMENT_VERSION_HISTORY', 'PLAGIARISM_SCAN', 'ORIGINAL_BRIEF'],
        defaultBurden: 'SELLER',
        burdenReason: 'Seller must prove originality and delivery of agreed scope.',
        irreversibleAsset: false
    },
    FREELANCE_VIDEO: {
        domain: 'Video editing or animation delivery',
        tier1Evidence: ['PROJECT_FILE_METADATA', 'EXPORT_LOG', 'ORIGINAL_BRIEF'],
        defaultBurden: 'BUYER',
        burdenReason: 'Buyer claiming defect must show the delivered file does not match the brief.',
        irreversibleAsset: false
    },
    FREELANCE_MUSIC: {
        domain: 'Beat or music production delivery',
        tier1Evidence: ['DAW_PROJECT_METADATA', 'AUDIO_FILE_METADATA', 'ORIGINAL_BRIEF'],
        defaultBurden: 'BOTH',
        burdenReason: 'Both parties must clarify whether delivery matched the agreed brief.',
        irreversibleAsset: false
    },
    FREELANCE_CONSULTING: {
        domain: 'Business consulting, coaching, or advisory services',
        tier1Evidence: ['SESSION_RECORD', 'DELIVERABLE_PROOF', 'ORIGINAL_SCOPE'],
        defaultBurden: 'BOTH',
        burdenReason: 'Consulting scope is often subjective — both parties must show what was agreed and delivered.',
        irreversibleAsset: false
    },
    // ── Crypto & digital assets ──────────────────────────────────────────────
    CRYPTO_TO_GOODS: {
        domain: 'Crypto payment for goods or services',
        tier1Evidence: ['TX_HASH', 'BLOCK_CONFIRMATION', 'WALLET_SCREENSHOT'],
        defaultBurden: 'BUYER',
        burdenReason: 'On-chain verification is definitive — buyer must prove non-receipt or wrong address.',
        irreversibleAsset: true
    },
    DIGITAL_DOWNLOAD: {
        domain: 'Digital file or download sale (template, preset, ebook, course)',
        tier1Evidence: ['UPLOAD_TIMESTAMP', 'FILE_CONTENTS_PROOF', 'DELIVERY_LINK'],
        defaultBurden: 'SELLER',
        burdenReason: 'Seller must prove they delivered exactly what was advertised.',
        irreversibleAsset: false
    },
    GAMING_ACCOUNT: {
        domain: 'Gaming account or in-game item sale',
        tier1Evidence: ['ACCOUNT_STATS_SCREENSHOT', 'LOGIN_CONFIRMATION', 'ORIGINAL_LISTING'],
        defaultBurden: 'BUYER',
        burdenReason: 'Buyer claiming misrepresentation must show the difference from what was advertised.',
        irreversibleAsset: true
    },
    DOMAIN_WEBSITE: {
        domain: 'Domain name, website, or SaaS acquisition',
        tier1Evidence: ['WHOIS_TRANSFER_PROOF', 'REGISTRAR_EMAIL', 'ACCESS_CONFIRMATION'],
        defaultBurden: 'SELLER',
        burdenReason: 'Seller must prove transfer completed in the buyer\'s registrar account.',
        irreversibleAsset: true
    },
    // ── Physical goods ───────────────────────────────────────────────────────
    PHYSICAL_GOODS: {
        domain: 'Physical goods sale and delivery',
        tier1Evidence: ['CARRIER_TRACKING', 'PROOF_OF_DELIVERY', 'UNBOXING_VIDEO'],
        defaultBurden: 'SELLER',
        burdenReason: 'Seller must prove physical delivery via carrier records.',
        irreversibleAsset: false
    },
    ELECTRONICS_GADGET: {
        domain: 'Electronics and gadget sales (phones, laptops, consoles)',
        tier1Evidence: ['IMEI_SERIAL_PROOF', 'CONDITION_PHOTOS', 'PURCHASE_PROOF'],
        defaultBurden: 'SELLER',
        burdenReason: 'Seller must prove the device condition and specs match the listing.',
        irreversibleAsset: false
    },
    VEHICLE_SALE: {
        domain: 'Car, motorcycle, or vehicle sale',
        tier1Evidence: ['VEHICLE_PAPERS', 'VIN_CHASSIS_PROOF', 'CONDITION_VIDEO'],
        defaultBurden: 'SELLER',
        burdenReason: 'Seller must prove ownership documents are valid and vehicle condition matches the listing.',
        irreversibleAsset: true
    },
    LUXURY_GOODS: {
        domain: 'Luxury goods sale (watches, jewelry, designer bags, art)',
        tier1Evidence: ['AUTHENTICITY_PROOF', 'SERIAL_NUMBER_PHOTO', 'CONDITION_VIDEO'],
        defaultBurden: 'SELLER',
        burdenReason: 'Seller must prove authenticity and condition match the listing.',
        irreversibleAsset: false
    },
    FASHION_GOODS: {
        domain: 'Clothing, shoes, and accessories sale',
        tier1Evidence: ['ITEM_PHOTOS', 'CONDITION_PROOF', 'ORIGINAL_LISTING_SCREENSHOT'],
        defaultBurden: 'SELLER',
        burdenReason: 'Seller must prove the item matches the listing photos and description.',
        irreversibleAsset: false
    },
    // ── Services ─────────────────────────────────────────────────────────────
    SOCIAL_SERVICE: {
        domain: 'Social media followers, views, or engagement service',
        tier1Evidence: ['PLATFORM_ANALYTICS_BEFORE_AFTER', 'TIMESTAMPED_SCREENSHOT'],
        defaultBurden: 'SELLER',
        burdenReason: 'Seller must prove delivery of agreed metrics via platform analytics.',
        irreversibleAsset: false
    },
    INFLUENCER_DEAL: {
        domain: 'Influencer sponsorship, shoutout, or brand deal',
        tier1Evidence: ['POST_SCREENSHOT', 'ANALYTICS_PROOF', 'ORIGINAL_AGREEMENT'],
        defaultBurden: 'SELLER',
        burdenReason: 'Influencer must prove they posted as agreed and hit the agreed metrics.',
        irreversibleAsset: false
    },
    EVENT_BOOKING: {
        domain: 'Artist booking, venue reservation, or event service',
        tier1Evidence: ['BOOKING_CONTRACT', 'PAYMENT_CONFIRMATION', 'CANCELLATION_PROOF'],
        defaultBurden: 'BOTH',
        burdenReason: 'Depends on who failed to deliver — both parties must provide event-day proof.',
        irreversibleAsset: false
    },
    TICKET_RESERVATION: {
        domain: 'Event ticket, concert ticket, or hotel reservation',
        tier1Evidence: ['TICKET_QR_CODE', 'BOOKING_CONFIRMATION_EMAIL', 'VALIDITY_PROOF'],
        defaultBurden: 'SELLER',
        burdenReason: 'Seller must prove ticket is valid and was issued legitimately.',
        irreversibleAsset: true
    },
    DISPATCH_DELIVERY: {
        domain: 'Dispatch rider, courier, or delivery service',
        tier1Evidence: ['PICKUP_PROOF', 'DELIVERY_CONFIRMATION', 'TRACKING_RECORD'],
        defaultBurden: 'SELLER',
        burdenReason: 'Dispatcher must prove successful delivery to the correct recipient.',
        irreversibleAsset: false
    },
    EDUCATION_SERVICE: {
        domain: 'Tutoring, online course, or educational service',
        tier1Evidence: ['SESSION_ATTENDANCE_PROOF', 'COURSE_ACCESS_PROOF', 'ORIGINAL_AGREEMENT'],
        defaultBurden: 'SELLER',
        burdenReason: 'Educator must prove sessions were delivered as agreed.',
        irreversibleAsset: false
    },
    // ── High-value / sector-specific ─────────────────────────────────────────
    REAL_ESTATE: {
        domain: 'Property or land sale',
        tier1Evidence: ['TITLE_DOCUMENT', 'SURVEY_PLAN', 'SITE_PHOTOS'],
        defaultBurden: 'SELLER',
        burdenReason: 'Seller must prove valid ownership title and that the property matches the listing.',
        irreversibleAsset: true
    },
    CONSTRUCTION_SERVICE: {
        domain: 'Construction, renovation, or contracting work',
        tier1Evidence: ['PROGRESS_PHOTOS', 'MATERIAL_RECEIPTS', 'ORIGINAL_CONTRACT'],
        defaultBurden: 'SELLER',
        burdenReason: 'Contractor must prove milestone work was completed to the agreed standard.',
        irreversibleAsset: false
    },
    GENERIC: {
        domain: 'General escrow dispute',
        tier1Evidence: ['ANY_VERIFIABLE_PROOF'],
        defaultBurden: 'BOTH',
        burdenReason: 'Both parties bear equal burden absent type-specific rules.',
        irreversibleAsset: false
    }
};

// Platform-specific navigation paths — prevents AI from guessing/hallucinating steps
export const EVIDENCE_HOW_TO: Record<string, Record<string, string>> = {
    INSTAGRAM_ACCOUNT: {
        LOGIN_CSV: 'On a computer: go to Instagram.com → Settings → Accounts Center → Password and security → Login activity → click "..." → Download data. Upload the CSV file you receive.',
        OGE_EMAIL: 'Open the email linked to this Instagram account. Search for "instagram.com email change". Forward that email as a file (not a screenshot) so we can check its headers.',
        ACTIVE_SESSIONS: 'Instagram → Settings → Accounts Center → Password and security → Where you\'re logged in. Take a screenshot of the full list with timestamps visible.'
    },
    DISCORD_ACCOUNT: {
        AUDIT_LOG: 'In your Discord server → Settings → Audit Log → filter to the last 7 days. Screenshot the full list with timestamps visible.',
        ACCOUNT_STANDING: 'Discord app → User Settings → Account Standing. Screenshot the full page.',
        ACTIVE_SESSIONS: 'Discord app → User Settings → Devices. Screenshot all logged-in devices with the dates they were last active.'
    },
    TELEGRAM_ACCOUNT: {
        ACTIVE_SESSIONS: 'Telegram → Settings → Privacy and Security → Active Sessions. Screenshot the full list of devices.',
        FORWARDED_META: 'Forward a recent message from the channel or account to your "Saved Messages" in Telegram and screenshot it — the forwarded message shows the original sender and date.',
        ADMIN_LOG: 'In the group or channel → tap the name at the top → Administrators → Recent Actions. Screenshot the last 7 days.'
    },
    GMAIL_ACCOUNT: {
        LAST_ACCOUNT_ACTIVITY: 'Open Gmail → scroll to the very bottom of the inbox → click "Details" under Last Account Activity. Screenshot the full IP address log.',
        SECURITY_EVENT_LOG: 'Go to myaccount.google.com → Security → Recent security events. Screenshot the full list.',
        RECOVERY_EMAIL_PROOF: 'Go to myaccount.google.com → Security → Recovery email. Screenshot the page showing the recovery email address was changed to the buyer\'s email.'
    },
    TWITTER_ACCOUNT: {
        LOGIN_HISTORY: 'Go to twitter.com or the X app → Settings → Security and account access → Apps and sessions → Account access history. Screenshot the full login list with dates.',
        EMAIL_CONFIRMATION: 'Check the email linked to this account for a "new login" or "email address changed" notification from Twitter/X. Forward that email as a file attachment.',
        ACTIVE_SESSIONS: 'Settings → Security and account access → Apps and sessions → Sessions. Screenshot all active sessions with device names visible.'
    },
    TIKTOK_ACCOUNT: {
        LOGIN_ACTIVITY: 'TikTok app → Profile → ☰ (top right) → Settings and privacy → Security and login → Login activity. Screenshot the full list of devices and dates.',
        LINKED_EMAIL_PROOF: 'TikTok app → Profile → ☰ → Settings and privacy → Account → screenshot showing the linked email or phone number.',
        ACCOUNT_STATS_SCREENSHOT: 'TikTok app → tap your Profile. Screenshot the page showing your username, follower count, following count, and total likes.'
    },
    YOUTUBE_CHANNEL: {
        ANALYTICS_SCREENSHOT: 'Go to studio.youtube.com → Analytics → Overview. Screenshot the dashboard showing the channel name, subscriber count, and your Google account email (top right corner).',
        CHANNEL_OWNERSHIP_EMAIL: 'Check your email for a notification from YouTube or Google about being added as a channel manager or owner. Forward that email as a file attachment.',
        STUDIO_ACCESS_LOG: 'Go to studio.youtube.com → Settings → Channel → Advanced settings. Screenshot the page showing the Brand Account and ownership details.'
    },
    FACEBOOK_ACCOUNT: {
        LOGIN_HISTORY: 'Facebook → Settings & privacy → Settings → Security and login → Where you\'re logged in. Screenshot the full list of active sessions with device names.',
        PAGE_ADMIN_PROOF: 'Go to your Facebook Page → Settings → New Pages Experience → Page access. Screenshot the admin list — the buyer\'s account must be listed as owner or admin.',
        SECURITY_LOG: 'Facebook → Settings → Security and login → Recent security emails. Screenshot any password or email changes shown.'
    },
    FREELANCE_CODE: {
        GIT_COMMIT_HASH: 'Go to the GitHub or GitLab repository → Commits. Click on the relevant commit and copy the full 40-character commit hash from the URL bar.',
        REPO_COLLABORATOR_PROOF: 'Repo Settings → Collaborators (or Members). Screenshot the list showing the buyer\'s username was added.',
        DEPLOY_LOGS: 'From your hosting platform (Vercel, Netlify, GitHub Actions, etc.) — screenshot the successful build or deploy log showing the file name, date, and green status.'
    },
    FREELANCE_DESIGN: {
        FIGMA_VERSION_HISTORY: 'In Figma: File menu → Version History (or press Ctrl+Alt+S) — screenshot the full history panel showing the file name, edit dates, and version entries. In Canva: Share → Version history. In Adobe Illustrator / Photoshop / XD: right-click the file → Properties (Windows) or Get Info (Mac) showing the creation date.',
        FILE_METADATA: 'Right-click the design file → Properties (Windows) or Get Info (Mac). Screenshot the window showing the Created and Last Modified dates. Or open the file in Google Drive / Dropbox and screenshot the file details panel.',
        ORIGINAL_BRIEF: 'Screenshot the original project brief from WhatsApp, Telegram, Discord, or email — showing exactly what was requested, the sender\'s name, and the date/time.'
    },
    FREELANCE_WRITING: {
        DOCUMENT_VERSION_HISTORY: 'In Google Docs: File → Version history → See version history. Screenshot the panel showing your Google account name and the date the document was first created. In Notion: ··· menu → Page history. In Word Online: click Version history in the toolbar.',
        PLAGIARISM_SCAN: 'Run the article on Grammarly Plagiarism Checker or Copyscape (copyscape.com). Screenshot the results page showing the article title, originality percentage, and any sources found.',
        ORIGINAL_BRIEF: 'Screenshot the original project brief from WhatsApp, Telegram, Discord, or email — showing the agreed topic, word count, tone, and the date it was sent.'
    },
    FREELANCE_VIDEO: {
        PROJECT_FILE_METADATA: 'Right-click your video project file (Adobe Premiere .prproj, DaVinci Resolve .drp, After Effects .aep, CapCut project) → Properties (Windows) or Get Info (Mac). Screenshot showing the file name and creation date.',
        EXPORT_LOG: 'Screenshot the export queue or render log from your editing app showing the file name, resolution, and export date. Or screenshot the file in Google Drive / WeTransfer showing the upload timestamp.',
        ORIGINAL_BRIEF: 'Screenshot the original brief from WhatsApp, Telegram, Discord, or email showing what was asked for (length, style, platform), with the sender\'s name and date.'
    },
    FREELANCE_MUSIC: {
        DAW_PROJECT_METADATA: 'Right-click your music project file (FL Studio .flp, Ableton Live .als, Logic Pro .logicx, GarageBand) → Properties (Windows) or Get Info (Mac). Screenshot showing the file name and the date it was created.',
        AUDIO_FILE_METADATA: 'Right-click the finished audio file (.mp3, .wav, .flac) → Properties → Details tab (Windows) or Get Info (Mac). Screenshot showing the title, creation date, and duration.',
        ORIGINAL_BRIEF: 'Screenshot the original brief from WhatsApp, Telegram, or DM showing what was agreed (genre, BPM, key, length, style), with the sender\'s name and date.'
    },
    FREELANCE_CONSULTING: {
        SESSION_RECORD: 'Screenshot the calendar invite or booking confirmation (Calendly, Google Calendar, Zoom, etc.) for each session showing the date, time, and attendees. Or screenshot the video call from Zoom/Google Meet showing the call duration.',
        DELIVERABLE_PROOF: 'Upload or screenshot any reports, strategy documents, action plans, or other files you delivered as part of this service.',
        ORIGINAL_SCOPE: 'Screenshot the original agreement from WhatsApp, Telegram, or email showing what services were agreed, how many sessions, and the payment amount.'
    },
    CRYPTO_TO_GOODS: {
        TX_HASH: 'Copy the full transaction hash from your crypto wallet. For Ethereum or BSC it starts with 0x. For Bitcoin or USDT it\'s a long string of letters and numbers. Paste it here — we check it directly on the blockchain.',
        BLOCK_CONFIRMATION: 'On a block explorer (etherscan.io, bscscan.com, blockchain.info), search your transaction hash and screenshot the full results page showing the confirmation count, sender address, and recipient address.',
        WALLET_SCREENSHOT: 'Open your wallet app (MetaMask, Trust Wallet, Binance, Bybit, etc.) and go to the transaction details. Screenshot the full screen showing sender, recipient, amount, and timestamp.'
    },
    PHYSICAL_GOODS: {
        CARRIER_TRACKING: 'Go to the carrier\'s website (DHL, FedEx, UPS, USPS, GIG Logistics, etc.), enter the tracking number, and screenshot the full delivery history showing every scan and the final status.',
        PROOF_OF_DELIVERY: 'Download the signed Proof of Delivery (POD) document from the carrier\'s portal and upload the full PDF.',
        UNBOXING_VIDEO: 'Record a clear, uncut video showing the sealed package, then opening it to show the contents. Upload the video file directly — not a link.'
    },
    ELECTRONICS_GADGET: {
        IMEI_SERIAL_PROOF: 'For phones: dial *#06# on the phone to display the IMEI and screenshot it — or photograph the IMEI sticker on the original box. For laptops and other electronics: photograph the serial number sticker (usually on the bottom of the device, inside the battery compartment, or on the original box).',
        CONDITION_PHOTOS: 'Take clear, well-lit photos of the device from all sides — front, back, left, right, top, bottom. Show any existing scratches, dents, or damage clearly.',
        PURCHASE_PROOF: 'Photograph the original store receipt, invoice, or online purchase confirmation showing the device model, IMEI/serial number (if shown), and purchase date.'
    },
    VEHICLE_SALE: {
        VEHICLE_PAPERS: 'Photograph both sides of the vehicle registration documents and proof of ownership. For Nigeria: include the vehicle license, proof of ownership letter, and any roadworthiness certificate.',
        VIN_CHASSIS_PROOF: 'Photograph the VIN or chassis number plate inside the vehicle (usually on the dashboard near the windscreen, inside the door jamb, or in the engine bay). The number must be clearly readable.',
        CONDITION_VIDEO: 'Record a short, uncut video (2-3 minutes) walking around the vehicle showing the full exterior, interior, dashboard/odometer, engine bay, and any noted damage or issues.'
    },
    LUXURY_GOODS: {
        AUTHENTICITY_PROOF: 'Photograph the certificate of authenticity, original store receipt, warranty card, or authentication tag. For watches: photograph the caseback serial number and any papers. For bags: photograph the date code stamp and authenticity card.',
        SERIAL_NUMBER_PHOTO: 'Take a close-up, focused photo of the serial or reference number on the item — on the caseback for watches, the interior stamp for bags, the hallmark for jewelry.',
        CONDITION_VIDEO: 'Record a short video showing the item from all angles in good lighting, including all hardware, logos, stitching, zips, and any signs of wear or damage.'
    },
    FASHION_GOODS: {
        ITEM_PHOTOS: 'Take clear photos of the item from the front, back, and sides. All brand tags, size labels, and care labels must be visible in at least one photo.',
        CONDITION_PROOF: 'Photograph any flaws — stains, tears, missing buttons, worn areas, or sole damage. Take close-up shots of any defects mentioned or disputed.',
        ORIGINAL_LISTING_SCREENSHOT: 'Screenshot the original listing or product post (WhatsApp status, Instagram post, Telegram channel) showing the item photos, price, condition description, and the date it was posted.'
    },
    SOCIAL_SERVICE: {
        PLATFORM_ANALYTICS_BEFORE_AFTER: 'Screenshot the platform\'s analytics page (Instagram Insights, YouTube Studio, Twitter/X Analytics, TikTok Pro) showing follower or view counts with the date range visible — take one before the service started and one after it ended.',
        TIMESTAMPED_SCREENSHOT: 'On your phone, screenshot the account\'s public stats page. Make sure your phone\'s date and time shows in the status bar at the top of the screen.'
    },
    DIGITAL_DOWNLOAD: {
        UPLOAD_TIMESTAMP: 'Screenshot your cloud storage or selling platform (Google Drive, Dropbox, Gumroad, Payhip, Sellfy, Notion, etc.) showing the file name, size, and the date it was uploaded.',
        FILE_CONTENTS_PROOF: 'Open the file and screenshot the first page or main view (template first slide, ebook cover, preset panel, etc.) so we can confirm it matches what was advertised.',
        DELIVERY_LINK: 'Screenshot the message where you sent the download link to the buyer, with your username and the timestamp clearly visible.'
    },
    GAMING_ACCOUNT: {
        ACCOUNT_STATS_SCREENSHOT: 'Log in to the platform (Steam, PlayStation, Xbox, Roblox, PUBG, FIFA/FC, Call of Duty, Mobile Legends, etc.) and screenshot the account profile showing username, level, rank, and any items included in the sale.',
        LOGIN_CONFIRMATION: 'Check the email linked to the game account for a "new device login" notification. Screenshot or forward it. Or screenshot the active sessions in the account\'s security settings.',
        ORIGINAL_LISTING: 'Screenshot the original listing or agreement message showing exactly what stats and items were being sold, with your username and the date visible.'
    },
    DOMAIN_WEBSITE: {
        WHOIS_TRANSFER_PROOF: 'Go to who.is or lookup.icann.org, search the domain name, and screenshot the full WHOIS record showing the current registrant name and registration dates.',
        REGISTRAR_EMAIL: 'Forward the domain transfer confirmation email from your registrar (GoDaddy, Namecheap, Cloudflare, Google Domains, etc.) as a file attachment showing the domain was moved to the buyer\'s account.',
        ACCESS_CONFIRMATION: 'Screenshot your registrar account dashboard (GoDaddy, Namecheap, etc.) showing the domain listed under your account with full DNS management access.'
    },
    INFLUENCER_DEAL: {
        POST_SCREENSHOT: 'Screenshot the published post, story, video, or reel on the agreed platform showing your username, the content, the date and time, and the engagement numbers (likes, views, comments).',
        ANALYTICS_PROOF: 'Screenshot the post analytics from your platform dashboard (Instagram Insights, TikTok Pro, YouTube Studio, Twitter Analytics) showing reach, impressions, and engagement for that specific post.',
        ORIGINAL_AGREEMENT: 'Screenshot the original agreement message (DM, WhatsApp, or email) showing what content was agreed, the platform, the deadline, the payment, and the brand\'s account handle.'
    },
    EVENT_BOOKING: {
        BOOKING_CONTRACT: 'Upload or photograph the signed booking agreement showing the artist or vendor name, event date, venue, agreed fee, and performance or service terms.',
        PAYMENT_CONFIRMATION: 'Screenshot or photograph the payment receipt, bank transfer confirmation, or transaction record showing the amount paid, date, and the recipient\'s name.',
        CANCELLATION_PROOF: 'Screenshot any messages confirming a cancellation or no-show, with timestamps. If the artist or vendor didn\'t show up, provide a dated photo at the venue during the event time.'
    },
    TICKET_RESERVATION: {
        TICKET_QR_CODE: 'Screenshot or photograph the full ticket, including the QR code or barcode. Only share this in this secure dispute thread — do not share it publicly.',
        BOOKING_CONFIRMATION_EMAIL: 'Forward the booking confirmation email as a file attachment, or screenshot it showing your name, event name, event date, booking reference, and the sender email address.',
        VALIDITY_PROOF: 'If the ticket was invalid, screenshot the error message you saw when you tried to use it — at the venue gate, on the app, or online — with the date and time visible.'
    },
    DISPATCH_DELIVERY: {
        PICKUP_PROOF: 'Screenshot or photograph the waybill, receipt, or booking confirmation given at pickup — showing the item description, sender name, recipient address, and pickup date/time.',
        DELIVERY_CONFIRMATION: 'Screenshot the completed delivery status from the delivery app (Bolt Food, Glovo, Kwik, etc.) showing "Delivered" with timestamp. Or photograph the signed delivery note with recipient name.',
        TRACKING_RECORD: 'Screenshot the full tracking history from the delivery platform or courier app — showing every status update from pickup to delivery with times.'
    },
    EDUCATION_SERVICE: {
        SESSION_ATTENDANCE_PROOF: 'Screenshot the video call or session from Zoom, Google Meet, or Microsoft Teams showing the meeting name, date, duration, and participants. Or screenshot the attendance record from the learning platform.',
        COURSE_ACCESS_PROOF: 'Screenshot your student dashboard on the course platform (Teachable, Thinkific, Udemy, Google Classroom, etc.) showing your enrollment, the course name, and any lesson completion dates.',
        ORIGINAL_AGREEMENT: 'Screenshot the original agreement from WhatsApp, Telegram, or email showing what was agreed — number of sessions, topics, schedule, and payment amount.'
    },
    REAL_ESTATE: {
        TITLE_DOCUMENT: 'Photograph both sides of the property title document — this could be a Certificate of Occupancy (C of O), Right of Occupancy, Deed of Assignment, Governor\'s Consent, or Gazette. The property address, owner name, and official stamp must be clearly visible.',
        SURVEY_PLAN: 'Photograph the official survey plan showing the property boundaries, survey number, and the licensed surveyor\'s stamp and signature.',
        SITE_PHOTOS: 'Take clear, timestamped photos of the actual property from multiple angles — entrance gate, front view, interior main areas, and any structures included in the sale.'
    },
    CONSTRUCTION_SERVICE: {
        PROGRESS_PHOTOS: 'Take timestamped photos of the construction site at the disputed milestone stage — photos must clearly show the work done. Make sure your phone\'s date is visible in the status bar, or hold a visible date placard in the shot.',
        MATERIAL_RECEIPTS: 'Photograph all receipts for materials purchased for this project — each receipt must show the item name, quantity, price, date, and the seller\'s name.',
        ORIGINAL_CONTRACT: 'Photograph or scan the signed written agreement showing the agreed scope of work, payment schedule, milestone breakdown, timeline, and both parties\' signatures.'
    }
};

export interface TierHintResult {
    tier: 1 | 2 | 3;
    tags: string[];
}

// Deterministic pre-classification of evidence tier — runs on every message, zero AI cost
export function quickTierHint(content: string, attachments: any[]): TierHintResult {
    const tags: string[] = [];

    // Tier 1 — verifiable, metadata-rich
    if (/0x[a-f0-9]{40,}/i.test(content) || /\b[a-f0-9]{64}\b/i.test(content)) tags.push('BLOCKCHAIN_TX');
    if (attachments.some((a: any) => /\.csv$/i.test(a.name || ''))) tags.push('CSV_EXPORT');
    if (attachments.some((a: any) => /\.(har|log)$/i.test(a.name || ''))) tags.push('API_LOG');
    if (attachments.some((a: any) =>
        /\.(mp4|mov|webm|avi)$/i.test(a.name || '') && (a.size || 0) > 1_000_000
    )) tags.push('SCREEN_RECORDING');
    if (attachments.some((a: any) => /\.zip$/i.test(a.name || ''))) tags.push('CHAT_EXPORT_ZIP');

    // Tier 2 — third-party, some verifiability
    if (attachments.some((a: any) => a.type?.startsWith('image/') && (a.size || 0) > 500_000)) tags.push('HIGH_RES_PHOTO');
    else if (attachments.some((a: any) => a.type?.startsWith('image/'))) tags.push('SCREENSHOT');

    const TIER1 = new Set(['BLOCKCHAIN_TX', 'CSV_EXPORT', 'API_LOG', 'SCREEN_RECORDING', 'CHAT_EXPORT_ZIP']);
    const TIER2 = new Set(['HIGH_RES_PHOTO', 'SCREENSHOT']);

    let tier: 1 | 2 | 3 = 3;
    if (tags.some(t => TIER1.has(t))) tier = 1;
    else if (tags.some(t => TIER2.has(t))) tier = 2;

    return { tier, tags };
}

// Heuristic pre-classifier — free, used before calling Gemini.
// Only product name is used — platform (e.g. 'discord') tells us how the user registered,
// not what they're selling. Never infer dispute type from registration platform.
export function platformHeuristicGuess(
    productName: string
): { type: DisputeTypeCode; confidence: number } {
    const p = productName.toLowerCase();

    // Social media accounts (most specific first)
    if (/instagram|ig account|ig handle|ig page/.test(p)) return { type: 'INSTAGRAM_ACCOUNT', confidence: 0.9 };
    if (/discord\s*(account|server|channel|handle|tag|nitro|boost)/i.test(p)) return { type: 'DISCORD_ACCOUNT', confidence: 0.9 };
    if (/telegram|tg channel|tg group|tg bot/.test(p)) return { type: 'TELEGRAM_ACCOUNT', confidence: 0.9 };
    if (/gmail|google account/.test(p)) return { type: 'GMAIL_ACCOUNT', confidence: 0.9 };
    if (/twitter account|x account|twitter page|tweet account/i.test(p)) return { type: 'TWITTER_ACCOUNT', confidence: 0.9 };
    if (/tiktok|tik tok/i.test(p)) return { type: 'TIKTOK_ACCOUNT', confidence: 0.9 };
    if (/youtube channel|yt channel|youtube page/i.test(p)) return { type: 'YOUTUBE_CHANNEL', confidence: 0.9 };
    if (/facebook page|fb page|facebook account|fb account/i.test(p)) return { type: 'FACEBOOK_ACCOUNT', confidence: 0.9 };

    // Crypto & digital assets
    if (/0x[a-f0-9]{10,}|crypto|bitcoin|btc|ethereum|eth|usdt|binance/.test(p)) return { type: 'CRYPTO_TO_GOODS', confidence: 0.9 };
    if (/gaming account|game account|pubg|roblox|fifa account|cod account|steam account|fortnite|mobile legends|mlbb/i.test(p)) return { type: 'GAMING_ACCOUNT', confidence: 0.85 };
    if (/domain name|website sale|saas acquisition|web app for sale|online business for sale/i.test(p)) return { type: 'DOMAIN_WEBSITE', confidence: 0.85 };
    if (/template|preset|ebook|e-book|lightroom|notion template|canva template|font pack|digital download/i.test(p)) return { type: 'DIGITAL_DOWNLOAD', confidence: 0.8 };

    // Physical goods (specific before generic)
    if (/\bphone\b|iphone|samsung galaxy|macbook|ipad|airpods|playstation|ps5|xbox|gaming console|tablet|laptop/i.test(p)) return { type: 'ELECTRONICS_GADGET', confidence: 0.85 };
    if (/\bcar\b|vehicle|motorcycle|\bbike\b|automobile|tokunbo|foreign used|imported car/i.test(p)) return { type: 'VEHICLE_SALE', confidence: 0.85 };
    if (/rolex|gucci|\blv\b|louis vuitton|luxury bag|designer bag|jewelry|jewellery|diamond|gold chain|wristwatch/i.test(p)) return { type: 'LUXURY_GOODS', confidence: 0.85 };
    if (/cloth|clothing|fashion|dress|\bshoe|sneaker|thrift|uk used|\bshirt\b|jeans|ankara|agbada|lace fabric/i.test(p)) return { type: 'FASHION_GOODS', confidence: 0.75 };
    if (/shipping|delivery|physical|product|item|goods/.test(p)) return { type: 'PHYSICAL_GOODS', confidence: 0.7 };

    // Services
    if (/followers|views|likes|engagement|social media growth/.test(p)) return { type: 'SOCIAL_SERVICE', confidence: 0.85 };
    if (/influencer|shoutout|brand deal|sponsored post|paid promo|promo post|advert post/i.test(p)) return { type: 'INFLUENCER_DEAL', confidence: 0.85 };
    if (/event booking|artist booking|dj booking|venue booking|wedding vendor|event planning|performance booking/i.test(p)) return { type: 'EVENT_BOOKING', confidence: 0.85 };
    if (/concert ticket|event ticket|hotel reservation|show ticket|reservation booking/i.test(p)) return { type: 'TICKET_RESERVATION', confidence: 0.8 };
    if (/dispatch|\bdelivery service\b|courier|dispatch rider|logistics service|\berrand\b|package delivery/i.test(p)) return { type: 'DISPATCH_DELIVERY', confidence: 0.85 };
    if (/coaching|consulting|business coach|advisory|strategy session|mentoring|life coach/i.test(p)) return { type: 'FREELANCE_CONSULTING', confidence: 0.75 };
    if (/tutoring|home lesson|private lesson|online class|study coach/i.test(p)) return { type: 'EDUCATION_SERVICE', confidence: 0.75 };

    // High-value sectors
    if (/\bland\b|property|real estate|plot of land|house sale|duplex|bungalow|\bestate\b|apartment for sale/i.test(p)) return { type: 'REAL_ESTATE', confidence: 0.85 };
    if (/construction|renovation|building work|contractor|plumbing|electrical work|tiling|roofing/i.test(p)) return { type: 'CONSTRUCTION_SERVICE', confidence: 0.8 };

    // Freelance
    if (/video edit|reel edit|animation|motion graphic|after effects|premiere pro|davinci/i.test(p)) return { type: 'FREELANCE_VIDEO', confidence: 0.8 };
    if (/\bbeat\b|music production|fl studio|ableton|audio production|music beat|instrumental/i.test(p)) return { type: 'FREELANCE_MUSIC', confidence: 0.85 };
    if (/code|software|app|website|bot|script|api|development/.test(p)) return { type: 'FREELANCE_CODE', confidence: 0.75 };
    if (/design|logo|figma|ui\/ux|graphic|banner|illustration/.test(p)) return { type: 'FREELANCE_DESIGN', confidence: 0.75 };
    if (/article|writing|copy|content|blog|seo|text/.test(p)) return { type: 'FREELANCE_WRITING', confidence: 0.75 };

    return { type: 'GENERIC', confidence: 0.5 };
}
