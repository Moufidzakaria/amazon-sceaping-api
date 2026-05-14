# Use official Apify image with Playwright
FROM apify/actor-node-playwright-chrome:latest

# Set working directory
WORKDIR /usr/src/app

# IMPORTANT: fix permissions
USER root

# Copy package files first (cache optimization)
COPY package*.json ./

# Install dependencies (fixed command)
RUN npm install --omit=dev --no-optional

# Copy all project files
COPY . .

# Ensure correct permissions
RUN chown -R root:root /usr/src/app

# Optional build step
RUN npm run build || echo "No build step"

# Run actor
CMD ["npm", "start"]