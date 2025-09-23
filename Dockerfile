FROM node:22-slim

WORKDIR /app

# Puppeteerが動作するために必要なシステムライブラリをインストール
# puppeteer/puppeteerのドキュメントで推奨されているパッケージを含みます
# ここでは例としてChromiumを使用
RUN apt-get update && apt-get install -y \
  ca-certificates \
  fonts-liberation \
  libasound2 \
  libatk-bridge2.0-0 \
  libcups2 \
  libdrm2 \
  libgbm1 \
  libgdk-pixbuf2.0-0 \
  libglib2.0-0 \
  libgtk-3-0 \
  libnspr4 \
  libnss3 \
  libx11-xcb1 \
  libxcomposite1 \
  libxdamage1 \
  libxext6 \
  libxfixes3 \
  libxrandr2 \
  libxshmfence1 \
  xdg-utils \
  --no-install-recommends && \
  apt-get clean && \
  rm -rf /var/lib/apt/lists/*

# Chromiumをインストール
RUN apt-get update && apt-get install -y chromium

# Puppeteerのキャッシュパスを設定（推奨）
# コンテナ内でキャッシュディレクトリが書き込み可能になるように設定
# Cloud Runなどの環境で問題になることがある
ENV PUPPETEER_CACHE_DIR=/usr/src/app/.puppeteer_cache
