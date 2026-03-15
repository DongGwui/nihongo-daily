FROM node:22-slim
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY dist/ ./dist/
COPY data/ ./data/
CMD ["node", "dist/index.js"]
