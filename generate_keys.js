const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const targetDir = path.resolve(__dirname, 'packages/whatsapp');

const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
  modulusLength: 2048,
  publicKeyEncoding: {
    type: 'spki',
    format: 'pem'
  },
  privateKeyEncoding: {
    type: 'pkcs8',
    format: 'pem'
  }
});

fs.writeFileSync(path.join(targetDir, 'private.pem'), privateKey);
fs.writeFileSync(path.join(targetDir, 'public.pem'), publicKey);

console.log('✅ RSA Keys generated successfully in packages/whatsapp/');
