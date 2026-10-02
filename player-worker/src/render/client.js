/**
 * جافاسكربت صفحة المشغّل — منطق السيرفرات والمواسم والحلقات والمفضلة.
 * يُحقن كـ<script> مضمن؛ D = بيانات الصفحة (jsonForScript).
 * القواعد: قايمة واحدة مفتوحة في نفس اللحظة (السيرفر/الموسم/الحلقة تُغلق بعضها).
 */

export function clientScript() {
  return String.raw`
(function () {
  'use strict';
  var D = window.__PLAYER__;
  var P = document.getElementById('player');
  var S = document.getElementById('status');
  var B = document.getElementById('serverBar');
  var seasonBtnEl = document.getElementById('seasonBtn');
  var seasonMenuEl = document.getElementById('seasonMenu');
  var seasonLabelEl = document.getElementById('seasonLabel');
  var episodeBtnEl = document.getElementById('episodeBtn');
  var episodeMenuEl = document.getElementById('episodeMenu');
  var episodeLabelEl = document.getElementById('episodeLabel');
  var favBtn = document.getElementById('favBtn');
  var menuBtn = document.getElementById('menuBtn');
  var menuPanel = document.getElementById('menuPanel');
  var menuBackdrop = document.getElementById('menuBackdrop');
  var menuClose = document.getElementById('menuClose');
  var active = null;
  var hideTimer = null;

  // مؤشر التحميل يختفي خلال 5000ms مهما حصل (حتى لو الـiframe ما بعتش load).
  function hideStatus() {
    if (S) S.style.display = 'none';
    if (hideTimer) { clearTimeout(hideTimer); hideTimer = null; }
  }
  function showStatus() {
    if (!S) return;
    S.style.display = 'flex';
    if (hideTimer) clearTimeout(hideTimer);
    hideTimer = setTimeout(hideStatus, 5000);
  }

  function pageUrl(sn, en) {
    var s = (sn === undefined) ? D.season : sn;
    var e = (en === undefined) ? D.episode : en;
    if (D.mediaType === 'movie') return '/movies/' + D.slug;
    return '/series/' + D.slug + '/season/' + s + '/episode/' + e;
  }

  // مرآة buildServerUrl على السيرفر، شاملة باراميترات العربية.
  function srcFor(s) {
    if (!s) return '';
    var b = s.base || '';
    var id = s.id;
    var t = D.tmdbId, sn = D.season, ep = D.episode;
    var m = (D.mediaType === 'movie');
    var u = '';
    if (id === 'vidlink') {
      u = m ? 'https://vidlink.pro/movie/' + t : 'https://vidlink.pro/tv/' + t + '/' + sn + '/' + ep;
    } else if (id === 'videasy') {
      u = m ? 'https://player.videasy.net/movie/' + t : 'https://player.videasy.net/tv/' + t + '/' + sn + '/' + ep;
    } else if (id === '111movies') {
      u = m ? b + '/movie/' + t : 'https://111movies.net/tv/' + t + '/' + sn + '/' + ep;
    } else if (id === 'autoembed_co') {
      u = m ? b + '/movie/tmdb/' + t : b + '/tv/tmdb/' + t + '-' + sn + '-' + ep;
    } else {
      u = m ? b + '/movie/' + t : b + '/tv/' + t + '/' + sn + '/' + ep;
    }
    if (id.lastIndexOf('vidsrc_', 0) === 0) {
      u += (u.indexOf('?') >= 0 ? '&' : '?') + 'lang=ar&sub=ar';
    } else if (id === 'autoembed_co') {
      u += (u.indexOf('?') >= 0 ? '&' : '?') + 'lang=ar&subtitles=ar';
    } else if (id === '111movies') {
      u += (u.indexOf('?') >= 0 ? '&' : '?') + 'lang=ar';
    }
    return u;
  }

  function load(u) {
    showStatus();
    // بلا sandbox لكل السيرفرات — بعض المصادر ترفض الإطارات المقيدة.
    P.removeAttribute('sandbox');
    P.src = u;
  }

  /* ---------- إغلاق كل القوائم المنسدلة (قايمة واحدة مفتوحة فقط) ---------- */
  function closeAllMenus() {
    var pairs = [
      ['srvDdBtn', 'srvDdMenu'],
      ['seasonBtn', 'seasonMenu'],
      ['episodeBtn', 'episodeMenu'],
    ];
    for (var i = 0; i < pairs.length; i++) {
      var btn = document.getElementById(pairs[i][0]);
      var menu = document.getElementById(pairs[i][1]);
      if (btn) btn.setAttribute('aria-expanded', 'false');
      if (menu) menu.hidden = true;
    }
  }

  function selectServer(btn, s) {
    active = s;
    var items = B.querySelectorAll('.srv-item');
    for (var i = 0; i < items.length; i++) items[i].classList.remove('active');
    if (btn) btn.classList.add('active');
    var label = document.getElementById('srvDdLabel');
    if (label) label.textContent = btn ? btn.getAttribute('data-label') : 'اختر السيرفر';
    load(s.src || srcFor(s));
    closeAllMenus();
  }

  function plus18Svg() {
    return '<svg viewBox="0 0 24 24" style="width:14px;height:14px" aria-hidden="true"><path d="M12 2.5 22 21H2Z" fill="#dc2626" stroke="#7f1d1d" stroke-width="1.5" stroke-linejoin="round"/><line x1="12" y1="9" x2="12" y2="14.5" stroke="#fff" stroke-width="2.2" stroke-linecap="round"/><circle cx="12" cy="17.5" r="1.3" fill="#fff"/></svg>';
  }

  function renderTabs() {
    if (!B) return;
    var menu = document.getElementById('srvDdMenu');
    if (!menu) return;
    menu.innerHTML = '';
    if (!D.servers.length) {
      menu.innerHTML = '<div class="srv-dd-head">⚠ لا توجد مصادر متاحة الآن</div>';
      return;
    }
    var head = document.createElement('div');
    head.className = 'srv-dd-head';
    head.textContent = 'مصادر المشاهدة';
    menu.appendChild(head);
    var checkSvg = '<svg class="srv-check" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="20 6 9 17 4 12"/></svg>';
    D.servers.forEach(function (s, idx) {
      var shortName = s.short || s.name || ('سيرفر ' + (idx + 1));
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'srv-item';
      btn.setAttribute('data-label', 'سيرفر ' + shortName);
      var num = document.createElement('span');
      num.className = 'srv-num';
      num.textContent = String(idx + 1);
      btn.appendChild(num);
      var name = document.createElement('span');
      name.textContent = 'سيرفر ' + shortName;
      btn.appendChild(name);
      // شارة +18 على 111Movies وAutoEmbed (إعلانات للكبار)
      if (s.id === 'autoembed_co' || s.id === '111movies') {
        var b = document.createElement('span');
        b.className = 'plus18';
        b.title = '+18';
        b.innerHTML = plus18Svg();
        btn.appendChild(b);
      }
      btn.insertAdjacentHTML('beforeend', checkSvg);
      btn.addEventListener('click', function () { selectServer(btn, s); });
      menu.appendChild(btn);
    });
    var legend = document.createElement('div');
    legend.className = 'srv-dd-legend';
    legend.innerHTML = plus18Svg() + '<span>إعلانات للكبار</span>';
    menu.appendChild(legend);
    var first = menu.querySelector('.srv-item');
    if (first) selectServer(first, D.servers[0]);
  }

  function initSrvDd() {
    var btn = document.getElementById('srvDdBtn');
    var menu = document.getElementById('srvDdMenu');
    if (!btn || !menu) return;
    btn.addEventListener('click', function (e) {
      e.stopPropagation();
      var wasOpen = !menu.hidden;
      closeAllMenus();
      if (!wasOpen) {
        menu.hidden = false;
        btn.setAttribute('aria-expanded', 'true');
      }
    });
    menu.addEventListener('click', function (e) { e.stopPropagation(); });
  }

  var PICK_CHECK = '<svg class="pick-check" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="20 6 9 17 4 12"/></svg>';

  function setupPick(btn, menu) {
    if (!btn || !menu) return;
    btn.addEventListener('click', function (e) {
      e.stopPropagation();
      var wasOpen = !menu.hidden;
      closeAllMenus();
      if (!wasOpen) {
        menu.hidden = false;
        btn.setAttribute('aria-expanded', 'true');
      }
    });
    menu.addEventListener('click', function (e) { e.stopPropagation(); });
  }

  function renderEpSelect() {
    if (!episodeMenuEl || !episodeLabelEl) return;
    episodeLabelEl.textContent = 'حلقة ' + D.episode;
    episodeMenuEl.innerHTML = '';
    (D.episodes || []).forEach(function (ep) {
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'pick-item' + (ep.episode_number === D.episode ? ' active' : '');
      b.innerHTML = '<span>الحلقة ' + ep.episode_number + '</span><span class="pick-badge">' + ep.episode_number + '</span>' + (ep.episode_number === D.episode ? PICK_CHECK : '');
      b.addEventListener('click', function () {
        if (ep.episode_number === D.episode) { closeAllMenus(); return; }
        D.episode = ep.episode_number;
        episodeLabelEl.textContent = 'حلقة ' + D.episode;
        episodeMenuEl.querySelectorAll('.pick-item').forEach(function (x) { x.classList.remove('active'); });
        b.classList.add('active');
        closeAllMenus();
        history.replaceState(null, '', pageUrl());
        if (active) load(srcFor(active));
        // تحديث السابق/التالي فورًا بعد تغيير الحلقة
        if (window.__updatePrevNext) window.__updatePrevNext();
      });
      episodeMenuEl.appendChild(b);
    });
  }

  function renderSeasonSelect() {
    if (!seasonMenuEl || !seasonLabelEl) return;
    seasonLabelEl.textContent = 'الموسم ' + D.season;
    seasonMenuEl.innerHTML = '';
    (D.seasons || []).forEach(function (s) {
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'pick-item' + (s.season_number === D.season ? ' active' : '');
      b.innerHTML = '<span>الموسم ' + s.season_number + '</span><span class="pick-badge">' + (s.episode_count || 0) + ' حلقة</span>' + (s.season_number === D.season ? PICK_CHECK : '');
      b.addEventListener('click', function () {
        if (s.season_number === D.season) { closeAllMenus(); return; }
        // تغيير الموسم: تنقّل كامل ليُعيد السيرفر قائمة الحلقات الجديدة.
        window.location.href = pageUrl(s.season_number, 1);
      });
      seasonMenuEl.appendChild(b);
    });
  }

  /* ---------- أزرار الحلقة السابقة/التالية (ديناميكية — تتحدث مع كل اختيار حلقة) ---------- */
  function seasonIdx(sn) {
    var seasons = D.seasons || [];
    for (var i = 0; i < seasons.length; i++) {
      if (seasons[i].season_number === sn) return i;
    }
    return -1;
  }

  // الوجهات تُحسب لحظة الاستدعاء من D.season/D.episode الحاليين —
  // السابق: حلقة أقل أو آخر حلقة في الموسم الأسبق • التالي: حلقة أكبر
  // أو أول حلقة في الموسم التالي.
  function computeTargets(sn, ep) {
    var seasons = D.seasons || [];
    var idx = seasonIdx(sn);
    if (idx < 0) return { prev: null, next: null };
    var cur = seasons[idx];
    var prev = null, next = null;
    if (ep > 1) { prev = [sn, ep - 1]; }
    else if (idx > 0 && seasons[idx - 1].episode_count > 0) {
      prev = [seasons[idx - 1].season_number, seasons[idx - 1].episode_count];
    }
    if (ep < cur.episode_count) { next = [sn, ep + 1]; }
    else if (idx < seasons.length - 1) { next = [seasons[idx + 1].season_number, 1]; }
    return { prev: prev, next: next };
  }

  function updatePrevNext() {
    if (D.mediaType !== 'tv') return;
    var prevBtn = document.getElementById('prevEpBtn');
    var nextBtn = document.getElementById('nextEpBtn');
    var t = computeTargets(D.season, D.episode);
    if (prevBtn) {
      if (t.prev) { prevBtn.style.display = ''; prevBtn.__target = t.prev; }
      else { prevBtn.style.display = 'none'; prevBtn.__target = null; }
    }
    if (nextBtn) {
      if (t.next) { nextBtn.style.display = ''; nextBtn.__target = t.next; }
      else { nextBtn.style.display = 'none'; nextBtn.__target = null; }
    }
  }

  function initPrevNext() {
    if (D.mediaType !== 'tv') return;
    var prevBtn = document.getElementById('prevEpBtn');
    var nextBtn = document.getElementById('nextEpBtn');
    if (prevBtn) {
      prevBtn.addEventListener('click', function () {
        var t = prevBtn.__target;
        if (t) window.location.href = pageUrl(t[0], t[1]);
      });
    }
    if (nextBtn) {
      nextBtn.addEventListener('click', function () {
        var t = nextBtn.__target;
        if (t) window.location.href = pageUrl(t[0], t[1]);
      });
    }
    updatePrevNext();
    window.__updatePrevNext = updatePrevNext;
  }

  function initMenu() {
    if (!menuPanel || !menuBtn) return;
    function open() {
      menuPanel.setAttribute('aria-hidden', 'false');
      if (menuBackdrop) menuBackdrop.hidden = false;
      menuBtn.setAttribute('aria-expanded', 'true');
    }
    function close() {
      menuPanel.setAttribute('aria-hidden', 'true');
      if (menuBackdrop) menuBackdrop.hidden = true;
      menuBtn.setAttribute('aria-expanded', 'false');
    }
    menuBtn.addEventListener('click', function () {
      if (menuPanel.getAttribute('aria-hidden') === 'true') open(); else close();
    });
    if (menuBackdrop) menuBackdrop.addEventListener('click', close);
    if (menuClose) menuClose.addEventListener('click', close);
  }

  function initFav() {
    if (!favBtn) return;
    var apply = function (state) {
      if (state === 'favorite' || state === 'completed' || state === 'neutral') {
        favBtn.setAttribute('data-state', state);
      }
    };
    apply(D.heartState);
    favBtn.addEventListener('click', function () {
      // نفس حالة مفضلة صفحة العمل عبر جسر المشغّل الموقّع — بلا تنقل.
      if (!D.pt) return;
      fetch('https://4cima.com/api/player/card-action', {
        method: 'POST',
        headers: { 'Authorization': 'Bearer ' + D.pt, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content_type: D.mediaType,
          tmdb_id: D.tmdbId,
          title: D.title || '',
          poster_path: D.posterPath || '',
        }),
      }).then(function (r) { return r.ok ? r.json() : null; })
        .then(function (j) { if (j && j.newState) apply(j.newState); })
        .catch(function () { /* الإبقاء على الحالة الحالية */ });
    });
  }

  function initUserMenu() {
    var toggle = document.getElementById('menuUserToggle');
    var chip = document.getElementById('userChip');
    var dd = document.getElementById('menuDropdown');
    if (!toggle || !dd || !chip) return;
    toggle.addEventListener('click', function (e) {
      e.stopPropagation();
      dd.hidden = !dd.hidden;
      toggle.setAttribute('aria-expanded', dd.hidden ? 'false' : 'true');
      chip.classList.toggle('open', !dd.hidden);
    });
    document.addEventListener('click', function () {
      dd.hidden = true;
      toggle.setAttribute('aria-expanded', 'false');
      chip.classList.remove('open');
    });
  }

  // أي ضغطة خارج القوائم تغلقها كلها (القايمة الجانبية لها مُغلق خاص بها)
  document.addEventListener('click', function () { closeAllMenus(); });

  renderTabs();
  renderSeasonSelect();
  renderEpSelect();
  initSrvDd();
  setupPick(seasonBtnEl, seasonMenuEl);
  setupPick(episodeBtnEl, episodeMenuEl);
  initPrevNext();
  initMenu();
  initFav();
  initUserMenu();
  P.addEventListener('load', hideStatus);
  showStatus();
})();
`;
}
