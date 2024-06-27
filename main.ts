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
  endPoint: env.B2_ENDPOINT,
  accessKey: env.B2_ACCESS_KEY_ID,
  secretKey: env.B2_SECRET_ACCESS_KEY,
  bucket: env.B2_BUCKET_NAME,
  pathStyle: true,
  region: "us-west",
});

const router = new Router();
router.get("/(.*)", async (context) => {
  const param = context.params[0];
  const host = context.request.url.hostname;
  // const fullUrl = context.request.url;
  let fileExtention = extname(param);
  let saveFileName = basename(param, fileExtention);
  let fullSavePath = `${saveFileName}${fileExtention}`;

  if (!param) {
    context.response.status = 302;
    context.response.redirect("https://connormoulton.com");
    return;
  }

  if (param.endsWith("&download") || host == "connormoulton.com") {
    const modParam = param.slice(0, -9);
    const result = await s3.getObject(`${modParam}`);
    try {
      fileExtention = extname(modParam);
      saveFileName = basename(modParam, fileExtention);
      fullSavePath = `${saveFileName}${fileExtention}`;
      context.response.headers.set(
        "Content-Disposition",
        `attachment; filename="${fullSavePath}"`,
      );
      context.response.body = result.body;
    } catch (err) {
      console.log(err);
    }
  } else {
    const fileExists = s3.exists(`${param}`);

    if (await fileExists === false) {
      context.response.status = 302;
      context.response.redirect("https://connormoulton.com");
      return;
    } else {
      // const result = await s3.getObject(`${param}`);
      try {
        context.response.body = `
		<!DOCTYPE html>
		<html lang="en">
		  <head>
			<meta charset="UTF-8">
			<meta name="viewport" content="width=device-width, initial-scale=1.0">
			<link rel="stylesheet" type="text/css" href="/icons/font/hugeicons-font.css">
			<title>cloud.connormoulton.com/${fullSavePath}</title>
			<script src="https://cdn.tailwindcss.com"></script>
		  </head>
		  <body class="flex items-center justify-center min-h-screen bg-white dark:bg-black">
		  <a href="${fullSavePath}&download">
			<div class="bg-white dark:bg-black border border-black dark:border-white p-8 text-center hover:bg-gray-500 hover:bg-opacity-20">
			<div class="bg-white">
			  ${
          [".png", ".gif", ".jpg", ".jpeg"].includes(fileExtention)
            ? `<img class="h-52 mx-auto mb-4 object-cover" src="${fullSavePath}&download" alt="${saveFileName}">`
            : ""
        }
		</div>
			 <div class="text-black dark:text-white no-underline text-lg font-bold"> ${saveFileName} <span class="p-0.5 border border-black dark:border-white rounded-md font-mono font-normal text-sm uppercase">${
          fileExtention.slice(1)
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
        //   context.response.status = 500;
        //   context.response.body = { error: "Failed to generate download link" };
      }
    }
  }
});

const app = new Application();
app.use(router.routes());
app.use(router.allowedMethods());

console.log("Server is running on http://localhost:8000");
await app.listen({ port: 8000 });
