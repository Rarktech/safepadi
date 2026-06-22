// Shared QR canvas-drawing logic (rounded modules + center clear-zone) used by both
// the full branded banner card and the lightweight QR-only crop for the web modal.
const qrCanvasScript = (referralLink: string) => `
    (function () {
        var QR_SIZE  = 380;
        var QR_COLOR = '#0f172a';

        var qrObj = new QRCode(document.getElementById('qr-hidden'), {
            text:         "${referralLink}",
            width:        QR_SIZE,
            height:       QR_SIZE,
            colorDark:    QR_COLOR,
            colorLight:   '#ffffff',
            correctLevel: QRCode.CorrectLevel.H
        });

        var model = qrObj._oQRCode;
        if (!model) return;

        var N  = model.getModuleCount();
        var mp = QR_SIZE / N;

        var canvas = document.getElementById('qr-canvas');
        canvas.width  = QR_SIZE;
        canvas.height = QR_SIZE;
        var ctx = canvas.getContext('2d');

        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, QR_SIZE, QR_SIZE);

        var pad    = mp * 0.06;
        var radius = mp * 0.32;

        function rr(x, y, w, h, r) {
            r = Math.min(r, w / 2, h / 2);
            ctx.beginPath();
            ctx.moveTo(x + r, y);
            ctx.arcTo(x + w, y,     x + w, y + h, r);
            ctx.arcTo(x + w, y + h, x,     y + h, r);
            ctx.arcTo(x,     y + h, x,     y,     r);
            ctx.arcTo(x,     y,     x + w, y,     r);
            ctx.closePath();
            ctx.fill();
        }

        ctx.fillStyle = QR_COLOR;
        for (var row = 0; row < N; row++) {
            for (var col = 0; col < N; col++) {
                if (model.isDark(row, col)) {
                    rr(col * mp + pad, row * mp + pad, mp - 2 * pad, mp - 2 * pad, radius);
                }
            }
        }

        var clearR = QR_SIZE * 0.122;
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(QR_SIZE / 2, QR_SIZE / 2, clearR, 0, Math.PI * 2);
        ctx.fill();
    })();
`;

export const generateReferralTemplate = (data: {
    safetag: string;
    referralLink: string;
    logoDataUrl: string;
    bgDataUrl: string;
}) => {
    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <script src="https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js"></script>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            background: transparent;
            width: 1000px;
            height: 1150px;
            overflow: hidden;
        }
        .canvas {
            width: 1000px;
            height: 1150px;
            position: relative;
            background-image: url("${data.bgDataUrl}");
            background-size: 100% 100%;
            overflow: hidden;
        }
        .qr-zone {
            position: absolute;
            left: 50%;
            top: 59%;
            transform: translate(-50%, -50%);
            display: flex;
            flex-direction: column;
            align-items: center;
        }
        .qr-inner {
            position: relative;
            width: 380px;
            height: 380px;
            display: inline-block;
        }
        #qr-canvas {
            display: block;
            width: 380px;
            height: 380px;
        }
        .qr-logo-overlay {
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            width: 80px;
            height: 80px;
            object-fit: contain;
            pointer-events: none;
        }
        .join-label {
            position: absolute;
            left: 50%;
            top: 83%;
            transform: translateX(-50%);
            font-family: -apple-system, BlinkMacSystemFont, 'Inter', sans-serif;
            font-size: 26px;
            font-weight: 700;
            color: #ffffff;
            white-space: nowrap;
            letter-spacing: 0.3px;
        }
    </style>
</head>
<body>
    <div class="canvas">
        <div class="qr-zone">
            <div class="qr-inner">
                <canvas id="qr-canvas"></canvas>
                ${data.logoDataUrl ? `<img class="qr-logo-overlay" src="${data.logoDataUrl}" alt="" />` : ''}
            </div>
        </div>
        <div class="join-label">Join: @${data.safetag}</div>
    </div>

    <div id="qr-hidden" style="position:fixed;top:-9999px;left:-9999px;visibility:hidden;"></div>

    <script>${qrCanvasScript(data.referralLink)}</script>
</body>
</html>
    `;
};

// Lightweight QR-only crop (380×380, white background, no banner chrome) — used by the
// web dashboard's QR modal, which doesn't have room for the full 1000×1150 branded card.
export const generateReferralQrTemplate = (data: {
    referralLink: string;
    logoDataUrl: string;
}) => {
    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <script src="https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js"></script>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { background: #ffffff; width: 380px; height: 380px; overflow: hidden; }
        .qr-wrap { position: relative; width: 380px; height: 380px; background: #ffffff; }
        #qr-canvas { display: block; width: 380px; height: 380px; }
        .qr-logo-overlay {
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            width: 80px;
            height: 80px;
            object-fit: contain;
            pointer-events: none;
        }
    </style>
</head>
<body>
    <div class="qr-wrap">
        <canvas id="qr-canvas"></canvas>
        ${data.logoDataUrl ? `<img class="qr-logo-overlay" src="${data.logoDataUrl}" alt="" />` : ''}
    </div>

    <div id="qr-hidden" style="position:fixed;top:-9999px;left:-9999px;visibility:hidden;"></div>

    <script>${qrCanvasScript(data.referralLink)}</script>
</body>
</html>
    `;
};
