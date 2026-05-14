# Amazon Multi Category Scraper 🛒

An Apify Actor built with **Playwright** to scrape Amazon product listings from multiple categories with pagination support.

---

## 🚀 Features

- Multi-category scraping
- Pagination support
- Product title extraction
- Price extraction
- Rating extraction
- Image URL extraction
- ASIN detection
- Anti-bot detection (Robot Check / CAPTCHA)

---

## ⚙️ Input

The Actor expects the following JSON input:

```json
{
  "categories": [
    "gaming chair",
    "laptop",
    "headphones",
    "smartwatch",
    "monitor"
  ],
  "pages": 3
}