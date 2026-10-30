# QuickBite — blue frontend demo

Unzip the folder, then open **login.html** in your browser.

The website uses HTML, CSS and plain JavaScript. It keeps the supplied navy and sky-blue student website and adds matching admin, kitchen and login screens.

## Demo login

Choose the account type, click **Use demo details**, then sign in.

| Role | Email | Password |
| --- | --- | --- |
| Student | student@quickbite.demo | quickbite123 |
| Admin | admin@quickbite.demo | quickbite123 |
| Kitchen | kitchen@quickbite.demo | quickbite123 |

## Pages

- `login.html` — shared login with Student, Admin and Kitchen selections.
- `index.html` — original student design, menu search/filter/sort, cart, demo wallet and order tracking.
- `admin.html` — overview, orders, menu editing, stock and canteen settings.
- `kitchen.html` — order preparation board, collection and food availability.

Student orders appear in the admin and kitchen views. Kitchen updates progress through Placed → Preparing → Ready → Completed. Sign out to switch accounts, or use separate tabs.

Data is saved in this browser's local storage. Accounts are demo sessions, not secure authentication. Payments and orders are simulated; there is no backend or real payment processing.

Google Fonts and optional food photographs use the internet. System fonts and food emoji provide fallbacks.

## Optional local preview

For consistent shared storage across pages and tabs, run this from the extracted folder if Node.js is installed:

```text
node serve.cjs
```

Then open http://127.0.0.1:4186/login.html. The preview server only serves the files; all website interactions remain in the browser.
