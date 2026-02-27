# Setting Up Google Workspace for thindtransport.com

This guide will help you create a professional Google account (email ending in @thindtransport.com) and connect it to your domain.

## Step 1: Sign Up for Google Workspace

1.  Go to [Google Workspace Sign Up](https://workspace.google.com/pricing.html).
2.  **Choose a Plan:** "Business Starter" ($6/user/mo) is usually enough for starting out.
3.  **Enter Business Name:** "Thind Transport LLC".
4.  **Contact Info:** Enter your *current* personal email (e.g., Gmail) and phone number.
5.  **Does your business have a domain?** Select **"Yes, I have one I can use"**.
6.  **Enter Domain:** `thindtransport.com`.
7.  **Create Your User:** Choose your username (e.g., `recruiting`, `info`, or `ranvir`).
    *   This will be your main admin account (e.g., `recruiting@thindtransport.com`).

## Step 2: Verify Domain Ownership

Google needs to know you own the domain.

1.  Log in to the [Google Admin Console](https://admin.google.com) with your new account.
2.  Click **Verify Domain**.
3.  It will give you a **TXT verification record** (a long string of random text).
4.  **Copy** this code.

## Step 3: Add Records in Namecheap

1.  Log in to **Namecheap**.
2.  Go to **Domain List** -> **Manage** (next to `thindtransport.com`).
3.  Go to **Advanced DNS**.
4.  **Add TXT Record** (for verification):
    *   **Type:** TXT Record
    *   **Host:** @
    *   **Value:** (Paste the Google verification code here)
    *   **TTL:** Automatic
    *   Click the green checkmark ✅.

## Step 4: Set Up Email (MX Records)

To receive emails, you need to point your domain's "Mail" traffic to Google.

1.  Still in **Namecheap Advanced DNS**:
2.  Look for "Mail Settings" (usually below the host records).
3.  Select **"Custom MX"**.
4.  **Delete** any existing MX records if you see them.
5.  **Add these 5 records:**

| Type | Host | Value | Priority | TTL |
|------|------|-------|----------|-----|
| MX Record | @ | aspmx.l.google.com | 1 | Automatic |
| MX Record | @ | alt1.aspmx.l.google.com | 5 | Automatic |
| MX Record | @ | alt2.aspmx.l.google.com | 5 | Automatic |
| MX Record | @ | alt3.aspmx.l.google.com | 10 | Automatic |
| MX Record | @ | alt4.aspmx.l.google.com | 10 | Automatic |

6.  Save changes.

## Step 5: Finish Setup in Google

1.  Go back to the **Google Admin Console**.
2.  Click **"Verify my domain"** (or "Activate Gmail").
3.  It might take 5-10 minutes for Google to see the changes you made in Namecheap.
4.  Once verified, you are done! 🎉

## Step 6: (Optional) Create Email Aliases

You don't need to pay for multiple accounts if one person is managing them. You can create "Aliases" for free.

*   **Example:** If your main email is `ranvir@thindtransport.com`, you can create aliases for:
    *   `info@thindtransport.com`
    *   `recruiting@thindtransport.com`
    *   `sales@thindtransport.com`

**How to do it:**
1.  Google Admin > **Users**.
2.  Click your user name.
3.  Click **"Add Alternate Emails"** (Aliases).
4.  Type `info` and save.
5.  Now, emails sent to `info@...` will arrive in your `ranvir@...` inbox!

---

## Important Note for Vercel

Since you are using Vercel for your website hosting, make sure you **DO NOT** delete the A Records or CNAME records pointing to Vercel (76.76.21.21) when you are editing your DNS for email.

*   **A Records / CNAME** = Website (Keep pointing to Vercel)
*   **MX Records** = Email (Point to Google)

