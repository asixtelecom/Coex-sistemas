# Mapeamento de Portas - Servidor Coexsistemas

**Data:** 11/07/2026
**Hostname:** coexsistemas.techvoz.com.br

---

## Serviços de Aplicação

| Porta | Serviço | Descrição |
|:-----:|---------|-----------|
| 3000 | whatsapp-techvoz | Aplicação Next.js (WhatsApp) |
| 3006 | coex-crm | CRM Next.js (PM2 Cluster) |
| 54321 | Supabase Kong | API Gateway do Supabase |
| 54323 | Supabase Studio | Painel de administração Supabase |
| 54324 | Supabase Inbucket | Teste de emails (Mailpit) |
| 54327 | Supabase Analytics | Analytics Server |
| 8080 | Evolution API | API WhatsApp (Evolution) |

---

## Bancos de Dados

| Porta | Serviço | Descrição |
|:-----:|---------|-----------|
| 3306 | MariaDB | Banco principal (host) |
| 3307 | MariaDB | MagnusBilling (Docker) |
| 5432 | PostgreSQL | Banco principal (localhost) |
| 54322 | PostgreSQL | Next SaaS (Docker) |
| 54330 | PostgreSQL | Supabase (Docker) |
| 27017 | MongoDB | localhost |
| 6379 | Redis | Cache (localhost) |
| 26739 | Redis | Evolution API (Docker) |

---

## Servidores Web

| Porta | Serviço | Descrição |
|:-----:|---------|-----------|
| 80 | Nginx | Proxy reverso HTTP |
| 443 | LiteSpeed | Proxy reverso HTTPS |
| 887 | LiteSpeed | Servidor web |
| 888 | LiteSpeed | Baota Panel |
| 3008 | LiteSpeed | Servidor web |
| 7080 | LiteSpeed | Servidor web |
| 8188 | LiteSpeed | Servidor web |
| 21314 | Webserver | Baota Panel Web |
| 21316 | PHP | Baota PHP |

---

## Email

| Porta | Serviço | Descrição |
|:-----:|---------|-----------|
| 25 | Postfix | SMTP |
| 465 | Postfix | SMTPS (SSL) |
| 587 | Postfix | SMTP Submission (TLS) |
| 110 | Dovecot | POP3 |
| 995 | Dovecot | POP3S (SSL) |
| 143 | Dovecot | IMAP |
| 993 | Dovecot | IMAPS (SSL) |
| 10024 | Amavis | Antivírus de email |
| 11332 | Rspamd | Anti-spam |
| 11333 | Rspamd | Anti-spam (web interface) |
| 11334 | Rspamd | Anti-spam |

---

## Infraestrutura

| Porta | Serviço | Descrição |
|:-----:|---------|-----------|
| 21 | Pure-FTPd | FTP |
| 22 | SSH | Acesso remoto |
| 53 | PowerDNS | DNS Server |
| 631 | CUPS | Serviço de impressão |

---

## MikoPBX (Docker)

| Porta | Serviço | Descrição |
|:-----:|---------|-----------|
| 21317 | SSH | SSH do PBX |
| 21318 | HTTP | Web interface |
| 21319 | HTTPS | Web interface (SSL) |
| 21320 | SIP UDP | SIP trunk |
| 21321 | SIP TLS | SIP trunk (SSL) |
| 21322-21330 | RTP | Áudio (10000-10008) |
| 21331 | AMI | Asterisk Manager |
| 21332 | Asterisk | AMI porta 5038 |
| 21333 | HTTP | porta 8088 |
| 21334 | HTTPS | porta 8089 |

---

## Supabase (Docker) - Detalhes

| Container | Porta | Função |
|-----------|:-----:|--------|
| supabase_db | 54330 | PostgreSQL |
| supabase_kong | 54321 | API Gateway |
| supabase_studio | 54323 | Dashboard |
| supabase_rest | - | PostgREST (interno) |
| supabase_auth | - | GoTrue Auth (interno) |
| supabase_realtime | - | Realtime (interno) |
| supabase_storage | - | File Storage (interno) |
| supabase_analytics | 54327 | Log Analytics |
| supabase_inbucket | 54324 | Email test |
| supabase_vector | - | Vector (interno) |
| supabase_edge_runtime | - | Edge Functions (interno) |

---

*Documento gerado automaticamente em 11/07/2026*
