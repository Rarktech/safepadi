const REVIEWS_URL_BASE = process.env.REVIEWS_URL || 'https://safeeely.com';

export interface InvoiceData {
    txnCode: string;
    txnId: string;
    invoiceDate: string;
    seller: { firstName: string; lastName: string; safetag: string; email: string };
    buyer: { firstName: string; lastName: string; safetag: string; email: string };
    productName: string;
    description?: string;
    transactionType: 'ONE_TIME' | 'MILESTONE';
    milestones?: { title: string; amount: number }[];
    amount: number;
    feeAmount: number;
    totalAmount: number;
    feeAllocation: 'buyer' | 'seller' | 'split';
    currency: string;
}

function esc(s: string): string {
    return String(s ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

export function generateInvoiceTemplate(data: InvoiceData): string {
    const logoUrl = `${REVIEWS_URL_BASE}/logo-main.svg`;
    const payUrl = `${REVIEWS_URL_BASE}/pay/${data.txnId}`;

    const feeWho = data.feeAllocation === 'buyer' ? 'paid by buyer'
        : data.feeAllocation === 'seller' ? 'paid by seller'
        : 'split 50/50';

    let itemRows = '';
    if (data.transactionType === 'MILESTONE' && data.milestones?.length) {
        itemRows += `
            <tr>
                <td>
                    <span class="item-name">${esc(data.productName)}</span>
                    ${data.description ? `<span class="item-desc">${esc(data.description)}</span>` : ''}
                </td>
                <td class="item-amount">—</td>
            </tr>`;
        data.milestones.forEach((m, i) => {
            itemRows += `
            <tr>
                <td><span class="item-name" style="font-weight:500;padding-left:16px">Phase ${i + 1}: ${esc(m.title)}</span></td>
                <td class="item-amount">${m.amount.toLocaleString()} ${esc(data.currency)}</td>
            </tr>`;
        });
    } else {
        itemRows = `
            <tr>
                <td>
                    <span class="item-name">${esc(data.productName)}</span>
                    ${data.description ? `<span class="item-desc">${esc(data.description)}</span>` : ''}
                </td>
                <td class="item-amount">${data.amount.toLocaleString()} ${esc(data.currency)}</td>
            </tr>`;
    }

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
      background: #ffffff;
      width: 794px;
      padding: 60px;
      color: #0f172a;
    }
    .header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 48px;
    }
    .logo { height: 44px; width: auto; }
    .invoice-badge {
      background: #4F46E5;
      color: #ffffff;
      border-radius: 12px;
      padding: 18px 26px;
      text-align: right;
      min-width: 200px;
    }
    .badge-label {
      font-size: 10px;
      font-weight: 700;
      letter-spacing: 2px;
      text-transform: uppercase;
      opacity: 0.75;
      margin-bottom: 6px;
    }
    .badge-number { font-size: 20px; font-weight: 800; }
    .from-block {
      margin-bottom: 40px;
      padding-bottom: 40px;
      border-bottom: 1px solid #e2e8f0;
    }
    .from-name { font-size: 22px; font-weight: 700; margin-bottom: 8px; }
    .from-sub { font-size: 13px; color: #64748b; line-height: 1.8; }
    .meta-row {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 48px;
    }
    .section-label {
      font-size: 10px;
      font-weight: 700;
      letter-spacing: 1.5px;
      text-transform: uppercase;
      color: #94a3b8;
      margin-bottom: 12px;
    }
    .bill-name { font-size: 15px; font-weight: 700; margin-bottom: 4px; }
    .bill-sub { font-size: 13px; color: #475569; line-height: 1.7; }
    .meta-info { text-align: right; }
    .meta-item { margin-bottom: 14px; }
    .meta-label {
      font-size: 10px;
      font-weight: 700;
      letter-spacing: 1.5px;
      text-transform: uppercase;
      color: #94a3b8;
      display: block;
      margin-bottom: 3px;
    }
    .meta-value { font-size: 14px; font-weight: 600; }
    .items-table { width: 100%; border-collapse: collapse; margin-bottom: 32px; }
    .items-table thead tr { border-bottom: 2px solid #0f172a; }
    .items-table thead th {
      font-size: 11px;
      font-weight: 700;
      letter-spacing: 1px;
      text-transform: uppercase;
      padding: 12px 0;
      text-align: left;
    }
    .items-table thead th.amount-col { text-align: right; }
    .items-table tbody tr { border-bottom: 1px solid #f1f5f9; }
    .items-table tbody td { padding: 18px 0; font-size: 14px; vertical-align: top; }
    .item-name { font-weight: 600; display: block; }
    .item-desc { font-size: 12px; color: #64748b; margin-top: 5px; display: block; line-height: 1.6; }
    .item-amount { text-align: right; font-weight: 600; white-space: nowrap; }
    .totals { margin-left: auto; width: 300px; margin-bottom: 48px; }
    .total-row { display: flex; justify-content: space-between; padding: 8px 0; font-size: 14px; }
    .total-label { color: #64748b; }
    .total-value { font-weight: 600; }
    .total-due { border-top: 2px solid #0f172a; margin-top: 8px; padding-top: 14px !important; }
    .total-due .total-label { font-weight: 700; color: #0f172a; font-size: 15px; }
    .total-due .total-value { font-size: 17px; color: #0f172a; }
    .pay-wrap { text-align: center; margin: 48px 0 40px; }
    .pay-btn {
      background: #10B981;
      color: #ffffff;
      text-decoration: none;
      padding: 18px 64px;
      border-radius: 12px;
      font-size: 16px;
      font-weight: 700;
      display: inline-block;
    }
    .footer {
      border-top: 1px solid #e2e8f0;
      padding-top: 24px;
      text-align: center;
      color: #94a3b8;
      font-size: 12px;
    }
  </style>
</head>
<body>

  <div class="header">
    <img class="logo" src="${logoUrl}" alt="Safeeely" />
    <div class="invoice-badge">
      <div class="badge-label">Invoice</div>
      <div class="badge-number">${esc(data.txnCode)}</div>
    </div>
  </div>

  <div class="from-block">
    <div class="from-name">${esc(data.seller.firstName)} ${esc(data.seller.lastName)}</div>
    <div class="from-sub">@${esc(data.seller.safetag)}<br>${esc(data.seller.email)}<br>safeeely.com</div>
  </div>

  <div class="meta-row">
    <div>
      <div class="section-label">Bill To</div>
      <div class="bill-name">${esc(data.buyer.firstName)} ${esc(data.buyer.lastName)}</div>
      <div class="bill-sub">@${esc(data.buyer.safetag)}<br>${esc(data.buyer.email)}</div>
    </div>
    <div class="meta-info">
      <div class="meta-item">
        <span class="meta-label">Invoice Date</span>
        <span class="meta-value">${esc(data.invoiceDate)}</span>
      </div>
      <div class="meta-item">
        <span class="meta-label">Transaction #</span>
        <span class="meta-value">${esc(data.txnCode)}</span>
      </div>
      <div class="meta-item">
        <span class="meta-label">Secured By</span>
        <span class="meta-value">Safeeely Escrow</span>
      </div>
    </div>
  </div>

  <table class="items-table">
    <thead>
      <tr>
        <th>Description</th>
        <th class="amount-col">Amount</th>
      </tr>
    </thead>
    <tbody>${itemRows}</tbody>
  </table>

  <div class="totals">
    <div class="total-row">
      <span class="total-label">Subtotal</span>
      <span class="total-value">${data.amount.toLocaleString()} ${esc(data.currency)}</span>
    </div>
    <div class="total-row">
      <span class="total-label">Platform Fee (${esc(feeWho)})</span>
      <span class="total-value">${data.feeAmount.toFixed(2)} ${esc(data.currency)}</span>
    </div>
    <div class="total-row total-due">
      <span class="total-label">Total Due</span>
      <span class="total-value">${data.totalAmount.toFixed(2)} ${esc(data.currency)}</span>
    </div>
  </div>

  <div class="pay-wrap">
    <a href="${payUrl}" class="pay-btn">&#x1F4B3;&nbsp; Pay with Safeeely</a>
  </div>

  <div class="footer">
    Safeeely &nbsp;&middot;&nbsp; Secure Escrow Platform &nbsp;&middot;&nbsp; safeeely.com &nbsp;&middot;&nbsp; support@safeeely.com
  </div>

</body>
</html>`;
}
