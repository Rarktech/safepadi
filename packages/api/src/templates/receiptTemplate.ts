export const generateReceiptTemplate = (data: {
    reference: string;
    date: string;
    buyerName: string;
    sellerName: string;
    productName: string;
    platform: string;
    amount: number;
    currency: string;
    isCompleted?: boolean;
    isMarketing?: boolean;
    isBuyer?: boolean;
}) => {
    const isCompleted = data.isCompleted || false;
    const isMarketing = data.isMarketing || false;
    const referralLink = (data as any).referralLink || 'https://safeeely.com';
    
    return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <style>
            @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;700;800&display=swap');
            
            body {
                font-family: 'Inter', sans-serif;
                margin: 0;
                padding: 0;
                background-color: #ffffff;
                width: 600px;
                box-sizing: border-box;
                min-height: 800px;
                display: flex;
                flex-direction: column;
            }
            
            .header {
                background-color: ${(isMarketing || isCompleted) ? '#ffffff' : '#10B981'};
                padding: ${(isMarketing || isCompleted) ? '30px 30px 10px 30px' : '30px'};
                display: flex;
                flex-direction: ${(isMarketing || isCompleted) ? 'column' : 'row'};
                justify-content: ${(isMarketing || isCompleted) ? 'center' : 'space-between'};
                align-items: center;
                color: ${(isMarketing || isCompleted) ? '#0f172a' : '#ffffff'};
                text-align: ${(isMarketing || isCompleted) ? 'center' : 'left'};
            }

            .marketing-banner {
                display: ${isMarketing ? 'block' : 'none'};
                background-color: #f1f5f9;
                padding: 15px;
                margin: 0 30px 15px 30px;
                border-radius: 15px;
                text-align: center;
                position: relative;
                overflow: hidden;
            }

            .marketing-brand {
                background: #10B981;
                color: white;
                display: inline-flex;
                align-items: center;
                gap: 5px;
                padding: 4px 10px;
                border-radius: 8px;
                font-size: 12px;
                font-weight: 800;
                margin-bottom: 15px;
            }

            .marketing-image-mockup {
                background: white;
                border: 6px solid #334155;
                border-bottom: none;
                width: 140px;
                height: 60px;
                margin: 0 auto;
                border-radius: 10px 10px 0 0;
                position: relative;
                padding: 8px;
                display: flex;
                flex-direction: column;
                gap: 6px;
            }

            .marketing-bubble {
                background: #ffffff;
                border: 0.5px solid #e2e8f0;
                padding: 6px 8px;
                border-radius: 6px;
                font-size: 9px;
                font-weight: 700;
                color: #10B981;
                box-shadow: 0 2px 4px rgba(0,0,0,0.05);
                display: flex;
                align-items: center;
                gap: 4px;
            }

            .success-icon-container {
                position: relative;
                width: 100px;
                height: 100px;
                margin-bottom: 24px;
                display: ${(isMarketing || isCompleted) ? 'flex' : 'none'};
                justify-content: center;
                align-items: center;
            }

            .checkmark-circle {
                width: 60px;
                height: 60px;
                background-color: #10B981;
                border-radius: 50%;
                display: flex;
                justify-content: center;
                align-items: center;
                color: white;
                box-shadow: 0 8px 20px rgba(16, 185, 129, 0.2);
                z-index: 2;
            }
            
            .checkmark-circle svg {
                width: 30px;
                height: 30px;
            }

            .confetti {
                position: absolute;
                width: 130%;
                height: 130%;
                z-index: 1;
            }

            .header-text h1 {
                margin: 0;
                font-size: ${(isMarketing || isCompleted) ? '24px' : '20px'};
                font-weight: 800;
                letter-spacing: -0.5px;
            }
            
            .header-text p {
                margin: 6px 0 0 0;
                font-size: 14px;
                opacity: 0.9;
                color: ${(isMarketing || isCompleted) ? '#64748b' : '#ffffff'};
            }

            .logo-area {
                display: ${(isMarketing || isCompleted) ? 'none' : 'flex'};
                align-items: center;
                gap: 10px;
                background-color: rgba(255,255,255,0.2);
                padding: 8px 12px;
                border-radius: 10px;
            }
            
            .referral-promo {
                display: ${isMarketing ? 'block' : 'none'};
                background: #f8fafc;
                margin: 15px 30px;
                padding: 15px;
                border-radius: 12px;
                text-align: center;
                border: 2px dashed #e2e8f0;
            }

            .referral-title {
                font-weight: 800;
                color: #0f172a;
                margin-bottom: 4px;
                font-size: 14px;
            }

            .referral-link {
                color: #10B981;
                font-weight: 700;
                font-size: 12px;
                word-break: break-all;
            }

            .completed-btn {
                display: ${(isMarketing || isCompleted) ? 'block' : 'none'};
                background-color: #10B981;
                color: white !important;
                text-decoration: none;
                padding: 14px 28px;
                border-radius: 25px;
                font-weight: 700;
                margin: 20px 30px 10px 30px;
                text-align: center;
                font-size: 14px;
                box-shadow: 0 4px 14px rgba(16, 185, 129, 0.3);
            }

            .logo-icon {
                width: 20px;
                height: 20px;
            }

            .logo-text {
                font-weight: 800;
                font-size: 18px;
                letter-spacing: -0.5px;
            }

            .sub-header {
                background-color: #f8fafc;
                padding: 15px 30px;
                display: flex;
                justify-content: space-between;
                align-items: center;
                border-bottom: 1px solid #e2e8f0;
            }

            .transaction-type {
                font-weight: 600;
                color: #334155;
                font-size: 16px;
            }

            .status-badge {
                background-color: #DEF7EC;
                color: #03543F;
                padding: 4px 12px;
                border-radius: 15px;
                font-size: 12px;
                font-weight: 600;
            }

            .details-container {
                padding: 5px 30px;
                flex-grow: 1;
            }

            .detail-row {
                padding: 15px 0;
                border-bottom: 1px solid #f1f5f9;
            }

            .detail-row:last-child {
                border-bottom: none;
            }

            .detail-label {
                color: #94a3b8;
                font-size: 12px;
                margin-bottom: 4px;
            }

            .detail-value {
                color: #0f172a;
                font-size: 14px;
                font-weight: 600;
            }

            .amount-value {
                font-size: 24px;
                color: #0f172a;
                font-weight: 700;
                margin-top: 4px;
            }

            .footer {
                padding: 20px 30px;
                background-color: #ffffff;
                text-align: ${isMarketing ? 'center' : 'left'};
            }
            
            .note {
                display: ${isMarketing ? 'none' : 'flex'};
                gap: 10px;
                color: #64748b;
                font-size: 11px;
                line-height: 1.5;
                margin-bottom: 30px;
            }

            .note strong {
                color: #334155;
            }

            .thanks-area {
                display: ${(isMarketing || isCompleted) ? 'block' : 'none'};
                margin-top: 15px;
                padding-top: 15px;
                border-top: 1px solid #f1f5f9;
            }

            .thanks-text {
                color: #94a3b8;
                font-size: 12px;
                margin-bottom: 10px;
                font-weight: 500;
            }

            .footer-logo {
                display: flex;
                justify-content: center;
                align-items: center;
                gap: 6px;
                color: #10B981;
            }

            .company-info {
                display: ${isMarketing ? 'none' : 'block'};
                color: #94a3b8;
                font-size: 11px;
                line-height: 1.6;
            }
        </style>
    </head>
    <body>
        
        <div class="header">
            <div class="success-icon-container">
                <svg class="confetti" viewBox="0 0 100 100">
                    <circle cx="20" cy="20" r="2" fill="#10B981" />
                    <circle cx="80" cy="15" r="3" fill="#3B82F6" />
                    <circle cx="90" cy="60" r="2" fill="#F59E0B" />
                    <circle cx="10" cy="70" r="3" fill="#EF4444" />
                    <rect x="45" y="5" width="4" height="4" fill="#10B981" transform="rotate(45 47 7)" />
                    <rect x="75" y="85" width="3" height="3" fill="#3B82F6" transform="rotate(15 76 86)" />
                </svg>
                <div class="checkmark-circle">
                    <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="4" stroke-linecap="round" stroke-linejoin="round">
                        <polyline points="20 6 9 17 4 12"></polyline>
                    </svg>
                </div>
            </div>
            <div class="header-text">
                <h1>${(isMarketing || isCompleted) ? 'Transaction Completed!' : 'Escrow Secured'}</h1>
                <p>
                    ${(isMarketing || isCompleted) 
                        ? (data.isBuyer 
                            ? `Funds for <b>${data.productName}</b> have been released to the seller.` 
                            : `Funds for <b>${data.productName}</b> have been released to your account.`)
                        : "Your payment is now safe in escrow."}
                </p>
            </div>
            <div class="logo-area">
                <svg class="logo-icon" viewBox="0 0 24 24" fill="none">
                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
                <span class="logo-text">Safeeely</span>
            </div>
        </div>

        <div class="marketing-banner">
            <div class="marketing-brand">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                </svg>
                PROTECT+
            </div>
            
            ${data.isBuyer ? `
                <h2 style="margin: 0 0 4px 0; font-size: 16px; font-weight: 800;">Safeeely has got you covered</h2>
                <p style="margin: 0 0 15px 0; font-size: 11px; color: #64748b;">stress-free secured payment always</p>
                
                <div class="marketing-image-mockup">
                    <div class="marketing-bubble">
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
                            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                        </svg>
                        Secure payments with Safeeely
                    </div>
                    <div style="position: absolute; right: 15px; top: 15px; background: #fbbf24; width: 24px; height: 24px; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: white; font-weight: 900; font-size: 14px; box-shadow: 0 4px 10px rgba(251, 191, 36, 0.4);">
                        !
                    </div>
                </div>
            ` : `
                <h2 style="margin: 0 0 4px 0; font-size: 16px; font-weight: 800;">Build your Trust Score</h2>
                <p style="margin: 0 0 15px 0; font-size: 11px; color: #64748b;">Every successful sale boosts your global reputation</p>
                
                <div class="marketing-image-mockup" style="border: none; background: #f8fafc; height: 50px; display: flex; align-items: center; justify-content: center;">
                    <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#10B981" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                        <path d="M9 12l2 2 4-4" stroke-width="2.5"/>
                    </svg>
                    <div style="margin-left: 8px; font-size: 10px; font-weight: 800; color: #10B981;">SECURED MERCHANT</div>
                </div>
            `}
        </div>

        <div class="referral-promo">
            <div class="referral-title">Share the word and get commissions! 💰</div>
            <div class="referral-link">${referralLink}</div>
        </div>

        <div class="sub-header" style="display: ${isMarketing ? 'none' : 'flex'}">
            <div class="transaction-type">${isCompleted ? 'Payment Finalized' : 'Escrow Payment Secured'}</div>
            <div class="status-badge">Complete</div>
        </div>

        <div class="details-container">
            <div class="detail-row">
                <div class="detail-label">Reference ID</div>
                <div class="detail-value">${data.reference}</div>
                <div class="detail-label" style="margin-top: 6px;">${data.date}</div>
            </div>

            <div class="detail-row">
                <div class="detail-label">Buyer Profile</div>
                <div class="detail-value">@${data.buyerName.replace(/^@/, '')}</div>
            </div>

            <div class="detail-row" style="display: ${isMarketing ? 'none' : 'block'}">
                <div class="detail-label">Product / Service</div>
                <div class="detail-value">${data.productName}</div>
            </div>

            <div class="detail-row">
                <div class="detail-label">${(isMarketing || isCompleted) ? 'Total Amount' : 'Amount Paid into Escrow'}</div>
                <div class="amount-value">${data.currency} ${data.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
            </div>
        </div>

        <a href="#" class="completed-btn">Carry out another transaction</a>

        <div class="footer">
            <div class="note">
                <strong>Note:</strong> 
                <div>This receipt is computer generated and no signature is required. Funds are securely locked in the Safeeely escrow vault until both parties confirm delivery.</div>
            </div>

            <div class="thanks-area">
                <div class="thanks-text">thanks for using safeeely</div>
                <div class="footer-logo">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                    </svg>
                    <span style="font-weight: 800; font-size: 18px; letter-spacing: -0.5px;">Safeeely</span>
                </div>
            </div>

            <div class="company-info">
                <strong>Safeeely Escrow Services</strong><br/>
                Securing Global Transactions<br/>
                support@safeeely.com
            </div>
        </div>

    </body>
    </html>
    `;
};
