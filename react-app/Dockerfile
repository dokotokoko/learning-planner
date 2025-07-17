# マルチステージビルド - 開発ステージ
FROM node:18-alpine as development

# 引数を受け取る
ARG MODE=development

WORKDIR /app

# package.jsonとpackage-lock.jsonをコピー
COPY package*.json ./

# 依存関係をインストール
RUN npm ci

# ソースコードをコピー
COPY . .

# ポート3000を公開
EXPOSE 3000

# 開発サーバー起動用のコマンド（修正版）
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0", "--port", "3000", "--strictPort"]

# ビルドステージ
FROM node:18-alpine as builder

WORKDIR /app

# package.jsonとpackage-lock.jsonをコピー
COPY package*.json ./

# 依存関係をインストール
RUN npm ci

# ソースコードをコピー
COPY . .

# プロダクションビルド
RUN npm run build

# 本番用のNginxイメージ
FROM nginx:alpine as production

# リバースプロキシ用のディレクトリを作成
RUN mkdir -p /var/cache/nginx /var/tmp && \
    chown -R nginx:nginx /var/cache/nginx /var/tmp

# ビルドしたアプリをNginxの公開ディレクトリにコピー
COPY --from=builder /app/dist /usr/share/nginx/html

# ポート80を公開
EXPOSE 80

# nginx起動コマンド
CMD ["nginx", "-g", "daemon off;"] 