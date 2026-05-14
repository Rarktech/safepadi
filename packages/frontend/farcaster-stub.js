// Stub for @farcaster/miniapp-sdk — only needed inside Farcaster mini-app contexts.
// @chainrails/react dynamically imports this with a .catch() fallback; this stub
// prevents Turbopack from failing the build when the real package isn't installed.
module.exports = { sdk: null };
