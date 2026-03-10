# Prep 결제 모듈

토스페이먼츠 연동 결제 모듈

## 프로젝트 구조

```
prep/
├── server/                 # Node.js Express API 서버
│   ├── src/
│   │   ├── app.js          # 메인 엔트리
│   │   ├── config/         # DB 설정
│   │   ├── controllers/    # 컨트롤러
│   │   ├── middleware/     # 인증 미들웨어
│   │   ├── models/         # 데이터 모델
│   │   ├── routes/         # 라우트
│   │   └── services/       # 외부 서비스 (토스, 이메일)
│   └── sql/                # SQL 스키마
├── docker/                 # Docker 설정 파일
├── css/                    # 프론트엔드 스타일
├── js/                     # 프론트엔드 스크립트
├── templates/              # CSV 템플릿
├── docker-compose.yml
├── Jenkinsfile
└── nginx.conf
```

---

## 1. 로컬 개발 (Docker Compose)

Docker Compose로 MariaDB, Node.js, Nginx를 한 번에 실행합니다.

### 사전 요구사항

- Docker, Docker Compose

### 실행

```bash
docker compose up -d
```

### 접속

| 서비스 | URL |
|--------|-----|
| 웹 (Nginx) | http://localhost:8080 |
| API 직접 접근 | http://localhost:3000 |
| MariaDB | localhost:3307 (user: riseone / pw: riseone1234!) |

### 종료

```bash
# 종료 (데이터 유지)
docker compose down

# 종료 + DB 데이터 삭제
docker compose down -v
```

### 참고

- DB 초기 데이터는 `docker/init.sql`에서 자동 로드됩니다 (최초 실행 시)
- DB 스키마를 변경한 경우 `docker compose down -v` 후 재시작하세요
- 프론트엔드 파일(HTML/CSS/JS)은 볼륨 마운트되어 수정 시 즉시 반영됩니다
- 서버 코드 변경 시 `docker compose restart app`으로 재시작하세요

---

## 2. 개발 서버 (115.68.179.155)

Nginx + PM2로 운영합니다. Jenkins CI/CD로 자동 배포됩니다.

### 2-1. 서버 초기 설정

```bash
# 필수 패키지 설치
sudo yum install -y git
curl -fsSL https://rpm.nodesource.com/setup_20.x | sudo bash -
sudo yum install -y nodejs
sudo npm install -g pm2

# 배포 디렉토리 생성
sudo mkdir -p /app/service/prep
sudo chown -R ec2-user:ec2-user /app/service/prep
```

### 2-2. 환경 변수 설정

```bash
cp /app/service/prep/server/.env.example /app/service/prep/server/.env
vi /app/service/prep/server/.env
```

```env
PORT=3000
NODE_ENV=development

DB_HOST=localhost
DB_PORT=3306
DB_USER=prep
DB_PASSWORD=your_password
DB_NAME=riseone

JWT_SECRET=your_jwt_secret

TOSS_CLIENT_KEY=test_ck_xxx
TOSS_SECRET_KEY=test_sk_xxx

SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_app_password
```

### 2-3. Nginx 설정

기존 Nginx 설정 파일에 아래 location 블록을 추가합니다.

```nginx
server {
    listen 80;
    server_name 115.68.179.155;

    # ... 기존 설정 (jenkins, n8n 등) ...

    # Prep 정적 파일
    location /prep/css/ {
        alias /app/service/prep/css/;
        expires 7d;
        add_header Cache-Control "public, immutable";
    }

    location /prep/js/ {
        alias /app/service/prep/js/;
        expires 7d;
        add_header Cache-Control "public, immutable";
    }

    location /prep/images/ {
        alias /app/service/prep/images/;
        expires 30d;
        add_header Cache-Control "public, immutable";
    }

    # Prep API 프록시
    location /prep/api/ {
        proxy_pass http://127.0.0.1:3000/api/;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Prep 메인 페이지
    location /prep/ {
        alias /app/service/prep/;
        index index.html;
        try_files $uri $uri/ /prep/index.html;
    }
}
```

