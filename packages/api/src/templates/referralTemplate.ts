export const generateReferralTemplate = (data: { safetag: string; referralLink: string }) => {
    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet">
    <script src="https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js"></script>
    <style>
        :root {
            --brand-green: #16a34a;
            --brand-dark: #0f172a;
            --light-green: #e6f4ea;
            --lime: #ccfe0e;
        }
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: 'Plus Jakarta Sans', sans-serif;
            background: transparent;
            width: 1000px;
            height: 1150px;
            display: flex;
            align-items: center;
            justify-content: center;
            overflow: hidden;
        }
        .canvas {
            width: 1000px;
            height: 1150px;
            background: #16a34a; /* Safeeely color scheme */
            position: relative;
            display: flex;
            flex-direction: column;
            align-items: center;
            color: white;
            padding: 50px 40px;
            box-sizing: border-box;
        }
        
        /* 4-point sparkle stars like reference */
        .sparkle-1 {
            position: absolute; top: 220px; left: 160px; width: 40px; height: 40px;
            color: #0f172a; transform: rotate(-15deg); z-index: 10;
        }
        .sparkle-2 {
            position: absolute; top: 480px; right: 150px; width: 30px; height: 30px;
            color: #0f172a; transform: rotate(15deg); z-index: 10;
        }

        /* Top Brand Logo */
        .header {
            display: flex; align-items: center; justify-content: center; gap: 12px; margin-bottom: 30px;
            z-index: 10;
        }
        .header-text { font-size: 32px; font-weight: 800; letter-spacing: -1px; color: white; }
        
        /* Hero Text */
        .hero {
            text-align: center; z-index: 10; font-size: 38px; font-weight: 800;
            line-height: 1.25; margin-bottom: 45px; max-width: 820px; color: #111827;
            letter-spacing: -1px; text-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        
        /* Central Cards Container */
        .cards-container {
            position: relative; z-index: 20; width: 750px; height: 380px;
            transform-style: preserve-3d; perspective: 1000px; margin-bottom: 40px;
        }
        
        .chat-card {
            position: absolute; background: #0f172a; border-radius: 40px; padding: 25px;
            display: flex; align-items: center; gap: 25px; 
            box-shadow: 0 25px 50px rgba(0,0,0,0.3); width: 660px;
            border: 2px solid rgba(255,255,255,0.05);
            background-image: linear-gradient(145deg, #1e293b, #0f172a);
        }
        
        .card-1 {
            top: 0; left: 0; transform: rotate(-3deg); z-index: 1;
        }
        .card-2 {
            top: 180px; right: 0; transform: rotate(2deg); z-index: 2;
        }
        
        .icon-box {
            width: 105px; height: 105px; background: #ffffff; border-radius: 28px;
            display: flex; align-items: center; justify-content: center; flex-shrink: 0;
            box-shadow: 0 10px 25px rgba(0,0,0,0.15);
        }
        .card-1 .icon-box svg { width: 55px; height: 55px; fill: #5865F2; } /* Discord Blurple */
        .card-2 .icon-box svg { width: 55px; height: 55px; fill: #25D366; } /* WhatsApp Green */
        
        .card-content { display: flex; flex-direction: column; justify-content: center; gap: 8px; }
        .card-name { font-size: 24px; font-weight: 800; color: white; }
        .card-text { font-size: 20px; font-weight: 500; color: #e2e8f0; line-height: 1.4; }
        
        /* Script Text Section */
        .script-box {
            text-align: center; max-width: 800px; margin-top: 15px; margin-bottom: 35px;
            z-index: 30;
        }
        .script-text {
            font-size: 20px; font-weight: 600; color: white; line-height: 1.6;
            margin: 0; padding: 0; text-shadow: 0 2px 10px rgba(0,0,0,0.15);
        }
        
        /* QR Code section */
        .qr-wrapper {
            background: white; border-radius: 24px; padding: 12px;
            box-shadow: 0 10px 25px rgba(0,0,0,0.2); display: inline-block;
            margin-bottom: 20px; z-index: 30;
        }
        .safetag-label {
            background: #0f172a; color: white; font-size: 16px; font-weight: 800;
            padding: 8px 24px; border-radius: 20px; display: inline-block;
            margin-top: -15px; z-index: 35; position: relative;
            border: 3px solid #16a34a; margin-bottom: -5px;
        }
        
        /* Trust Proof Section */
        .trust-section {
            display: flex; align-items: center; justify-content: center; gap: 15px;
            margin-top: auto; padding-bottom: 10px; z-index: 30;
        }
        .avatars { display: flex; align-items: center; }
        .avatars img { 
            width: 42px; height: 42px; background: white; border-radius: 50%;
            box-shadow: 0 4px 10px rgba(0,0,0,0.15); margin-left: -12px;
            border: 3px solid #16a34a; z-index: 4; object-fit: cover;
        }
        .avatars img:first-child { margin-left: 0; z-index: 5; }
        .avatars img:nth-child(2) { z-index: 4; }
        .avatars img:nth-child(3) { z-index: 3; }
        .avatars img:nth-child(4) { z-index: 2; }
        .trust-text { font-size: 17px; font-weight: 800; color: #0f172a; }

    </style>
</head>
<body>
    <div class="canvas">
        
        <!-- Sparkles -->
        <svg class="sparkle-1" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 0C12 6.627 6.627 12 0 12C6.627 12 12 17.373 12 24C12 17.373 17.373 12 24 12C17.373 12 12 6.627 12 0Z" />
        </svg>
        <svg class="sparkle-2" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 0C12 6.627 6.627 12 0 12C6.627 12 12 17.373 12 24C12 17.373 17.373 12 24 12C17.373 12 12 6.627 12 0Z" />
        </svg>

        <div class="header">
            <!-- Safeeely Logo White -->
            <div style="width:40px; height:40px; background:transparent; display:flex; align-items:center; justify-content:center; color:white;">
                <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
            </div>
            <div class="header-text">Safeeely</div>
        </div>
        
        <div class="hero" style="color: white;">
            Never pay online without using Safeeely,<br>if you want to secure your money
        </div>
        
        <div class="cards-container">
            <!-- Card 1: Discord -->
            <div class="chat-card card-1">
                <div class="icon-box">
                    <svg viewBox="0 0 127.14 96.36">
                        <path d="M107.7,8.07A105.15,105.15,0,0,0,81.47,0a72.06,72.06,0,0,0-3.36,6.83A97.68,97.68,0,0,0,49,6.83,72.37,72.37,0,0,0,45.64,0,105.89,105.89,0,0,0,19.39,8.09C2.79,32.65-1.71,56.6.54,80.21h0A105.73,105.73,0,0,0,32.71,96.36,77.7,77.7,0,0,0,39.6,85.25a68.42,68.42,0,0,1-10.85-5.18c.91-.66,1.8-1.34,2.66-2a75.57,75.57,0,0,0,64.32,0c.87.71,1.76,1.39,2.66,2a68.68,68.68,0,0,1-10.87,5.19,77,77,0,0,0,6.89,11.1A105.25,105.25,0,0,0,126.6,80.22h0C129.24,52.84,122.09,29.11,107.7,8.07ZM42.45,65.69C36.18,65.69,31,60,31,53s5-12.74,11.43-12.74S54,46,53.89,53,48.84,65.69,42.45,65.69Zm42.24,0C78.41,65.69,73.31,60,73.31,53s5-12.74,11.43-12.74S96.1,46,96,53,91,65.69,84.69,65.69Z"/>
                    </svg>
                </div>
                <div class="card-content">
                    <div class="card-name">Discord Buyer</div>
                    <div class="card-text">I want to buy your account, but how do we trade safely?</div>
                </div>
            </div>

            <!-- Card 2: WhatsApp -->
            <div class="chat-card card-2">
                <div class="icon-box">
                    <svg viewBox="0 0 24 24">
                        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 0 0-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z"/>
                    </svg>
                </div>
                <div class="card-content">
                    <div class="card-name">@${data.safetag}</div>
                    <div class="card-text">Let's use Safeeely! Your money stays in escrow until I deliver.</div>
                </div>
            </div>
        </div>
        
        <div style="display: flex; flex-direction: column; align-items: center;">
            <div class="qr-wrapper">
                <div id="qrcode"></div>
            </div>
            <div class="safetag-label">@${data.safetag}</div>
        </div>
        
        <div class="script-box">
            <p class="script-text">
                Hi guys! I'm using Safeeely to pay securely online.<br>
                Never pay for anything online without using Safeeely.<br>
                Because without Safeeely your transaction is not safe, I can guarantee that.
            </p>
        </div>

        <div class="trust-section">
            <div class="avatars">
                <img src="https://i.pravatar.cc/100?img=33" alt=""/>
                <img src="https://i.pravatar.cc/100?img=47" alt=""/>
                <img src="https://i.pravatar.cc/100?img=12" alt=""/>
                <img src="https://i.pravatar.cc/100?img=5" alt=""/>
            </div>
            <div class="trust-text">
                Trusted by 20k+ users
            </div>
        </div>
        
    </div>
    
    <script>
        new QRCode(document.getElementById("qrcode"), {
            text: "${data.referralLink}",
            width: 220,
            height: 220,
            colorDark: "#0f172a",
            colorLight: "#ffffff",
            correctLevel: QRCode.CorrectLevel.H
        });
    </script>
</body>
</html>
    `;
};
