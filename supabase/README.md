# Supabase setup (AI-ADPD class #6)

The website reads its faculty data from Supabase. Follow these steps once.

## 1. Create the project
1. Go to <https://supabase.com> → **Sign Up** → **Continue with GitHub**.
2. **New Project** → name it `immba-backend`, choose a region near Taiwan
   (Northeast Asia / Tokyo) and set a database password.
   Keep that password safe — it is **not** needed in the website code.

## 2. Create the tables
1. Open **SQL Editor** → **New query**.
2. Paste the whole content of [`schema.sql`](schema.sql) → **Run**.
   It creates the `faculty` table, the `admin_profiles` table with the
   three roles, the row level security policies and the
   `faculty-photos` storage bucket.
3. Optional but recommended: run [`seed.sql`](seed.sql) the same way to
   load the 19 faculty members of the program.

## 3. Copy the connection details
**Project Settings → API**, copy:
- **Project URL** → `https://xxxx.supabase.co`
- **anon public key** → long string

The anon key is meant to be public (it ships inside front-end code and is
protected by the row level security policies). Never copy the
`service_role` key or the database password into the website.

## 4. Connect the website
- **Locally**: paste both values into `assets/js/supabase-config.js`.
- **On Vercel**: Project → **Settings → Environment Variables**, add
  `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`, then redeploy.
  `scripts/build-config.sh` writes the config file during the build.

## 5. Become the first super administrator
1. Open `admin.html` → **Create an account** → confirm the verification
   email that Supabase sends you.
2. Back in the SQL Editor, run (with your own email):

   ```sql
   update public.admin_profiles
      set role = 'super_admin'
    where email = 'you@example.com';
   ```

3. Sign in again. From now on, new people who register appear in the
   **Administrators** tab as `pending`, and you approve or reject them
   from there.

## Roles
| Role | Can do |
|---|---|
| `pending` | Registered and verified, but no access to the back office |
| `admin` | Manage faculty: create, edit, delete, reorder, upload photos |
| `super_admin` | Everything, plus approve or reject other administrators |

## Faculty photos
`supabase/faculty-photos/` holds the 19 official photos, named so they sort
in the same order as the faculty list. To publish them:

1. Supabase → **Storage** → bucket **faculty-photos** → **Upload files** →
   select every file in `supabase/faculty-photos/`.
2. SQL Editor → run [`photos.sql`](photos.sql), which sets `image_url` on
   each faculty row to the public URL of its photo.

From then on, photos are managed from the back office (`admin.html`):
editing a faculty member and choosing a file uploads it to the same bucket.

Photos belong to Fu Jen Catholic University, College of Management; they are
reused here for a university course assignment.

## Marketplace (class #10)
[`marketplace.sql`](marketplace.sql) adds the student-to-student marketplace:
`shop_profiles`, `products`, `orders` and `order_items`, the storage bucket
`product-images`, and the two functions that are the only way to write an
order.

| Role | How you get it | Can do |
|---|---|---|
| Visitor | not signed in | browse the active listings |
| Buyer | any signed-in account | cart, place orders, confirm receipt, own history |
| Seller | `shop_profiles.seller_status = 'approved'` | list products, manage stock, confirm payment, ship, sales records, CSV |
| Platform admin | `admin_profiles.role` is `admin` or `super_admin` | see every transaction, approve or suspend sellers — read-only on orders |

Two things are deliberately *not* possible from the browser:

* **Writing an order directly.** There is no insert or update policy on
  `orders`. `rpc_place_order` locks the product rows, re-reads price and
  stock from the database and splits the cart into one order per seller;
  `rpc_advance_order` is the only door into the status machine
  `awaiting_payment → ready_to_ship → shipped → completed`, and it checks
  who is calling: only the seller may confirm a payment or a shipment.
* **Deleting a transaction.** Cancelling is allowed only while an order is
  still waiting for payment (and it returns the stock). Everything from
  "payment confirmed" onwards stays as a business record.

Every change to a product or an order is written to `audit_log` by the
`log_audit_any()` trigger, so the Activity log in the back office also
covers the marketplace.

Approve the first seller with:

```sql
update public.shop_profiles
   set seller_status = 'approved', approved_at = now()
 where email = 'you@example.com';
```
