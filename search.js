/* CrowdNord on-page help search. No external services; everything runs in the browser. */
(function () {
  "use strict";
  var form = document.getElementById("help-search");
  if (!form) return;
  var input = document.getElementById("search-input");
  var panel = document.getElementById("search-panel");
  var status = document.getElementById("search-status");
  var list = document.getElementById("search-results");
  var empty = form.querySelector(".search-empty");
  var clearBtn = form.querySelector(".search-clear");
  form.hidden = false;

  var STOP = "a an and are can do does for from get got have how i i'm im is it its me my of on or our please the to was what when where who why will with you your account accounts help".split(" ");
  var SYN = [
    ["x", "twitter", "tweet", "tweets"],
    ["instagram", "ig", "insta"],
    ["facebook", "fb", "meta"],
    ["google", "gmail", "youtube", "android"],
    ["apple", "icloud", "iphone", "appleid"],
    ["hack", "hacked", "hacker", "hackers", "compromised", "stolen", "taken"],
    ["suspend", "suspended", "suspension", "ban", "banned", "disabled", "deactivated"],
    ["lock", "locked", "limited", "restricted"],
    ["login", "log", "signin", "sign", "access"],
    ["2fa", "two-factor", "authenticator", "authentication", "codes", "code"],
    ["cost", "price", "fee", "fees", "pay", "payment", "charge", "money"],
    ["scam", "scams", "scammer", "fake", "phishing", "fraud", "impersonation"],
    ["crypto", "bitcoin", "wallet"],
    ["phone", "number", "sim"],
    ["appeal", "appeals", "review", "objection"]
  ];

  function norm(s) {
    return (s || "").toLowerCase().replace(/[’']/g, "").replace(/apple id/g, "appleid").replace(/can ?t|cannot/g, "cant")
      .replace(/sign[ -]?in|log[ -]?in/g, "login").replace(/[^a-z0-9\-]+/g, " ").trim();
  }
  function stem(w) {
    if (w.length > 5 && /ing$/.test(w)) return w.slice(0, -3);
    if (w.length > 4 && /ed$/.test(w)) return w.slice(0, -2);
    if (w.length > 3 && /s$/.test(w) && !/ss$/.test(w)) return w.slice(0, -1);
    return w;
  }
  function group(t) {
    for (var i = 0; i < SYN.length; i++) if (SYN[i].indexOf(t) !== -1) return SYN[i];
    return [t];
  }
  function wordsOf(s) { return norm(s).split(/\s+/).filter(Boolean).map(stem); }

  function sectionName(el) {
    var sec = el.closest("section");
    var h = sec && sec.querySelector("h2");
    return h ? h.textContent.trim() : "";
  }

  var items = [];
  var n = 0;
  function add(el, kind, title, body, keywords) {
    if (!el.id) el.id = "s-item-" + (++n);
    items.push({
      el: el, kind: kind, title: title.trim(), body: body,
      section: sectionName(el),
      t: wordsOf(title), k: wordsOf(keywords || ""), b: wordsOf(body)
    });
  }
  document.querySelectorAll("details.topic").forEach(function (d) {
    var b = d.querySelector(".topic-body");
    add(d, "answer", d.querySelector(".topic-q").textContent, b.textContent, d.getAttribute("data-keywords") + " " + d.querySelector(".topic-tag").textContent);
  });
  document.querySelectorAll(".faq-list details").forEach(function (d) {
    var s = d.querySelector("summary");
    add(d, "answer", s.textContent, d.textContent.replace(s.textContent, ""), "faq");
  });
  document.querySelectorAll(".link-list > li, .warn-list > li, .promise-grid > li, .steps > li, .card-do, .card-dont, #privacy").forEach(function (li) {
    var h = li.querySelector("h3");
    if (!h) return;
    var hc = h.cloneNode(true);
    hc.querySelectorAll(".plat, [aria-hidden='true']").forEach(function (x) { x.remove(); });
    add(li, "section", hc.textContent, li.textContent.replace(h.textContent, ""), "");
  });

  function hit(words, q) {
    for (var i = 0; i < words.length; i++) {
      var w = words[i];
      if (w === q) return true;
      if (q.length >= 3 && w.indexOf(q) === 0) return true;
    }
    return false;
  }
  function score(item, terms) {
    var total = 0;
    for (var i = 0; i < terms.length; i++) {
      var best = 0;
      var g = terms[i];
      for (var j = 0; j < g.length; j++) {
        var q = g[j];
        var s = (hit(item.t, q) ? 5 : 0) + (hit(item.k, q) ? 3 : 0) + (hit(item.b, q) ? 1 : 0);
        if (j > 0) s *= 0.9;
        if (s > best) best = s;
      }
      if (!best) return 0;
      total += best;
    }
    return total + (item.kind === "answer" ? 1 : 0);
  }

  function esc(s) { return s.replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }

  function search(raw) {
    var tokens = norm(raw).split(/\s+/).filter(Boolean);
    var meaningful = tokens.filter(function (t) { return STOP.indexOf(t) === -1; });
    if (!meaningful.length) meaningful = tokens;
    var terms = meaningful.map(function (t) { return group(t).map(stem).concat(stem(t)); });
    return items.map(function (it) { return { it: it, s: score(it, terms) }; })
      .filter(function (r) { return r.s > 0; })
      .sort(function (a, b) { return b.s - a.s; });
  }

  function render() {
    var q = input.value.trim();
    clearBtn.hidden = !q;
    document.querySelectorAll(".is-match").forEach(function (el) { el.classList.remove("is-match"); });
    if (q.length < 2) { panel.hidden = true; list.innerHTML = ""; status.textContent = ""; return; }
    var res = search(q);
    panel.hidden = false;
    list.innerHTML = "";
    if (!res.length) {
      status.textContent = "0 matches for “" + q + "”.";
      empty.hidden = false;
      return;
    }
    empty.hidden = true;
    var answers = res.filter(function (r) { return r.it.kind === "answer"; }).slice(0, 4);
    var others = res.filter(function (r) { return r.it.kind !== "answer"; }).slice(0, 4);
    var shown = answers.concat(others);
    status.textContent = shown.length + (shown.length === 1 ? " match" : " matches") + " for “" + q + "”.";
    shown.forEach(function (r, i) {
      var it = r.it;
      var li = document.createElement("li");
      li.className = "result result-" + it.kind;
      var html = '<p class="result-meta">' + esc(it.section) + "</p>" +
        '<a class="result-title" href="#' + it.el.id + '">' + esc(it.title) + "</a>";
      if (it.kind === "answer") {
        var body = it.el.querySelector(".topic-body") || it.el.querySelector("p");
        html += '<div class="result-answer">' + (it.el.classList.contains("topic") ? body.innerHTML : "<p>" + body.innerHTML + "</p>") + "</div>";
        it.el.open = true;
        it.el.classList.add("is-match");
      } else {
        html += '<p class="result-snippet">' + esc(it.body.trim().replace(/\s+/g, " ").slice(0, 150)) + (it.body.trim().length > 150 ? "…" : "") + "</p>";
      }
      li.innerHTML = html;
      list.appendChild(li);
    });
  }

  function jump(id) {
    var el = document.getElementById(id);
    if (!el) return;
    if (el.tagName === "DETAILS") el.open = true;
    if (!el.hasAttribute("tabindex")) el.setAttribute("tabindex", "-1");
    el.scrollIntoView({ behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "center" });
    el.focus({ preventScroll: true });
    el.classList.remove("flash");
    void el.offsetWidth;
    el.classList.add("flash");
    setTimeout(function () { el.classList.remove("flash"); }, 2400);
  }

  var timer;
  input.addEventListener("input", function () { clearTimeout(timer); timer = setTimeout(render, 120); });
  form.addEventListener("submit", function (e) {
    e.preventDefault();
    render();
    var first = list.querySelector(".result-title");
    if (first) first.focus();
  });
  list.addEventListener("click", function (e) {
    var a = e.target.closest(".result-title");
    if (!a) return;
    e.preventDefault();
    jump(a.getAttribute("href").slice(1));
  });
  form.addEventListener("keydown", function (e) {
    var links = Array.prototype.slice.call(list.querySelectorAll(".result-title"));
    var idx = links.indexOf(document.activeElement);
    if (e.key === "ArrowDown" && links.length && (document.activeElement === input || idx > -1)) {
      e.preventDefault();
      links[Math.min(idx + 1, links.length - 1)].focus();
    } else if (e.key === "ArrowUp" && idx > -1) {
      e.preventDefault();
      if (idx === 0) input.focus(); else links[idx - 1].focus();
    } else if (e.key === "Escape") {
      if (input.value) { input.value = ""; render(); }
      input.focus();
    }
  });
  clearBtn.addEventListener("click", function () { input.value = ""; render(); input.focus(); });
  form.querySelectorAll(".chip").forEach(function (c) {
    c.addEventListener("click", function () { input.value = c.getAttribute("data-q"); render(); input.focus(); });
  });
  document.addEventListener("keydown", function (e) {
    if (e.key !== "/" || e.ctrlKey || e.metaKey || e.altKey) return;
    var t = e.target;
    if (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName)) return;
    e.preventDefault();
    input.focus();
    input.select();
  });
  var params = new URLSearchParams(location.search);
  if (params.get("q")) { input.value = params.get("q"); render(); }
})();
