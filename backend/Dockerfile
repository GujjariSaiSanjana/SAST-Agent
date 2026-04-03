FROM node:20-alpine

WORKDIR /app

# Install dependencies for Prisma and Bearer
RUN apk add --no-cache curl unzip git openssl libc6-compat
RUN curl -sfL https://raw.githubusercontent.com/Bearer/bearer/main/contrib/install.sh | sh -s -- -b /usr/local/bin

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy source and prisma schema
COPY tsconfig.json ./
COPY prisma ./prisma
COPY src ./src

# Generate prisma client
RUN npm run prisma:generate

# Build the app
RUN npm run build

EXPOSE 3001

CMD ["npm", "run", "start"]
