# Shared Home Expense Tracker (Production Edition)

A fully responsive, mobile-first PWA designed for 7 roommates to track, split, and settle household expenses. 
This version is architected for **production deployment** using **PostgreSQL**, **Render**, and **Vercel**. It features a premium "Apple Wallet" inspired glassmorphic UI and personal dashboards.

## Features
- **Personal Dashboards**: Select your avatar at the top to see your personal contribution, exact share, and what you owe.
- **Premium Fintech UI**: Glassmorphism, deep iOS shadows, smooth animations, and glowing wallet cards.
- **Zero-Friction Entry**: Add expenses in a one-handed, thumb-optimized full-screen modal.
- **Transaction Feed Settlement**: Modern peer-to-peer payment style settlement algorithm.
- **PWA Ready**: Installable as a native app on Android home screens.

---

## 🚀 Production Deployment Guide

You can host this application permanently for **free** so all roommates can access it globally.

### Step 1: Set up the Database (Supabase)
1. Go to [Supabase](https://supabase.com) and create a free account.
2. Click **New Project** and create a database (save your database password!).
3. Go to **Project Settings -> Database**.
4. Scroll down to **Connection string** -> **URI**.
5. Copy the connection string. It will look like this:
   `postgresql://postgres:[YOUR-PASSWORD]@db.xxxx.supabase.co:5432/postgres`
6. *Replace `[YOUR-PASSWORD]` with the password you created in step 2.*

### Step 2: Deploy the Backend (Render.com)
1. Push this code to a GitHub repository.
2. Go to [Render](https://render.com) and create a free account.
3. Click **New -> Web Service** and connect your GitHub repository.
4. **Configuration:**
   - **Name:** `expense-tracker-backend`
   - **Root Directory:** `backend`
   - **Environment:** `Node`
   - **Build Command:** `npm install`
   - **Start Command:** `node server.js`
5. **Environment Variables:**
   Add a new environment variable:
   - **Key:** `DATABASE_URL`
   - **Value:** *(Paste your Supabase connection string from Step 1)*
   *(Leave FRONTEND_URL blank for now, we will add it later)*
6. Click **Deploy Web Service**.
7. Once deployed, copy your backend URL (e.g., `https://expense-tracker-backend.onrender.com`).
   *Note: On the first ever run, the backend will automatically connect to Supabase, create the tables, and add the seed data.*

### Step 3: Deploy the Frontend (Vercel)
1. Go to [Vercel](https://vercel.com) and create a free account.
2. Click **Add New -> Project** and import your GitHub repository.
3. **Configuration:**
   - **Framework Preset:** `Vite`
   - **Root Directory:** `frontend`
4. **Environment Variables:**
   Add a new environment variable:
   - **Name:** `VITE_API_URL`
   - **Value:** *(Paste your Render backend URL from Step 2)*
5. Click **Deploy**.
6. Once deployed, copy your Vercel frontend URL (e.g., `https://expense-tracker.vercel.app`).

### Step 4: Finalize Security (CORS)
1. Go back to your **Render Web Service**.
2. Go to **Environment**.
3. Add a new variable:
   - **Key:** `FRONTEND_URL`
   - **Value:** *(Paste your Vercel frontend URL from Step 3)*
4. Click **Save Changes**. The backend will now safely only accept requests from your Vercel app.

---

## 💻 Local Development

If you want to run the app locally for testing:

1. In the `backend` folder, create a `.env` file and add your `DATABASE_URL`.
2. From the root directory, install everything:
   ```bash
   npm run install:all
   ```
3. Start the application:
   ```bash
   npm run dev
   ```
4. Access the app on your local network using the IP shown in the terminal (e.g., `http://192.168.x.x:3000`).