```bash
sudo nginx -t
sudo systemctl reload nginx
```

### 2-4. PM2로 서버 실행

```bash
cd /app/service/prep/server
npm install
pm2 start src/app.js --name prep

# 서버 재부팅 시 자동 시작
pm2 startup
pm2 save
```

### 2-5. CI/CD (Jenkins)

`develop` 브랜치에 push하면 자동 배포됩니다.

#### Jenkins .env 파일 등록

Jenkinsfile에서 `prep-env-file` Credential ID로 `.env` 파일을 참조합니다.
Jenkins에 아래와 같이 등록해야 합니다.

1. Jenkins 관리 > Credentials > System > Global credentials
2. **Add Credentials** 클릭
3. 아래 항목 입력:
   - **Kind**: `Secret file`
   - **File**: 로컬에서 작성한 `.env` 파일 업로드
   - **ID**: `prep-env-file`
   - **Description**: `Prep 환경변수 파일`
4. **Create** 클릭

`.env` 파일 내용은 [2-2. 환경 변수 설정](#2-2-환경-변수-설정)을 참고하세요.
환경 변수가 변경되면 Jenkins에서 해당 Credential을 업데이트한 후 재배포하면 됩니다.

#### 배포 흐름

1. GitHub `develop` 브랜치 push
2. Jenkins Webhook 트리거
3. Jenkins가 `.env` 파일을 서버로 SCP 전송
4. 서버에서 `git reset --hard origin/develop`
5. `.env` 파일을 `server/.env`로 이동
6. `npm install --omit=dev`
7. PM2 재시작 (`pm2 restart prep`)

### PM2 명령어

```bash
pm2 status           # 상태 확인
pm2 logs prep        # 로그 확인
pm2 restart prep     # 재시작
pm2 stop prep        # 중지
```

---

## 3. 상용 서버

개발 서버와 동일한 구조(Nginx + PM2)를 사용하며, 아래 항목만 다르게 설정합니다.

### 3-1. 환경 변수 (.env)

```env
PORT=3000
NODE_ENV=production

DB_HOST=localhost
DB_PORT=3306
DB_USER=prep
DB_PASSWORD=강력한_비밀번호
DB_NAME=riseone

JWT_SECRET=강력한_JWT_시크릿

TOSS_CLIENT_KEY=live_ck_xxx
TOSS_SECRET_KEY=live_sk_xxx

SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=production_email@gmail.com
SMTP_PASS=production_app_password
```

### 3-2. Nginx 설정

개발 서버와 동일한 구조이며, `server_name`을 실제 도메인으로 변경합니다.
SSL 인증서 적용을 권장합니다.

```nginx
server {
    listen 443 ssl;
    server_name your-domain.com;

    ssl_certificate /etc/letsencrypt/live/your-domain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/your-domain.com/privkey.pem;

    # 정적 파일 및 API 프록시 설정은 개발 서버와 동일
    # ...
}

# HTTP → HTTPS 리다이렉트
server {
    listen 80;
    server_name your-domain.com;
    return 301 https://$host$request_uri;
}
```

### 3-3. PM2 설정

```bash
cd /app/service/prep/server
npm install --omit=dev
pm2 start src/app.js --name prep -i max    # 클러스터 모드 (CPU 코어 수만큼)

pm2 startup
pm2 save
```

### 3-4. 상용 배포

상용 서버는 `main` 브랜치 기준으로 수동 배포합니다.

```bash
cd /app/service/prep
git fetch origin
git reset --hard origin/main

cd server
npm install --omit=dev
pm2 restart prep
```

---

## 개발 서버 vs 상용 서버 차이점

| 항목 | 개발 서버 | 상용 서버 |
|------|-----------|-----------|
| 브랜치 | `develop` | `main` |
| 배포 방식 | Jenkins 자동 배포 | 수동 배포 |
| NODE_ENV | development | production |
| 토스 키 | 테스트 키 (test_) | 라이브 키 (live_) |
| PM2 모드 | 단일 프로세스 | 클러스터 모드 (`-i max`) |
| SSL | 없음 | 적용 권장 |
