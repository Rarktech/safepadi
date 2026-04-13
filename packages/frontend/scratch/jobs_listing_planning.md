# Jobs Marketplace - Architecture & Feature Plan

The user wants to plan the **Jobs Marketplace** experience before building the code. This covers both the overarching List View (the directory of all jobs) and the detailed Listing Page for a specific post. The central requirement is accommodating a **dual-sided marketplace** where BOTH buyers and sellers can post, while integrating the Safeeely multi-currency and escrow fee systems.

---

## 1. Jobs Marketplace Overview Page (List View)
The main hub where users browse all posts must be adapted to clearly delineate who is posting what.

### Key Features & Layout Adaptations
*   **Unified but Distinct List**: The `JobsList` component will display both "Wanted" and "Offering" posts in the same list but styled with clear visual indicators (e.g., a colored badge: `Looking to Hire` vs. `Available for Work`).
*   **Dual-Sided Filtering**: The `FilterBar` needs a new primary toggle or dropdown:
    *   *Intent Filter*: Filter by "All", "Hiring" (Buyer posts), or "Offering Services" (Seller posts).
*   **Row Data Adjustments**: 
    *   The `JobRow` component will replace generic terms. For example, instead of just "Price," it might say "Budget" (if hiring) or "Rate" (if offering).
    *   The "Poster" identity will emphasize whether it's an Agency/Freelancer or a Corporate Client.

---

## 2. Detailed Jobs Listing Page (Single Post View)
When a user clicks into a specific post from the List View, the page must accommodate standard job metadata with Safeeely's trust features.

### Key Considerations Based on User Request
*   **Dual-Sided Marketplace Mechanism**: 
    *   The UI must clearly distinguish the context to tell the visitor exactly what the next step is.
*   **Multi-Currency Support**: Budgets/Salaries need currency indicators and perhaps conversion hints.
*   **Fee Handling Reflection**: The listing MUST clearly show who pays the 5% Safeeely fee (Poster Pays, Responder Pays, or Split 50/50), as selected during creation.
*   **Images/Media**: Support for corporate logos, team photos, or freelancer portfolio pieces with a primary image and thumbnail strip.

### Proposed Layout & Features (Dual-Sided approach)

#### A. Header Section (Hero-ish)
*   **Listing Intent Badge**: Prominent badge indicating "HIRING" or "AVAILABLE FOR HIRE" to immediately set context.
*   **Job/Service Title**: Prominent h1.
*   **Poster Info (Client or Agency)**: Name, verified badge, Trust Score snippet.
*   **Key Tags**: Employment Type (Full-time, Contract, Freelance), Location Type (Remote, On-site in [City]), Industry.
*   **Post Date**: "Posted 2 days ago".

#### B. Financials & Escrow Block (The "Multi-Currency & Safeeely" USP)
*   **Budget/Salary/Rate Structure**: Display the price clearly with currency symbols (e.g., `Budget: $10,000 - $15,000 USD` or `Rate: ₦500,000/month`).
*   **Fee Structure Breakdown**: A very clear badge explaining the 5% fee setup. E.g., "Safeeely Escrow Fee: 50/50 Split" or "Poster Covers Escrow Fee".
*   **Contextual Primary CTA**: 
    *   If it's a *Buyer's Post* ("Hiring"): Button says "Apply via Safeeely" or "Submit Proposal".
    *   If it's a *Seller's Post* ("Offering"): Button says "Hire me via Safeeely" or "Initiate Escrow".

#### C. Media Gallery (Left side of a 2-column layout)
*   Space for pitch decks, previous work examples, corporate branding, or portfolio shots.
*   Support the Primary Image (logo/main visual) and thumbnail strip below it.

#### D. Job/Service Details (Right side)
*   **Description**: "About the Role" (for buyers) or "About My Services" (for sellers). Expandable text area.
*   **Requirements/Skills/Deliverables**: Bullet points or pill-shaped tags detailing what is needed or what is offered.
*   **Key Features (From creation form)**: E.g., 'Remote OK', 'Benefits Included', 'Fast Delivery'.

#### E. Poster Deep Dive & Trust Section (Bottom Section)
*   **Verified Feedback**: Pulling in the review system ("Client Feedback" or "Freelancer History").
*   **Trust Score Dial**: The animated dial component to build confidence in the poster.
*   **Other Open Listings**: "Other listings by [Poster Name]".

---

## 3. Specific Features to Discuss with User

*   **Currency Display**: How do we handle the currency viewing experience? Does the viewer select a preferred currency and see a live estimated conversion, or do we strictly display the poster's base currency?
*   **Application/Hire Flow (Recommended approach)**: 
    *   **Goal**: The user wants people to jump straight into chat but ensure they know to use Safeeely for payment.
    *   **The Method (Pre-Chat Warning Interstitial)**:
        1. **Primary Button**: The main CTA simply says "Message [Poster Name]" or "Discuss Role".
        2. **The Interception Modal**: When clicked, a clean, branded modal pops up. 
           * *Headline*: "Protect Your Deal 🛡️"
           * *Message*: "You are about to chat directly with [Name]. Please remember, for your financial protection, **always return to Safeeely** to fund the escrow contract before starting any work or sending any assets."
           * *Action*: A button saying "I Understand, Open Chat" (which then redirects to WhatsApp/Telegram).
        3. **Secondary Base Button**: Next to the chat button on the listing, have an "Initiate Escrow" button. This way, they chat first, agree on terms, and come right back to the listing to click "Initiate Escrow" when ready.
*   **Listing Differentiation**: How distinct should the styling be between "Hiring" posts and "Offering" posts? Simply a tag/badge, or completely different accent colors?
