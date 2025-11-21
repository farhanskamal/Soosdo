# Soodo Code - Deployment Guide

## GitHub Pages Hosting

This project is configured to be hosted entirely on GitHub Pages with automatic deployment via GitHub Actions.

### Prerequisites

1. A GitHub account
2. Git installed on your machine
3. The code committed and pushed to GitHub

### Setup Instructions

#### 1. Create a GitHub Repository

```bash
# Initialize git (if not already done)
git init

# Add all files
git add .

# Commit
git commit -m "Initial commit: Soodo Code"

# Add remote (replace with your repo URL)
git remote add origin https://github.com/YOUR_USERNAME/SoodoCode.git

# Push to GitHub
git branch -M main
git push -u origin main
```

#### 2. Enable GitHub Pages

1. Go to your GitHub repository
2. Navigate to **Settings** → **Pages**
3. Under "Build and deployment":
   - Select **Deploy from a branch**
   - Select branch: **gh-pages**
   - Select folder: **/ (root)**
4. Click Save

The GitHub Actions workflow will automatically create the `gh-pages` branch.

#### 3. Automatic Deployment

The `.github/workflows/deploy.yml` workflow will:
- Trigger on every push to `main` or `master` branch
- Install dependencies using pnpm
- Build the project with `GITHUB_PAGES=true` environment variable
- Deploy to GitHub Pages automatically

#### 4. Access Your Site

Your app will be available at: `https://YOUR_USERNAME.github.io/SoodoCode/`

### Important Notes

#### Backend Considerations

**Supabase Edge Functions** will work from GitHub Pages because:
- ✅ They're called via HTTP from the browser
- ✅ CORS is typically enabled on Supabase endpoints
- ✅ No server-side rendering required

**Environment Variables** (for API keys):
- Never commit `.env` files to GitHub (included in `.gitignore`)
- For public APIs, consider using GitHub Secrets if needed
- For Supabase: Use environment variables in your build process (optional)

#### SPA Routing

React Router works correctly on GitHub Pages because:
- ✅ The app is a single-page application (SPA)
- ✅ All routes are handled client-side
- ✅ Direct URL access works (e.g., `/SoodoCode/app`)

### Local Development

```bash
# Install dependencies
pnpm install

# Run dev server
pnpm run dev

# Build locally
pnpm run build

# Preview production build
pnpm run preview
```

### Troubleshooting

**Routes not working after deployment:**
- The `vite.config.ts` is already configured with the correct base path (`/SoodoCode/`)
- Make sure the repository name is correct in the config

**Blank page after deployment:**
- Check GitHub Actions tab for build errors
- Verify the `dist/` folder is being created
- Check browser console for errors

**Build fails:**
- Ensure all dependencies are in `package.json`
- Check Node.js version (18+ recommended)
- Review GitHub Actions logs for specific errors

### Manual Deployment (Alternative)

If you prefer not to use GitHub Actions:

```bash
# Build the project
GITHUB_PAGES=true pnpm run build

# Deploy (requires `gh-pages` package)
pnpm add -D gh-pages
pnpm run deploy
```

### API Configuration

For production, configure your API endpoints:

1. **Supabase**: Update endpoints in your environment if needed
2. **AI Providers**: Store API keys securely (never commit to repo)
3. **Custom Backend**: Ensure CORS headers are properly configured

### Performance Notes

- The app is optimized for production builds
- All assets are minified and optimized
- Consider enabling compression on your GitHub Pages hosting

### Next Steps

1. Push code to GitHub
2. GitHub Actions automatically deploys on push
3. Access your app at `https://YOUR_USERNAME.github.io/SoodoCode/`
4. Share the link with users!
