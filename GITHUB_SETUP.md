# Soodo Code - GitHub Setup & Hosting Guide

## Quick Start (5 minutes)

### Step 1: Initialize Git Repository

```powershell
# From your project directory
git init
git config user.name "Your Name"
git config user.email "your.email@example.com"
git add .
git commit -m "Initial commit: Soodo Code application"
```

### Step 2: Create Repository on GitHub

1. Go to [GitHub.com](https://github.com) and sign in
2. Click **"+" icon** → **"New repository"**
3. Name it: `SoodoCode` (keep it public for GitHub Pages)
4. **Do NOT** initialize with README (we already have one)
5. Click **"Create repository"**

### Step 3: Connect Local Repository to GitHub

Copy the commands from GitHub and run them:

```powershell
git remote add origin https://github.com/YOUR_USERNAME/SoodoCode.git
git branch -M main
git push -u origin main
```

Replace `YOUR_USERNAME` with your GitHub username.

### Step 4: Enable GitHub Pages

1. Go to your repository on GitHub
2. Click **Settings** (top right)
3. Click **Pages** (left sidebar)
4. Under "Build and deployment":
   - Source: **Deploy from a branch**
   - Branch: **gh-pages**
   - Folder: **/ (root)**
5. Click **Save**

### Step 5: Wait for Deployment

1. Go to **Actions** tab in your repository
2. You should see a workflow running (Deploy to GitHub Pages)
3. Wait for it to complete (usually 2-3 minutes)
4. Green checkmark = Success! ✅

### Step 6: Access Your Site

Your app is now live at:
```
https://YOUR_USERNAME.github.io/SoodoCode/
```

Replace `YOUR_USERNAME` with your GitHub username.

---

## Repository Name Note

⚠️ **Important**: If you name your repository something other than `SoodoCode`, update `vite.config.ts`:

```typescript
base: isGHPages ? '/YOUR_REPO_NAME/' : '/',
```

---

## Making Updates

After you've set everything up, deploying updates is simple:

```powershell
# Make changes to your code
# Then:
git add .
git commit -m "Update: Description of changes"
git push
```

The workflow automatically:
1. Builds your project
2. Deploys to GitHub Pages
3. Updates your live site

---

## Environment Variables

For local development, create a `.env.local` file:

```
VITE_OPENAI_API_KEY=sk-...
VITE_SUPABASE_URL=https://...
```

**Never commit `.env` files!** (already in `.gitignore`)

For production secrets on GitHub:
1. Go to Settings → Secrets and variables → Actions
2. Add secrets (they won't be visible in logs)
3. Reference in workflow: `${{ secrets.YOUR_SECRET_NAME }}`

---

## Troubleshooting

### Blank Page After Deployment

Check the browser console (F12):
- Look for CORS errors
- Check for 404 errors on resources
- Verify the base path in vite.config.ts

### Routes Not Working

The app uses React Router. All routes are handled client-side. If you get a 404:
- Don't add a 404.html file
- Routes like `/SoodoCode/app` should work automatically

### Build Failed in Actions

1. Go to Actions tab
2. Click the failed workflow
3. Click "Deploy to GitHub Pages" job
4. Scroll down to see error messages

Common issues:
- Missing dependencies in package.json
- TypeScript errors (check `npm run lint`)
- Wrong Node.js version

### Local Build Test

Before pushing, test locally:

```powershell
# Install if needed
pnpm install

# Test production build
$env:GITHUB_PAGES='true'
pnpm run build

# Preview
pnpm run preview
```

---

## File Structure

Important files for deployment:
```
SoodoCode/
├── .github/workflows/
│   └── deploy.yml           # Automatic deployment config
├── .gitignore              # Prevent uploading unnecessary files
├── vite.config.ts          # Build configuration (includes base path)
├── package.json            # Dependencies and scripts
└── src/                    # Your source code
```

---

## Limitations & Solutions

### No Backend

GitHub Pages is static hosting. For backend features:

**Supabase** (recommended):
- ✅ Works perfectly from GitHub Pages
- All calls are HTTP requests from browser
- Edge functions are serverless

**Your API**:
- Ensure CORS headers allow GitHub Pages domain
- Add: `Access-Control-Allow-Origin: *` (or specific domain)

### Environment Variables

Cannot use `.env` files on GitHub Pages. Solutions:

1. **Hardcode endpoints** (if not sensitive)
2. **Use GitHub Secrets** (for CI/CD)
3. **Client-side config** (user enters API keys in app)

---

## Next Steps

1. ✅ Follow the Quick Start steps above
2. ✅ Test your live site at `https://YOUR_USERNAME.github.io/SoodoCode/`
3. ✅ Share the link with friends!

## Support

For GitHub Pages issues, see: https://docs.github.com/en/pages
For React Router issues, see: https://reactrouter.com/start/library/setup

---

## Your Site URL

Once deployed, share this URL:
```
https://YOUR_USERNAME.github.io/SoodoCode/
```

🎉 Your Soodo Code app is live on the internet!
