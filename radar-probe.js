/* 主持雷达探针 v0.1（2026-10-04）
 * 用法：抖音网页版直播间页面 → F12 Console → 整段粘贴回车。
 * 只读弹幕区公开消息（进场「XX 来了」/ 发言 / 礼物名与件数），分类后经 Worker 队列推到雷达屏。
 * 页面右下角出现「🛰 雷达」徽标 = 接入成功；刷新直播间需重新粘贴。
 * 安全：不点击、不输入、不碰账号任何操作；凭证=主播访问码（__TOKEN__ 由雷达屏「复制探针」自动带入）。
 */
(function () {
  if (window.__RADAR_PROBE__) { return '雷达探针已在运行'; }
  window.__RADAR_PROBE__ = true;
  var TOKEN = '__TOKEN__';
  var API = 'https://fb.menghualu.com.co/api/live/event';
  var VER = 'v0.1';

  /* ---------- 徽标 ---------- */
  var badge = document.createElement('div');
  badge.style.cssText = 'position:fixed;right:14px;bottom:14px;z-index:2147483647;background:#33462c;color:#c9ec5a;' +
    'font:600 12px/1 -apple-system,sans-serif;padding:8px 12px;border-radius:999px;box-shadow:0 2px 10px rgba(0,0,0,.35);' +
    'pointer-events:none;transition:background .3s;';
  badge.textContent = '🛰 雷达 接入中…';
  document.documentElement.appendChild(badge);

  /* ---------- 队列与发送 ---------- */
  var queue = [], sent = 0, failStreak = 0, seen = {};
  function push(ev) {
    var fp = ev.kind + '|' + ev.nick + '|' + (ev.content || '') + '|' + (ev.gift || '') + '|' + (ev.count || 1);
    var now = Date.now();
    if (seen[fp] && now - seen[fp] < 4000) return;   // 同一事件 4s 内去重（DOM 重渲染会重复命中）
    seen[fp] = now;
    if (Object.keys(seen).length > 600) seen = {};
    queue.push(ev);
  }
  setInterval(function () {
    if (!queue.length) return;
    var batch = queue.splice(0, 50);
    fetch(API, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: TOKEN, events: batch })
    }).then(function (r) { return r.json(); }).then(function (j) {
      if (j && j.ok) {
        sent += batch.length; failStreak = 0;
        badge.style.background = '#33462c';
        badge.textContent = '🛰 雷达 已推 ' + sent + ' 条';
      } else { throw new Error((j && j.error) || 'bad'); }
    }).catch(function (e) {
      failStreak++;
      queue = batch.concat(queue).slice(-200);
      badge.style.background = '#d64f18';
      badge.textContent = '🛰 雷达 发送失败×' + failStreak + '（' + String(e).slice(0, 30) + '）';
    });
  }, 2500);

  /* ---------- 消息分类 ---------- */
  function classify(text) {
    var t = String(text || '').replace(/\s+/g, ' ').trim();
    if (!t || t.length > 220) return null;
    var m;
    // 进场：「XX 来了」「XX来了」「XX 进入直播间」
    m = t.match(/^(.{1,30}?)\s*(?:来了|进入直播间)[！!~～。]?$/);
    if (m && !/[:：]/.test(m[1])) return { kind: 'enter', nick: m[1].trim() };
    // 送礼：「XX 送出了 嘉年华 x3」「XX 为主播送出 小心心」
    m = t.match(/^(.{1,30}?)\s*(?:送出了|送出|为主播送出|为主播送上了)\s*(.{1,20}?)\s*(?:[x×*]\s*(\d{1,4}))?[！!~～。]?$/);
    if (m) return { kind: 'gift', nick: m[1].trim(), gift: m[2].trim(), count: parseInt(m[3], 10) || 1 };
    // 发言：「XX：内容」
    m = t.match(/^(.{1,30}?)\s*[:：]\s*(.{1,150})$/);
    if (m) {
      var nick = m[1].trim();
      if (/^(?:系统|官方|直播间|主播|管理)/.test(nick)) return null;
      return { kind: 'chat', nick: nick, content: m[2].trim() };
    }
    return null;
  }

  /* ---------- DOM 监听 ---------- */
  // 优先锁定聊天容器；找不到先观察 body，容器出现后再收窄（选择器按实战校准更新）
  var CHAT_SEL = [
    '[class*="chatroom"] [class*="item"]', '[class*="ChatRoom"] [class*="Item"]',
    '[class*="danmu"] [class*="item"]', '[class*="Danmu"] [class*="Item"]',
    '[data-e2e*="chat"] [class*="item"]', '[class*="message"][class*="item"]'
  ];
  var marked = typeof WeakSet !== 'undefined' ? new WeakSet() : null;
  function harvest(node) {
    if (!node || node.nodeType !== 1) return;
    var cands = [];
    // 新增节点本身 + 其内可疑消息节点（消息通常是短文本叶子块）
    if (node.textContent && node.textContent.length < 240) cands.push(node);
    var inner = node.querySelectorAll ? node.querySelectorAll('div,li,span') : [];
    for (var i = 0; i < inner.length && cands.length < 40; i++) {
      if (inner[i].textContent && inner[i].textContent.length < 240) cands.push(inner[i]);
    }
    for (var j = 0; j < cands.length; j++) {
      var el = cands[j];
      if (marked && marked.has(el)) continue;
      var ev = classify(el.textContent);
      if (ev) { push(ev); if (marked) marked.add(el); }
    }
  }
  var mo = new MutationObserver(function (recs) {
    for (var i = 0; i < recs.length; i++) {
      var adds = recs[i].addedNodes;
      for (var k = 0; k < adds.length; k++) harvest(adds[k]);
    }
  });
  mo.observe(document.body, { childList: true, subtree: true });

  /* ---------- 自报 ---------- */
  push({ kind: 'chat', nick: '雷达探针', content: '探针 ' + VER + ' 已上线（本条为自报，忽略即可）' });
  return '雷达探针 ' + VER + ' 已启动';
})();
