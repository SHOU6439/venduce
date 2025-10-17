# pride

上から順番に実行してください。

# Setup

## Python pip install

## mac

```sh
cd backend
python3 -m venv .venv
. ./.venv/bin/activate
pip install -r requirements.txt
```

## windows

```sh
cd backend
py -m venv .venv
source .\.venv\Scripts\activate
pip install -r requirements.txt
```

## Next.js

## mac and windows

```sh
cd frontend
npm install
```

# docker

## start

```sh
docker compose up -d
```

## stop

```sh
docker compose down
```

# URL まとめ

## Next.js

```sh
http://localhost:3000
```

## FastAPI

```sh
http://localhost:8000/api
```

### docs

```sh
http://localhost:8000/docs
```

## SQLAdmin

```sh
http://localhost/admin/
```

```makefile
make setup # バックエンド・フロントエンド両方のセットアップ
make up # コンテナ起動
make logs # ログ表示
```
