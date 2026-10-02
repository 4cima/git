/**
 * نظام إعلانات 4cima.stream (متصفح) — منقول من خبرة adsV2 في الموقع الرئيسي.
 * القواعد: طابور أدستيرا متسلسل (atOptions عالمي) • ظهور عند الامتلاء •
 * حارس التوصيل الميت • تسليح البوباندَر فور التحميل • DOMParser ممنوع.
 */

export function adsScript(streamAdsJson) {
  return `(function () {
  'use strict';
  var ADS = ${streamAdsJson};
  // مصيد أخطاء تشخيصي — يبقى شغالًا في الإنتاج (مفيد لفحص الشبكات)
  window.__ADS_ERRS = window.__ADS_ERRS || [];
  window.addEventListener('error', function (e) {
    window.__ADS_ERRS.push(String((e && (e.message || e.type)) || 'error'));
  });
  window.addEventListener('unhandledrejection', function (e) {
    window.__ADS_ERRS.push('rejection: ' + String((e && e.reason && (e.reason.message || e.reason)) || 'unknown'));
  });
  if (!ADS || !ADS.enabled) return;

  /* ---------- 1) حارس دومين التوصيل الميت (مرآة deadDeliveryGuard) ----------
     أدستيرا أحيانًا توزّع من دومين ميت (no A record) — نحيّده محليًا لتبقى
     الزونات مركّبة، ولما يتبدل الدومين تتعافى الإعلانات بلا تعديل كود. */
  (function installDeadDeliveryGuard() {
    var DEAD = 'kettledroopingcontinuation.com';
    var isDead = function (u) { return String(u || '').indexOf(DEAD) !== -1; };
    try {
      var scriptDesc = Object.getOwnPropertyDescriptor(HTMLScriptElement.prototype, 'src');
      if (scriptDesc && scriptDesc.set) {
        Object.defineProperty(HTMLScriptElement.prototype, 'src', {
          set: function (v) { scriptDesc.set.call(this, isDead(v) ? 'data:text/javascript,' : v); },
          get: function () { return scriptDesc.get.call(this); },
          configurable: true,
        });
      }
      var imgDesc = Object.getOwnPropertyDescriptor(HTMLImageElement.prototype, 'src');
      if (imgDesc && imgDesc.set) {
        Object.defineProperty(HTMLImageElement.prototype, 'src', {
          set: function (v) { imgDesc.set.call(this, isDead(v) ? 'data:image/gif;base64,R0lGODlhAQABAAAAACw=' : v); },
          get: function () { return imgDesc.get.call(this); },
          configurable: true,
        });
      }
      var origOpen = XMLHttpRequest.prototype.open;
      XMLHttpRequest.prototype.open = function () {
        var args = Array.prototype.slice.call(arguments);
        if (isDead(args[1])) args[1] = 'data:text/plain,';
        return origOpen.apply(this, args);
      };
      var origFetch = window.fetch;
      if (origFetch) {
        window.fetch = function (input) {
          var url = (typeof input === 'string') ? input : (input && input.url) || '';
          if (isDead(url)) return Promise.resolve(new Response('', { status: 204 }));
          return origFetch.apply(this, arguments);
        };
      }
      if (navigator.sendBeacon) navigator.sendBeacon = function () { return true; };
    } catch (e) { /* لا تعطّل الصفحة أبدًا */ }
  })();

  /* ---------- أدوات الحقن المباشر (بلا DOMParser نهائيًا) ---------- */
  function injectScriptToBody(unit) {
    if (!unit || !unit.scriptSrc) return false;
    if (document.querySelector('script[data-zone="' + unit.zoneId + '"]')) return false;
    var s = document.createElement('script');
    s.async = true;
    s.dataset.zone = unit.zoneId;
    s.src = unit.scriptSrc;
    document.body.appendChild(s);
    return true;
  }

  /* ---------- 2) «الظهور عند الامتلاء» ----------
     الخانة مخفية (visibility) حتى يرسم الإعلان iframe/img/video فعليًا؛
     لو ملّتش خلال fillTimeoutMs تُحذف من الصفحة. الحجم محجوز مسبقًا → صفر CLS. */
  function watchFill(box, container, timeoutMs) {
    if (!box || !container) return;
    var started = Date.now();
    var timer = setInterval(function () {
      var alive = container.isConnected;
      var filled = alive && container.querySelector('iframe, img, video');
      if (filled) {
        box.classList.add('ad-filled');
        clearInterval(timer);
      } else if (!alive || Date.now() - started > timeoutMs) {
        if (box && box.parentNode) box.parentNode.removeChild(box);
        clearInterval(timer);
      }
    }, ADS.fillPollMs || 400);
  }

  /* ---------- 3) طابور أدستيرا المتسلسل ----------
     كل snippet أدستيرا يقرأ window.atOptions العالمي لحظة التنفيذ —
     التركيب المتوازي يجعل بانرًا واحدًا فقط يظهر. نركّب ورا بعض: نضبط
     atOptions → نحقن invoke.js → ننتظر التحميل (فشل أمان 8 ثوانٍ) → التالي. */
  function mountAdsterraQueue() {
    var slots = (ADS.adsterra && ADS.adsterra.slots) || [];
    var chain = Promise.resolve();
    slots.forEach(function (slot) {
      chain = chain.then(function () {
        return new Promise(function (resolve) {
          try {
            var container = document.getElementById(slot.container);
            var box = document.getElementById(slot.box);
            if (!container || !box || !container.isConnected) return resolve();
            // خانة مخفية (ديسكتوب على موبايل أو العكس) — لا تضيّع ظهورًا
            if (!container.offsetParent) return resolve();
            var done = false;
            var finish = function () { if (!done) { done = true; resolve(); } };
            window.atOptions = {
              'key': slot.key,
              'format': 'iframe',
              'height': slot.height,
              'width': slot.width,
              'params': {},
            };
            var s = document.createElement('script');
            s.src = ADS.adsterra.deliveryBase + '/' + slot.key + '/invoke.js';
            s.addEventListener('load', finish);
            s.addEventListener('error', finish);
            setTimeout(finish, ADS.adsterraLoadFailsafeMs || 8000);
            container.appendChild(s);
            // مؤقت الامتلاء يبدأ من لحظة تركيب هذه الخانة — كل خانة تأخذ
            // مهلتها كاملة مهما تأخر ترتيبها في الطابور
            watchFill(box, container, ADS.fillTimeoutMs);
          } catch (e) {
            window.__ADS_ERRS.push('mount ' + slot.id + ': ' + (e && e.message));
            resolve();
          }
        });
      });
    });
    // أي رفض في السلسلة لا يوقف باقي الخانات أبدًا
    chain.catch(function (e) {
      window.__ADS_ERRS.push('chain: ' + String((e && e.message) || e));
    });
  }

  /* ---------- 3ب) Native Banner (أدستيرا) ----------
     مش من طابور atOptions — invoke.js بتاع النيتف بيرسم جوه div بمعرّف
     حرفي container-<hash> بالترتيب الرسمي (السكربت أولًا ثم الحاوية بعده).
     نفس سياسة الظهور عند الامتلاء: يظهر لما يرسم ويُحذف لو ملّش. */
  function mountNativeBanner() {
    var nb = ADS.nativeBanner;
    if (!nb || !nb.scriptSrc || !nb.containerId) return;
    var host = document.getElementById('adNative');
    var box = document.getElementById('adNativeBox');
    if (!host || !box || !host.isConnected) return;
    if (document.querySelector('script[data-zone="' + nb.zoneId + '"]')) return;
    var s = document.createElement('script');
    s.async = true;
    s.dataset.zone = nb.zoneId;
    s.src = nb.scriptSrc;
    host.appendChild(s);
    var d = document.createElement('div');
    d.id = nb.containerId;
    host.appendChild(d);
    watchFill(box, host, ADS.fillTimeoutMs);
  }

  /* ---------- 4) الشريط السفلي للموبايل ---------- */
  function initSticky() {
    var bar = document.getElementById('stickyAd');
    if (!bar) return;
    var closeBtn = document.getElementById('stickyClose');
    if (closeBtn) {
      closeBtn.addEventListener('click', function () {
        if (bar.parentNode) bar.parentNode.removeChild(bar);
      });
    }
  }

  /* ---------- 5) طابور ضغطات المشغّل (مرآة waterfall.ts) ----------
     نفس إيقاع الموقع الرئيسي: ضغطة 1 بوباندَر (السكربت المسلَّح يفتح)،
     ضغطة 2 سمارتلينك (مرة واحدة لكل جلسة)، ثم هدوء 30 دقيقة.
     التسليح فور التحميل (تجهيز هيلتوب 1–2 ثانية — درس 7e413ea)،
     والفتح نفسه يتم داخل الضغطة الحقيقية بسكربت الشبكة نفسه.
     سقف هيلتوب الذاتي (2/24 ساعة) يحدّ المجموع مع ضغطات الموقع الرئيسي. */
  var WF_KEY = '4s_wf_v1';
  function wfLoad() {
    try { return JSON.parse(sessionStorage.getItem(WF_KEY)) || null; } catch (e) { return null; }
  }
  function wfSave(s) {
    try { sessionStorage.setItem(WF_KEY, JSON.stringify(s)); } catch (e) { /* وضع خاص */ }
  }
  function initPopunderWaterfall() {
    if (!ADS.popunder || !ADS.popunder.scriptSrc) return;
    var st = wfLoad();
    if (!st || typeof st.clicks !== 'number') { st = { clicks: 0, smartlink: false, lastPopAt: 0 }; wfSave(st); }
    // التسليح الفوري — السكربت يربط ضغطاته خلال 1–2 ثانية من التحميل
    injectScriptToBody(ADS.popunder);
    document.addEventListener('click', function () {
      var now = Date.now();
      var s = wfLoad() || { clicks: 0, smartlink: false, lastPopAt: 0 };
      // انتهى الهجوم الثلاثي؟ ابدأ دورة جديدة بعد الهجوم أو بعد الهدوء
      if (s.clicks >= 3) {
        if (now - s.lastPopAt < (ADS.cooldownMs || 0)) return; // هدوء 30 دقيقة
        s = { clicks: 0, smartlink: s.smartlink, lastPopAt: now };
      }
      s.clicks++;
      if (s.clicks === 2 && !s.smartlink && ADS.smartlink && ADS.smartlink.url) {
        // السمارتلينك يُفتح متزامنًا داخل الـgesture — فشله لا يعلّق شيئًا
        try { window.open(ADS.smartlink.url, '_blank', 'noopener'); s.smartlink = true; } catch (e) {}
      }
      s.lastPopAt = now;
      wfSave(s);
    }, true);
  }

  /* ---------- التشغيل ---------- */
  function boot() {
    // الفيجنت فورًا (مونتاج يدير مكان الرسم بنفسه)
    injectScriptToBody(ADS.vignette);
    // بانرات أدستيرا — بعد رسم الهيكل مباشرة
    mountAdsterraQueue();
    mountNativeBanner();
    initSticky();
    initPopunderWaterfall();
    // سلايدر الفيديو بعد تأخير المشاهدة (45 ثانية)
    if (ADS.videoSlider && ADS.videoSlider.scriptSrc) {
      setTimeout(function () { injectScriptToBody(ADS.videoSlider); }, ADS.videoSlider.delayMs || 45000);
    }
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();`;
}
