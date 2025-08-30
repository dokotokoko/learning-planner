FROM nginx:alpine

# タイムゾーン設定
RUN apk add --no-cache tzdata && \
    cp /usr/share/zoneinfo/Asia/Tokyo /etc/localtime && \
    apk del tzdata

# Nginxの設定をコピー
COPY nginx.conf /etc/nginx/nginx.conf

# 証明書ディレクトリを作成
RUN mkdir -p /etc/nginx/certs

# ヘルスチェック
HEALTHCHECK --interval=30s --timeout=3s \
  CMD wget --quiet --tries=1 --spider http://localhost:80/ || exit 1

EXPOSE 80 443

CMD ["nginx", "-g", "daemon off;"]