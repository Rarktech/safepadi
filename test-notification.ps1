# Test Webhook Script for Safeeely Payments
# Run this from your terminal to simulate a successful Flutterwave payment

$TXN_CODE = "TXN-20260321-63E210" # You can change this to any valid txn_code
$WEBHOOK_URL = "http://localhost:3000/api/payments/flutterwave/webhook"
$SECRET_HASH = "Godisalwaysgoodnew1@" # Match this with your .env

Write-Host "🚀 Simulating successful payment for $TXN_CODE..." -ForegroundColor Cyan

$Payload = @{
    event = "charge.completed"
    data = @{
        id = 123456
        tx_ref = "$($TXN_CODE)_$((Get-Date).Ticks)"
        status = "successful"
        amount = 100
        currency = "USD"
    }
} | ConvertTo-Json

$Headers = @{
    "verif-hash" = $SECRET_HASH
    "Content-Type" = "application/json"
}

try {
    $Response = Invoke-RestMethod -Uri $WEBHOOK_URL -Method Post -Body $Payload -Headers $Headers -ErrorAction Stop
    Write-Host "✅ Webhook Result: $($Response)" -ForegroundColor Green
    Write-Host "Check your bot chats for notifications now!" -ForegroundColor Yellow
} catch {
    Write-Host "❌ Webhook Failed: $($_.Exception.Message)" -ForegroundColor Red
}
