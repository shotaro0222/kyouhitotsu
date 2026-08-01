import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
	env,
	createExecutionContext,
	waitOnExecutionContext,
	SELF,
} from "cloudflare:test";
import { describe, it, expect } from "vitest";
import worker from "../src/index";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const IncomingRequest = Request<unknown, IncomingRequestCfProperties>;

describe("daily data", () => {
	it("parses every JSON data file as daily entry arrays", async () => {
		const dataDir = path.resolve(__dirname, "../src/data");
		const files = (await readdir(dataDir)).filter((name) => name.endsWith(".json")).sort();

		for (const file of files) {
			const filePath = path.join(dataDir, file);
			const text = await readFile(filePath, "utf8");
			const parsed = JSON.parse(text);
			expect(Array.isArray(parsed)).toBe(true);
			for (const item of parsed) {
				expect(item).toMatchObject({
					day: expect.any(Number),
					title: expect.any(String),
					description: expect.any(String),
					source: expect.any(String),
				});
			}
		}
	});

	it("returns a daily entry for the flower API", async () => {
		const request = new IncomingRequest("http://example.com/api/flower");
		const ctx = createExecutionContext();
		const response = await worker.fetch(request, env, ctx);
		await waitOnExecutionContext(ctx);

		expect(response.status).toBe(200);
		const body = await response.json();
		expect(body).toMatchObject({
			typeTitle: "今日の花",
			title: expect.any(String),
			description: expect.any(String),
			source: expect.any(String),
		});
	});

	it("keeps recipe data at 365 unique daily entries", async () => {
		const recipePath = path.resolve(__dirname, "../src/data/recipe.json");
		const recipeText = await readFile(recipePath, "utf8");
		const recipeData = JSON.parse(recipeText);
		expect(Array.isArray(recipeData)).toBe(true);
		expect(recipeData).toHaveLength(365);
		const titles = recipeData.map((item: { title: string }) => item.title);
		expect(new Set(titles).size).toBe(365);

		const request = new IncomingRequest("http://example.com/api/recipe");
		const ctx = createExecutionContext();
		const response = await worker.fetch(request, env, ctx);
		await waitOnExecutionContext(ctx);
		expect(response.status).toBe(200);
	});

	it("serves the worker over the test environment", async () => {
		const response = await SELF.fetch("https://example.com/api/flower");
		expect(response.status).toBe(200);
	});
});
