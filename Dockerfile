# Use a official Node runtime as a parent image
FROM node:20-slim

# Set the working directory in the container
WORKDIR /app

# Copy package.json and package-lock.json
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy the rest of the application code
COPY . .

# Ensure firebase-applet-config.json exists for the build (it's not in git)
RUN if [ ! -f firebase-applet-config.json ]; then echo "{}" > firebase-applet-config.json; fi

# Build the application
RUN npm run build

# Expose the port the app runs on
EXPOSE 3000

# Command to run the application
CMD ["npm", "start"]
