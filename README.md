# Dave Auto Hub — Production-Ready Foundation

This package provides a deployable Node/Express foundation for Dave Auto Hub.

## Included
- Customer vehicle showroom
- Search and category filtering
- Vehicle database (SQLite)
- Private admin login
- Add/edit/delete vehicles
- Reservation database
- WhatsApp reservation handoff
- Paystack server-side initialization endpoint
- Paystack webhook endpoint
- Helmet security headers and request logging

## Payment
Paystack is selected because its Ghana checkout supports cards and Mobile Money. Do not put the secret key in browser code.

Create `.env` from `.env.example` and set:
- PAYSTACK_SECRET_KEY
- ADMIN_USERNAME
- ADMIN_PASSWORD
- SESSION_SECRET
- BASE_URL

The Paystack webhook should point to `/api/paystack/webhook` on the deployed HTTPS domain.

## Important production hardening still required before accepting real money
- Use HTTPS and a managed host.
- Replace the in-memory admin sessions with secure, persistent sessions.
- Add rate limiting and CSRF protection for admin mutations.
- Use a strong password hash (Argon2/bcrypt) rather than a plain environment password.
- Store uploaded images in object storage rather than arbitrary remote URLs.
- Add payment reference linking to the exact reservation and verify webhook signatures.
- Configure backups, monitoring and error alerts.
- Complete Paystack merchant/KYC onboarding and confirm the channels available to Dave Auto Hub.

The site is intentionally designed so the payment secret remains server-side.
