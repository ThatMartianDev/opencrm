set -e

cd /var/www/crm/opencrm

echo "Installing dependencies..."
npm ci

echo "Building application..."
npm run build

echo "Restarting PM2..."
pm2 restart opencrm

echo "Deployment complete."