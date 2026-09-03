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
| **CRISPR gRNA Design** | Guide RNA design with local-genome screening when configured and a clearly labeled NCBI BLAST fallback otherwise. |
| **BLAST Search** | Run BLAST sequence alignment. |
| **Molecular Weight Calculator** | Quick MW calculation for sequences. |
| **Lab Utilities** | Molecular-weight, solution-preparation, and dilution calculations. |

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

### Versioned qPCR source catalog

PrimerCat keeps computed candidates separate from third-party source records. Build the local human/mouse gene index with the official NCBI `gene_info` snapshots:

```bash
cd backend
python scripts/build_qpcr_catalog.py \
  --output ../reference-data/qpcr-catalog.sqlite3 \
  --species human --species mouse
```

Set `QPCR_CATALOG_DB` to the generated file. Official or otherwise authorized qPrimerDB/PrimerBank exports can be added with `--qprimerdb [SPECIES=]FILE` or `--primerbank [SPECIES=]FILE`. Curated literature tables can be added with `--publication [SPECIES=]FILE`; each row must include a reviewable `source_url`, DOI, or PMID. The import layer preserves each record's source and evidence class; it does not convert computational records into experimental claims.

A publication table may be TSV, CSV, JSON, or ZIP and should provide: `source_record_id`/`id`, `gene_symbol`/`gene`, `target_accession`, forward and reverse primer sequences, `source_name`, and `source_url` or `doi`/`pmid`. Amplicon size and F/R Tm are optional. Records without a target accession or traceable publication link are rejected.

Every successful build writes a SHA-256 manifest beside the database. For a later refresh, build a complete temporary database and replace the active file only after validation:

```bash
python scripts/build_qpcr_catalog.py \
  --output ../reference-data/qpcr-catalog.sqlite3 \
  --species human --species mouse \
  --qprimerdb human=/path/to/human-export.zip \
  --qprimerdb mouse=/path/to/mouse-export.zip \
  --replace
```

PrimerBank documents public web search and source-level validation pages, but as of 2026-09-04 its official help does not document a bulk-download endpoint. PrimerCat therefore does not crawl the full site as a production update mechanism. Use a data export obtained from the source or with permission, and keep its retrieval date and checksum in the generated manifest.

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
| **CRISPR gRNA 设计** | gRNA 设计；配置本地基因组索引时执行基因组筛查，否则使用明确标注的 NCBI BLAST 初筛。 |
| **BLAST 序列比对** | 运行 BLAST 序列比对。 |
| **分子量计算器** | 快速计算序列分子量。 |
| **实用小工具** | 分子量、溶液配制与稀释计算。 |

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

### 版本化 qPCR 来源目录

PrimerCat 将本站计算候选与第三方来源记录分开保存。可使用 NCBI 官方 `gene_info` 快照建立人和小鼠的本地基因索引：

```bash
cd backend
python scripts/build_qpcr_catalog.py \
  --output ../reference-data/qpcr-catalog.sqlite3 \
  --species human --species mouse
```

然后将 `QPCR_CATALOG_DB` 指向该文件。获得官方或已授权的导出文件后，可用 `--qprimerdb [SPECIES=]FILE` 或 `--primerbank [SPECIES=]FILE` 导入。人工核对的论文表格可用 `--publication [SPECIES=]FILE` 导入，但每条记录必须提供可核查的 `source_url`、DOI 或 PMID。导入层保留原始来源和证据类型，不会将计算数据库记录写成实验验证。

论文表格可使用 TSV、CSV、JSON 或 ZIP，应包含：`source_record_id`/`id`、`gene_symbol`/`gene`、`target_accession`、正反向引物序列、`source_name`，以及 `source_url` 或 `doi`/`pmid`；扩增子长度和 F/R Tm 为可选字段。缺少靶标 accession 或可追溯论文链接的记录会被拒绝。

每次成功构建都会在数据库旁生成包含 SHA-256 的清单。后续更新可先完整构建临时数据库，通过后再原子替换当前文件：

```bash
python scripts/build_qpcr_catalog.py \
  --output ../reference-data/qpcr-catalog.sqlite3 \
  --species human --species mouse \
  --qprimerdb human=/path/to/human-export.zip \
  --qprimerdb mouse=/path/to/mouse-export.zip \
  --replace
```

PrimerBank 公开说明提供网页检索与逐条实验记录，但截至 2026-09-04，其官方帮助页没有说明批量下载端点。因此 PrimerCat 不把整站抓取作为生产更新机制；应使用从来源方取得或获得许可的数据导出，并在构建清单中保留获取日期与校验和。

### 引用

如果 PrimerCat 对你的研究有帮助，欢迎引用（应用内 **引用** 页提供 BibTeX / APA 格式）：

> Wang, Z. (2026). *PrimerCat: An auditable platform for qPCR primer design, CRISPR gRNA design, and BLAST sequence search* (Version 1.0) [Software]. https://primercat.tech

---

## License

Copyright © 2026 PrimerCat. All rights reserved.
