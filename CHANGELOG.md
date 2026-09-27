# Changelog

## [1.0.0] — 2026-09-27

Initial production-hardening release for Meri Dukaan.

### Priority 1 — Real Backup / Restore
- Added real JSON backup download.
- Added backup restore flow with validation and overwrite confirmation.
- Added backup-version and storage/quota error handling.

### Priority 2 — Print / Export / Share
- Added working print, export and share workflows for supported business documents and reports.
- Added receipt/report output support using the existing utilities.

### Priority 3 — Robust Sale Validation
- Added store-level validation for sale quantities, prices, discounts, paid amounts, payment modes and customer requirements.
- Prevented invalid sales from mutating stock or balances.

### Priority 4 — Complete Returns Accounting
- Added return validation and return tracking.
- Added partial/full return handling, stock restoration, refund calculation and customer-credit adjustments.

### Priority 5 — Supplier Payments
- Added supplier payment records with payment method, notes and purchase linkage.
- Added supplier balance updates and supplier-payment history support.

### Priority 6 — Accurate Daily Closing
- Added mode-wise daily closing calculations.
- Added cash sales, mixed sales, customer payments, expenses, supplier cash payments, refunds and expected-cash breakdown.

### Priority 7 — Staff Permissions
- Added granular permission keys and enforced permission checks at store/action level.
- Added permission-denied audit logging and staff-management controls.

### Priority 8 — PIN / Security Hardening
- Removed demo PIN leakage from the lock screen.
- Enforced exactly 4-digit PINs.
- Added startup auto-lock support.
- Added SHA-256 PIN hashing with fixed + per-staff salt.
- Added 5-attempt / 30-second lockout protection.

### Priority 9 — Dynamic Dates
- Replaced hardcoded top-bar date output with dynamic current-date formatting.
- Added date refresh support for the live top bar.

### Priority 10 — Demo Data Cleanup & Production Initialization
- Added blank initial state for first-time users.
- Added `isDemoMode` state flag and backward-compatible migration handling.
- Added Reset to Blank and Load Demo Data actions in Settings with confirmation dialogs.
- Added current-mode indicator in Settings.
- Replaced random store IDs with `crypto.randomUUID()`.
- Replaced automatic random purchase invoice numbers with sequential invoice numbering.

### Technical Notes
- Storage key remains `dukaanflow-state-v1`.
- Existing saved user data is preserved during the demo/blank-state migration.
