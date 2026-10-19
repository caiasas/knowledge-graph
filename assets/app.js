/* =========================================================================
 * 知识图谱 · 交互与渲染
 * 纯前端、零依赖：数据存 localStorage，可导入/导出 JSON
 * ========================================================================= */
(function () {
  "use strict";
 

  /* ======================= 0. 基础工具 ======================= */
  var SVGNS = "http://www.w3.org/2000/svg";

  function $(sel, root) { return (root || document).querySelector(sel); }
  function $$(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }
  function clamp(v, a, b) { return v < a ? a : (v > b ? b : v); }
  function lerp(a, b, t) { return a + (b - a) * t; }
  function uid() { return "k" + Math.random().toString(36).slice(2, 8); }
  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }
  function svgEl(tag, attrs) {
    var e = document.createElementNS(SVGNS, tag);
    if (attrs) { for (var k in attrs) { if (attrs[k] != null) e.setAttribute(k, attrs[k]); } }
    return e;
  }
  function splitList(s) {
    return String(s || "").split(/[,，、;；]/).map(function (x) { return x.trim(); }).filter(Boolean);
  }
  function debounce(fn, ms) {
    var t; return function () { var a = arguments, self = this; clearTimeout(t); t = setTimeout(function () { fn.apply(self, a); }, ms); };
  }
  function nowId(prefix) { return prefix + "-" + Date.now().toString(36) + Math.random().toString(36).slice(2, 5); }

  var BUILD = "2026-10-19.2230";
  var STORE_KEY = "kg.data.v1";
  var THEME_KEY = "kg.theme";
  var PALETTE = ["#F0B429", "#38BDF8", "#A78BFA", "#34D399", "#FB7185", "#FB923C", "#22D3EE", "#A3E635",
                 "#F472B6", "#818CF8", "#2DD4BF", "#FACC15"];

  /* ======================= 1. 状态 ======================= */
  var S = {
    data: null,
    nodes: [],
    byId: {},
    catColors: {},
    typeMap: {},
    typeOrder: [],
    links: [],
    nbrs: {},
    levels: {},
    mode: "overview",
    focusId: null,
    trail: [],
    selectedId: null,
    query: "",
    hiddenCats: {},
    hiddenTypes: {},
    results: [],
    active: -1,
    alpha: 1,
    view: { k: 1, x: 0, y: 0, user: false },
    autoFitted: false,
    settling: false,
    focusR: 190,
    needsPaint: true,
    labelsDirty: true,
    suppressPush: false,
    animating: false,
    lite: false,
    temp: 0,
    theme: "dark",
    empty: false
  };
  var V = {};
  var stage, svg, vp, gEdges, gNodes, gRings, gClusters;
  var rafId = 0;

  /* ======================= 2. 数据层 ======================= */
  function normalize(raw) {
    var d = raw && typeof raw === "object" ? raw : {};
    var cats = Array.isArray(d.categories) ? d.categories.slice() : [];
    var types = Array.isArray(d.relationTypes) ? d.relationTypes.slice() : [];
    if (!types.length) {
      types = [
        { name: "包含", color: "#7DD3FC", directed: true, inverse: "属于" },
        { name: "相关", color: "#94A3B8", directed: false, inverse: "相关" }
      ];
    }
    var seen = {};
    var srcNodes = Array.isArray(d.nodes) ? d.nodes : [];
    var nodes = srcNodes.map(function (n, i) {
      var node = {
        id: String(n.id || ("node-" + i)),
        name: String(n.name || "未命名"),
        aliases: Array.isArray(n.aliases) ? n.aliases.map(String) : splitList(n.aliases),
        category: String(n.category || "未分类"),
        tags: Array.isArray(n.tags) ? n.tags.map(String) : splitList(n.tags),
        summary: String(n.summary || ""),
        content: String(n.content || ""),
        level: (n.level === undefined || n.level === null || n.level === "") ? null : clamp(Number(n.level), 0, 3),
        links: []
      };
      if (seen[node.id]) node.id = node.id + "-" + i;
      seen[node.id] = true;
      return node;
    });
    var idSet = {};
    nodes.forEach(function (n) { idSet[n.id] = true; });
    nodes.forEach(function (n, i) {
      var rawLinks = srcNodes[i] && Array.isArray(srcNodes[i].links) ? srcNodes[i].links : [];
      var used = {};
      rawLinks.forEach(function (l) {
        var to = String(l && l.to || "");
        var type = String(l && l.type || "相关");
        if (!idSet[to] || to === n.id) return;
        var key = type + ">" + to;
        if (used[key]) return;
        used[key] = true;
        n.links.push({ type: type, to: to, note: String(l.note || "") });
      });
    });
    // 补全分类
    var catMap = {};
    cats.forEach(function (c) { catMap[c.name] = c; });
    nodes.forEach(function (n) {
      if (!catMap[n.category]) {
        var c = { name: n.category, color: PALETTE[Object.keys(catMap).length % PALETTE.length] };
        cats.push(c); catMap[n.category] = c;
      }
    });
    // 补全关系类型
    var typeNames = {};
    types.forEach(function (t) { typeNames[t.name] = true; });
    nodes.forEach(function (n) {
      n.links.forEach(function (l) {
        if (!typeNames[l.type]) {
          types.push({ name: l.type, color: "#94A3B8", directed: true, inverse: l.type });
          typeNames[l.type] = true;
        }
      });
    });
    return {
      version: 1,
      title: String(d.title || "我的知识图谱"),
      subtitle: String(d.subtitle || ""),
      updatedAt: Number(d.updatedAt || 0),
      categories: cats,
      relationTypes: types,
      nodes: nodes
    };
  }

  function loadData() {
    try {
      var s = localStorage.getItem(STORE_KEY);
      if (s) {
        var parsed = JSON.parse(s);
        if (parsed && Array.isArray(parsed.nodes)) return normalize(parsed);
      }
    } catch (e) { /* 忽略损坏数据，回落到示例 */ }
    return normalize(window.KG_SEED || { nodes: [] });
  }

  var storageOK = true;
  function saveData() {
    try {
      localStorage.setItem(STORE_KEY, JSON.stringify(S.data));
      storageOK = true;
      if (typeof scheduleLanPush === "function") scheduleLanPush();
      if (typeof schedulePush === "function") schedulePush();
    } catch (e) {
      storageOK = false;
      toast("本次改动没能保存：浏览器禁止了本地存储（file:// 打开时常见）", true);
    }
  }

  function checkStorage() {
    try {
      localStorage.setItem("kg.probe", "1");
      localStorage.removeItem("kg.probe");
    } catch (e) {
      storageOK = false;
      setTimeout(function () {
        toast("当前环境不能保存数据：请用 serve.cmd 启动，或部署到 GitHub Pages 后使用", true);
      }, 900);
    }
  }

  function rebuild() {
    var d = S.data;
    S.nodes = d.nodes;
    S.byId = {};
    S.catColors = {};
    S.typeMap = {};
    S.typeOrder = [];
    S.links = [];
    S.nbrs = {};

    d.categories.forEach(function (c, i) {
      S.catColors[c.name] = c.color || PALETTE[i % PALETTE.length];
    });
    d.relationTypes.forEach(function (t, i) {
      S.typeMap[t.name] = { color: t.color || "#94A3B8", directed: t.directed !== false, inverse: t.inverse || t.name, index: i };
      S.typeOrder.push(t.name);
    });

    d.nodes.forEach(function (n) {
      S.byId[n.id] = n;
      S.nbrs[n.id] = {};
      if (!S.catColors[n.category]) S.catColors[n.category] = PALETTE[Object.keys(S.catColors).length % PALETTE.length];
    });

    d.nodes.forEach(function (n) {
      var seen = {};
      n.links.forEach(function (l) {
        if (!S.byId[l.to]) return;
        var key = [n.id, l.to].sort().join("~") + "~" + l.type;
        if (seen[key]) return;
        seen[key] = true;
        S.links.push({
          key: key,
          source: n.id,
          target: l.to,
          type: l.type,
          note: l.note || "",
          pairIndex: 0
        });
        S.nbrs[n.id][l.to] = true;
        S.nbrs[l.to][n.id] = true;
      });
    });

    // 层级：显式 level 优先；否则按“包含”关系推导（根 0 / 中间 1 / 叶子 2）
    S.levels = {};
    var inc = {}, out = {};
    S.links.forEach(function (l) {
      if (l.type !== "包含") return;
      out[l.source] = (out[l.source] || 0) + 1;
      inc[l.target] = (inc[l.target] || 0) + 1;
    });
    var containCount = 0;
    Object.keys(out).forEach(function (k) { containCount += out[k]; });
    var degs = [];
    S.nodes.forEach(function (n) { degs.push(neighborIds(n.id).length); });
    degs.sort(function (a, b) { return b - a; });
    var hi = degs[Math.floor(degs.length * 0.2)] || 0;
    var mid = degs[Math.floor(degs.length * 0.5)] || 0;
    S.nodes.forEach(function (n) {
      if (n.level !== null && n.level !== undefined) { S.levels[n.id] = n.level; return; }
      if (containCount >= 2) {
        var i = inc[n.id] || 0, o = out[n.id] || 0;
        S.levels[n.id] = (i === 0 && o > 0) ? 0 : (i > 0 && o > 0 ? 1 : 2);
      } else {
        var d = neighborIds(n.id).length;
        S.levels[n.id] = d >= hi && hi > 0 ? 0 : (d >= mid && mid > 0 ? 1 : 2);
      }
    });

    // 同一对节点之间的多条边做弯曲偏移
    var pairCount = {};
    S.links.forEach(function (l) {
      var p = [l.source, l.target].sort().join("~");
      pairCount[p] = (pairCount[p] || 0);
      l.pairIndex = pairCount[p];
      pairCount[p] += 1;
    });
  }

  function catColor(name) { return S.catColors[name] || "#94A3B8"; }
  function typeColor(name) { return (S.typeMap[name] && S.typeMap[name].color) || "#94A3B8"; }
  function inverseLabel(type) { return (S.typeMap[type] && S.typeMap[type].inverse) || type; }
  function neighborIds(id) { return Object.keys(S.nbrs[id] || {}); }
  function isCatHidden(c) { return !!S.hiddenCats[c]; }
  function isTypeHidden(t) { return !!S.hiddenTypes[t]; }
  function nodeVisible(n) { return !S.empty && !isCatHidden(n.category); }

  /* ======================= 3. 图层构建 ======================= */
  function nodeRadius(n) {
    var lvl = S.levels && S.levels[n.id] != null ? S.levels[n.id] : 2;
    if (lvl === 0) return 34;
    if (lvl === 1) return 26;
    if (lvl === 3) return 16;
    return 20;
  }

  function buildGraph() {
    gEdges.textContent = "";
    gNodes.textContent = "";
    gRings.textContent = "";
    V = {};

    var n = S.nodes.length;
    S.nodes.forEach(function (node, i) {
      var r0 = nodeRadius(node);
      var ang = i * 2.399963;
      var rad = 34 * Math.sqrt(i + 1);
      var v = {
        id: node.id,
        x: Math.cos(ang) * rad,
        y: Math.sin(ang) * rad,
        vx: 0, vy: 0,
        r: r0, tr: r0,
        tx: 0, ty: 0,
        el: null, halo: null, disc: null, ring: null, glyph: null, label: null
      };
      V[node.id] = v;

      var g = svgEl("g", { "class": "node", "data-id": node.id });
      g.style.setProperty("--c", catColor(node.category));

      var halo = svgEl("circle", { "class": "halo", r: r0 * 2.1, cx: 0, cy: 0 });
      var disc = svgEl("circle", { "class": "disc", r: r0, cx: 0, cy: 0 });
      var ring = svgEl("circle", { "class": "ring", r: r0 + 6, cx: 0, cy: 0 });
      var glyph = svgEl("text", { "class": "glyph", x: 0, y: 0 });
      var label = svgEl("text", { "class": "label", x: 0, y: r0 + 15 });

      glyph.textContent = firstChar(node.name);
      label.textContent = node.name;

      g.appendChild(halo); g.appendChild(disc); g.appendChild(ring);
      g.appendChild(glyph); g.appendChild(label);
      gNodes.appendChild(g);

      v.el = g; v.halo = halo; v.disc = disc; v.ring = ring; v.glyph = glyph; v.label = label;
      setNodeRadius(v, r0);
    });

    S.links.forEach(function (l) {
      var p = svgEl("path", { "class": "edge" + (S.typeMap[l.type] && S.typeMap[l.type].directed === false ? " related" : " directed") });
      p.style.setProperty("--hot", typeColor(l.type));
      l.arrow = false;
      var t = svgEl("text", { "class": "edge-label" });
      t.textContent = l.type;
      gEdges.appendChild(p);
      gEdges.appendChild(t);
      l.el = p; l.labelEl = t;
    });

    applyFilters();
    layoutClusters(false);
    if (S.mode === "focus" && S.focusId && S.byId[S.focusId]) {
      computeFocusTargets();
      snapToTargets();
      applyModeClasses();
    }
    S.needsPaint = true;
    S.autoFitted = false;
    updateNodeLabels();
  }

  function firstChar(name) {
    var m = String(name).trim();
    if (!m) return "?";
    var c = m.charAt(0);
    return /[a-z]/i.test(c) ? c.toUpperCase() : c;
  }

  function setNodeRadius(v, r) {
    v.r = r;
    v.disc.setAttribute("r", r.toFixed(2));
    v.halo.setAttribute("r", (r * 1.35).toFixed(2));
    v.ring.setAttribute("r", (r + 6).toFixed(2));
    v.label.setAttribute("y", (r + 15).toFixed(2));
    v.glyph.setAttribute("font-size", Math.max(11, r * 0.66).toFixed(1));
  }

  var labelFrame = 0;
  function placeLabels() {
    S.nodes.forEach(function (n) {
      var v = V[n.id];
      if (!v) return;
      if (S.mode === "focus" && v.labelAng != null) {
        var rr = (v.labelR || 0) * 0 + (v.tr || v.r) + 16;
        var dx = Math.cos(v.labelAng) * rr;
        var dy = Math.sin(v.labelAng) * rr + 5;
        v.label.setAttribute("x", dx.toFixed(1));
        v.label.setAttribute("y", dy.toFixed(1));
        var co = Math.cos(v.labelAng);
        v.label.setAttribute("text-anchor", co > 0.3 ? "start" : (co < -0.3 ? "end" : "middle"));
      } else {
        v.labelAng = null;
        v.label.setAttribute("x", 0);
        v.label.setAttribute("y", (v.r + 15).toFixed(1));
        v.label.setAttribute("text-anchor", "middle");
      }
    });
  }

  function updateNodeLabels() {
    var k = S.view.k;
    var list = [];
    S.nodes.forEach(function (n) {
      var v = V[n.id];
      if (!v || !nodeVisible(n)) return;
      if (v.el.classList.contains("faded")) { v.el.classList.add("hide-label"); return; }
      list.push({ n: n, v: v, deg: neighborIds(n.id).length });
    });
    list.sort(function (a, b) { return b.deg - a.deg; });
    var boxes = [];
    list.forEach(function (it) {
      var nr = it.v.r * k + 3;
      boxes.push({
        x1: S.view.x + it.v.x * k - nr, y1: S.view.y + it.v.y * k - nr,
        x2: S.view.x + it.v.x * k + nr, y2: S.view.y + it.v.y * k + nr,
        node: it.n.id
      });
    });
    list.forEach(function (it) {
      var wpx = Math.max(30, it.n.name.length * 12.6) * k + 8;
      var hpx = 17 * k;
      var lx = it.v.x, ly = it.v.y + it.v.r + 15;
      if (it.v.labelAng != null) {
        var lrr = (it.v.tr || it.v.r) + 16;
        lx = it.v.x + Math.cos(it.v.labelAng) * lrr;
        ly = it.v.y + Math.sin(it.v.labelAng) * lrr + 5;
      }
      var cx = S.view.x + lx * k;
      var cy = S.view.y + ly * k;
      var anchor = "middle";
      if (it.v.labelAng != null) {
        var co = Math.cos(it.v.labelAng);
        if (co > 0.3) anchor = "start";
        else if (co < -0.3) anchor = "end";
      }
      var x1 = anchor === "start" ? cx : anchor === "end" ? cx - wpx : cx - wpx / 2;
      var box = { x1: x1, y1: cy - hpx / 2, x2: x1 + wpx, y2: cy + hpx / 2 };
      var hit = false;
      if (k >= 0.40) {
        for (var i = 0; i < boxes.length; i++) {
          var b = boxes[i];
          if (b.node === it.n.id) continue;
          if (!(box.x2 < b.x1 || box.x1 > b.x2 || box.y2 < b.y1 || box.y1 > b.y2)) { hit = true; break; }
        }
      }
      var pinned = it.n.id === S.selectedId || it.n.id === S.focusId;
      it.v.el.classList.toggle("hide-label", hit && !pinned);
      if (!hit) boxes.push(box);
    });
  }

  /* ======================= 4. 布局：分类星团 + 碰撞松弛 ======================= */
  var CAT_CENTERS = {};

  function clusterLayout() {
    var counts = {}, byCat = {};
    S.nodes.forEach(function (n) {
      counts[n.category] = (counts[n.category] || 0) + 1;
      (byCat[n.category] = byCat[n.category] || []).push(n);
    });
    var cats = S.data.categories.filter(function (c) { return counts[c.name]; });
    var n = cats.length;
    var radii = cats.map(function (c) { return 46 + 36 * Math.sqrt(counts[c.name]); });
    var R = 210;
    if (n > 1) {
      for (var i = 0; i < n; i++) {
        var r1 = radii[i], r2 = radii[(i + 1) % n];
        R = Math.max(R, (r1 + r2 + 150) / (2 * Math.sin(Math.PI / n)));
      }
    }
    CAT_CENTERS = {};
    var vw = stage.clientWidth || 1200, vh = stage.clientHeight || 800;
    var portrait = vh > vw * 1.15;
    cats.forEach(function (c, i) {
      var ang, sx = 1, sy = 1;
      if (n === 2) {
        ang = portrait ? (-Math.PI / 2 + i * Math.PI) : (i * Math.PI);
      } else {
        ang = -Math.PI / 2 + i * Math.PI * 2 / n;
        if (portrait) { sx = 0.72; sy = 1; } else { sx = 1; sy = 0.78; }
      }
      var cx = n > 1 ? Math.cos(ang) * R * sx : 0;
      var cy = n > 1 ? Math.sin(ang) * R * sy : 0;
      var arr = byCat[c.name];
      CAT_CENTERS[c.name] = { x: cx, y: cy, r: radii[i], color: catColor(c.name), count: arr.length };
      arr.forEach(function (node, k) {
        var v = V[node.id];
        if (!v) return;
        var rr = radii[i] * Math.sqrt((k + 0.7) / arr.length) * 0.95;
        var a2 = k * 2.399963 + i * 0.7;
        v.x = cx + Math.cos(a2) * rr;
        v.y = cy + Math.sin(a2) * rr;
        v.vx = 0; v.vy = 0;
        v.tr = nodeRadius(node);
      });
    });
  }

  function renderClusterLabels() {
    if (!gClusters) return;
    gClusters.textContent = "";
    if (S.mode === "focus") return;
    Object.keys(CAT_CENTERS).forEach(function (name) {
      var c = CAT_CENTERS[name];
      var ang = Math.atan2(c.y, c.x);
      var off = c.r + 44;
      var lx = c.x + Math.cos(ang) * off;
      var ly = c.y + Math.sin(ang) * off + 6;
      var t = svgEl("text", {
        "class": "cluster-label",
        x: lx.toFixed(1),
        y: ly.toFixed(1),
        "text-anchor": "middle"
      });
      t.style.setProperty("--c", c.color);
      t.textContent = name + " · " + c.count;
      gClusters.appendChild(t);
    });
  }

  function relax(iterations) {
    var list = S.nodes.filter(nodeVisible);
    for (var it = 0; it < iterations; it++) {
      for (var c = 0; c < list.length; c++) {
        var node = list[c], vv = V[node.id], cc = CAT_CENTERS[node.category];
        if (!cc) continue;
        vv.x += (cc.x - vv.x) * 0.016;
        vv.y += (cc.y - vv.y) * 0.016;
      }
      for (var i = 0; i < list.length; i++) {
        var a = V[list[i].id];
        for (var j = i + 1; j < list.length; j++) {
          var b = V[list[j].id];
          var dx = b.x - a.x, dy = b.y - a.y;
          var d = Math.sqrt(dx * dx + dy * dy) || 0.01;
          var minD = a.r + b.r + 34;
          if (d < minD) {
            var push = (minD - d) * 0.52;
            var ux = dx / d, uy = dy / d;
            a.x -= ux * push; a.y -= uy * push;
            b.x += ux * push; b.y += uy * push;
          }
        }
      }
      if (it % 2 === 0) {
        for (var li = 0; li < S.links.length; li++) {
          var l = S.links[li];
          if (isTypeHidden(l.type)) continue;
          var sa = V[l.source], sb = V[l.target];
          if (!sa || !sb) continue;
          if (!nodeVisible(S.byId[l.source]) || !nodeVisible(S.byId[l.target])) continue;
          var lx = sb.x - sa.x, ly = sb.y - sa.y;
          var ld = Math.sqrt(lx * lx + ly * ly) || 0.01;
          if (ld > 260) {
            var f = (ld - 260) * 0.008;
            var nx = lx / ld, ny = ly / ld;
            sa.x += nx * f; sa.y += ny * f;
            sb.x -= nx * f; sb.y -= ny * f;
          }
        }
      }
    }
  }

  function separate(iterations) {
    var list = S.nodes.filter(nodeVisible);
    for (var it = 0; it < iterations; it++) {
      for (var i = 0; i < list.length; i++) {
        var a = V[list[i].id];
        for (var j = i + 1; j < list.length; j++) {
          var b = V[list[j].id];
          var dx = b.x - a.x, dy = b.y - a.y;
          var d = Math.sqrt(dx * dx + dy * dy) || 0.01;
          var minD = a.r + b.r + 30;
          if (d < minD) {
            var push = (minD - d) * 0.5;
            var ux = dx / d, uy = dy / d;
            a.x -= ux * push; a.y -= uy * push;
            b.x += ux * push; b.y += uy * push;
          }
        }
      }
    }
  }

  function cacheOverview() {
    S.overviewPos = {};
    S.nodes.forEach(function (n) {
      var v = V[n.id];
      if (v) S.overviewPos[n.id] = { x: v.x, y: v.y };
    });
  }

  function layoutClusters(animate) {
    if (!animate) {
      clusterLayout();
      relax(240);
      separate(50);
      renderClusterLabels();
      cacheOverview();
      paint();
      return;
    }
    // 返回全图：直接用缓存的布局，只把离开过原位的节点滑回去
    if (!S.overviewPos) {
      clusterLayout();
      relax(240);
      separate(50);
      cacheOverview();
    }
    S.nodes.forEach(function (n) {
      var v = V[n.id], c = S.overviewPos[n.id];
      if (!v || !c) return;
      v.tx = c.x; v.ty = c.y;
      v.tr = nodeRadius(n);
    });
    renderClusterLabels();
    if (document.documentElement.classList.contains("no-anim")) {
      snapToTargets();
    } else {
      S.settling = true;
      beginTween(S.nodes.map(function (n) { return n.id; }), 460);
      S.needsPaint = true;
    }
  }

  function settleOverview() {
    if (!S.settling) return 0;
    var n = advanceTweens();
    if (!n) S.settling = false;
    return n;
  }

  /* ======================= 5. 渲染循环 ======================= */
  function focusSet() {
    if (!S.focusId) return [];
    var list = [S.focusId];
    neighborIds(S.focusId).forEach(function (id) {
      if (S.byId[id] && nodeVisible(S.byId[id])) list.push(id);
    });
    return list;
  }

  /* 缓动：轻微回弹的 easeOutBack，像圆点在轨道上滑过去 */
  function easeOutBack(p) {
    var c1 = 1.08, c3 = c1 + 1;
    return 1 + c3 * Math.pow(p - 1, 3) + c1 * Math.pow(p - 1, 2);
  }

  function beginTween(ids, dur, delayOf) {
    S.animating = true;
    var now = performance.now();
    ids.forEach(function (id, idx) {
      var v = V[id];
      if (!v) return;
      var d = typeof delayOf === "function" ? delayOf(v, idx) : (delayOf || 0);
      if (Math.abs(v.x - v.tx) < 0.5 && Math.abs(v.y - v.ty) < 0.5) { v.x = v.tx; v.y = v.ty; return; }
      v.fx = v.x; v.fy = v.y; v.fr = v.r;
      v.t0 = now + d; v.dur = dur || 520;
      v.moving = true;
    });
  }

  function advanceTweens() {
    var now = performance.now();
    var moving = 0;
    S.nodes.forEach(function (n) {
      var v = V[n.id];
      if (!v || !v.moving) return;
      var p = clamp((now - v.t0) / v.dur, 0, 1);
      var e = easeOutBack(p);
      v.x = v.fx + (v.tx - v.fx) * e;
      v.y = v.fy + (v.ty - v.fy) * e;
      v.r = v.fr + (v.tr - v.fr) * e;
      if (p >= 1) {
        v.x = v.tx; v.y = v.ty;
        v.moving = false;
      } else {
        moving++;
      }
    });
    if (!moving) { S.animating = false; S.needsPaint = true; }
    return moving;
  }

  function snapToTargets() {
    S.nodes.forEach(function (n) {
      var v = V[n.id];
      if (!v) return;
      if (v.tx != null) { v.x = v.tx; v.y = v.ty; }
      if (v.tr) v.r = v.tr;
      v.moving = false;
      S.needsPaint = true;
    });
    S.settling = false;
  }

  function settleFocus() { return advanceTweens(); }

  function computeFocusTargets() {
    var center = S.focusId;
    if (!center) return;
    var cv = V[center];
    if (!cv) return;

    var nbrs = neighborIds(center).filter(function (id) { return nodeVisible(S.byId[id]); });
    nbrs.sort(function (x, y) {
      var a = S.byId[x], b = S.byId[y];
      if (a.category !== b.category) return a.category < b.category ? -1 : 1;
      return a.name < b.name ? -1 : 1;
    });

    cv.tx = 0; cv.ty = 0; cv.tr = 46; cv.labelAng = Math.PI / 2;

    var count = nbrs.length;
    var R = clamp(170 + count * 13, 200, 430);
    if (stage.clientWidth < 520) R = Math.min(R, 148);
    var outerR = R;
    var staggered = count > 14;

    /* 按分类分组，组间留缺口：同一条分支聚成一段弧，看起来像树杈 */
    var groups = [];
    var index = {};
    nbrs.forEach(function (id) {
      var cat = S.byId[id].category;
      if (!index[cat]) { index[cat] = []; groups.push(index[cat]); }
      index[cat].push(id);
    });
    var gap = groups.length > 1 ? 0.09 : 0;
    var usable = Math.PI * 2 - gap * groups.length;
    var cursor = -Math.PI / 2;

    groups.forEach(function (g) {
      var span = usable * (g.length / count);
      g.forEach(function (id, i) {
        var v = V[id];
        if (!v) return;
        var ang = cursor + span * ((i + 0.5) / g.length);
        var r = R;
        if (staggered && g.length > 6 && i % 2 === 1) r = R + 115;
        if (r > outerR) outerR = r;
        v.tx = Math.cos(ang) * r;
        v.ty = Math.sin(ang) * r;
        v.tr = nodeRadius(S.byId[id]);
        v.labelAng = ang;
        v.labelR = r;
      });
      cursor += span + gap;
    });
    S.focusR = outerR;

    S.nodes.forEach(function (n) {
      if (n.id === center || nbrs.indexOf(n.id) >= 0) return;
      var v = V[n.id]; if (!v) return;
      v.tx = v.x;
      v.ty = v.y;
      v.tr = nodeRadius(n);
      v.labelAng = null;
    });

    placeLabels();
    gRings.textContent = "";
    if (count > 1) {
      gRings.appendChild(svgEl("circle", { cx: 0, cy: 0, r: R, fill: "none", stroke: "currentColor", "stroke-width": "1", "stroke-dasharray": "2 10", opacity: ".12" }));
      if (staggered && outerR > R + 1) {
        gRings.appendChild(svgEl("circle", { cx: 0, cy: 0, r: outerR, fill: "none", stroke: "currentColor", "stroke-width": "1", "stroke-dasharray": "2 10", opacity: ".08" }));
      }
    }
  }

  function applyModeClasses() {
    var set = S.mode === "focus" ? focusSet() : null;
    if (gClusters) gClusters.style.display = S.mode === "focus" ? "none" : "";
    S.nodes.forEach(function (n) {
      var v = V[n.id];
      if (!v) return;
      var inFocus = !set || set.indexOf(n.id) >= 0;
      v.el.classList.toggle("faded", !inFocus && S.mode === "focus");
      v.el.classList.toggle("center", n.id === S.focusId);
      v.el.classList.toggle("selected", n.id === S.selectedId);
    });
    S.links.forEach(function (l) {
      var visible = S.mode !== "focus" || (set.indexOf(l.source) >= 0 && set.indexOf(l.target) >= 0);
      l.hidden = !visible || isTypeHidden(l.type) || !nodeVisible(S.byId[l.source]) || !nodeVisible(S.byId[l.target]);
      l.el.classList.toggle("off", l.hidden);
      l.labelEl.classList.toggle("off", l.hidden);
      l.dirty = true;
    });
  }

  function paint(force) {
    var i, v, n;
    S.edgeTick = (S.edgeTick || 0) + 1;

    for (i = 0; i < S.nodes.length; i++) {
      n = S.nodes[i];
      v = V[n.id];
      if (!v) continue;
      if (Math.abs(v.r - v.tr) > 0.15) { setNodeRadius(v, lerp(v.r, v.tr, 0.18)); v.dirty = true; }
      if (v.px !== v.x || v.py !== v.y || v.dirty) {
        v.el.setAttribute("transform", "translate(" + v.x.toFixed(2) + " " + v.y.toFixed(2) + ")");
        v.px = v.x; v.py = v.y;
        v.moved = true;
        v.dirty = false;
      }
    }

    for (i = 0; i < S.links.length; i++) {
      var l = S.links[i];
      if (l.hidden) continue;
      var a = V[l.source], b = V[l.target];
      if (!a || !b) continue;
      var dx = b.x - a.x, dy = b.y - a.y;
      var d = Math.sqrt(dx * dx + dy * dy) || 1;
      var ux = dx / d, uy = dy / d;
      var sx = a.x + ux * (a.r + 2), sy = a.y + uy * (a.r + 2);
      var ex = b.x - ux * (b.r + 7), ey = b.y - uy * (b.r + 7);
      var off = l.pairIndex > 0 ? 0.10 + l.pairIndex * 0.10 : 0;
      var cx = (sx + ex) / 2 - uy * d * off;
      var cy = (sy + ey) / 2 + ux * d * off;
      var wantArrow = S.mode === "focus" && d > 70 && S.typeMap[l.type] && S.typeMap[l.type].directed !== false;
      if (l.arrow !== wantArrow) {
        if (wantArrow) l.el.setAttribute("marker-end", "url(#arrow)");
        else l.el.removeAttribute("marker-end");
        l.arrow = wantArrow;
      }
      var dStr = "M" + sx.toFixed(1) + "," + sy.toFixed(1) + " Q" + cx.toFixed(1) + "," + cy.toFixed(1) + " " + ex.toFixed(1) + "," + ey.toFixed(1);
      if (l.pd !== dStr) { l.el.setAttribute("d", dStr); l.pd = dStr; }
      if (S.mode === "focus") {
        var mx = 0.25 * sx + 0.5 * cx + 0.25 * ex;
        var my = 0.25 * sy + 0.5 * cy + 0.25 * ey;
        l.labelEl.setAttribute("x", mx.toFixed(1));
        l.labelEl.setAttribute("y", (my - 5).toFixed(1));
        l.labelEl.classList.add("show");
      } else {
        l.labelEl.classList.remove("show");
      }
      l.dirty = false;
    }
    S.nodes.forEach(function (node) { var vv = V[node.id]; if (vv) vv.moved = false; });
    S.labelDirtyAt = performance.now();
  }

  var FPS = { on: false, frames: 0, last: 0 };
  try { FPS.on = /debug=1/.test(location.search); } catch (e) {}
  function tickFps(now) {
    if (!FPS.on) return;
    FPS.frames++;
    if (!FPS.last) FPS.last = now;
    if (now - FPS.last >= 500) {
      window.__fps = Math.round(FPS.frames * 1000 / (now - FPS.last));
      FPS.frames = 0; FPS.last = now;
    }
  }

  function loop(now) {
    tickFps(now || performance.now());
    var moving = 0;
    if (S.animating || S.settling) moving = S.mode === "overview" ? settleOverview() : settleFocus();
    if (moving || S.needsPaint) {
      paint(!moving);
      S.needsPaint = false;
    }
    if (!moving && S.labelDirtyAt && performance.now() - S.labelDirtyAt > 90) {
      S.labelDirtyAt = 0;
      updateNodeLabels();
    }
    if (S.mode === "overview" && !S.view.user && !S.autoFitted && !S.settling) {
      S.autoFitted = true;
      fitView(true);
    }
    rafId = requestAnimationFrame(loop);
  }

  /* ======================= 6. 视图变换 ======================= */
  function applyView() {
    S.labelDirtyAt = performance.now();
    vp.setAttribute("transform", "translate(" + S.view.x.toFixed(2) + " " + S.view.y.toFixed(2) + ") scale(" + S.view.k.toFixed(4) + ")");
    vp.style.setProperty("--edge-w", clamp(1.1 / S.view.k, 0.85, 2.6).toFixed(2));
    updateNodeLabels();
  }

  function toWorld(clientX, clientY) {
    var r = stage.getBoundingClientRect();
    return {
      x: (clientX - r.left - S.view.x) / S.view.k,
      y: (clientY - r.top - S.view.y) / S.view.k
    };
  }

  function zoomAt(sx, sy, factor) {
    var k2 = clamp(S.view.k * factor, 0.18, 3.2);
    var wx = (sx - S.view.x) / S.view.k;
    var wy = (sy - S.view.y) / S.view.k;
    S.view.x = sx - wx * k2;
    S.view.y = sy - wy * k2;
    S.view.k = k2;
    S.view.user = true;
    applyView();
  }

  var viewToken = 0;
  function setView(k, x, y, animate, dur) {
    var myToken = ++viewToken;
    if (document.documentElement.classList.contains("no-anim")) animate = false;
    var from = { k: S.view.k, x: S.view.x, y: S.view.y };
    var to = { k: k, x: x, y: y };
    if (!animate) {
      S.view.k = k; S.view.x = x; S.view.y = y; applyView(); return;
    }
    var t0 = performance.now();
    var total = dur || 420;
    function anim(t) {
      if (myToken !== viewToken) return;
      var p = clamp((t - t0) / total, 0, 1);
      var e = 1 - Math.pow(1 - p, 3);
      S.view.k = lerp(from.k, to.k, e);
      S.view.x = lerp(from.x, to.x, e);
      S.view.y = lerp(from.y, to.y, e);
      applyView();
      if (p < 1) requestAnimationFrame(anim);
    }
    requestAnimationFrame(anim);
  }

  function fitView(animate, useTargets, dur) {
    var w = stage.clientWidth, h = stage.clientHeight;
    var padL = window.innerWidth > 1180 ? 250 : 26;
    var padR = 26, padT = 34, padB = 58;
    var minX = 1e9, minY = 1e9, maxX = -1e9, maxY = -1e9, any = false;
    S.nodes.forEach(function (n) {
      if (!nodeVisible(n)) return;
      var v = V[n.id]; if (!v) return;
      any = true;
      var px = useTargets && v.moving ? v.tx : v.x;
      var py = useTargets && v.moving ? v.ty : v.y;
      minX = Math.min(minX, px - v.r - 40); maxX = Math.max(maxX, px + v.r + 40);
      minY = Math.min(minY, py - v.r - 40); maxY = Math.max(maxY, py + v.r + 50);
    });
    if (!any) return;
    var availW = Math.max(120, w - padL - padR);
    var availH = Math.max(120, h - padT - padB);
    var k = clamp(Math.min(availW / (maxX - minX || 1), availH / (maxY - minY || 1)), 0.18, 1.35);
    if (/debug=1/.test(location.search)) window.__fitDbg = { minX: Math.round(minX), maxX: Math.round(maxX), minY: Math.round(minY), maxY: Math.round(maxY), k: +k.toFixed(3), availW: availW, availH: availH };
    var cx = (minX + maxX) / 2, cy = (minY + maxY) / 2;
    setView(k, padL + availW / 2 - cx * k, padT + availH / 2 - cy * k, animate !== false, dur);
  }

  /* ======================= 7. 模式切换 ======================= */
  function focusCenter() {
    var w = stage.clientWidth, h = stage.clientHeight;
    var left = window.innerWidth > 1180 ? 240 : 0;
    var right = (window.innerWidth > 900 && !panelEl().hidden) ? 436 : 0;
    var bottom = (window.innerWidth <= 900 && !panelEl().hidden) ? Math.min(h * 0.58, 540) : 0;
    return { x: left + (w - left - right) / 2, y: (h - bottom) / 2 };
  }

  function enterFocus(id, pushTrail) {
    if (!S.byId[id]) return;
    cancelReveal();
    S.mode = "focus";
    S.focusId = id;
    if (pushTrail) {
      var i = S.trail.indexOf(id);
      if (i >= 0) S.trail = S.trail.slice(0, i + 1);
      else S.trail.push(id);
    } else {
      S.trail = [id];
    }
    computeFocusTargets();
    if (document.documentElement.classList.contains("no-anim") || document.documentElement.classList.contains("perf")) {
      snapToTargets();
    } else {
      beginTween(focusSet(), 520);
    }
    applyModeClasses();
    paint();
    renderCrumbs();
    rescaleFocus();
    hideHint();
  }

  function rescaleFocus() {
    if (S.mode !== "focus") return;
    var padL = window.innerWidth > 1180 ? 240 : 0;
    var availW = stage.clientWidth - padL - 70;
    var availH = stage.clientHeight - 120;
    var k = clamp(Math.min(availW, availH) / (2 * (S.focusR || 190) + 90), 0.52, 1.2);
    var c = focusCenter();
    setView(k, c.x, c.y, false);
  }

  function cancelReveal() {
    ["#edges", "#clusters"].forEach(function (sel) {
      var g = $(sel);
      if (g) { g.style.transition = ""; g.style.opacity = ""; }
    });
    S.links.forEach(function (l) { l.el.style.transition = ""; l.el.style.opacity = ""; });
    S.nodes.forEach(function (n) {
      var v = V[n.id];
      if (v) { v.el.style.transition = ""; v.el.style.opacity = ""; }
    });
    if (S.revealTimer) { clearTimeout(S.revealTimer); S.revealTimer = 0; }
    S.revealing = false;
  }

  function exitFocus() {
    var __t0 = performance.now();
    cancelReveal();
    S.mode = "overview";
    S.focusId = null;
    S.trail = [];
    gRings.textContent = "";
    if (!S.overviewPos) {
      clusterLayout();
      relax(240);
      separate(50);
      cacheOverview();
    }
    S.nodes.forEach(function (n) {
      var v = V[n.id], c = S.overviewPos[n.id];
      if (!v || !c) return;
      v.tx = c.x; v.ty = c.y;
      v.x = c.x; v.y = c.y;
      v.tr = nodeRadius(n); v.r = v.tr;
      v.moving = false; v.vx = 0; v.vy = 0;
    });
    renderClusterLabels();
    applyModeClasses();
    placeLabels();
    renderCrumbs();
    S.settling = false;
    S.animating = false;
    S.view.user = false;
    S.autoFitted = false;

    var noAnim = document.documentElement.classList.contains("no-anim");
    var perf = document.documentElement.classList.contains("perf");

    if (noAnim) {
      snapToTargets();
      fitView(false, true);
      S.needsPaint = true;
      paint(true);
    } else {
      var step = 9;
      var delays = {};
      S.nodes.forEach(function (n, i) {
        var v = V[n.id];
        delays[n.id] = i * step;
        if (!v) return;
        v.el.style.transition = "opacity .24s linear " + (i * step) + "ms";
        v.el.style.opacity = "0";
      });
      S.links.forEach(function (l) {
        var d = Math.max(delays[l.source] || 0, delays[l.target] || 0) + 80;
        l.el.style.transition = "opacity .24s linear " + d + "ms";
        l.el.style.opacity = "0";
      });
      var gc = $("#clusters");
      if (gc) {
        gc.style.transition = "opacity .3s linear " + Math.round(S.nodes.length * step * 0.5) + "ms";
        gc.style.opacity = "0";
      }
      if (perf) {
        // 低配/高分屏：位置直接到位，只保留分批渐显，避免逐帧重绘
        snapToTargets();
        fitView(false, true);
        S.needsPaint = true;
        paint(true);
      } else {
        beginTween(S.nodes.map(function (n) { return n.id; }), 460, function (v, idx) { return idx * step; });
        S.settling = true;
        S.animating = true;
        S.needsPaint = true;
        fitView(true, true, 620);
      }
      requestAnimationFrame(function () {
        S.nodes.forEach(function (n) { var v = V[n.id]; if (v) v.el.style.opacity = ""; });
        S.links.forEach(function (l) { l.el.style.opacity = ""; });
        if (gc) gc.style.opacity = "";
      });
      S.revealTimer = setTimeout(cancelReveal, S.nodes.length * step + 1100);
    }
    if (/debug=1/.test(location.search)) window.__exitMs = Math.round(performance.now() - __t0);
  }

  /* ======================= 8. 选中与详情 ======================= */
  function selectNode(id) {
    S.selectedId = id;
    S.nodes.forEach(function (n) {
      var v = V[n.id]; if (v) v.el.classList.toggle("selected", n.id === id);
    });
    highlightEdges(id);
    renderPanel();
  }

  function highlightEdges(id) {
    var hot = {};
    S.links.forEach(function (l) {
      if (!id) { l.el.classList.remove("hot"); return; }
      if (l.hidden) { l.el.classList.remove("hot"); return; }
      var on = l.source === id || l.target === id;
      l.el.classList.toggle("hot", on);
      if (on) hot[l.key] = true;
    });
  }

  function panelEl() { return $("#panel"); }

  function renderPanel() {
    var id = S.selectedId;
    var panel = panelEl();
    if (!id || !S.byId[id]) { closePanel(); return; }
    var n = S.byId[id];
    var color = catColor(n.category);
    var out = [];
    n.links.forEach(function (l) {
      if (!S.byId[l.to]) return;
      out.push({ type: l.type, dir: "out", other: S.byId[l.to], note: l.note });
    });
    S.nodes.forEach(function (m) {
      if (m.id === n.id) return;
      m.links.forEach(function (l) {
        if (l.to === n.id) out.push({ type: l.type, dir: "in", other: m, note: l.note });
      });
    });
    out.sort(function (a, b) {
      var ia = (S.typeMap[a.type] || {}).index; if (ia == null) ia = 99;
      var ib = (S.typeMap[b.type] || {}).index; if (ib == null) ib = 99;
      if (ia !== ib) return ia - ib;
      return a.other.name < b.other.name ? -1 : 1;
    });

    var relHtml = out.length ? out.map(function (r) {
      var directed = !S.typeMap[r.type] || S.typeMap[r.type].directed !== false;
      var arrow = directed ? (r.dir === "out" ? "→" : "←") : "·";
      return [
        '<li class="rel">',
        '<span class="rel-type" style="--tc:' + esc(typeColor(r.type)) + '">' + esc(r.type) + "</span>",
        '<span class="rel-arrow">' + arrow + "</span>",
        '<button class="rel-target" data-goto="' + esc(r.other.id) + '" style="--c:' + esc(catColor(r.other.category)) + '">' + esc(r.other.name) + "</button>",
        r.note ? '<span class="rel-note">' + esc(r.note) + "</span>" : "",
        "</li>"
      ].join("");
    }).join("") : '<li class="p-empty">还没有建立关系，点击「编辑」添加。</li>';

    var tags = (n.tags || []).map(function (t) { return '<span class="tag">' + esc(t) + "</span>"; }).join("");
    var aliases = (n.aliases || []).filter(Boolean).join(" · ");

    panel.innerHTML = [
      '<div class="panel-head">',
      '<span class="cat-chip" style="--c:' + esc(color) + '">' + esc(n.category) + "</span>",
      '<span class="spacer"></span>',
      '<button class="panel-close" data-act="close" aria-label="关闭">✕</button>',
      "</div>",
      '<div class="panel-scroll">',
      '<h2 class="panel-title">' + esc(n.name) + "</h2>",
      aliases ? '<p class="panel-alias">' + esc(aliases) + "</p>" : "",
      n.summary ? '<p class="panel-summary" style="--c:' + esc(color) + '">' + esc(n.summary) + "</p>" : "",
      tags ? '<div class="tag-row">' + tags + "</div>" : "",
      '<section class="p-section">',
      '<h3>关系网络 <span class="line"></span><span class="cnt">' + out.length + " 条</span></h3>",
      '<ul class="rel-list">' + relHtml + "</ul>",
      "</section>",
      n.content ? [
        '<section class="p-section">',
        '<h3>详细说明 <span class="line"></span></h3>',
        '<p class="p-text">' + esc(n.content) + "</p>",
        "</section>"
      ].join("") : "",
      "</div>",
      '<div class="panel-foot">',
      '<button class="btn ghost" data-act="locate">在图谱中聚焦</button>',
      '<button class="btn" data-act="edit">编辑</button>',
      '<button class="btn danger icon-only" data-act="delete" aria-label="删除">',
      '<svg viewBox="0 0 24 24" fill="none" style="width:16px;height:16px"><path d="M4 7h16M9 7V5h6v2M6.5 7l.8 12.2a1.5 1.5 0 0 0 1.5 1.3h6.4a1.5 1.5 0 0 0 1.5-1.3L17.5 7" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>',
      "</button>",
      "</div>"
    ].join("");

    panel.hidden = false;
    panel.classList.add("open");
    var scrim = $("#scrim");
    scrim.hidden = window.innerWidth > 900;
    hideHint();
    if (S.mode === "focus" && window.innerWidth > 640) {
      var c = focusCenter();
      setView(S.view.k, c.x, c.y, true);
    }
  }

  function closePanel() {
    S.selectedId = null;
    var panel = panelEl();
    panel.classList.remove("open");
    panel.hidden = true;
    panel.innerHTML = "";
    $("#scrim").hidden = true;
    S.nodes.forEach(function (n) {
      var v = V[n.id]; if (v) v.el.classList.remove("selected");
    });
    highlightEdges(null);
    if (S.mode === "focus") {
      var c = focusCenter();
      setView(S.view.k, c.x, c.y, true);
    }
  }

  /* ======================= 9. 面包屑 ======================= */
  function renderCrumbs() {
    var el = $("#crumbs");
    if (S.mode !== "focus") { el.hidden = true; el.innerHTML = ""; return; }
    var html = ['<button class="crumb" data-crumb="root">全图</button>'];
    S.trail.forEach(function (id, i) {
      var n = S.byId[id];
      if (!n) return;
      html.push('<span class="crumb-sep">/</span>');
      html.push('<button class="crumb' + (i === S.trail.length - 1 ? " current" : "") + '" data-crumb="' + esc(id) + '">' + esc(n.name) + "</button>");
    });
    el.innerHTML = html.join("");
    el.hidden = false;
  }

  /* ======================= 10. 筛选面板 ======================= */
  function renderFilters() {
    var catWrap = $("#cat-chips");
    var counts = {};
    S.nodes.forEach(function (n) { counts[n.category] = (counts[n.category] || 0) + 1; });
    catWrap.innerHTML = S.data.categories.filter(function (c) { return counts[c.name]; }).map(function (c) {
      var on = !S.hiddenCats[c.name];
      return '<button class="chip' + (on ? "" : " off") + '" data-cat="' + esc(c.name) + '" style="--c:' + esc(catColor(c.name)) + '">' +
        '<span class="dot"></span>' + esc(c.name) + '<span class="num">' + counts[c.name] + "</span></button>";
    }).join("");

    var typeWrap = $("#type-chips");
    var tcount = {};
    S.links.forEach(function (l) { tcount[l.type] = (tcount[l.type] || 0) + 1; });
    typeWrap.innerHTML = S.data.relationTypes.filter(function (t) { return tcount[t.name]; }).map(function (t) {
      var on = !S.hiddenTypes[t.name];
      return '<button class="chip' + (on ? "" : " off") + '" data-type="' + esc(t.name) + '" style="--c:' + esc(typeColor(t.name)) + '">' +
        '<span class="dot"></span>' + esc(t.name) + '<span class="num">' + tcount[t.name] + "</span></button>";
    }).join("");

    var vis = S.nodes.filter(nodeVisible).length;
    var visEdges = S.links.filter(function (l) { return !isTypeHidden(l.type) && nodeVisible(S.byId[l.source]) && nodeVisible(S.byId[l.target]); }).length;
    $("#stats").innerHTML = "<span>" + vis + " 个节点</span><span>" + visEdges + " 条关系</span>";
  }

  function applyFilters() {
    S.nodes.forEach(function (n) {
      var v = V[n.id];
      if (!v) return;
      v.el.classList.toggle("faded", !nodeVisible(n));
    });
    applyModeClasses();
    S.temp = Math.max(S.temp, 40);
    renderStats();
  }

  function renderStats() {
    var vis = S.nodes.filter(nodeVisible).length;
    var visEdges = S.links.filter(function (l) { return !isTypeHidden(l.type) && nodeVisible(S.byId[l.source]) && nodeVisible(S.byId[l.target]); }).length;
    var el = $("#stats");
    if (el) el.innerHTML = "<span>" + vis + " 个节点</span><span>" + visEdges + " 条关系</span>";
  }

  /* ======================= 11. 搜索 ======================= */
  function fuzzy(text, q) {
    text = String(text || "").toLowerCase();
    if (!text || !q) return 0;
    var i = text.indexOf(q);
    if (i === 0) return 1;
    if (i > 0) return 0.82 - Math.min(i, 30) / 160;
    var ti = 0, gaps = 0;
    for (var k = 0; k < text.length && ti < q.length; k++) {
      if (text.charAt(k) === q.charAt(ti)) ti++;
      else if (ti > 0) gaps++;
    }
    if (ti < q.length) return 0;
    return Math.max(0.12, 0.42 - gaps * 0.01);
  }

  function scoreNode(n, terms) {
    var fields = [
      { w: 1.00, text: n.name },
      { w: 0.92, text: (n.aliases || []).join(" ") },
      { w: 0.72, text: (n.tags || []).join(" ") },
      { w: 0.58, text: n.category },
      { w: 0.46, text: n.summary },
      { w: 0.30, text: n.content }
    ];
    var total = 0;
    for (var t = 0; t < terms.length; t++) {
      var best = 0;
      for (var f = 0; f < fields.length; f++) {
        var sc = fuzzy(fields[f].text, terms[t]) * fields[f].w;
        if (sc > best) best = sc;
      }
      if (best === 0) return 0;
      total += best;
    }
    return total / terms.length;
  }

  function runSearch(raw) {
    var q = String(raw || "").trim().toLowerCase();
    S.query = q;
    if (!q) { S.results = []; renderResults(); return; }
    var terms = q.split(/\s+/).filter(Boolean);
    var scored = [];
    S.nodes.forEach(function (n) {
      if (!nodeVisible(n)) return;
      var s = scoreNode(n, terms);
      if (s > 0) scored.push({ node: n, score: s });
    });
    scored.sort(function (a, b) { return b.score - a.score; });
    S.results = scored.slice(0, 8);
    S.active = S.results.length ? 0 : -1;
    renderResults();
    markMatches(S.results.map(function (x) { return x.node.id; }));
  }

  function markMatches(ids) {
    var set = {};
    ids.forEach(function (id) { set[id] = true; });
    S.nodes.forEach(function (n) {
      var v = V[n.id];
      if (v) v.el.classList.toggle("match", !!set[n.id] && S.query.length > 0);
    });
  }

  function markName(name, q) {
    if (!q) return esc(name);
    var i = name.toLowerCase().indexOf(q);
    if (i < 0) return esc(name);
    return esc(name.slice(0, i)) + "<mark>" + esc(name.slice(i, i + q.length)) + "</mark>" + esc(name.slice(i + q.length));
  }

  function renderResults() {
    var box = $("#results");
    var input = $("#q");
    $("#search").classList.toggle("has-value", !!input.value);
    if (!S.query) { box.hidden = true; box.innerHTML = ""; return; }
    if (!S.results.length) {
      box.innerHTML = '<div class="results-empty">没有找到「' + esc(input.value) + "」<br><span style=\"font-size:11.5px;opacity:.7\">试试标签，或新建这个知识点</span></div>";
      box.hidden = false;
      return;
    }
    box.innerHTML = S.results.map(function (r, i) {
      var n = r.node;
      return [
        '<button class="result" role="option" data-id="' + esc(n.id) + '" aria-selected="' + (i === S.active) + '" style="--c:' + esc(catColor(n.category)) + '">',
        '<span class="result-dot"></span>',
        '<span class="result-main">',
        '<span class="result-name">' + markName(n.name, S.query) + "</span>",
        '<span class="result-sub">' + esc(n.summary || (n.aliases || []).join(" · ") || "—") + "</span>",
        "</span>",
        '<span class="result-cat">' + esc(n.category) + "</span>",
        "</button>"
      ].join("");
    }).join("") + '<div class="results-foot"><span>↑↓ 选择</span><span>Enter 打开</span></div>';
    box.hidden = false;
  }

  function pickResult(id) {
    var n = S.byId[id];
    if (!n) return;
    if (S.mode === "focus") enterFocus(id, true); else enterFocus(id, false);
    selectNode(id);
    $("#results").hidden = true;
    var input = $("#q");
    input.blur();
    if (window.innerWidth <= 900) input.value = "";
  }

  /* ======================= 12. 编辑器 ======================= */
  function openEditor(id) {
    var isNew = !id;
    var n = isNew ? { id: "", name: "", aliases: [], category: "", tags: [], summary: "", content: "", links: [] }
                  : JSON.parse(JSON.stringify(S.byId[id]));
    var catOptions = S.data.categories.map(function (c) { return '<option value="' + esc(c.name) + '"></option>'; }).join("");

    var targetOptions = S.nodes.filter(function (m) { return m.id !== n.id; })
      .sort(function (a, b) { return a.name < b.name ? -1 : 1; })
      .map(function (m) { return '<option value="' + esc(m.id) + '">' + esc(m.name) + " · " + esc(m.category) + "</option>"; }).join("");

    var typeOptions = S.data.relationTypes.map(function (t) { return '<option value="' + esc(t.name) + '">' + esc(t.name) + "</option>"; }).join("");

    function relRow(rel) {
      return [
        '<div class="rel-row">',
        '<select class="select rel-type">' + typeOptions.replace('value="' + esc(rel.type) + '"', 'value="' + esc(rel.type) + '" selected') + "</select>",
        '<select class="select rel-target">' + '<option value="">选择目标…</option>' + targetOptions.replace('value="' + esc(rel.to) + '"', 'value="' + esc(rel.to) + '" selected') + "</select>",
        '<input class="input rel-note" placeholder="关系说明（可选）" value="' + esc(rel.note || "") + '">',
        '<button type="button" class="del" aria-label="删除关系">✕</button>',
        "</div>"
      ].join("");
    }

    var rows = (n.links || []).map(relRow).join("");

    var html = [
      '<form class="modal" id="editor-form">',
      '<div class="modal-head">',
      '<h2>' + (isNew ? "新增知识" : "编辑知识") + "</h2>",
      '<span class="sub">固定字段 · 保存后立即生效</span>',
      '<span class="spacer"></span>',
      '<button type="button" class="panel-close" data-close aria-label="关闭">✕</button>',
      "</div>",
      '<div class="modal-body">',
      '<div class="form-grid">',
      '<div class="field"><label>名称 <span class="req">*</span></label><input class="input" name="name" required value="' + esc(n.name) + '" placeholder="例如：注意力机制"></div>',
      '<div class="field"><label>层级</label><select class="select" name="level">' +
        '<option value="">自动（按包含关系推导）</option>' +
        '<option value="0"' + (n.level === 0 ? " selected" : "") + '>核心 / 总纲</option>' +
        '<option value="1"' + (n.level === 1 ? " selected" : "") + '>一级</option>' +
        '<option value="2"' + (n.level === 2 ? " selected" : "") + '>二级 / 叶子</option>' +
        '<option value="3"' + (n.level === 3 ? " selected" : "") + '>三级 / 细节</option>' +
      '</select></div>' +
      '<div class="field"><label>分类 <span class="req">*</span></label><input class="input" name="category" list="cat-list" value="' + esc(n.category) + '" placeholder="选择或输入新分类"><datalist id="cat-list">' + catOptions + "</datalist></div>",
      '<div class="field full"><label>别名 / 英文名</label><input class="input" name="aliases" value="' + esc((n.aliases || []).join("，")) + '" placeholder="用逗号分隔，例如：Attention，注意力"></div>',
      '<div class="field full"><label>标签</label><input class="input" name="tags" value="' + esc((n.tags || []).join("，")) + '" placeholder="用逗号分隔，便于搜索"></div>',
      '<div class="field full"><label>一句话定义</label><textarea class="textarea" name="summary" rows="2" placeholder="一句话说清它是什么">' + esc(n.summary) + "</textarea></div>",
      '<div class="field full"><label>详细说明</label><textarea class="textarea" name="content" rows="6" placeholder="展开说明、要点、例子……">' + esc(n.content) + "</textarea></div>",
      "</div>",
      '<div class="rel-editor">',
      '<div class="rel-editor-head"><h3>关系</h3><span class="spacer"></span><button type="button" class="btn ghost" id="add-rel" style="height:30px;font-size:12px">＋ 添加关系</button></div>',
      '<div class="rel-rows" id="rel-rows">' + (rows || '<div class="rel-empty">还没有关系。添加「包含 / 前置 / 相关」等连接，它会出现在图谱里。</div>') + "</div>",
      "</div>",
      "</div>",
      '<div class="modal-foot">',
      '<span class="hint-line">提示：关系是单向的，反向会显示为「' + esc(S.data.relationTypes[0] ? S.data.relationTypes[0].inverse : "属于") + '」这类反向标签。</span>',
      '<span class="spacer"></span>',
      '<button type="button" class="btn ghost" data-close>取消</button>',
      '<button type="submit" class="btn primary">保存</button>',
      "</div>",
      "</form>"
    ].join("");

    showModal(html);

    $("#add-rel").addEventListener("click", function () {
      var wrap = $("#rel-rows");
      var empty = $(".rel-empty", wrap);
      if (empty) empty.remove();
      var tmp = document.createElement("div");
      tmp.innerHTML = relRow({ type: S.data.relationTypes[0] ? S.data.relationTypes[0].name : "相关", to: "", note: "" });
      wrap.appendChild(tmp.firstChild);
    });

    $("#rel-rows").addEventListener("click", function (e) {
      var btn = e.target.closest(".del");
      if (!btn) return;
      var row = btn.closest(".rel-row");
      if (row) row.remove();
    });

    $("#editor-form").addEventListener("submit", function (e) {
      e.preventDefault();
      saveEditor(id, e.target);
    });
  }

  function saveEditor(id, form) {
    var name = form.name.value.trim();
    if (!name) { toast("请填写名称", true); form.name.focus(); return; }
    var category = form.category.value.trim();
    if (!category) { toast("请填写分类", true); form.category.focus(); return; }

    var links = [];
    $$(".rel-row", form).forEach(function (row) {
      var type = row.querySelector(".rel-type").value;
      var to = row.querySelector(".rel-target").value;
      var note = row.querySelector(".rel-note").value.trim();
      if (!to || to === id) return;
      links.push({ type: type, to: to, note: note });
    });

    var payload = {
      name: name,
      category: category,
      aliases: splitList(form.aliases.value),
      tags: splitList(form.tags.value),
      summary: form.summary.value.trim(),
      content: form.content.value.trim(),
      level: form.level.value === "" ? null : Number(form.level.value),
      links: links
    };

    if (id) {
      var n = S.byId[id];
      Object.keys(payload).forEach(function (k) { n[k] = payload[k]; });
    } else {
      var node = { id: nowId("k"), links: [] };
      Object.keys(payload).forEach(function (k) { node[k] = payload[k]; });
      S.data.nodes.push(node);
      id = node.id;
    }

    if (!S.catColors[category]) {
      S.data.categories.push({ name: category, color: PALETTE[S.data.categories.length % PALETTE.length] });
    }

    saveData();
    rebuild();
    buildGraph();
    hideModal();
    renderFilters();
    enterFocus(id, false);
    selectNode(id);
    toast("已保存「" + name + "」");
  }

  function confirmDialog(opts) {
    var html = [
      '<div class="modal small">',
      '<div class="modal-head"><h2>' + esc(opts.title) + "</h2></div>",
      '<div class="modal-body"><p class="p-text" style="margin:0;font-size:13.5px">' + opts.message + "</p></div>",
      '<div class="modal-foot"><span class="spacer"></span>',
      '<button type="button" class="btn ghost" data-cancel>取消</button>',
      '<button type="button" class="btn ' + (opts.danger ? "danger" : "primary") + '" data-ok>' + esc(opts.ok || "确定") + "</button>",
      "</div></div>"
    ].join("");
    showModal(html);
    $("[data-cancel]", $("#modal-root")).addEventListener("click", hideModal);
    $("[data-ok]", $("#modal-root")).addEventListener("click", function () {
      hideModal();
      opts.onOk();
    });
  }

  function deleteNode(id) {
    var n = S.byId[id];
    if (!n) return;
    confirmDialog({
      title: "删除「" + n.name + "」？",
      message: "将同时删除指向它的 " + countIncoming(id) + " 条关系。此操作不可撤销。",
      ok: "删除",
      danger: true,
      onOk: function () {
        S.data.nodes = S.data.nodes.filter(function (m) { return m.id !== id; });
        S.data.nodes.forEach(function (m) {
          m.links = m.links.filter(function (l) { return l.to !== id; });
        });
        if (S.selectedId === id) closePanel();
        saveData();
        rebuild();
        buildGraph();
        renderFilters();
        if (S.data.nodes.length) { exitFocus(); setTimeout(function () { fitView(true); }, 80); }
        else { S.empty = true; updateEmptyState(); }
        toast("已删除");
      }
    });
  }

  function countIncoming(id) {
    var c = 0;
    S.nodes.forEach(function (m) {
      if (m.id === id) return;
      m.links.forEach(function (l) { if (l.to === id) c++; });
    });
    return c;
  }

  /* ======================= 13. 导入导出 ======================= */
  function exportJSON() {
    var payload = {
      version: 1,
      title: S.data.title,
      subtitle: S.data.subtitle,
      categories: S.data.categories,
      relationTypes: S.data.relationTypes,
      nodes: S.data.nodes
    };
    var blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json;charset=utf-8" });
    var a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "knowledge-graph-" + new Date().toISOString().slice(0, 10) + ".json";
    document.body.appendChild(a);
    a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 400);
    toast("已导出 " + S.nodes.length + " 条知识");
  }

  function importJSON(file, mode) {
    var reader = new FileReader();
    reader.onload = function () {
      var parsed;
      try { parsed = JSON.parse(String(reader.result)); }
      catch (e) { toast("JSON 解析失败：" + e.message, true); return; }
      var incoming = normalize(parsed);
      if (!incoming.nodes.length) { toast("文件里没有知识点", true); return; }
      if (mode === "replace") {
        S.data = incoming;
      } else {
        var map = {};
        S.data.nodes.forEach(function (n) { map[n.id] = n; });
        incoming.nodes.forEach(function (n) {
          if (map[n.id]) {
            Object.keys(n).forEach(function (k) { map[n.id][k] = n[k]; });
          } else {
            S.data.nodes.push(n);
          }
        });
        var known = {};
        S.data.categories.forEach(function (c) { known[c.name] = true; });
        incoming.categories.forEach(function (c) { if (!known[c.name]) S.data.categories.push(c); });
        var tknown = {};
        S.data.relationTypes.forEach(function (t) { tknown[t.name] = true; });
        incoming.relationTypes.forEach(function (t) { if (!tknown[t.name]) S.data.relationTypes.push(t); });
      }
      saveData();
      rebuild();
      buildGraph();
      renderFilters();
      S.view.user = false;
      exitFocus();
      setTimeout(function () { fitView(true); }, 100);
      toast((mode === "replace" ? "已覆盖导入 " : "已合并 ") + incoming.nodes.length + " 条知识");
    };
    reader.readAsText(file, "utf-8");
  }

  function resetDemo() {
    confirmDialog({
      title: "恢复示例数据？",
      message: "当前所有知识点与关系都会被示例数据替换，建议先导出备份。",
      ok: "恢复",
      danger: true,
      onOk: function () {
        S.data = normalize(window.KG_SEED);
        saveData();
        rebuild();
        buildGraph();
        renderFilters();
        S.view.user = false;
        exitFocus();
        setTimeout(function () { fitView(true); }, 100);
        toast("已恢复示例数据");
      }
    });
  }

  function helpDialog() {
    var sample = JSON.stringify({
      id: "attention",
      name: "注意力机制",
      aliases: ["Attention"],
      category: "深度学习",
      tags: ["QKV", "权重"],
      summary: "让模型对输入的不同部分分配不同权重。",
      content: "详细的说明文字……",
      links: [{ type: "前置", to: "transformer", note: "核心运算" }]
    }, null, 2);
    showModal([
      '<div class="modal">',
      '<div class="modal-head"><h2>数据格式</h2><span class="sub">固定字段 · JSON</span><span class="spacer"></span><button type="button" class="panel-close" data-close>✕</button></div>',
      '<div class="modal-body">',
      '<p class="p-text" style="margin-top:0">每条知识是一条 JSON 记录，字段固定，可随时导出备份、批量编辑后再导入。</p>',
      '<div class="form-grid" style="margin-top:14px">',
      '<div class="field"><label>必填</label><div class="hint-line"><b>id</b> 唯一标识 · <b>name</b> 名称 · <b>category</b> 分类</div></div>',
      '<div class="field"><label>可选</label><div class="hint-line"><b>aliases</b> 别名数组 · <b>tags</b> 标签数组 · <b>summary</b> 一句话定义 · <b>content</b> 详细说明 · <b>links</b> 关系数组</div></div>',
      "</div>",
      '<div class="field full" style="margin-top:16px"><label>关系 links</label><div class="hint-line">每条关系 = <code>{ type, to, note }</code>：type 为关系名（包含/前置/依赖/相关/对比/应用），to 为目标知识 id，note 为补充说明。反向关系会自动补全显示。</div></div>',
      '<pre style="margin-top:14px;padding:14px;border-radius:12px;border:1px solid var(--line);background:color-mix(in srgb, var(--bg) 60%, transparent);overflow:auto;font-family:var(--font-mono);font-size:11.5px;line-height:1.6;color:var(--ink-2)">' + esc(sample) + "</pre>",
      "</div>",
      '<div class="modal-foot"><span class="hint-line">数据保存在浏览器 localStorage，换设备请用导出/导入。 · 版本 ' + BUILD + '</span><span class="spacer"></span><button type="button" class="btn" data-close>知道了</button></div>',
      "</div>"
    ].join(""));
  }

  /* ======================= 14. 模态框 / 提示 ======================= */
  function showModal(html) {
    var root = $("#modal-root");
    root.innerHTML = html;
    root.hidden = false;
    $$("[data-close]", root).forEach(function (b) { b.addEventListener("click", hideModal); });
    var first = root.querySelector("input, textarea");
    if (first && window.innerWidth > 900) setTimeout(function () { first.focus(); }, 60);
  }

  function hideModal() {
    var root = $("#modal-root");
    root.hidden = true;
    root.innerHTML = "";
  }

  var toastTimer = {};
  function toast(msg, isErr) {
    var wrap = $("#toasts");
    var el = document.createElement("div");
    el.className = "toast" + (isErr ? " err" : "");
    el.textContent = msg;
    wrap.appendChild(el);
    setTimeout(function () {
      el.style.transition = "opacity .25s, transform .25s";
      el.style.opacity = "0";
      el.style.transform = "translateY(6px)";
      setTimeout(function () { el.remove(); }, 260);
    }, 2400);
  }

  function hideHint() {
    var h = $("#hint");
    if (h) h.classList.add("gone");
  }

  function updateEmptyState() {
    var h = $("#hint");
    if (!S.nodes.length) {
      h.classList.remove("gone");
      h.innerHTML = "还没有知识点，点击右上角「新增」开始建立你的图谱";
    }
  }

  /* ======================= 15. 事件绑定 ======================= */
  function bindEvents() {
    var sdot = $("#sync-dot");
    if (sdot) sdot.addEventListener("click", function () { syncDialog(); });
    var pointers = {};
    var drag = null;
    var pinch = null;
    var hoverTimer = 0;

    function stagePoint(e) {
      var r = stage.getBoundingClientRect();
      return { x: e.clientX - r.left, y: e.clientY - r.top };
    }

    svg.addEventListener("pointerdown", function (e) {
      if (e.pointerType === "mouse" && e.button !== 0) return;
      svg.setPointerCapture(e.pointerId);
      pointers[e.pointerId] = { x: e.clientX, y: e.clientY };

      if (Object.keys(pointers).length === 1) {
        var nodeEl = e.target.closest ? e.target.closest(".node") : null;
        drag = {
          id: nodeEl ? nodeEl.getAttribute("data-id") : null,
          sx: e.clientX, sy: e.clientY,
          panX: S.view.x, panY: S.view.y,
          moved: false, t: Date.now()
        };
        svg.classList.add("dragging");
      } else {
        drag = null;
        var pts = Object.keys(pointers).map(function (k) { return pointers[k]; });
        var mid = { x: (pts[0].x + pts[1].x) / 2, y: (pts[0].y + pts[1].y) / 2 };
        var sp = stagePoint({ clientX: mid.x, clientY: mid.y });
        pinch = {
          dist: Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y) || 1,
          k0: S.view.k,
          wx: (sp.x - S.view.x) / S.view.k,
          wy: (sp.y - S.view.y) / S.view.k
        };
      }
      hideHint();
    });

    svg.addEventListener("pointermove", function (e) {
      if (!pointers[e.pointerId]) return;
      pointers[e.pointerId] = { x: e.clientX, y: e.clientY };

      if (pinch && Object.keys(pointers).length >= 2) {
        var pts = Object.keys(pointers).map(function (k) { return pointers[k]; });
        var mid = { x: (pts[0].x + pts[1].x) / 2, y: (pts[0].y + pts[1].y) / 2 };
        var d = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y) || 1;
        var k = clamp(pinch.k0 * (d / pinch.dist), 0.18, 3.2);
        var sp = stagePoint({ clientX: mid.x, clientY: mid.y });
        S.view.k = k;
        S.view.x = sp.x - pinch.wx * k;
        S.view.y = sp.y - pinch.wy * k;
        S.view.user = true;
        applyView();
        return;
      }

      if (!drag) return;
      var dx = e.clientX - drag.sx, dy = e.clientY - drag.sy;
      if (!drag.moved && Math.hypot(dx, dy) > 7) drag.moved = true;
      if (!drag.moved) return;

      if (drag.id && S.mode === "overview") {
        var v = V[drag.id];
        if (v) {
          var p = toWorld(e.clientX, e.clientY);
          v.x = p.x; v.y = p.y; v.vx = 0; v.vy = 0; v.moving = false;
          S.needsPaint = true;
        }
      } else if (!drag.id) {
        S.view.x = drag.panX + dx;
        S.view.y = drag.panY + dy;
        S.view.user = true;
        applyView();
      }
    });

    function endPointer(e) {
      var wasDrag = drag;
      delete pointers[e.pointerId];
      if (Object.keys(pointers).length < 2) pinch = null;
      svg.classList.remove("dragging");
      if (!drag) return;
      if (!drag.moved && wasDrag) {
        if (wasDrag.id) onNodeTap(wasDrag.id);
        else if (S.selectedId) closePanel();
      }
      drag = null;
    }
    svg.addEventListener("pointerup", endPointer);
    svg.addEventListener("pointercancel", function (e) {
      delete pointers[e.pointerId];
      pinch = null;
      drag = null;
      svg.classList.remove("dragging");
    });

    svg.addEventListener("wheel", function (e) {
      e.preventDefault();
      var p = stagePoint(e);
      zoomAt(p.x, p.y, Math.exp(-e.deltaY * 0.0016));
    }, { passive: false });

    function onNodeTap(id) {
      if (!S.byId[id]) return;
      if (S.mode === "focus" && S.focusId === id) { selectNode(id); return; }
      enterFocus(id, S.mode === "focus");
      selectNode(id);
    }

    // 悬停提示（仅鼠标）
    svg.addEventListener("pointerover", function (e) {
      if (e.pointerType === "touch") return;
      var g = e.target.closest ? e.target.closest(".node") : null;
      if (!g) return;
      var id = g.getAttribute("data-id");
      clearTimeout(hoverTimer);
      hoverTimer = setTimeout(function () { showTip(id, g); }, 90);
    });
    svg.addEventListener("pointerout", function (e) {
      var g = e.target.closest ? e.target.closest(".node") : null;
      if (!g) return;
      clearTimeout(hoverTimer);
      hideTip();
    });

    function showTip(id, g) {
      var n = S.byId[id];
      if (!n) return;
      var box = $("#tip");
      var cnt = n.links.length + countIncoming(id);
      box.innerHTML = [
        '<div class="t-cat" style="--c:' + esc(catColor(n.category)) + '"><i></i>' + esc(n.category) + "</div>",
        '<div class="t-name">' + esc(n.name) + "</div>",
        '<div class="t-sum">' + esc(n.summary || "—") + "</div>",
        '<div class="t-rel">' + cnt + " 条关系 · 点击展开</div>"
      ].join("");
      box.hidden = false;
      var rect = stage.getBoundingClientRect();
      var v = V[id];
      var sx = S.view.x + v.x * S.view.k;
      var sy = S.view.y + v.y * S.view.k - v.r * S.view.k - 12;
      box.style.left = clamp(sx, 130, stage.clientWidth - 130) + "px";
      box.style.top = Math.max(90, sy) + "px";
      g.classList.add("hovering");
      highlightEdges(id);
    }

    function hideTip() {
      $("#tip").hidden = true;
      $$(".node.hovering").forEach(function (el) { el.classList.remove("hovering"); });
      if (!S.selectedId) highlightEdges(null);
      else highlightEdges(S.selectedId);
    }

    // 搜索
    var q = $("#q");
    q.addEventListener("input", debounce(function () { runSearch(q.value); }, 70));
    q.addEventListener("focus", function () { if (q.value) runSearch(q.value); });
    q.addEventListener("keydown", function (e) {
      if (e.key === "ArrowDown" || e.key === "ArrowUp") {
        if (!S.results.length) return;
        e.preventDefault();
        S.active = (S.active + (e.key === "ArrowDown" ? 1 : -1) + S.results.length) % S.results.length;
        renderResults();
      } else if (e.key === "Enter") {
        if (S.results[S.active]) { e.preventDefault(); pickResult(S.results[S.active].node.id); }
      } else if (e.key === "Escape") {
        q.value = ""; runSearch(""); q.blur();
      }
    });
    $("#q-clear").addEventListener("click", function () {
      q.value = ""; runSearch(""); q.focus();
    });
    $("#results").addEventListener("click", function (e) {
      var b = e.target.closest(".result");
      if (b) pickResult(b.getAttribute("data-id"));
    });
    document.addEventListener("click", function (e) {
      if (!e.target.closest("#search-wrap")) { $("#results").hidden = true; }
      if (!e.target.closest("#menu") && !e.target.closest("#btn-menu")) { var m = $("#menu"); if (m) m.remove(); }
    });

    // 面板
    panelEl().addEventListener("click", function (e) {
      var t = e.target.closest("[data-act]");
      if (t) {
        var act = t.getAttribute("data-act");
        if (act === "close") { closePanel(); return; }
        if (act === "edit") { openEditor(S.selectedId); return; }
        if (act === "delete") { deleteNode(S.selectedId); return; }
        if (act === "locate") {
          if (S.mode !== "focus" || S.focusId !== S.selectedId) enterFocus(S.selectedId, true);
          closePanel();
          return;
        }
      }
      var go = e.target.closest("[data-goto]");
      if (go) {
        var id = go.getAttribute("data-goto");
        enterFocus(id, true);
        selectNode(id);
      }
    });

    $("#scrim").addEventListener("click", closePanel);

    // 面包屑
    $("#crumbs").addEventListener("click", function (e) {
      var b = e.target.closest("[data-crumb]");
      if (!b) return;
      var v = b.getAttribute("data-crumb");
      if (v === "root") { closePanel(); exitFocus(); return; }
      enterFocus(v, true);
      selectNode(v);
    });

    // 筛选
    $("#filters").addEventListener("click", function (e) {
      var c = e.target.closest("[data-cat]");
      if (c) {
        var name = c.getAttribute("data-cat");
        S.hiddenCats[name] = !S.hiddenCats[name];
        renderFilters(); applyFilters(); return;
      }
      var t = e.target.closest("[data-type]");
      if (t) {
        var tn = t.getAttribute("data-type");
        S.hiddenTypes[tn] = !S.hiddenTypes[tn];
        renderFilters(); applyFilters();
      }
    });
    $("#filters-reset").addEventListener("click", function () {
      S.hiddenCats = {}; S.hiddenTypes = {};
      renderFilters(); applyFilters();
    });
    $("#btn-filter").addEventListener("click", function () {
      var f = $("#filters");
      f.classList.toggle("open");
      f.style.display = f.classList.contains("open") ? "flex" : "";
    });

    // 缩放
    $("#zoombar").addEventListener("click", function (e) {
      var b = e.target.closest("[data-zoom]");
      if (!b) return;
      var a = b.getAttribute("data-zoom");
      var cx = stage.clientWidth / 2, cy = stage.clientHeight / 2;
      if (a === "in") zoomAt(cx, cy, 1.25);
      if (a === "out") zoomAt(cx, cy, 0.8);
      if (a === "fit") fitView(true);
      if (a === "overview") { closePanel(); exitFocus(); setTimeout(function () { fitView(true); }, 40); }
    });

    // 顶栏
    $("#btn-add").addEventListener("click", function () { openEditor(null); });
    $("#btn-theme").addEventListener("click", toggleTheme);
    $("#btn-menu").addEventListener("click", function (e) {
      e.stopPropagation();
      openMenu($("#btn-menu"));
    });

    // 键盘
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape") {
        if (!$("#modal-root").hidden) { hideModal(); return; }
        if ($("#results").hidden === false) { $("#results").hidden = true; return; }
        if (S.selectedId) { closePanel(); return; }
        if (S.mode === "focus") exitFocus();
        return;
      }
      var tag = (e.target.tagName || "").toLowerCase();
      var typing = tag === "input" || tag === "textarea" || tag === "select";
      if (e.key === "/" && !typing) {
        e.preventDefault();
        q.focus();
        q.select();
      }
    });

    window.addEventListener("resize", debounce(function () {
      if (S.mode === "focus") { rescaleFocus(); return; }
      if (!S.view.user) fitView(false);
      applyView();
    }, 150));
  }

  function openMenu(anchor) {
    var old = $("#menu");
    if (old) { old.remove(); return; }
    var r = anchor.getBoundingClientRect();
    var m = document.createElement("div");
    m.className = "menu";
    m.id = "menu";
    m.style.top = Math.round(r.bottom + 8) + "px";
    m.style.left = Math.round(Math.min(r.left - 170, window.innerWidth - 252)) + "px";
    if (window.innerWidth < 620) m.style.left = Math.round(window.innerWidth - 252) + "px";
    m.innerHTML = [
      '<button class="menu-item" data-m="export"><svg viewBox="0 0 24 24" fill="none"><path d="M12 3v12m0 0 4.5-4.5M12 15l-4.5-4.5M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/></svg>导出 JSON</button>',
      '<button class="menu-item" data-m="import"><svg viewBox="0 0 24 24" fill="none"><path d="M12 21V9m0 0 4.5 4.5M12 9l-4.5 4.5M4 7V5a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v2" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/></svg>导入 JSON</button>',
      '<div class="menu-sep"></div>',
      '<button class="menu-item" data-m="sync"><svg viewBox="0 0 24 24" fill="none"><path d="M20 12a8 8 0 0 1-13.6 5.7M4 12a8 8 0 0 1 13.6-5.7M4 19v-3h3M20 5v3h-3" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/></svg>云同步 <span class="menu-state" style="margin-left:auto;font-size:11px;opacity:.6"></span></button>',
      '<button class="menu-item" data-m="install"><svg viewBox="0 0 24 24" fill="none"><path d="M12 3v11m0 0 4-4m-4 4-4-4M5 17v2a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-2" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/></svg>安装到设备</button>',
      '<button class="menu-item" data-m="lite"><svg viewBox="0 0 24 24" fill="none"><path d="M13 2 4.5 13.5H11l-1 8.5L19.5 10H13z" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"/></svg>流畅模式 <span style="margin-left:auto;font-size:11px;opacity:.6" id="lite-state"></span></button>',
      '<button class="menu-item" data-m="help"><svg viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="9" stroke="currentColor" stroke-width="1.7"/><path d="M9.6 9.2a2.5 2.5 0 1 1 3.3 2.4c-.6.2-.9.8-.9 1.4v.4" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/><circle cx="12" cy="17" r="1" fill="currentColor"/></svg>数据格式说明</button>',
      '<button class="menu-item danger" data-m="reset"><svg viewBox="0 0 24 24" fill="none"><path d="M3 12a9 9 0 1 0 3-6.7M3 4v5h5" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/></svg>恢复示例数据</button>'
    ].join("");
    document.body.appendChild(m);
    var ls = m.querySelector("#lite-state");
    if (ls) ls.textContent = S.lite ? "开" : "关";
    var ms = m.querySelector(".menu-state");
    if (ms) ms.textContent = sync.cfg ? (sync.cfg.token ? "已开启" : "只读") : "未配置";
    m.addEventListener("click", function (e) {
      var b = e.target.closest("[data-m]");
      if (!b) return;
      var act = b.getAttribute("data-m");
      m.remove();
      if (act === "sync") { syncDialog(); return; }
      if (act === "install") { promptInstall(); return; }
      if (act === "lite") { applyLite(!S.lite, true); return; }
      if (act === "export") exportJSON();
      if (act === "help") helpDialog();
      if (act === "reset") resetDemo();
      if (act === "import") {
        var input = document.createElement("input");
        input.type = "file";
        input.accept = ".json,application/json";
        input.onchange = function () {
          var f = input.files && input.files[0];
          if (!f) return;
          confirmDialog({
            title: "导入 " + f.name,
            message: "选择导入方式：<b>合并</b>会保留现有知识并更新同 id 的条目；<b>覆盖</b>会清空当前数据。",
            ok: "合并导入",
            onOk: function () { importJSON(f, "merge"); }
          });
          // 在确认框里追加"覆盖"按钮
          setTimeout(function () {
            var foot = $(".modal-foot");
            if (!foot) return;
            var btn = document.createElement("button");
            btn.className = "btn danger";
            btn.textContent = "覆盖导入";
            btn.addEventListener("click", function () { hideModal(); importJSON(f, "replace"); });
            foot.insertBefore(btn, foot.querySelector("[data-ok]"));
          }, 0);
        };
        input.click();
      }
    });
  }

  var FORCE_STATIC = false;
  function applyLite(on, persist) {
    S.lite = on;
    document.documentElement.classList.toggle("lite", on);
    if (on) {
      document.documentElement.classList.add("no-anim");
    } else if (!FORCE_STATIC && !(window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches)) {
      document.documentElement.classList.remove("no-anim");
    }
    if (persist) {
      try { localStorage.setItem("kg.lite", on ? "1" : "0"); } catch (e) {}
      toast(on ? "已开启流畅模式：关闭动画与光晕" : "已关闭流畅模式");
    }
  }

  var deferredPrompt = null;

  function isStandalone() {
    return (window.matchMedia && window.matchMedia("(display-mode: standalone)").matches) || window.navigator.standalone === true;
  }

  function isIOS() {
    return /iphone|ipad|ipod/i.test(navigator.userAgent) ||
      (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  }

  function installDialog() {
    var secure = window.isSecureContext;
    var steps;
    if (!secure) {
      steps = "当前是 <b>http:// 局域网地址</b>，浏览器不会开启安装与离线缓存。<br><br>换用 HTTPS 地址（GitHub Pages / Netlify / Cloudflare）打开，就能安装成应用；局域网的好处是零延迟，适合一直开着浏览器用。";
    } else if (isIOS()) {
      steps = "1. 用 <b>Safari</b> 打开本页<br>2. 点底部的<b>分享</b>按钮<br>3. 选「<b>添加到主屏幕</b>」<br><br>之后从主屏打开就是全屏、可离线。";
    } else if (/android/i.test(navigator.userAgent)) {
      steps = "1. 点浏览器右上角 <b>⋮</b><br>2. 选「<b>安装应用</b>」或「添加到主屏幕」<br><br>装好后可断网使用。";
    } else {
      steps = "桌面 Chrome / Edge：点地址栏右侧的<b>安装图标</b>，或菜单 →「应用 / 安装此站点」。<br><br>装好后会出现在开始菜单 / 程序坞，独立窗口运行。";
    }
    showModal([
      '<div class="modal small">',
      '<div class="modal-head"><h2>安装到设备</h2><span class="spacer"></span><button type="button" class="panel-close" data-close>✕</button></div>',
      '<div class="modal-body"><p class="p-text" style="margin:0;font-size:13.5px;line-height:1.8">' + steps + "</p></div>",
      '<div class="modal-foot"><span class="hint-line">安装后数据仍保存在本机</span><span class="spacer"></span><button type="button" class="btn" data-close>知道了</button></div>',
      "</div>"
    ].join(""));
  }

  function promptInstall() {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      deferredPrompt.userChoice.then(function () {
        deferredPrompt = null;
        var b = $("#btn-install");
        if (b) b.hidden = true;
      }).catch(function () {});
      return;
    }
    installDialog();
  }

  function setupInstall() {
    var btn = $("#btn-install");
    if (isStandalone()) { if (btn) btn.hidden = true; return; }
    if (isIOS() && !btn) { /* iOS 没有事件，仍然给个入口 */ }
    if (isIOS() && btn) btn.hidden = false;
    window.addEventListener("beforeinstallprompt", function (e) {
      e.preventDefault();
      deferredPrompt = e;
      if (btn) btn.hidden = false;
    });
    window.addEventListener("appinstalled", function () {
      deferredPrompt = null;
      if (btn) btn.hidden = true;
      toast("已安装到设备");
    });
    if (btn) btn.addEventListener("click", promptInstall);
  }

  function toggleTheme() {
    S.theme = S.theme === "dark" ? "light" : "dark";
    document.documentElement.setAttribute("data-theme", S.theme);
    try { localStorage.setItem(THEME_KEY, S.theme); } catch (e) {}
    var meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute("content", S.theme === "dark" ? "#080a0f" : "#f4f1e9");
    paint();
  }


  /* ======================= 15.4 局域网存储 ======================= */
  var lan = { available: false, timer: 0, base: "", poll: 0 };

  function lanFetch(url, opts, ms) {
    return new Promise(function (resolve, reject) {
      var ctrl = typeof AbortController !== "undefined" ? new AbortController() : null;
      var t = setTimeout(function () { if (ctrl) ctrl.abort(); reject(new Error("timeout")); }, ms || 2500);
      fetch(url, Object.assign({ cache: "no-store" }, opts || {}, ctrl ? { signal: ctrl.signal } : {}))
        .then(function (r) { clearTimeout(t); resolve(r); })
        .catch(function (e) { clearTimeout(t); reject(e); });
    });
  }

  async function lanPull() {
    try {
      var r = await lanFetch(lan.base + "/api/data", {}, 2500);
      if (!r.ok) return null;
      return { data: await r.json() };
    } catch (e) { return null; }
  }

  function scheduleLanPush() {
    if (!lan.available) return;
    clearTimeout(lan.timer);
    lan.timer = setTimeout(function () {
      var payload = JSON.parse(JSON.stringify(S.data));
      payload.updatedAt = Date.now();
      S.data.updatedAt = payload.updatedAt;
      lanFetch(lan.base + "/api/data", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      }, 4000).catch(function () {});
    }, 700);
  }

  async function lanBoot() {
    var ping;
    try { ping = await lanFetch(lan.base + "/api/ping", {}, 2000); } catch (e) { ping = null; }
    if (!ping || !ping.ok) { lan.available = false; return; }
    lan.available = true;
    clearInterval(lan.poll);
    lan.poll = setInterval(function () {
      if (document.hidden || !$("#modal-root").hidden) return;
      lanPull().then(function (r) {
        if (!r) return;
        var at = Number(r.data.updatedAt || 0);
        if (at > Number(S.data.updatedAt || 0) + 800) {
          adoptRemote(r.data);
          toast("已同步局域网上的修改");
        }
      });
    }, 10000);
    var remote = await lanPull();
    if (!remote) {
      scheduleLanPush();
      if (!sync.cfg) {
        var d0 = $("#sync-dot");
        if (d0) { d0.hidden = false; d0.className = "sync-dot ok"; d0.title = "局域网存储：已连接"; }
      }
      return;
    }
    var remoteAt = Number(remote.data.updatedAt || 0);
    var localAt = Number(S.data.updatedAt || 0);
    if (remoteAt > localAt) {
      adoptRemote(remote.data);
      toast("已载入服务器上的数据");
    } else if (localAt > remoteAt) {
      scheduleLanPush();
    }
    var dot = $("#sync-dot");
    if (dot && !sync.cfg) {
      dot.hidden = false;
      dot.className = "sync-dot ok";
      dot.title = "局域网存储：已连接";
    }
  }

  /* ======================= 15.5 GitHub 云同步 ======================= */
  var SYNC_KEY = "kg.sync.v1";
  var sync = { cfg: null, sha: null, status: "off", timer: 0, poll: 0, busy: false, retry: 0 };

  function b64encode(str) {
    var bytes = new TextEncoder().encode(str);
    var bin = "";
    for (var i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
    return btoa(bin);
  }

  function b64decode(b64) {
    var bin = atob(String(b64).replace(/\s/g, ""));
    var bytes = new Uint8Array(bin.length);
    for (var i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return new TextDecoder().decode(bytes);
  }

  function loadSyncCfg() {
    try {
      var s = localStorage.getItem(SYNC_KEY);
      if (s) return JSON.parse(s);
    } catch (e) {}
    return null;
  }

  function saveSyncCfg(cfg) {
    try {
      if (cfg) localStorage.setItem(SYNC_KEY, JSON.stringify(cfg));
      else localStorage.removeItem(SYNC_KEY);
    } catch (e) {}
  }

  function syncHeaders(cfg, json) {
    var h = { "Accept": "application/vnd.github+json" };
    if (json) h["Content-Type"] = "application/json";
    if (cfg.token) h["Authorization"] = "Bearer " + cfg.token;
    return h;
  }

  function syncUrl(cfg) {
    return "https://api.github.com/repos/" + encodeURIComponent(cfg.owner) + "/" + encodeURIComponent(cfg.repo) +
      "/contents/" + encodeURIComponent(cfg.path || "data.json") + "?ref=" + encodeURIComponent(cfg.branch || "main");
  }

  function setSyncStatus(kind, msg) {
    sync.status = kind;
    var dot = $("#sync-dot");
    if (!dot) return;
    if (kind === "off") {
      if (typeof lan !== "undefined" && lan.available) {
        dot.hidden = false;
        dot.className = "sync-dot ok";
        dot.title = "局域网存储：已连接";
      } else {
        dot.hidden = true;
      }
      return;
    }
    dot.hidden = false;
    dot.className = "sync-dot " + ({ ok: "ok", busy: "busy", err: "err", ro: "ro" }[kind] || "");
    dot.title = kind === "ok" ? "云同步正常" : kind === "busy" ? "同步中…" : kind === "err" ? ("同步失败：" + (msg || "")) : "只读（未配置 Token）";
  }

  async function syncPullRaw(cfg) {
    var res = await fetch(syncUrl(cfg), { headers: syncHeaders(cfg), cache: "no-store" });
    if (res.status === 404) return null;
    if (!res.ok) throw new Error("HTTP " + res.status);
    var j = await res.json();
    var text = b64decode(j.content);
    return { data: JSON.parse(text), sha: j.sha };
  }

  async function syncPush(attempt) {
    if (!sync.cfg || !sync.cfg.token) return;
    sync.busy = true;
    setSyncStatus("busy");
    try {
      var payload = JSON.parse(JSON.stringify(S.data));
      payload.updatedAt = Date.now();
      S.data.updatedAt = payload.updatedAt;
      var url = syncUrl(sync.cfg).replace(/\?.*$/, "");
      var body = {
        message: "sync: " + new Date().toISOString(),
        content: b64encode(JSON.stringify(payload, null, 2)),
        branch: sync.cfg.branch || "main"
      };
      if (sync.sha) body.sha = sync.sha;
      var res = await fetch(url, { method: "PUT", headers: syncHeaders(sync.cfg, true), body: JSON.stringify(body) });
      if (res.status === 409 && !attempt) {
        var fresh = await syncPullRaw(sync.cfg);
        sync.sha = fresh ? fresh.sha : null;
        sync.busy = false;
        return syncPush(1);
      }
      if (!res.ok) throw new Error("HTTP " + res.status);
      var j = await res.json();
      sync.sha = j.content && j.content.sha;
      setSyncStatus("ok");
    } catch (e) {
      setSyncStatus("err", e.message);
    } finally {
      sync.busy = false;
    }
  }

  function schedulePush() {
    if (!sync.cfg || !sync.cfg.token || S.suppressPush) return;
    clearTimeout(sync.timer);
    sync.timer = setTimeout(function () { syncPush(); }, 1200);
  }

  function adoptRemote(remote) {
    var prevFocus = S.mode === "focus" ? S.focusId : null;
    S.suppressPush = true;
    S.data = normalize(remote);
    try { localStorage.setItem(STORE_KEY, JSON.stringify(S.data)); } catch (e) {}
    rebuild();
    buildGraph();
    renderFilters();
    closePanel();
    S.view.user = false;
    S.autoFitted = false;
    S.suppressPush = false;
    if (prevFocus && S.byId[prevFocus]) enterFocus(prevFocus, false);
    else if (document.documentElement.classList.contains("no-anim")) fitView(false);
    else exitFocus();
  }

  async function syncPull(silent) {
    if (!sync.cfg) return;
    if (sync.busy) return;
    setSyncStatus(sync.cfg.token ? "busy" : "ro");
    try {
      var remote = await syncPullRaw(sync.cfg);
      if (!remote) {
        if (sync.cfg.token) await syncPush();
        else setSyncStatus("err", "私有仓库需要 Token 才能读取");
        return;
      }
      sync.sha = remote.sha;
      var remoteAt = Number(remote.data.updatedAt || 0);
      var localAt = Number(S.data.updatedAt || 0);
      if (remoteAt > localAt) {
        adoptRemote(remote.data);
        if (!silent) toast("已同步其他设备的修改");
      } else if (localAt > remoteAt && sync.cfg.token) {
        await syncPush();
      }
      setSyncStatus(sync.cfg.token ? "ok" : "ro");
    } catch (e) {
      setSyncStatus("err", e.message);
    }
  }

  function startSync() {
    sync.cfg = loadSyncCfg();
    if (!sync.cfg) { setSyncStatus("off"); return; }
    syncPull(true);
    clearInterval(sync.poll);
    sync.poll = setInterval(function () {
      if (document.hidden || !$("#modal-root").hidden) return;
      syncPull(true);
    }, sync.cfg.token ? 20000 : 300000);
    document.addEventListener("visibilitychange", function () {
      if (!document.hidden) syncPull(true);
    });
  }

  function syncDialog() {
    var cfg = sync.cfg || { owner: "caiasas", repo: "knowledge-graph-data", branch: "main", path: "data.json", token: "" };
    var state = sync.status === "ok" ? "已连接，正常同步" : sync.status === "err" ? "连接异常，检查仓库名 / Token 权限" : sync.cfg ? "已配置" : "未配置";
    showModal([
      '<form class="modal" id="sync-form">',
      '<div class="modal-head"><h2>云同步</h2><span class="sub">数据存到 GitHub 私有仓库</span><span class="spacer"></span><button type="button" class="panel-close" data-close>✕</button></div>',
      '<div class="modal-body">',
      '<p class="p-text" style="margin-top:0;font-size:13px">多台设备读写私有仓库 <code>knowledge-graph-data</code> 里的 <code>data.json</code>：改完约 1 秒推送，其他设备 20 秒内拉取。私有仓库必须填 Token 才能读取和写入。</p>',
      '<div class="form-grid" style="margin-top:14px">',
      '<div class="field"><label>仓库所有者</label><input class="input" name="owner" value="' + esc(cfg.owner) + '" placeholder="caiasas"></div>',
      '<div class="field"><label>数据仓库</label><input class="input" name="repo" value="' + esc(cfg.repo) + '" placeholder="knowledge-graph-data"></div>',
      '<div class="field"><label>分支</label><input class="input" name="branch" value="' + esc(cfg.branch || "main") + '" placeholder="main"></div>',
      '<div class="field"><label>数据文件</label><input class="input" name="path" value="' + esc(cfg.path || "data.json") + '" placeholder="data.json"></div>',
      '<div class="field full"><label>访问令牌 Token <span class="req">*</span>（写入需要）</label><input class="input" name="token" type="password" autocomplete="off" value="' + esc(cfg.token || "") + '" placeholder="github_pat_... 或 ghp_..."><div class="hint-line">只保存在本机浏览器；建议用 Fine-grained token，只勾选该仓库的 <b>Contents: Read and write</b>。</div></div>',
      '</div>',
      '<div class="sync-row"><span>状态：</span><b>' + esc(state) + "</b></div>",
      '<p class="hint-line" style="margin-top:12px">没有 Token 也能只读同步（任何设备都能拉到最新数据），但只有配置了 Token 的设备能把修改写回仓库。</p>',
      '</div>',
      '<div class="modal-foot">',
      '<button type="button" class="btn danger" id="sync-off">关闭同步</button>',
      '<span class="spacer"></span>',
      '<button type="button" class="btn ghost" data-close>取消</button>',
      '<button type="submit" class="btn primary">保存并同步</button>',
      '</div>',
      '</form>'
    ].join(""));

    $("#sync-off").addEventListener("click", function () {
      saveSyncCfg(null);
      sync.cfg = null;
      sync.sha = null;
      clearInterval(sync.poll);
      setSyncStatus("off");
      hideModal();
      toast("已关闭云同步，数据只存本机");
    });

    $("#sync-form").addEventListener("submit", function (e) {
      e.preventDefault();
      var f = e.target;
      var next = {
        owner: f.owner.value.trim(),
        repo: f.repo.value.trim(),
        branch: f.branch.value.trim() || "main",
        path: f.path.value.trim() || "data.json",
        token: f.token.value.trim()
      };
      if (!next.owner || !next.repo) { toast("请填写仓库所有者和仓库名", true); return; }
      saveSyncCfg(next);
      sync.cfg = next;
      sync.sha = null;
      hideModal();
      toast("已保存，正在同步…");
      syncPull(false);
      startSync();
    });
  }

  /* ======================= 16. 启动 ======================= */
  function init() {
    try {
      if (window.matchMedia && window.matchMedia("(hover: none)").matches) document.documentElement.classList.add("touch");
      var lowEnd = (navigator.hardwareConcurrency && navigator.hardwareConcurrency <= 4) ||
        (navigator.deviceMemory && navigator.deviceMemory <= 4) ||
        (window.devicePixelRatio >= 2 && window.matchMedia && window.matchMedia("(hover: none)").matches);
      if (lowEnd) document.documentElement.classList.add("perf");
      FORCE_STATIC = /(^|[?&])static=1/.test(location.search);
      if (FORCE_STATIC) document.documentElement.classList.add("no-anim");
      if (localStorage.getItem("kg.lite") === "1") applyLite(true, false);
      if (window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
        document.documentElement.classList.add("no-anim");
      }
    } catch (e) {}
    stage = $("#stage");
    svg = $("#graph");
    vp = $("#viewport");
    gEdges = $("#edges");
    gNodes = $("#nodes");
    gRings = $("#rings");
    gClusters = $("#clusters");

    var params = {};
    try {
      (location.search || "").replace(/^\?/, "").split("&").forEach(function (kv) {
        if (!kv) return;
        var i = kv.indexOf("=");
        params[decodeURIComponent(i < 0 ? kv : kv.slice(0, i))] = i < 0 ? "1" : decodeURIComponent(kv.slice(i + 1));
      });
    } catch (e) {}
    try {
      var savedTheme = localStorage.getItem(THEME_KEY);
      if (savedTheme === "light" || savedTheme === "dark") S.theme = savedTheme;
    } catch (e) {}
    if (params.theme === "light" || params.theme === "dark") S.theme = params.theme;
    document.documentElement.setAttribute("data-theme", S.theme);

    checkStorage();
    S.data = loadData();
    rebuild();
    buildGraph();
    renderFilters();

    var w = stage.clientWidth, h = stage.clientHeight;
    S.view.k = 1; S.view.x = w / 2; S.view.y = h / 2;
    applyView();
    fitView(false);
    S.autoFitted = true;

    bindEvents();
    setupInstall();
    lan.base = location.origin;
    lanBoot();
    startSync();
    svg.classList.add("ready");
    loop();

    var hash = "";
    try { hash = decodeURIComponent(location.hash.replace(/^#/, "")); } catch (e) { hash = ""; }
    if (hash && S.byId[hash]) {
      enterFocus(hash, false);
      selectNode(hash);
    } else if (S.nodes.length && params.view !== "overview") {
      var hub = null, best = -1;
      S.nodes.forEach(function (n) {
        var d = neighborIds(n.id).length;
        if (d > best) { best = d; hub = n.id; }
      });
      if (hub) enterFocus(hub, false);
    }

    setTimeout(function () { if (S.mode === "focus") rescaleFocus(); /*__DBG__*/ if (/debug=1/.test(location.search)) document.title = "inner=" + window.innerHeight + " docScroll=" + document.documentElement.scrollHeight + " body=" + document.body.getBoundingClientRect().height.toFixed(0) + " app=" + $("#app").getBoundingClientRect().height.toFixed(0) + " stage=" + stage.getBoundingClientRect().height.toFixed(0) + " zoombarTop=" + $("#zoombar").getBoundingClientRect().top.toFixed(0) + " vb=" + $("#zoombar").getBoundingClientRect().bottom.toFixed(0); }, 140);
    setTimeout(function () { if (!S.selectedId && !S.view.user) hideHint(); }, 12000);

    $("#brand").addEventListener("click", function () {
      closePanel(); exitFocus();
      setTimeout(function () { fitView(true); }, 40);
    });

    if (!S.nodes.length) updateEmptyState();

    if (/debug=1/.test(location.search)) {
      window.__kg = { version: BUILD,
        data: function () { return S.data; }, save: saveData, sync: sync, pull: syncPull,
        state: function () { return { mode: S.mode, focusId: S.focusId, animating: S.animating, settling: S.settling, noAnim: document.documentElement.classList.contains("no-anim"), perf: document.documentElement.classList.contains("perf") }; },
        node: function (id) { var v = V[id]; return v ? { x: v.x, y: v.y, tx: v.tx, ty: v.ty, moving: v.moving, r: v.r, tr: v.tr } : null; }
      };
      var badge = document.createElement("div");
      badge.className = "fps-badge";
      badge.textContent = "…";
      document.body.appendChild(badge);
      setInterval(function () { badge.textContent = (window.__fps || 0) + " fps"; }, 500);
    }
  }

  function safeInit() {
    try { init(); } catch (e) {
      document.title = "ERR::" + e.message + " @@ " + String(e.stack || "").split("\n").slice(1, 3).join(" | ");
    }
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", safeInit);
  else safeInit();
})();
