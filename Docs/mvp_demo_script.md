# Tawlax MVP Demo Script

## Setup

Run the local stack and seed the Barka demo data:

```powershell
docker compose up -d
docker compose exec backend python manage.py seed_demo_data
```

Customer table URL:

```text
http://192.168.1.12:3000/t/barka_table_001
```

Staff login URL:

```text
http://192.168.1.12:3000/staff/login
```

Demo credentials:

```text
Admin:   barka_admin / Password123!
Kitchen: barka_kitchen / Password123!
Waiter:  barka_waiter / Password123!
Cashier: barka_cashier / Password123!
```

## Demo Flow

1. Customer scans `barka_table_001`.
2. Show Barka branding, Arabic/English toggle, food images, and meals-first menu.
3. Add `ربع فرخة بروستد`, set quantity to `2`, and add a note such as `Extra spicy`.
4. Place the order and keep the order status page open.
5. Login as kitchen and move the order `NEW -> PREPARING -> READY`.
6. Confirm the customer order page updates in realtime.
7. Login as waiter and mark the ready order as served.
8. Login as cashier, open Table 1, verify the order breakdown, and record cash payment.
9. Login as admin and show:
   - Menu/category image management
   - Branding settings
   - Tables
   - Staff
   - Orders
   - Analytics
   - Audit log

## Validation Commands

```powershell
docker compose exec backend python manage.py check
docker compose exec backend python manage.py test --noinput
docker compose exec frontend npm run build
docker compose exec frontend npm run lint
```

Expected result:

```text
Backend tests pass.
Django system check has no issues.
Frontend build succeeds.
ESLint reports 0 errors.
```
