const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

const BADGES_DIR = path.join(__dirname, '../frontend/public/badges');
const OUT_DIR = path.join(__dirname, 'badge-card-outputs');
fs.mkdirSync(OUT_DIR, { recursive: true });

const BADGE_LAYERS = [
  { file: '01_background_image.webp',          condition: 'always' },
  { file: '02_badge_verified_user_white.webp',  condition: 'locked', key: 'verified_kyc'   },
  { file: '03_badge_early_bird_white.webp',     condition: 'locked', key: 'early_bird'     },
  { file: '04_badge_verified_user.webp',        condition: 'badge',  key: 'verified_kyc'   },
  { file: '05_badge_whale_buyer_white.webp',    condition: 'locked', key: 'whale_buyer'    },
  { file: '06_badge_zero_drama_white.webp',     condition: 'locked', key: 'zero_drama'     },
  { file: '07_badge_trusted_seller_white.webp', condition: 'locked', key: 'trusted_seller' },
  { file: '08_badge_trusted_seller.webp',       condition: 'badge',  key: 'trusted_seller' },
  { file: '09_badge_early_bird.webp',           condition: 'badge',  key: 'early_bird'     },
  { file: '10_badge_whale_buyer.webp',          condition: 'badge',  key: 'whale_buyer'    },
  { file: '11_badge_zero_drama.webp',           condition: 'badge',  key: 'zero_drama'     },
];

async function generateCard(label, earnedKeys) {
  const activeLayers = BADGE_LAYERS.filter(l =>
    l.condition === 'always'
    || (l.condition === 'badge'  &&  earnedKeys.has(l.key))
    || (l.condition === 'locked' && !earnedKeys.has(l.key))
  );

  const [base, ...overlays] = activeLayers;
  const composite = await sharp(path.join(BADGES_DIR, base.file))
    .composite(overlays.map(l => ({ input: path.join(BADGES_DIR, l.file), top: 0, left: 0 })))
    .webp({ quality: 85 })
    .toBuffer();

  const outFile = path.join(OUT_DIR, `${label}.webp`);
  fs.writeFileSync(outFile, composite);
  const earned = activeLayers.filter(l => l.condition === 'badge').map(l => l.key);
  console.log(`✅ ${label}.webp  [earned: ${earned.length ? earned.join(', ') : 'none'}]`);
}

const scenarios = [
  { label: '01_no_badges',            earned: [] },
  { label: '02_early_bird_only',      earned: ['early_bird'] },
  { label: '03_whale_buyer_only',     earned: ['whale_buyer'] },
  { label: '04_trusted_seller_only',  earned: ['trusted_seller'] },
  { label: '05_zero_drama_only',      earned: ['zero_drama'] },
  { label: '06_verified_kyc_only',    earned: ['verified_kyc'] },
  { label: '07_all_badges',           earned: ['early_bird', 'whale_buyer', 'trusted_seller', 'zero_drama', 'verified_kyc'] },
];

(async () => {
  console.log(`\nBadge card test — output folder:\n${OUT_DIR}\n`);
  for (const s of scenarios) {
    await generateCard(s.label, new Set(s.earned));
  }
  console.log('\nDone. Open the output folder to inspect each card.');
})();
