import { Application, Router } from "https://deno.land/x/oak@v16.1.0/mod.ts";
import { config } from "https://deno.land/x/dotenv/mod.ts";
import { basename, extname } from "https://deno.land/std@0.224.0/path/mod.ts";
import { S3Client } from "https://deno.land/x/s3_lite_client@0.7.0/mod.ts";

if (Deno.env.get("DENO_DEPLOYMENT_ID") === undefined) {
	const env = config();
	for (const key in env) {
		Deno.env.set(key, env[key]);
	}
}

const env = Deno.env.toObject();

const s3 = new S3Client({
	endPoint: env.S3_ENDPOINT,
	accessKey: env.S3_ACCESS_KEY_ID,
	secretKey: env.S3_SECRET_ACCESS_KEY,
	bucket: env.S3_BUCKET_NAME,
	pathStyle: true,
	region: "us-west",
});

const router = new Router();
router.get("/share/(.*)", async (context) => {
	const param = context.params[0];
	const host = context.request.url.hostname;
	let fileExtension = extname(param);
	let saveFileName = basename(param, fileExtension);
	let fullSavePath = `${saveFileName}${fileExtension}`;

	if (!param) {
		context.response.status = 301;
		context.response.redirect(env.REDIRECT_URL);
		return;
	}

	const fileExists = await s3.exists(`${param}`);

	if (await fileExists === false) {
		context.response.status = 301;
		context.response.redirect(env.REDIRECT_URL);
		return;
	} else {
		const result = await s3.getObject(`${param}`);
		try {
			context.response.body = `
		<!DOCTYPE html>
		<html lang="en">
		  <head>
			<meta charset="UTF-8">
			<meta name="viewport" content="width=device-width, initial-scale=1.0">
			<link rel="stylesheet" type="text/css" href="/icons/font/hugeicons-font.css">
			<title>${saveFileName} | cloud.connormoulton.com</title>
			<script src="https://cdn.tailwindcss.com"></script>
		  </head>
		  <body class="flex items-center justify-center min-h-screen bg-white dark:bg-[#121212] font-mono">
		  <a href="/${param}">
			<div class="bg-white dark:bg-[#121212] border border-[#121212] dark:border-white p-8 text-center hover:bg-gray-500 hover:bg-opacity-20">

			 <div class="text-[#121212] dark:text-white no-underline text-lg"> ${saveFileName} <span class="p-0.5 border border-[#121212] dark:border-white font-mono font-normal text-sm uppercase">${
				fileExtension.slice(1)
			}</span>
			</div>
			<p class="text-sm dark:text-white text-black">download</p>
			</div>
			</a>
		  </body>
		</html>
	  `;
		} catch (error) {
			console.error(error);
			context.response.status = 500;
			context.response.body = {
				error: "Failed to generate view link",
			};
		}
	}
});

router.get("/(.*)", async (context) => {
	const param = context.params[0];
	const host = context.request.url.hostname;
	let fileExtension = extname(param);
	let saveFileName = basename(param, fileExtension);
	let fullSavePath = `${saveFileName}${fileExtension}`;

	if (!param) {
		context.response.status = 301;
		context.response.redirect(env.REDIRECT_URL);
		return;
	}

	const fileExists = await s3.exists(`${param}`);
	if (await fileExists === false) {
		context.response.status = 301;
		context.response.redirect(env.REDIRECT_URL);
		return;
	} else {
		const result = await s3.getObject(`${param}`);
		try {
			fileExtension = extname(param);
			saveFileName = basename(param, fileExtension);
			fullSavePath = `${saveFileName}${fileExtension}`;
			
			// Set appropriate Content-Type header
			const contentType = getContentType(fileExtension);
			context.response.headers.set("Content-Type", contentType);
			
			// For non-image files, still allow download
			if (!contentType.startsWith("image/")) {
				context.response.headers.set(
					"Content-Disposition",
					`inline; filename="${fullSavePath}"`,
				);
			}
			
			context.response.body = result.body;
		} catch (err) {
			console.log(err);
		}
	}
});

function getContentType(fileExtension: string): string {
	const contentTypes: { [key: string]: string } = {
		".html": "text/html",
		".css": "text/css",
		".js": "application/javascript",
		".json": "application/json",
		".png": "image/png",
		".jpg": "image/jpeg",
		".jpeg": "image/jpeg",
		".gif": "image/gif",
		".svg": "image/svg+xml",
		".pdf": "application/pdf",
		".txt": "text/plain",
		".xml": "application/xml",
		".mp3": "audio/mpeg",
		".mp4": "video/mp4",
		".webm": "video/webm",
		".wav": "audio/wav",
		".ogg": "audio/ogg",
		".zip": "application/zip",
		".doc": "application/msword",
		".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
		".xls": "application/vnd.ms-excel",
		".xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
		".ppt": "application/vnd.ms-powerpoint",
		".pptx": "application/vnd.openxmlformats-officedocument.presentationml.presentation",
		".csv": "text/csv",
		".md": "text/markdown",
		".ico": "image/x-icon",
		".webp": "image/webp",
	};
	
	return contentTypes[fileExtension.toLowerCase()] || "application/octet-stream";
}

const app = new Application();
app.use(router.routes());
app.use(router.allowedMethods());

await app.listen({ port: 8000 });
