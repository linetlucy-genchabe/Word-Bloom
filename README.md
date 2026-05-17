# WordBloom 🌸

A word game for family and friends — solo or multiplayer.

---

## Run locally

```bash
pip install -r requirements.txt
python manage.py runserver
```

Open: http://127.0.0.1:8000

---

## Deploy to Railway

### Option A — GitHub (recommended)

1. Push this folder to a GitHub repo:
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git branch -M main
   git remote add origin https://github.com/YOUR_USERNAME/wordbloom.git
   git push -u origin main
   ```

2. Go to https://railway.app → **New Project** → **Deploy from GitHub Repo**

3. Select your repo — Railway auto-detects Django ✅

4. Add these **Environment Variables** in the Railway dashboard (Settings → Variables):
   ```
   SECRET_KEY   =  any-long-random-string-here
   DEBUG        =  False
   ```

5. Railway runs `collectstatic` automatically during build.

6. Go to **Settings → Networking → Generate Domain** to get your public URL.

Done! 🎉

---

### Option B — Railway CLI

```bash
npm install -g @railway/cli
railway login
railway init
railway up
```

Then set variables in the dashboard as above.

---

## Project structure

```
wordbloom/
├── manage.py
├── Procfile            ← tells Railway to use gunicorn
├── runtime.txt         ← pins Python 3.11
├── requirements.txt    ← django + gunicorn + whitenoise
├── .gitignore
├── wordbloom/
│   ├── settings.py     ← reads SECRET_KEY & DEBUG from env vars
│   └── urls.py
└── game/
    ├── urls.py
    ├── views.py
    ├── static/css/style.css
    ├── static/js/
    └── templates/game/
```