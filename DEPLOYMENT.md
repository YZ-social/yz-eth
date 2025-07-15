# Deployment Guide for GitHub Pages

This guide explains how to deploy the YZ-ETH application to GitHub Pages using the modern GitHub Actions approach.

## Automatic Deployment

The application is configured for automatic deployment to GitHub Pages using GitHub Actions **directly from the main branch**.

### Setup

1. **Repository Settings**
   - Go to your repository on GitHub
   - Navigate to Settings > Pages
   - Under "Source", select "**Deploy from a branch**" and choose "**GitHub Actions**"
   - No need to specify a branch - deployment is handled automatically by Actions

2. **Automatic Deployment**
   - Every push to the `main` branch triggers an automatic build and deployment
   - The GitHub Action workflow (`.github/workflows/deploy.yml`) handles the entire process
   - No manual intervention required
   - No separate `gh-pages` branch is created or maintained

### Build Process

The deployment process:
1. Installs dependencies with `npm ci`
2. Builds the worker bundle with `npm run build:worker`
3. Builds the web application with `npm run build:web`
4. Uploads the built files directly to GitHub Pages using the official GitHub Pages action

## Manual Deployment

Manual deployment is no longer needed! Simply push to the `main` branch:

```bash
# Make your changes
git add .
git commit -m "Your changes"
git push origin main

# GitHub Actions will automatically deploy
```

## Local Development

To test the production build locally:

```bash
# Build the application
npm run build

# Preview the production build
npm run preview
```

## Configuration

### Base Path
The application is configured to work with GitHub Pages' subdirectory structure:
- Development: `http://localhost:3000/`
- Production: `https://yourusername.github.io/yz-eth/`

### Environment Variables
- `NODE_ENV=production` sets the correct base path for GitHub Pages
- No additional environment variables required

## Troubleshooting

### Common Issues

1. **404 Errors**: Make sure the `base` path in `vite.config.ts` matches your repository name
2. **Assets Not Loading**: Ensure `.nojekyll` file exists in the `public` directory (handled automatically)
3. **Build Failures**: Check the GitHub Actions logs for detailed error messages
4. **Deployment Failures**: Ensure repository has Pages enabled and set to "GitHub Actions" source

### Verifying Deployment

After deployment:
1. Visit `https://yourusername.github.io/yz-eth/`
2. Check that all assets load correctly
3. Test the application functionality
4. Verify transaction tiles and code editor work properly

## Benefits of New Deployment Method

- ✅ **Single Branch**: Everything stays on `main` - no more `gh-pages` branch
- ✅ **Automatic**: No manual deployment commands needed
- ✅ **Secure**: Uses GitHub's official Pages deployment action
- ✅ **Modern**: Follows current GitHub Pages best practices
- ✅ **Clean History**: No build artifacts committed to repository

## Custom Domain (Optional)

To use a custom domain:
1. Add a `CNAME` file to your `public` directory with your domain
2. Configure DNS records to point to GitHub Pages
3. Enable HTTPS in repository settings

## Live Demo

The application is deployed at: https://yz-social.github.io/yz-eth/ 