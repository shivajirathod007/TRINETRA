FROM node:18-alpine

WORKDIR /app

# Install dependencies
COPY package.json package-lock.json* ./
RUN npm install

# Copy source code and build
COPY . .
RUN npm run build

# Install serve to run production build
RUN npm install -g serve

# Expose port
EXPOSE 3000

# Start server
CMD ["serve", "-s", "dist", "-l", "3000"]
