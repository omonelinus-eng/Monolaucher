# My Shop — Deployment & Cloud Sync Guide

## What was fixed

1. **Rename**: "DukaBook" → "My Shop" everywhere in the UI (title, login screen, sidebar, browser tab, home-screen app name).
2. **The real bug behind every broken Edit/View/Delete button**: every row's Edit/View/Delete buttons were built like
   `onclick="openProductModal(\'+p.id+\')"` — because of how the quotes were escaped, the browser was literally calling
   `openProductModal("+p.id+")` (the text `+p.id+`, not the real ID) instead of the record's actual ID. That's why editing
   a product/customer/supplier/user always opened a blank form instead of the existing data, and why Delete/View
   silently did nothing. This is now fixed for **Products, Customers (View + Edit), Suppliers, Users, and Categories**.
3. **Purchases**: added full **Edit** and **Delete** support (there wasn't any before). Editing or deleting a purchase
   correctly reverses/reapplies its effect on product stock and the supplier's balance so your numbers stay accurate.
4. **Expenses**: added a real **Edit** button (there wasn't one before) and fixed the same button bug so **Delete** now
   actually works.
5. **Colour theme**: the login screen, primary buttons, focus states, and section headings now use jungle green as the
   dominant colour, with the navy/gold/orange/brown palette kept as supporting accents (same as the rest of the app).
6. **Offline + online + cloud sync**: see the "Cloud Sync" section below.
7. **Installable on phone (PWA)**: added a real `manifest.webmanifest`, proper icons, and a service worker (`sw.js`) so
   Chrome/Safari/Edge will offer "Add to Home Screen" / "Install App", and the app shell loads even with no signal.

## Files in this delivery

```
index.html              ← the app (rename to whatever your host expects, e.g. keep as index.html)
manifest.webmanifest    ← PWA manifest (must be deployed alongside index.html, same folder)
sw.js                   ← service worker for offline loading + installability
icon-192.png            ← app icon
icon-512.png            ← app icon
```

Deploy **all five files together, in the same folder**, to Netlify (drag-and-drop the whole folder, or connect it to
a Git repo). Don't rename `manifest.webmanifest`, `sw.js`, `icon-192.png`, or `icon-512.png` — `index.html` references
them by these exact names.

## Installing on a phone

Once deployed on Netlify (HTTPS is required — Netlify gives you this automatically):

- **Android/Chrome**: open the site → Chrome shows an "Install app" banner, or use ⋮ menu → "Add to Home screen".
- **iPhone/Safari**: open the site → tap the Share icon → "Add to Home Screen".

The app will open full-screen like a native app and continue to work with no internet connection, because the service
worker caches the app shell.

## How offline mode works (out of the box, no setup needed)

All data (products, sales, customers, purchases, expenses, etc.) is saved to the phone/computer's local storage the
instant you make a change — there is no "save" delay and no internet requirement. You can use the entire app with the
phone in airplane mode.

## Cloud Sync (optional, for backup + multi-device use)

By default there's no cloud — data lives only on the device you're using. If you want your data backed up online and
available from more than one device/phone, connect a free Firebase project:

1. Go to <https://console.firebase.google.com>, create a project (free "Spark" plan is enough for a single shop).
2. In the project, go to **Build → Firestore Database → Create database** (start in production mode, pick a region
   close to Kenya, e.g. `europe-west1` or `nam5`).
3. In **Project settings → General**, scroll to "Your apps" → click the `</>` (Web) icon → register an app (any
   nickname) → Firebase shows you a `firebaseConfig` object with `apiKey`, `authDomain`, `projectId`, `storageBucket`,
   `messagingSenderId`, `appId`.
4. In Firestore → **Rules**, set rules that only your app can read/write (simplest for a single shop, no login
   needed on the Firestore side since the app already has its own login):
   ```
   rules_version = '2';
   service cloud.firestore {
     match /databases/{database}/documents {
       match /shops/{shopId} {
         allow read, write: if true; // tighten this later if you add Firebase Auth
       }
     }
   }
   ```
   (For real production security, look into Firebase App Check or Firebase Authentication — ask a developer to help
   lock this down once you're past the pilot stage.)
5. In **My Shop → Settings → Cloud Sync & Offline Mode**, paste in the six values from step 3, pick any unique
   **Shop ID** (e.g. `omlin-main-shop`), and click **Connect**.
6. The status dot in the top bar will turn green ("Online — synced") once connected. If you go offline, it turns
   orange ("Offline — will sync") and automatically uploads the moment you're back online — you don't need to do
   anything.

**Note:** product photos and the shop logo are kept only on the device (not uploaded to Firestore) to keep cloud
sync fast and reliable — everything else (products, stock counts, sales, customers, suppliers, purchases, expenses,
settings) syncs.

## Update — Account-based access + PDF download fix (this delivery)

1. **Accounts instead of demo passwords**: the login screen now has "Sign In" and
   "Create Account" tabs. Creating an account requires a Name, a Password (with a
   show/hide eye toggle), a Confirm Password, and an **Access Code** — the code is
   `Error404`. Get this wrong and the account isn't created.
2. **Private data per account**: each account has its own completely separate shop
   database (products, sales, customers, suppliers, purchases, expenses, etc). Signing
   in as one account never shows another account's data. New accounts start empty —
   there's no shared demo data anymore (you can still load sample data manually from
   Settings → Load Sample Data, for testing).
3. **Fixed: PDF downloads looking broken on laptop/PC**: reports, receipts, and customer
   statements previously rendered off-screen for the PDF export, and the capture was
   affected by the page's scroll position. On tall/wide desktop screens (where the page
   is often scrolled), this shifted/cropped the exported PDF. Phones rarely trigger
   this because the app doesn't usually stay scrolled the same way. The export now
   resets scroll to the top-left and tells the PDF renderer to ignore scroll entirely,
   so downloads look the same and are no longer cut off, regardless of device or how
   far the page had been scrolled.
