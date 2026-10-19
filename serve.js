/* 极简静态服务器 + 局域网数据接口
 * 用法：node serve.js  （或双击 serve.cmd）
 * 平板/手机用同一 WiFi 打开控制台打印的地址。
 */
const http = require("http");
const fs = require("fs");
const os = require("os");
const path = require("path");

const ROOT = __dirname;
const PORT = Number(process.env.PORT || 8777);
const DATA_FILE = path.join(ROOT, "data.json");
const DATA_BAK = path.join(ROOT, "data.bak.json");
const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon"
};

function cors(res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,PUT,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  res.setHeader("Cache-Control", "no-store");
}

function send(res, code, text, type) {
  res.writeHead(code, { "Content-Type": type || "text/plain; charset=utf-8" });
  res.end(text);
}

function handleApi(req, res) {
  cors(res);
  if (req.method === "OPTIONS") { res.writeHead(204); return res.end(); }

  if (req.url.split("?")[0] === "/api/ping") {
    return send(res, 200, '{"ok":true,"app":"knowledge-graph"}', "application/json");
  }

  if (req.method === "GET") {
    fs.readFile(DATA_FILE, "utf8", function (err, text) {
      if (err) return send(res, 404, '{"error":"no data"}', "application/json");
      send(res, 200, text, "application/json; charset=utf-8");
    });
    return;
  }

  if (req.method === "PUT") {
    var body = "";
    var tooBig = false;
    req.on("data", function (chunk) {
      body += chunk;
      if (body.length > 8 * 1024 * 1024 && !tooBig) {
        tooBig = true;
        send(res, 413, '{"error":"too large"}', "application/json");
        req.destroy();
      }
    });
    req.on("end", function () {
      if (tooBig) return;
      var parsed;
      try { parsed = JSON.parse(body); } catch (e) { return send(res, 400, '{"error":"bad json"}', "application/json"); }
      if (!parsed || !Array.isArray(parsed.nodes)) return send(res, 400, '{"error":"bad data"}', "application/json");
      if (fs.existsSync(DATA_FILE)) { try { fs.copyFileSync(DATA_FILE, DATA_BAK); } catch (e) {} }
      fs.writeFile(DATA_FILE, body, "utf8", function (err) {
        if (err) return send(res, 500, '{"error":"write failed"}', "application/json");
        send(res, 200, '{"ok":true}', "application/json");
      });
    });
    return;
  }

  send(res, 405, '{"error":"method not allowed"}', "application/json");
}

http.createServer(function (req, res) {
  var rel = decodeURIComponent((req.url || "/").split("?")[0]);

  if (rel === "/api/ping" || rel === "/api/data") return handleApi(req, res);

  if (rel === "/") rel = "/index.html";
  var file = path.join(ROOT, path.normalize(rel).replace(/^([\\/])+/, ""));
  if (file.indexOf(ROOT) !== 0) return send(res, 403, "403");

  fs.readFile(file, function (err, data) {
    if (err) return send(res, 404, "404");
    res.writeHead(200, {
      "Content-Type": MIME[path.extname(file).toLowerCase()] || "application/octet-stream",
      "Cache-Control": "no-cache"
    });
    res.end(data);
  });
}).listen(PORT, "0.0.0.0", function () {
  var ips = [];
  var nets = os.networkInterfaces();
  Object.keys(nets).forEach(function (k) {
    (nets[k] || []).forEach(function (n) {
      if (n.family === "IPv4" && !n.internal) ips.push(n.address);
    });
  });
  console.log("");
  console.log("  知识图谱已启动");
  console.log("  本机：   http://127.0.0.1:" + PORT + "/");
  ips.forEach(function (ip) { console.log("  平板/手机：http://" + ip + ":" + PORT + "/"); });
  console.log("");
  console.log("  数据文件：" + DATA_FILE);
  console.log("  同一 WiFi 下用平板浏览器打开上面的地址即可；Ctrl+C 停止。");
});
