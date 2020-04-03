FROM node:10.16.0-alpine

WORKDIR /app

COPY ./package*.json ./
RUN npm install
COPY . .
RUN npm run build

EXPOSE 4000
CMD [ "npm", "start"]