# Sarvesh CRM - Live Demo

Public demo of the Sarvesh CRM (business management system) by Sarvesh Computer Enterprise.

- No real database and no keys: `src/supabaseClient.js` points to `src/demo/demoDb.js`,
  a fake database that saves everything in the visitor's browser (localStorage).
- Sample data: `src/demo/demoSeed.js` (sample company "Demo IT Solutions Sdn Bhd").
  It is put back fresh every day, or with the "Reset demo data" button.
- Demo login: no email or password (button "Enter Demo").
- Gold DEMO tab: `src/demo/DemoPanel.jsx` (WhatsApp, website, reset).

Hosting: Cloudflare Pages, build command `npm run build`, output folder `dist`.
No environment variables are needed.

Contact: +60 11-6397 5503 | info@sarveshcomputer.com.my | www.sarveshcomputer.com.my
