const express = require("express");
const axios = require("axios");
const cheerio = require("cheerio");

const app = express();
const PORT = process.env.PORT || 3000;

const BASE_URL = "https://ssstik.io";
const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, مثل Gecko) Chrome/120.0.0.0 Safari/537.36";

app.use(express.json());

app.get("/", (req, res) => {
  res.json({
    اسم: "واجهة تحميل تيك توك - SUNG-K4",
    نسخة: "1.0.0",
    طريقة_الاستخدام: "GET /api/tiktok?url={رابط_تيك_توك}",
    المطور: "محمد عبدالله (SUNG-K4)",
  });
});

function parseDownloadLinks(html) {
  const $ = cheerio.load(html);
  const results = [];

  $("a").each((i, el) => {
    const href = $(el).attr("href") || "";
    const text = ($(el).text() || "").trim().toLowerCase();
    if (!href.startsWith("http")) return;

    let نوع = "غير معروف";
    if (href.includes(".mp4")) نوع = "فيديو";
    if (href.includes(".mp3")) نوع = "صوت";

    if (!results.find((r) => r.الرابط === href)) {
      results.push({ نوع, الرابط: href, وصف: text || "تحميل" });
    }
  });

  return results;
}

async function fetchFromSSSTik(videoUrl, lang = "ar") {
  await axios.get(`${BASE_URL}/${lang}-1`, {
    headers: { "User-Agent": USER_AGENT },
  });

  const formData = new URLSearchParams();
  formData.append("id", videoUrl);
  formData.append("locale", lang);
  formData.append("tt", "");

  const { data: html } = await axios.post(`${BASE_URL}/${lang}-1`, formData.toString(), {
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      "User-Agent": USER_AGENT,
      "Origin": BASE_URL,
      "Referer": `${BASE_URL}/${lang}-1`,
    },
  });

  const links = parseDownloadLinks(html);

  return {
    المصدر: videoUrl,
    عدد_الروابط: links.length,
    الروابط: links,
  };
}

app.get("/api/tiktok", async (req, res) => {
  const videoUrl = req.query.url;
  if (!videoUrl) {
    return res.status(400).json({
      خطأ: "لازم تبعت وسيط ?url=رابط_تيك_توك",
      مثال: "/api/tiktok?url=https://www.tiktok.com/@user/video/1234567890",
    });
  }

  try {
    const result = await fetchFromSSSTik(videoUrl, "ar");
    if (!result.عدد_الروابط) {
      return res.status(404).json({
        خطأ: "لم يتم العثور على روابط تحميل. جرّب رابط آخر أو أعد المحاولة لاحقاً.",
      });
    }

    const اول_فيديو = result.الروابط.find((l) => l.نوع === "فيديو");
    const اول_صوت = result.الروابط.find((l) => l.نوع === "صوت");

    res.json({
      نجاح: true,
      المصدر: result.المصدر,
      فيديو: اول_فيديو ? اول_فيديو.الرابط : null,
      صوت: اول_صوت ? اول_صوت.الرابط : null,
      جميع_الروابط: result.الروابط,
    });
  } catch (err) {
    res.status(500).json({
      خطأ: "حصل خطأ أثناء معالجة الطلب. قد يكون تغيير في الموقع أو مشكلة مؤقتة.",
      تفاصيل: err.message,
    });
  }
});

app.listen(PORT, () => {
  console.log(`SUNG-K4 API يعمل على http://localhost:${PORT}`);
});
