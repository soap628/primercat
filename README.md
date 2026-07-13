# PrimerCat

> An auditable, full-stack platform for molecular-biology bench work: qPCR primer design, CRISPR gRNA design, BLAST sequence search, and handy lab utilities.
>
> 一站式、可溯源的分子生物学在线工具平台：qPCR 引物设计、CRISPR gRNA 设计、BLAST 序列比对，以及若干实用小工具。

🌐 **Live site / 线上站点:** [https://primercat.tech](https://primercat.tech)

[English](#english) · [中文](#中文)

---

## English

### What is PrimerCat?

PrimerCat is a bilingual (English / 中文) web platform that packages several common molecular-biology tools behind one clean, dark-themed interface. It is built around the idea of **auditable results** — every design step (scoring, specificity check, off-target search) is transparent and reproducible.

### Features

| Tool | Description |
| --- | --- |
| **qPCR Primer Design** | Design primers with `primer3`, custom scoring, and specificity checking via Bowtie2 / BLAST. |
| **Gene-based Primer Design** | Enter a gene name — the sequence is fetched automatically from NCBI and primers are designed for you. |
| **CRISPR gRNA Design** | Guide RNA design with genome-wide off-target analysis and hit annotation. |
| **BLAST Search** | Run BLAST sequence alignment. |
| **Molecular Weight Calculator** | Quick MW calculation for sequences. |
| **Lab Utilities** | Extra tools (grant/fund calculator, offshore hub) integrated into the platform. |

Plus: user accounts (JWT auth), a job history system, full English/中文 i18n, and citation / about / contact / sponsor / legal pages.

### Tech Stack

**Backend**
- [FastAPI](https://fastapi.tiangolo.com/) (async)
- SQLAlchemy 2.0 (async) + PostgreSQL + Alembic migrations
- [Biopython](https://biopython.org/) & [primer3-py](https://pypi.org/project/primer3-py/) for the biology
- NCBI E-utilities client with rate limiting + disk cache
- Bowtie2 / BLAST for off-target & specificity checks
- JWT authentication (python-jose + bcrypt)

**Frontend**
- [Next.js 14](https://nextjs.org/) (App Router) + TypeScript
- Tailwind CSS, Supabase-inspired dark design system (see `frontend/DESIGN.md`)
- `next-intl` for English / 中文 localization

**Infrastructure**
- Docker Compose: PostgreSQL · backend · frontend · nginx · certbot (auto HTTPS renewal)

### Repository Layout

```
.
├── backend/            # FastAPI application
│   ├── app/
│   │   ├── api/routes/  # primer, gene-primer, grna, blast, auth, jobs
│   │   ├── core/        # config, security, rate limiting
│   │   ├── db/          # models, session
│   │   ├── schemas/     # Pydantic schemas
│   │   └── services/    # primer/gRNA/BLAST/NCBI business logic
│   ├── alembic/         # DB migrations
│   └── tests/           # pytest suite
├── frontend/           # Next.js 14 app (i18n zh/en)
│   └── src/app/[locale]/ # localized pages & tools
├── nginx/              # reverse-proxy config
└── docker-compose.yml  # full-stack deployment
```

### Getting Started (local development)

**Prerequisites:** Python 3.11+, Node.js 18+, PostgreSQL (or use Docker).

**Backend**
```bash
cd backend
python -m venv .venv && source .venv/bin/activate   # Windows: .venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env        # then fill in DATABASE_URL, SECRET_KEY, NCBI_* etc.
alembic upgrade head
uvicorn app.main:app --reload
```
API docs will be available at `http://localhost:8000/docs`.

**Frontend**
```bash
cd frontend
npm install
npm run dev
```
App runs at `http://localhost:3000`.

### Deployment (Docker)

```bash
cp .env.example .env        # set POSTGRES_PASSWORD and SECRET_KEY
docker compose up -d --build
```
This starts PostgreSQL, the backend, the frontend, nginx, and certbot (for automatic HTTPS certificate renewal).

### Citation

If PrimerCat helps your research, please cite it (see the in-app **Cite** page for BibTeX / APA):

> Wang, Z. (2026). *PrimerCat: An auditable platform for qPCR primer design, CRISPR gRNA design, and BLAST sequence search* (Version 1.0) [Software]. https://primercat.tech

---

## 中文

### PrimerCat 是什么？

PrimerCat 是一个中英双语的在线平台，把几种常用的分子生物学工具整合到一个简洁的深色界面下。它的核心理念是 **结果可溯源** —— 每一步设计（打分、特异性检查、脱靶搜索）都透明、可复现。

### 功能

| 工具 | 说明 |
| --- | --- |
| **qPCR 引物设计** | 基于 `primer3` 设计引物，自定义打分，并通过 Bowtie2 / BLAST 做特异性检查。 |
| **基因引物设计（智能模式）** | 只需输入基因名，自动从 NCBI 获取序列并设计引物。 |
| **CRISPR gRNA 设计** | gRNA 设计，含全基因组脱靶分析与命中注释。 |
| **BLAST 序列比对** | 运行 BLAST 序列比对。 |
| **分子量计算器** | 快速计算序列分子量。 |
| **实用小工具** | 平台内集成的额外工具（经费通、离岸通）。 |

此外还有：用户账户（JWT 认证）、任务历史记录、完整的中英双语、引用 / 关于 / 联系 / 赞助 / 法律条款页面。

### 技术栈

**后端**
- [FastAPI](https://fastapi.tiangolo.com/)（异步）
- SQLAlchemy 2.0（异步）+ PostgreSQL + Alembic 数据库迁移
- [Biopython](https://biopython.org/) 与 [primer3-py](https://pypi.org/project/primer3-py/) 处理生物计算
- NCBI E-utilities 客户端，带限流 + 磁盘缓存
- Bowtie2 / BLAST 做脱靶与特异性检查
- JWT 认证（python-jose + bcrypt）

**前端**
- [Next.js 14](https://nextjs.org/)（App Router）+ TypeScript
- Tailwind CSS，Supabase 风格深色设计系统（见 `frontend/DESIGN.md`）
- `next-intl` 实现中英双语

**基础设施**
- Docker Compose：PostgreSQL · 后端 · 前端 · nginx · certbot（HTTPS 证书自动续期）

### 目录结构

```
.
├── backend/            # FastAPI 后端
│   ├── app/
│   │   ├── api/routes/  # primer、gene-primer、grna、blast、auth、jobs
│   │   ├── core/        # 配置、安全、限流
│   │   ├── db/          # 模型、会话
│   │   ├── schemas/     # Pydantic 数据模型
│   │   └── services/    # 引物/gRNA/BLAST/NCBI 业务逻辑
│   ├── alembic/         # 数据库迁移
│   └── tests/           # pytest 测试
├── frontend/           # Next.js 14 前端（中英双语）
│   └── src/app/[locale]/ # 本地化页面与工具
├── nginx/              # 反向代理配置
└── docker-compose.yml  # 全栈部署
```

### 本地开发

**环境要求：** Python 3.11+、Node.js 18+、PostgreSQL（或直接用 Docker）。

**后端**
```bash
cd backend
python -m venv .venv && source .venv/bin/activate   # Windows: .venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env        # 然后填入 DATABASE_URL、SECRET_KEY、NCBI_* 等
alembic upgrade head
uvicorn app.main:app --reload
```
接口文档：`http://localhost:8000/docs`。

**前端**
```bash
cd frontend
npm install
npm run dev
```
访问 `http://localhost:3000`。

### 部署（Docker）

```bash
cp .env.example .env        # 设置 POSTGRES_PASSWORD 与 SECRET_KEY
docker compose up -d --build
```
将启动 PostgreSQL、后端、前端、nginx 和 certbot（自动续期 HTTPS 证书）。

### 引用

如果 PrimerCat 对你的研究有帮助，欢迎引用（应用内 **引用** 页提供 BibTeX / APA 格式）：

> Wang, Z. (2026). *PrimerCat: An auditable platform for qPCR primer design, CRISPR gRNA design, and BLAST sequence search* (Version 1.0) [Software]. https://primercat.tech

---

## License

Copyright © 2026 PrimerCat. All rights reserved.
