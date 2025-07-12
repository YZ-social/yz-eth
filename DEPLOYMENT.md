# Deployment Guide for GitHub Pages

This guide explains how to deploy the YZ-ETH application to GitHub Pages.

## Automatic Deployment

The application is configured for automatic deployment to GitHub Pages using GitHub Actions.

### Setup

1. **Repository Settings**
   - Go to your repository on GitHub
   - Navigate to Settings > Pages
   - Under "Source", select "Deploy from a branch"
   - Choose "gh-pages" branch and "/ (root)" folder
   - Click "Save"

2. **Automatic Deployment**
   - Every push to the `main` branch triggers an automatic build and deployment
   - The GitHub Action workflow (`.github/workflows/deploy.yml`) handles the entire process
   - No manual intervention required

### Build Process

The deployment process:
1. Installs dependencies with `npm ci`
2. Builds the worker bundle with `npm run build:worker`
3. Builds the web application with `npm run build:web`
4. Deploys the built files to the `gh-pages` branch

## Manual Deployment

If you prefer to deploy manually:

```bash
# Install dependencies
npm install

# Build the application
npm run build

# Deploy to GitHub Pages
npm run deploy
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
- Development: `http://localhost:3001/`
- Production: `https://yourusername.github.io/yz-eth/`

### Environment Variables
- `NODE_ENV=production` sets the correct base path for GitHub Pages
- No additional environment variables required

## Troubleshooting

### Common Issues

1. **404 Errors**: Make sure the `base` path in `vite.config.ts` matches your repository name
2. **Assets Not Loading**: Ensure `.nojekyll` file exists in the `public` directory
3. **Build Failures**: Check the GitHub Actions logs for detailed error messages

### Verifying Deployment

After deployment:
1. Visit `https://yourusername.github.io/yz-eth/`
2. Check that all assets load correctly
3. Test the application functionality
4. Verify transaction tiles and code editor work properly

## Custom Domain (Optional)

To use a custom domain:
1. Add your domain to the `cname` field in `.github/workflows/deploy.yml`
2. Configure DNS records to point to GitHub Pages
3. Enable HTTPS in repository settings

## Live Demo

The application is deployed at: https://yz-social.github.io/yz-eth/ 