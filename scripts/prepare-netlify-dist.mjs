import fs from "fs";
import path from "path";

const sourceApp = path.resolve("apps/web/.next/server/app");
const sourceStatic = path.resolve("apps/web/.next/static");
const sourcePublic = path.resolve("apps/web/public");
const targetDir = path.resolve("dist-netlify");

fs.rmSync(targetDir, { recursive: true, force: true });
fs.mkdirSync(targetDir, { recursive: true });

function copyRecursive(src, dest) {
  if (!fs.existsSync(src)) return;
  const stat = fs.statSync(src);
  if (stat.isDirectory()) {
    fs.mkdirSync(dest, { recursive: true });
    for (const child of fs.readdirSync(src)) {
      copyRecursive(path.join(src, child), path.join(dest, child));
    }
  } else {
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.copyFileSync(src, dest);
  }
}

// 1. Copy Static Chunks to _next/static
console.log("Copying _next/static assets...");
copyRecursive(sourceStatic, path.join(targetDir, "_next/static"));

// 2. Copy Public Assets (manifest, icons, downloads, installer exe/zip, etc.)
console.log("Copying public assets...");
copyRecursive(sourcePublic, targetDir);

// 3. Copy Prerendered HTML Pages
const htmlPages = [
  { src: "index.html", dest: "index.html" },
  { src: "login.html", dest: "login/index.html" },
  { src: "register.html", dest: "register/index.html" },
  { src: "forgot-password.html", dest: "forgot-password/index.html" },
  { src: "onboarding.html", dest: "onboarding/index.html" },
  { src: "privacy.html", dest: "privacy/index.html" },
  { src: "terms.html", dest: "terms/index.html" },
  { src: "refund-policy.html", dest: "refund-policy/index.html" },
  { src: "dashboard.html", dest: "dashboard/index.html" },
  { src: "dashboard/orders.html", dest: "dashboard/orders/index.html" },
  { src: "dashboard/printers.html", dest: "dashboard/printers/index.html" },
  { src: "dashboard/qr-posters.html", dest: "dashboard/qr-posters/index.html" },
  { src: "dashboard/settings.html", dest: "dashboard/settings/index.html" },
  { src: "dashboard/help.html", dest: "dashboard/help/index.html" },
];

for (const p of htmlPages) {
  const fullSrc = path.join(sourceApp, p.src);
  const fullDest = path.join(targetDir, p.dest);
  if (fs.existsSync(fullSrc)) {
    fs.mkdirSync(path.dirname(fullDest), { recursive: true });
    fs.copyFileSync(fullSrc, fullDest);
    console.log(`✔ Copied ${p.dest}`);
  } else {
    console.warn(`⚠ Missing: ${p.src}`);
  }
}

// 4. Create _redirects file for Netlify clean routing and single-page application fallback
const redirectsContent = `
/downloads/*           /downloads/:splat                            200
/dashboard/orders      /dashboard/orders/index.html                 200
/dashboard/printers    /dashboard/printers/index.html               200
/dashboard/qr-posters  /dashboard/qr-posters/index.html             200
/dashboard/settings    /dashboard/settings/index.html               200
/dashboard/help        /dashboard/help/index.html                   200
/dashboard             /dashboard/index.html                        200
/onboarding            /onboarding/index.html                       200
/login                 /login/index.html                            200
/register              /register/index.html                         200
/forgot-password       /forgot-password/index.html                  200
/privacy               /privacy/index.html                          200
/terms                 /terms/index.html                            200
/refund-policy         /refund-policy/index.html                    200
/shop/*                /index.html                                  200
/order/*               /index.html                                  200
/*                     /index.html                                  200
`.trim();

fs.writeFileSync(path.join(targetDir, "_redirects"), redirectsContent, "utf8");
console.log("✔ Created _redirects file");
console.log(`\n🎉 Distribution ready for Netlify in: ${targetDir}`);
