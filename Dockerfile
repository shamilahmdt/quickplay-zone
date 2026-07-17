# 1. Base image
FROM node:20-alpine

# 2. Set working directory
WORKDIR /app

# 3. Copy package files
COPY package*.json ./

# 4. Install dependencies
RUN npm install

# 5. Copy the rest of the application code
COPY . .

# 6. Build the React application
RUN npm run build

# 7. Expose Vite's preview port (default is 4173)
EXPOSE 4173

# 8. Start the preview server, exposing it to the host
CMD ["npm", "run", "preview", "--", "--host"]
