#!/usr/bin/env bash
# PrimerCat 一键部署脚本（适用于全新的腾讯云轻量应用服务器）
# 用法：在仓库根目录执行  sudo bash deploy/deploy.sh
set -euo pipefail

DOMAIN="primercat.tech"
CERT_VOL="primercat_certbot-conf"

# ── 前置检查 ──────────────────────────────────────────────
[ "$EUID" -eq 0 ] || { echo "✗ 请用 root 运行：sudo bash deploy/deploy.sh"; exit 1; }
cd "$(dirname "$0")/.."

EMAIL="${CERTBOT_EMAIL:-}"
if [ -z "$EMAIL" ]; then
  read -rp "请输入邮箱（用于 Let's Encrypt 证书到期提醒）: " EMAIL
fi
[ -n "$EMAIL" ] || { echo "✗ 邮箱不能为空"; exit 1; }

echo "==> [1/7] 检查 / 安装 Docker..."
if ! command -v docker >/dev/null 2>&1; then
  curl -fsSL https://get.docker.com | sh
  systemctl enable --now docker
fi
docker compose version >/dev/null 2>&1 || { echo "✗ 缺少 docker compose 插件"; exit 1; }

echo "==> [2/7] 检查内存（前端构建需要，不足则创建 swap）..."
if [ "$(free -m 2>/dev/null | awk '/^Mem:/{print $2}')" -lt 2000 ] && [ ! -f /swapfile ]; then
  echo "    内存不足 2G，创建 2G swap 避免 Next.js 构建 OOM..."
  fallocate -l 2G /swapfile && chmod 600 /swapfile && mkswap /swapfile >/dev/null && swapon /swapfile
  grep -q '/swapfile' /etc/fstab || echo '/swapfile none swap sw 0 0' >> /etc/fstab
fi

echo "==> [3/7] 生成环境配置（已存在则跳过）..."
if [ ! -f .env ]; then
  printf 'POSTGRES_PASSWORD=%s\nSECRET_KEY=%s\n' \
    "$(openssl rand -hex 16)" "$(openssl rand -hex 32)" > .env
  echo "    已生成 .env（随机数据库密码 + JWT 密钥）"
fi
if [ ! -f backend/.env ]; then
  cat > backend/.env <<EOF
# PrimerCat 生产环境配置
NCBI_TOOL=primercat
NCBI_EMAIL=admin@example.com
NCBI_API_KEY=
BACKEND_CORS_ORIGINS=https://${DOMAIN},https://www.${DOMAIN}
COOKIE_SECURE=true
DEBUG=false
GRNA_OFFTARGET_BACKEND=auto
GRNA_ENABLE_NT_BLAST_FALLBACK=true
EOF
  echo "    已生成 backend/.env（如有 NCBI API Key 请稍后编辑填入）"
fi

echo "==> [4/7] 检查 DNS 解析..."
SERVER_IP="$(curl -fsS4 --max-time 8 https://api.ipify.org 2>/dev/null || true)"
DOMAIN_IP="$(getent hosts "$DOMAIN" 2>/dev/null | awk '{print $1}' | head -1)"
echo "    本机公网 IP: ${SERVER_IP:-未知} | ${DOMAIN} 解析到: ${DOMAIN_IP:-未解析}"
if [ -n "$SERVER_IP" ] && [ -n "$DOMAIN_IP" ] && [ "$SERVER_IP" != "$DOMAIN_IP" ]; then
  echo "⚠ 域名解析与本机 IP 不一致，请先在域名 DNS 处修正，否则证书签发会失败"
fi
WWW_RESOLVES=0
getent hosts "www.${DOMAIN}" >/dev/null 2>&1 && WWW_RESOLVES=1

echo "==> [5/7] 启动服务..."
# 出错时恢复完整版 nginx 配置
cleanup() { [ -f nginx/nginx.conf.full ] && mv nginx/nginx.conf.full nginx/nginx.conf; }
trap cleanup EXIT

HAS_CERT=0
if docker run --rm -v "${CERT_VOL}:/etc/letsencrypt" alpine \
     sh -c "[ -f /etc/letsencrypt/live/${DOMAIN}/fullchain.pem ]" 2>/dev/null; then
  HAS_CERT=1
fi

if [ "$HAS_CERT" = "0" ]; then
  echo "    首次部署：临时切换 HTTP-only 配置以签发证书..."
  cp nginx/nginx.conf nginx/nginx.conf.full
  cat > nginx/nginx.conf <<'NGINX'
events { worker_connections 1024; }
http {
  server {
    listen 80;
    server_name primercat.tech www.primercat.tech;
    location /.well-known/acme-challenge/ { root /var/www/certbot; }
    location /api/ {
      proxy_pass http://backend:8000;
      proxy_set_header Host $host;
      proxy_set_header X-Real-IP $remote_addr;
      proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
      proxy_set_header X-Forwarded-Proto $scheme;
    }
    location / {
      proxy_pass http://frontend:3000;
      proxy_http_version 1.1;
      proxy_set_header Upgrade $http_upgrade;
      proxy_set_header Connection 'upgrade';
      proxy_set_header Host $host;
      proxy_set_header X-Real-IP $remote_addr;
      proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
      proxy_set_header X-Forwarded-Proto $scheme;
    }
  }
}
NGINX
  docker compose up -d --build
  echo "    等待 nginx 就绪..."
  sleep 8

  DOMS="-d ${DOMAIN}"
  [ "$WWW_RESOLVES" = "1" ] && DOMS="$DOMS -d www.${DOMAIN}"
  echo "    通过 webroot 签发 Let's Encrypt 证书..."
  docker compose run --rm --entrypoint certbot certbot \
    certonly --webroot -w /var/www/certbot $DOMS \
    --email "$EMAIL" --agree-tos --no-eff-email --keep-until-expiring

  mv nginx/nginx.conf.full nginx/nginx.conf
  docker compose restart nginx
else
  echo "    证书已存在，直接以 HTTPS 配置启动..."
  docker compose up -d --build
fi

echo "==> [6/7] 健康检查（最多等待 2 分钟）..."
OK=0
for _ in $(seq 1 60); do
  if curl -fsk --noproxy '*' --max-time 5 "https://${DOMAIN}" -o /dev/null 2>/dev/null; then
    OK=1; break
  fi
  sleep 2
done

echo "==> [7/7] 结果"
docker compose ps
if [ "$OK" = "1" ]; then
  echo "✓ 部署完成：https://${DOMAIN}"
else
  echo "✗ 尚未检测到 HTTPS 响应，排查建议："
  echo "  1) 腾讯云控制台 - 轻量应用服务器 - 防火墙，确认放行 80、443 端口"
  echo "  2) 查看日志：docker compose logs -t --tail=50 nginx backend frontend"
fi
