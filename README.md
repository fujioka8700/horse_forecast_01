# horse_forecast_01

It's a horse forecast.

## コマンドたち

アプリ作成

```bash
$ docker compose run --rm app sh -c 'npx create-next-app . --typescript'
```

ファイルのオーナーを変更する

```bash
$ sudo chown -R $USER:$USER ./src/
```

npm install

```bash
$ docker compose run --rm app sh -c 'npm install'
```

アプリ開発時

```bash
$ docker compose up -d
```

起動したコンテナに入る<br>
compose.yaml の command: sh -c "npm run dev" をコメントアウトしてから、

```bash
$ docker compose exec app bash
```

アプリ開発終了時

```bash
$ docker compose down
```

本番環境で確認

```bash
$ npm start
```

## .env.local

```bash
HOSTNAME=localhost
PORT=3000
HOST=http://$HOSTNAME:$PORT
```
