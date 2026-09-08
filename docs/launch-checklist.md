# Before accepting live payments

This checklist is an activation gate for an unconnected prelaunch integration.

1. Use a separate Supabase development project first. Apply the migrations and optional seed. Confirm no security-advisor errors.
2. Create customer A, customer B, and owner accounts. Verify email codes, recovery codes, password changes, logout, refresh, and owner TOTP.
3. Through direct REST requests as customer A, try to read customer B's addresses, orders, saved items, return requests and private storage files. All must be denied or return no data. Do not test only hidden UI controls.
4. Attempt direct updates to owner_roles, product price, variants, reserved stock, order totals, paid status, audit events, or another profile. Non-owner attempts must fail. Owner actions without AAL2 must fail.
5. Create a product with one unit in a single option. Start two distinct checkouts concurrently. Exactly one may reserve the unit; available/reserved counts must remain nonnegative. Expire the abandoned reservation and verify release.
6. Edit an active cart's prices, shipping charges, coupon discount, user ID, and action name in browser requests. Server-selected actions and database totals must prevail.
7. Complete a test payment. Compare order/reference/amount/currency with Paystack. Reload callbacks and replay signed events. There must be one stock movement per SKU, one paid order, and one receipt job.
8. Reject invalid signatures, null/incorrect amounts, wrong currency/environment/reference, and a provider transaction already assigned to another order. A pending/failed/cancelled payment must not fulfill.
9. Expire a reservation, buy its stock through another order, then verify the late payment. It must enter reconciliation rather than oversell. Verify scheduler fairness with more than 40 pending/expired orders.
10. Simulate a provider initialization timeout. Reconcile the existing reference before restarting. Confirm expired checkout keys can be renewed by an explicit retry.
11. Test a full refund and a webhook that arrives before the provider response is stored. The inbox must preserve it for later matching. An ambiguous request must not issue a duplicate refund. Inspect the item before manually restocking.
12. Edit a purchased product name/price and customer's current address. Historical order items and delivery snapshots must remain unchanged.
13. Test failed emails and scheduler retries. The paid order must survive. Inspect exhausted jobs and unmatched refund events.
14. Confirm each actual product's images, specifications, option names, stock, prices, delivery zones, tax handling, return policy, privacy notice and business details. Remove sample claims and demonstration images where inappropriate.
15. Test product links, page refresh, mobile checkout keyboard, keyboard-only menus/dialogs, 200% text zoom, form labels, account and payment return routes on the HTTPS deployed origin.
16. Check the repository and browser bundle for secrets. Set up database plus Storage backups using features in the purchased Supabase plan, and rehearse restoration.
17. Only after the above passes: approve real merchant mode and enable STORE_LIVE on the frontend and Edge Function. Monitor early orders and payment reconciliation.

Known deferred scope is documented in README.md, including full media-upload UI, editable categories/policies, partial refunds, guest recovery links, automated courier connections, and automatic recovery of an ambiguous payment initialization. Resolve requirements that your launch depends on before trading.
