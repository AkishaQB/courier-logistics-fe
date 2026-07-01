FROM node:22-alpine

WORKDIR /app

# Install dependencies
COPY package.json package-lock.json ./
RUN npm install

# Copy source code
COPY . .

EXPOSE 5175

CMD ["npx", "vite", "--host", "0.0.0.0", "--port", "5175"]
