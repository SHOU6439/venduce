FROM node:20

ENV LANG=C.UTF-8
ENV LC_ALL=C.UTF-8

WORKDIR /app

COPY package*.json ./
# optionalDependencies 設定は不要。ロックファイルに従ってインストール
RUN npm ci

COPY . .

EXPOSE 3000
CMD ["npm", "run", "dev"]
