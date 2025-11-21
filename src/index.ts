import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

import puppeteer from "puppeteer";

import { data, username } from "./constants";
import type { ChartData, DataType } from "./types";
import { t } from "./utils";

(async () => {
	// Launch the browser
	const browser = await puppeteer.launch({ headless: false });
	// Open a new blank page
	const page = await browser.newPage();
	// Set viewport size
	await page.setViewport({ width: 1280, height: 900 });

	// Anti-bot headers
	await page.setExtraHTTPHeaders({
		"User-Agent":
			"Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36",
		"Accept-Language": "en-US,en;q=0.9",
	});

	// Disable WebDriver flag
	await page.evaluateOnNewDocument(() => {
		Object.defineProperty(navigator, "webdriver", { get: () => false });
	});

	// Navigate
	await page.goto(`https://telemetr.me/@${username}`, {
		waitUntil: "domcontentloaded",
		timeout: 0,
	});

	// Channel Title & Description & Avatar
	const elementTitle = await page.locator(".channel-inner__name").waitHandle();
	const elementDescription = await page.locator(".channel__description").waitHandle();
	const elementAvatar = await page.locator(".card-info__header-image .img-fluid").waitHandle();
	const title: string | null = await elementTitle?.evaluate((el) => el.textContent?.trim());
	const description: string | null = await elementDescription?.evaluate((el) => el.innerHTML?.trim());
	const avatar: string | null = await elementAvatar?.evaluate((el) => el.getAttribute("src"));

	// Descriptions for stats
	const descriptions: string[] | null = await page.$$eval(".icon.icon-info.icon-tooltip", (options) =>
		options.map((option) => option.getAttribute("data-original-title") ?? ""),
	);

	// Statistics
	const stats: string[] = await page.$$eval(".channel-inner__stat-item", (options) =>
		options.map((option) => option.textContent?.trim() ?? ""),
	);

	// Subscribers & views & ER
	const subscribers: string[] = await page.$$eval(".stat-col__data", (options) =>
		options.map((option) => option.textContent?.trim().split(" ").join("") ?? ""),
	);

	// Chart data
	const charts: string | undefined = await page.$$eval("script", (scripts) =>
		scripts.map((s) => s.textContent).find((t) => t?.includes("chartDataFirst")),
	);
	const parseChartData = (script: string | undefined, varName: string): ChartData => {
		if (!script) return null;
		const regex = new RegExp(`${varName}\\s*=\\s*(\\{[\\s\\S]*?\\}|\\[[\\s\\S]*?\\])`);
		const match = script.match(regex);
		if (!match) return null;

		try {
			return JSON.parse(match[1]);
		} catch {
			return Function(`"use strict"; return (${match[1]})`)();
		}
	};
	const chartDataFirst: ChartData = parseChartData(charts, "chartDataFirst");
	const chartDataSecond: ChartData = parseChartData(charts, "chartDataSecond");
	const chartDataMain: ChartData = parseChartData(charts, "chartDataMain");

	// Recent Posts
	const posts = await page.$$eval(".post-card", (options) =>
		options.map((option) => {
			const created_at =
				option.querySelector(".post-card__header-date")?.textContent.trim().split(" ").slice(2).join("") ?? "";
			const views = option.querySelectorAll(".stats-list__item")[0]?.textContent.trim().split(" ").join("") ?? "";
			const comments = option.querySelectorAll(".stats-list__item")[1]?.textContent.trim().split(" ").join("") ?? "";
			const replies = option.querySelectorAll(".stats-list__item")[2]?.textContent.trim().split(" ").join("") ?? "";
			const content = option.querySelector(".post-card__body-container")?.textContent.trim() ?? "";
			const emojies = Array.from(option.querySelectorAll(".emotions-item")).map((el) => ({
				emoji: el.querySelector(".emotions-item__emoji")?.textContent.trim() ?? "",
				content: el.querySelector(".emotions-item__count")?.textContent.trim().split(" ").join("") ?? "",
			}));

			return { created_at, views, comments, replies, content, emojies };
		}),
	);

	// Read existing data
	const DATA_FILE = path.resolve("./data.json");

	const allData: DataType[] = fs.existsSync(DATA_FILE) ? JSON.parse(fs.readFileSync(DATA_FILE, "utf-8")) : [];

	// Update data
	data.id = "";
	data.created_at = "";
	data.updated_at = new Date().toISOString();
	data.username = username;
	data.avatar = avatar ?? "";
	data.link = `https://t.me/${username}`;
	data.title = title;
	data.description = description;
	data.stats = stats;
	data.subscribers = {
		description: t(descriptions[0]) ?? null,
		total: subscribers[0] ?? null,
		today: subscribers[1] ?? null,
		chart: chartDataFirst,
	};
	data.views_per_post = {
		description: t(descriptions[1]) ?? null,
		total: subscribers[2] ?? null,
		chart: chartDataSecond,
	};
	data.ER = {
		description: t(descriptions[2]) ?? null,
		general: subscribers[3]?.replace("%", "") ?? null,
		daily: subscribers[4]?.replace("%", "") ?? null,
	};
	data.DOP = {
		description: t(descriptions[3]) ?? null,
		chart: chartDataMain,
	};
	data.posts = posts;

	// log data
	// console.log(data);

	// save or update entry
	const existingIndex = allData.findIndex((d) => d.username === data.username);

	if (existingIndex >= 0) {
		const existing = allData[existingIndex];

		data.id = existing.id;
		data.created_at = existing.created_at;

		// always update the updated_at timestamp
		data.updated_at = new Date().toISOString();

		// update existing data
		allData[existingIndex] = data;
	} else {
		// new entry
		data.id = crypto.randomUUID();
		data.created_at = new Date().toISOString();
		data.updated_at = new Date().toISOString();
		allData.push(data);
	}

	// save chart data to a separate JSON file
	fs.writeFileSync(DATA_FILE, JSON.stringify(allData, null, 2));

	await browser.close();
})();
