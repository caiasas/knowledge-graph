/* 极简静态服务器：双击 serve.cmd 后，平板/手机用同一 WiFi 访问控制台打印的地址 */
const http = require("http");
const fs = require("fs");
const os = require("os");
const path = require("path");

const ROOT = __dirname;
const PORT = Number(process.env.PORT || 8777);
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

http.createServer(function (req, res) {
  var rel = decodeURIComponent((req.url || "/").split("?")[0]);
  if (rel === "/") rel = "/index.html";
  var file = path.join(ROOT, path.normalize(rel).replace(/^([\\/])+/, ""));
  if (file.indexOf(ROOT) !== 0) { res.writeHead(403); return res.end("403"); }
  fs.readFile(file, function (err, data) {
    if (err) { res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" }); return res.end("404"); }
    res.writeHead(200, { "Content-Type": MIME[path.extname(file).toLowerCase()] || "application/octet-stream", "Cache-Control": "no-cache" });
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
  console.log("  同一 WiFi 下用平板浏览器打开上面的地址即可；Ctrl+C 停止。");
});
