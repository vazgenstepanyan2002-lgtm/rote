const fs = require("fs");
const vm = require("vm");
const { execSync } = require("child_process");

let errors = 0;
const ok = msg => console.log("\x1b[32m✔\x1b[0m", msg);
const fail = (msg, err) => { errors++; console.error("\x1b[31m✖\x1b[0m", msg, "\n ", err.message || err); };

// 1. Проверка всех JS-файлов
for (const f of fs.readdirSync(".").filter(x => x.endsWith(".js") && x !== "check.js")) {
  try {
    execSync(`node --check "${f}"`, { stdio: "pipe" });
    ok(`JS: ${f}`);
  } catch (e) {
    fail(`JS: ${f}`, e.stderr ? e.stderr.toString().trim() : e);
  }
}

// 2. Проверка всех JSON-файлов
for (const f of fs.readdirSync(".").filter(x => x.endsWith(".json"))) {
  try {
    JSON.parse(fs.readFileSync(f, "utf8"));
    ok(`JSON: ${f}`);
  } catch (e) {
    fail(`JSON: ${f}`, e);
  }
}

// 3. Проверка встроенных <script> и <style> внутри HTML-файлов
for (const f of fs.readdirSync(".").filter(x => x.endsWith(".html"))) {
  const html = fs.readFileSync(f, "utf8");
  let idx = 0, htmlOk = true;
  for (const m of html.matchAll(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/gi)) {
    idx++;
    try {
      new vm.Script(m[1], { filename: `${f}#script-${idx}` });
    } catch (e) {
      htmlOk = false;
      fail(`HTML <script #${idx}> в ${f}`, e);
    }
  }
  for (const m of html.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/gi)) {
    const open = (m[1].match(/\{/g) || []).length;
    const close = (m[1].match(/\}/g) || []).length;
    if (open !== close) {
      htmlOk = false;
      fail(`HTML <style> в ${f}`, `Не совпадают скобки: { = ${open}, } = ${close}`);
    }
  }
  if (htmlOk) ok(`HTML (скрипты и стили): ${f}`);
}

// 4. Проверка баланса скобок в style.css
if (fs.existsSync("style.css")) {
  const css = fs.readFileSync("style.css", "utf8");
  const open = (css.match(/\{/g) || []).length;
  const close = (css.match(/\}/g) || []).length;
  if (open === close) ok("CSS: style.css");
  else fail("CSS: style.css", `Не совпадают скобки: { = ${open}, } = ${close}`);
}

console.log(errors ? `\n❌ Найдено ошибок: ${errors}` : "\n✅ Весь проект проверен: ошибок нет!");
process.exit(errors ? 1 : 0);
