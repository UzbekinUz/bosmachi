# Bosmachi

Talabalar ijara/yashash ma'lumotlarini yig'ish tizimi (React + Tailwind + Express + MongoDB).

## Ishga tushirish
1. MongoDB ishlab turishi kerak (`server/.env` -> `MONGO_URI`).
2. `npm run install:all`
3. Ikki terminalda: `npm run server` va `npm run client`
   - Forma: http://localhost:5173
   - Admin: http://localhost:5173/admin (login/parol: `server/.env` -> `ADMIN_USER` / `ADMIN_PASS`)
4. Production: `npm run build`, so'ng `npm start` — hammasi http://localhost:5000 da.

Yuborilgan ma'lumotlar `server/data/submissions.xlsx` fayliga avtomatik yoziladi.
