# Fix Git Authentication Error (403)

## Quick Fix - Use Personal Access Token

### Step 1: Create GitHub Personal Access Token

1. Go to https://github.com/settings/tokens/new
2. **Token name**: `Soosdo Deployment`
3. **Expiration**: 90 days (or longer)
4. **Scopes** - Check these boxes:
   - ✅ `repo` (full control of private repositories)
   - ✅ `workflow` (update GitHub Actions workflows)
   - ✅ `write:packages` (write packages)
5. Click **"Generate token"**
6. **COPY THE TOKEN** (you won't see it again!)

### Step 2: Use Token for Git Push

Option A - Use Token in URL (One-time):
```powershell
# Remove old remote
git remote remove origin

# Add new remote with token
git remote add origin https://YOUR_USERNAME:YOUR_TOKEN@github.com/farhanskamal/Soosdo.git

# Push
git push -u origin main
```

Replace:
- `YOUR_USERNAME` = your GitHub username
- `YOUR_TOKEN` = the token you just copied

Option B - Store Credentials (Recommended):

```powershell
# Configure git to cache credentials
git config --global credential.helper wincred

# Now push (will prompt for username/token first time)
git push -u origin main

# Next time it will remember
```

### Step 3: If Prompted

When pushed, you might see:
```
Username for 'https://github.com': farhanskamal
Password for 'https://github.com@farhanskamal': [PASTE_YOUR_TOKEN_HERE]
```

Just paste your token as the password.

---

## Alternative - Use SSH (Advanced)

If you prefer SSH (no token needed):

### Generate SSH Key

```powershell
# Generate key (press Enter 3 times for defaults)
ssh-keygen -t ed25519 -C "your.email@example.com"
```

This creates keys at:
- Private: `C:\Users\Mafius\.ssh\id_ed25519`
- Public: `C:\Users\Mafius\.ssh\id_ed25519.pub`

### Add SSH Key to GitHub

1. Go to https://github.com/settings/keys
2. Click **"New SSH key"**
3. **Title**: `Soosdo Deployment`
4. **Key type**: Authentication Key
5. **Key**: Open `id_ed25519.pub` and paste contents
6. Click **"Add SSH key"**

### Update Git Remote

```powershell
# Remove HTTPS remote
git remote remove origin

# Add SSH remote
git remote add origin git@github.com:farhanskamal/Soosdo.git

# Push
git push -u origin main
```

---

## Troubleshooting

### Still Getting 403?

**Check 1: Verify Token Scope**
- Go to https://github.com/settings/tokens
- Click your token
- Ensure `repo` scope is checked

**Check 2: Token Expired?**
- Tokens can expire
- Generate a new one at https://github.com/settings/tokens/new

**Check 3: Wrong Username?**
- Make sure URL uses: `farhanskamal` (your username)
- Not: `YOUR_USERNAME` (placeholder)

**Check 4: Repository Exists?**
- Go to https://github.com/farhanskamal/Soosdo
- Make sure repository is created
- Make sure it's public (for GitHub Pages)

### Clear Cached Credentials (Windows)

If you have old credentials cached:

1. Open **Credential Manager**
   - Search "Credential Manager" in Windows
   - Or: `Control Panel` → `User Accounts` → `Credential Manager`

2. Find GitHub entry:
   - Look for `github.com` entry
   - Click **Remove**

3. Try git push again - it will ask for new credentials

### Test SSH Connection

```powershell
# Test if SSH works
ssh -T git@github.com

# Should see:
# Hi farhanskamal! You've successfully authenticated...
```

---

## Complete Working Example

```powershell
# Navigate to project
cd C:\Users\Mafius\Desktop\Soosdo

# Check if git is already initialized
git status

# If not initialized:
git init
git config user.name "Your Name"
git config user.email "your@email.com"
git add .
git commit -m "Initial commit: Soodo Code"

# Option 1: Using Personal Access Token
git remote add origin https://farhanskamal:YOUR_TOKEN@github.com/farhanskamal/Soosdo.git
git push -u origin main

# Option 2: Using SSH
git remote add origin git@github.com:farhanskamal/Soosdo.git
git push -u origin main
```

---

## Next Steps After Push

1. Go to https://github.com/farhanskamal/Soosdo
2. Verify code is there
3. Go to **Settings** → **Pages**
4. Select branch: `gh-pages`
5. Click Save
6. Wait 2-3 minutes
7. Visit your site at: `https://farhanskamal.github.io/Soosdo/`

---

## Security Notes

⚠️ **Token Safety**:
- Never share your token
- Never commit tokens to Git
- Treat like a password
- Can revoke at anytime in Settings → Tokens

⚠️ **URL with Token**:
- If you use token in URL, don't commit it
- Better to use credential helper or SSH

---

## Still Stuck?

Try these commands to debug:

```powershell
# Check git config
git config --list

# Check remote URL
git remote -v

# Try verbose push to see detailed error
git push -u origin main -v

# Check SSH connectivity (if using SSH)
ssh -vT git@github.com
```

Copy any error messages and check GitHub's help:
- https://docs.github.com/en/authentication/troubleshooting-ssh
- https://docs.github.com/en/authentication/troubleshooting-commit-signature-verification
