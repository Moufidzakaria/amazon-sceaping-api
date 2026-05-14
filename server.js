require("dotenv").config({ path: ".env" });

const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const crypto = require("crypto");

const mongoose = require("mongoose");
const { createClient } = require("redis");
const { ApifyClient } = require("apify-client");

const app = express();

// ===================== MIDDLEWARE =====================
app.use(express.json());
app.use(cors());
app.use(helmet());
app.use(morgan("dev"));

// ===================== ENV CHECK =====================
const { MONGO_URL, REDIS_URL, APIFY_TOKEN, PORT = 3000 } = process.env;

if (!MONGO_URL || !REDIS_URL || !APIFY_TOKEN) {
    console.error("❌ Missing ENV variables (MONGO_URL / REDIS_URL / APIFY_TOKEN)");
    process.exit(1);
}

// ===================== DB =====================
mongoose.connect(MONGO_URL)
    .then(() => console.log("🧠 MongoDB connected"))
    .catch(err => {
        console.error(err);
        process.exit(1);
    });

// ===================== USER MODEL =====================
const User = mongoose.model("User", new mongoose.Schema({
    email: String,
    apiKey: String,
    plan: { type: String, default: "starter" },
    usage: { type: Number, default: 0 },
}));

// ===================== ACTOR MODEL (IMPORTANT FIX) =====================
const Actor = mongoose.model("Actor", new mongoose.Schema({
    name: String,
    slug: String,
    actorId: String,
    active: { type: Boolean, default: true },
}));

// ===================== REDIS =====================
const redis = createClient({ url: REDIS_URL });

redis.connect()
    .then(() => console.log("⚡ Redis connected"))
    .catch(console.error);

// ===================== APIFY =====================
const apify = new ApifyClient({ token: APIFY_TOKEN });

// ===================== LIMITS =====================
const LIMITS = {
    starter: 100,
    pro: 1000,
    business: 10000,
};

// ===================== CACHE =====================
const setCache = (k, v) => redis.setEx(k, 600, JSON.stringify(v));
const getCache = async (k) => {
    const d = await redis.get(k);
    return d ? JSON.parse(d) : null;
};

// ===================== AUTH =====================
async function auth(req, res, next) {
    const key = req.headers["x-api-key"];

    if (!key) return res.status(401).json({ error: "Missing API key" });

    const user = await User.findOne({ apiKey: key });

    if (!user) return res.status(401).json({ error: "Invalid API key" });

    req.user = user;
    next();
}

// ===================== REGISTER =====================
app.post("/register", async (req, res) => {
    const apiKey = crypto.randomUUID();

    const user = await User.create({
        email: req.body.email,
        apiKey,
    });

    res.json({ apiKey });
});

// ===================== SCRAPE (MAIN SAAS ENDPOINT) =====================
app.post("/scrape", auth, async (req, res) => {
    const { query } = req.body;
    const user = req.user;

    if (!query) return res.status(400).json({ error: "query required" });

    const cached = await getCache(query);
    if (cached) {
        return res.json({ success: true, cached: true, data: cached });
    }

    if (user.usage >= LIMITS[user.plan]) {
        return res.status(403).json({ error: "Upgrade plan" });
    }

    try {
        const run = await apify.actor("your-actor-id").call({
            categories: [query],
            pages: 3,
        });

        const { items } = await apify.dataset(run.defaultDatasetId).listItems({
            clean: true,
            limit: 1000,
        });

        user.usage += items.length;
        await user.save();

        await setCache(query, items);

        res.json({
            success: true,
            total: items.length,
            data: items,
        });

    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ===================== GET DATASET =====================
app.get("/data/:id", auth, async (req, res) => {
    const { id } = req.params;

    const cached = await getCache(id);
    if (cached) return res.json({ cached: true, data: cached });

    try {
        const dataset = await apify.dataset(id).listItems({
            clean: true,
            limit: 1000,
        });

        await setCache(id, dataset.items);

        res.json({ success: true, data: dataset.items });

    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ===================== SINGLE ITEM =====================
app.get("/data/:id/item/:index", auth, async (req, res) => {
    const { id, index } = req.params;

    try {
        const dataset = await apify.dataset(id).listItems({
            clean: true,
            limit: 1000,
        });

        const item = dataset.items[index];

        if (!item) return res.status(404).json({ error: "Not found" });

        res.json({ success: true, data: item });

    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ===================== ACTORS MARKETPLACE =====================
app.get("/actors", async (req, res) => {
    const actors = await Actor.find({ active: true });
    res.json(actors);
});

// ===================== RUN ACTOR BY SLUG =====================
app.post("/run/:slug", auth, async (req, res) => {
    const { slug } = req.params;
    const { query } = req.body;

    const actor = await Actor.findOne({ slug });

    if (!actor) {
        return res.status(404).json({ error: "Actor not found" });
    }

    try {
        const run = await apify.actor(actor.actorId).call({
            query,
        });

        const { items } = await apify.dataset(run.defaultDatasetId).listItems({
            clean: true,
        });

        res.json({
            success: true,
            actor: actor.name,
            data: items,
        });

    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ===================== USER INFO =====================
app.get("/me", auth, (req, res) => {
    res.json({
        email: req.user.email,
        plan: req.user.plan,
        usage: req.user.usage,
        limit: LIMITS[req.user.plan],
    });
});

// ===================== ADMIN RESET =====================
app.post("/admin/reset", async (req, res) => {
    await User.updateMany({}, { usage: 0 });
    res.json({ success: true });
});

// ===================== START =====================
app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
});