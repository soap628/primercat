# BLAST 短引物检索修复与验证

日期：2026-09-05。以下是本地代码与真实 NCBI 请求的验证记录，不是线上部署记录，也不是实验验证。

## 问题与修复

普通 BLAST 页面原本使用 E-value 0.001，手工粘贴短引物不会启用短序列设置。20 nt 的 GAPDH 示例在普通模式、RefSeq RNA、E-value 0.001 下返回了有效的零命中报告。修复后，同一序列能返回完整覆盖的 GAPDH 匹配。

前后端现在均支持自动识别 10–50 nt 的单条 DNA。短模式默认 E-value 1000、word size 7、reward +1、penalty −3、gap costs 5/2、关闭低复杂度过滤；保留用户显式设置。这里的 10–50 nt 是 PrimerCat 的应用范围，并非声称 NCBI 将所有 50 nt 以下序列统一归为 blastn-short。一次只检索一条序列，拒绝多条 FASTA 被拼接或仅展示首条结果。

结果显示实际提交序列、数据库、物种、E-value、模式和返回上限，并绑定查询快照。使用查询坐标计算覆盖度，避免把局部区域 100% 一致度误认成全长匹配。PrimerCat 自产与已有来源的 F/R 序列均可分别带入站内 BLAST，维持原始 5′→3′ 方向；跳转本身不发起远程检索。

## 真实请求

下列请求使用人类、RefSeq RNA、自动短模式、默认 E-value 1000、最多 50 hits；均通过本地 `/api/v1/blast/search`，未模拟 NCBI 响应。

| 示例 | 提交序列（5′→3′） | 返回数量 | 首条匹配 | 首条一致度 |
| --- | --- | --- | --- | --- |
| PrimerCat GAPDH F | GATTTGGTCGTATTGGGCGC | 50 | NM_001289745（GAPDH） | 100% |
| OriGene GAPDH F | GTCTCCTCTGACTTCAACAGCG | 50 | NM_001289745（GAPDH） | 100% |
| PrimerBank GAPDH R | AAGTGGTCGTTGAGGGCAATG | 50 | NM_001289745（GAPDH） | 100% |

自产示例已在浏览器手工粘贴并提交，首条查询覆盖度为 100%，E-value 为 0.0034。OriGene 与 PrimerBank 示例的请求分别约 42.9 秒、42.1 秒完成。另一次独立客户端请求（最多 5 hits）38.2 秒完成，验证 NCBI XML2_S 可解析为正确的 20 nt 查询记录。

50 是请求的返回上限，不是全部匹配数，更不是 50 个已确认脱靶。这些示例不能证明所有基因、物种或数据库均可成功，也不等同于成对特异性或湿实验验证。

## 稳定性边界

- BLAST 工具使用独立的有界远程客户端：完整 HTTP 请求最多 25 秒，总检索最多 240 秒，服务层最多等待 250 秒。
- POST 只提交一次；临时网络或 5xx 错误只对同一 RID 的 GET 有限重试。首次等待至少 20 秒，同一 RID 至少间隔 60 秒。
- 单进程客户端联系间隔至少 10 秒；远期轮询不会提前占据当前提交的时间槽。
- 每个服务进程最多 4 个不同的在途 BLAST 工具请求；相同请求合并。单个请求断开不会取消其他用户正在等候的共享工作。
- 有效零命中、空响应、无效 XML、超时与繁忙分别处理；失败不进入结果缓存。等待界面只显示真实耗时，不按计时器虚构“解析中”阶段。

限制：此次没有重写 qPCR、PCR、CRISPR 其他服务使用的旧 `run_qblast`。联系间隔和并发合并目前是进程内机制，不是跨生产 worker 或所有业务的统一限流。NCBI 可用性和远端排队时间仍不受 PrimerCat 控制。

## 自动化检查

- 后端全量：353 项通过（含短序列模式、缓存隔离、零命中/错误区分、合并请求、容量边界与远程超时/轮询测试）。
- 前端查询辅助模块：12 项通过。
- TypeScript 类型检查通过。
- 前端 production build 通过；构建后恢复本地开发预览。

## 方法来源

- [NCBI BLAST 参数与 blastn-short](https://www.ncbi.nlm.nih.gov/books/NBK279684/table/appendices.T.blastn_application_options/)
- [NCBI Common URL API](https://blast.ncbi.nlm.nih.gov/doc/blast-help/urlapi.html)
- [NCBI BLAST 开发者调用指南](https://blast.ncbi.nlm.nih.gov/doc/blast-help/developerinfo.html)
