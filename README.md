# amazon-scraping-api
# 🚀 Amazon Scraping SaaS API

API SaaS scalable pour le scraping de produits Amazon via Apify + Playwright, avec gestion utilisateur, cache Redis et limitation de quotas.

---

## ⚙️ Stack technique

- Node.js + Express
- MongoDB (Mongoose)
- Redis (cache & performance)
- Apify SDK + Apify Client
- Playwright-extra (scraping stealth)
- Helmet + CORS + Morgan

---

## ✨ Features

- 🔎 Scraping Amazon par catégories
- ⚡ Cache Redis (rapide + optimisation coût)
- 👤 Authentification par API Key
- 📊 Système de plans (starter / pro / business)
- 🚦 Limitation d’usage par utilisateur
- 🧠 Support Apify actors marketplace
- 📦 Pagination + batching
- 🛡️ Sécurisé (Helmet + middleware auth)

---

## 📦 Installation

```bash
git clone https://github.com/Moufidzakaria/amazon-sceaping-api.git
cd amazon-sceaping-api
npm install
```

---

## 🔐 Variables d’environnement (.env)

```env
MONGO_URL=your_mongodb_url
REDIS_URL=your_redis_url
APIFY_TOKEN=your_apify_token
PORT=3000
```

---

## ▶️ Lancer le projet

```bash
node server.js
```

ou en mode dev :

```bash
npm run dev
```

---

## 📡 API ENDPOINTS

---

### 🔑 Register user

```http
POST /register
```

**Body**
```json
{
  "email": "test@gmail.com"
}
```

**Response**
```json
{
  "apiKey": "generated-key"
}
```

---

### 🔎 Scrape products

```http
POST /scrape
```

Headers :
```
x-api-key: YOUR_API_KEY
```

Body :
```json
{
  "query": "laptop"
}
```

---

### 📊 Get dataset

```http
GET /data/:id
```

---

### 📦 Get single item

```http
GET /data/:id/item/:index
```

---

### ⚙️ Run actor

```http
POST /run/:slug
```

Body :
```json
{
  "query": "gaming chair"
}
```

---

### 👤 User info

```http
GET /me
```

---

## 🧠 Architecture

Client → Express API → Redis Cache → MongoDB → Apify

---

## ⚡ Optimisations

- Blocage images/fonts pour vitesse scraping
- Cache Redis (TTL 10 min)
- Batch push data (300 items)
- Deduplication ASIN + URL
- Retry navigation safe

---

## 🛡️ Sécurité

- Helmet (headers sécurité)
- API Key auth
- Limite d’usage par plan
- Proxy Apify

---

## 📈 Plans

| Plan      | Limite |
|----------|--------|
| Starter  | 100    |
| Pro      | 1000   |
| Business | 10000  |

---

## 🚀 Améliorations possibles

- Queue BullMQ (scraping async)
- JWT auth + API Key hybride
- Dashboard React admin
- Webhooks Apify
- Stripe billing
- Logs temps réel (WebSocket)

---

## 🔥 Auteur

Moufid Zakaria
