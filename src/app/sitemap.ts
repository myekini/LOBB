import type { MetadataRoute } from "next";

const siteUrl = "https://lobb.ng";

const routes = [
  "",
  "/about",
  "/coaches",
  "/coaches/join",
  "/contact",
  "/faq",
  "/how-it-works",
  "/privacy",
  "/terms",
];

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();

  return routes.map((route) => ({
    url: `${siteUrl}${route}`,
    lastModified: now,
    changeFrequency: route === "" || route === "/coaches" ? "daily" : "monthly",
    priority: route === "" ? 1 : route === "/coaches" ? 0.9 : 0.6,
  }));
}
