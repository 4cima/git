/**
 * نظام التصميم — نسخة مطابقة لهوية 4cima.com الحالية.
 * التوكنز منقول من globals.css + QuantumNavbar + MovieCard في الموقع الرئيسي:
 * سطح #020617 فوق 6565.jpg • كريمي #E8E4DC • تدرج أحمر→عنبري • ذهبي #C9A962
 * شيب ثلاثي الأبعاد (إطار متدرج + سليت 800→950) • شريط توهج روز→عنبري→سماوي.
 * القائمة الجانبية = نسخة حرفية من QuantumNavbar (ثلاثية + 3 أعمدة + لغات زجاجية).
 */

export const stylesCss = String.raw`
*{box-sizing:border-box;margin:0;padding:0}
:root{
  --bg:#020617;--surface:#0f0f14;--raised:#1c1b1f;
  --cream:#e8e4dc;--silver:#b3afaa;--muted:#94a3b8;
  --red:#ef4444;--red-600:#dc2626;--amber:#f59e0b;--amber-400:#fbbf24;
  --gold:#c9a962;--gold-light:#e8d5a3;
  --cyan:#22d3ee;--sky:#38bdf8;--rose:#fb7185;--green:#10b981;
  --border:rgba(255,255,255,.08);--border-strong:rgba(255,255,255,.15);
  --radius:16px;--radius-btn:12px;
}
html{scrollbar-width:thin;scrollbar-color:var(--raised) transparent}
::-webkit-scrollbar{width:6px}
::-webkit-scrollbar-thumb{background:var(--raised);border-radius:6px}
::-webkit-scrollbar-thumb:hover{background:var(--silver)}
body{
  font-family:Cairo,'DM Sans',system-ui,sans-serif;
  color:var(--cream);min-height:100vh;display:flex;flex-direction:column;
  overflow-x:hidden;
}
a{color:inherit}
button{font-family:inherit}
:focus-visible{outline:3px solid var(--gold);outline-offset:2px;border-radius:6px}

/* ---------- الهيدر الشفاف الثابت (QuantumNavbar) ---------- */
.site-header{position:fixed;top:0;right:0;left:0;z-index:50}
.header-inner{max-width:1920px;margin:0 auto;height:52px;display:flex;align-items:center;gap:14px;padding:0 24px}
@media(min-width:640px){.header-inner{padding:0 32px}}
@media(min-width:768px){.header-inner{padding:0 48px}}
@media(min-width:1024px){.header-inner{padding:0 64px}}
.menu-btn{height:36px;width:42px;flex-shrink:0;border-radius:8px;border:1px solid rgba(148,163,184,.5);background:linear-gradient(135deg,#1e293b,#334155);color:var(--cyan);cursor:pointer;display:flex;align-items:center;justify-content:center;transition:all .2s;box-shadow:0 4px 10px rgba(0,0,0,.35)}
.menu-btn:hover{background:linear-gradient(135deg,rgba(51,65,85,.95),rgba(71,85,105,.95));color:#67e8f9;border-color:rgba(148,163,184,.8)}
.menu-btn svg{width:26px;height:26px}

/* الشعار الملوّن — حروف 4cima نفس ألوان الموقع الرئيسي (LTR إجباري لعدم الانعكاس) */
.logo{display:inline-flex;align-items:center;font-size:28px;font-weight:900;line-height:1.2;letter-spacing:-.02em;text-decoration:none;white-space:nowrap;transition:transform .15s;direction:ltr}
.logo:hover{transform:scale(1.05)}
.logo .l4{color:#dc2626;text-shadow:0 1px 0 #991b1b,0 2px 0 #7f1d1d,0 3px 0 #450a0a}
.logo .lc{color:#38bdf8;text-shadow:0 1px 0 #0284c7,0 2px 0 #0369a1,0 3px 0 #075985}
.logo .li{color:#10b981;text-shadow:0 1px 0 #059669,0 2px 0 #047857,0 3px 0 #065f46}
.logo .lm{color:#d946ef;text-shadow:0 1px 0 #c026d3,0 2px 0 #a21caf,0 3px 0 #86198f}
.logo .la{color:#fbbf24;text-shadow:0 1px 0 #d97706,0 2px 0 #b45309,0 3px 0 #92400e}

/* ---------- شريط العناوين (ملاصق للنافبار) ---------- */
/* «الورقة» الكاملة — بعرض الشاشة، على ظهرها كل مكونات فوق الفيديو، وقاعها يتلاشي قبل المشغّل */
.top-sheet{position:relative;width:100%;border-radius:20px 20px 0 0;background:linear-gradient(to bottom,rgba(30,41,59,.97) 0%,rgba(24,33,50,.85) 45%,rgba(12,17,30,.38) 76%,rgba(2,6,23,0) 100%);box-shadow:inset 0 1px 0 rgba(255,255,255,.12);padding-bottom:30px}
.titles-bar{display:flex;flex-wrap:wrap;align-items:center;justify-content:flex-start;gap:10px;padding:56px 24px 0;max-width:1060px;margin:0 auto;width:100%}
.type-badge{display:inline-flex;align-items:center;padding:4px 14px;border-radius:8px;font-size:12px;font-weight:800;color:#fff;white-space:nowrap;backdrop-filter:blur(6px);box-shadow:0 4px 6px -1px rgba(0,0,0,.3)}
.type-badge.movie{background:#b91c1c;border:1px solid #dc2626}
.type-badge.series{background:#1e40af;border:1px solid #1d4ed8}
/* مكوّن الاسم — محتوى عادي جوه الورقة الكاملة (الورقة هي اللي بتحمل الخلفية والتلاشي) */
.chip3d{display:inline-flex;max-width:100%;min-width:0}
.chip3d-inner{display:inline-flex;align-items:center;gap:12px;padding:8px 2px;max-width:100%;overflow:hidden;min-width:0}
.t-ar{font-size:19px;font-weight:900;color:#f1f5f9;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.t-en{font-size:14.5px;font-weight:700;direction:ltr;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.chip3d-movie .t-en{color:#f87171}
.chip3d-series .t-en{color:#38bdf8}
/* القلب — نفس شارات MovieCard (محايد/مفضل/مكتمل) */
.fav-btn{flex-shrink:0;width:40px;height:40px;border-radius:999px;border:2px solid rgba(255,255,255,.4);background:rgba(0,0,0,.8);color:#e5e7eb;cursor:pointer;display:inline-flex;align-items:center;justify-content:center;transition:all .2s}
.fav-btn:hover{transform:scale(1.06)}
.fav-ico{display:flex;align-items:center;justify-content:center}
.fav-ico svg{width:20px;height:20px;fill:none;stroke:currentColor;stroke-width:2}
.fav-btn[data-state="favorite"]{background:#ef4444;border-color:#f87171;color:#fff;box-shadow:0 0 15px rgba(239,68,68,.5)}
.fav-btn[data-state="favorite"] .fav-ico svg{fill:currentColor}
.fav-btn[data-state="completed"]{background:#22c55e;border-color:#4ade80;color:#fff;box-shadow:0 0 15px rgba(34,197,94,.5)}
.fav-btn[data-state="completed"] .fav-ico svg{fill:currentColor}

/* ---------- صف المعلومات + زر العودة بجانب التقييم ---------- */
.info-row{display:flex;flex-wrap:wrap;align-items:center;gap:8px;padding:6px 24px 0;max-width:1060px;margin:0 auto;width:100%}
.info-genre{padding:3px 12px;border-radius:8px;font-size:12px;font-weight:800;letter-spacing:.05em;color:#fff;white-space:nowrap;box-shadow:0 4px 10px rgba(0,0,0,.3)}
.info-chip{display:inline-flex;align-items:center;gap:5px;padding:3.6px 12px;border-radius:8px;font-size:12.5px;font-weight:700;white-space:nowrap}
.info-chip-year.year-current{background:#a855f7;color:#fff;box-shadow:0 0 12px rgba(168,85,247,.55);animation:yearPulse 2s ease-in-out infinite}
.info-chip-year.year-2020s{background:#2563eb;color:#fff}
.info-chip-year.year-2010s{background:#0891b2;color:#fff}
.info-chip-year.year-2000s{background:#f1f5f9;color:#0f172a}
.info-chip-year.year-old{background:#334155;color:#cbd5e1}
@keyframes yearPulse{0%,100%{box-shadow:0 0 8px rgba(168,85,247,.4)}50%{box-shadow:0 0 16px rgba(168,85,247,.7)}}
.info-chip-runtime{background:rgba(255,255,255,.08);border:1px solid var(--border);color:#e2e8f0}
.info-chip-rating{background:rgba(15,23,42,.9);border:1px solid rgba(234,179,8,.4);color:#facc15;direction:ltr}
.info-chip-rating svg{width:11px;height:11px;fill:#facc15;stroke:none}
/* زر العودة — كوكتيل أخضر ملكي × فحم × ذهبي غامق بنص ذهبي واضح */
.back-chip{display:inline-flex;align-items:center;gap:6px;padding:4.6px 16px;border-radius:8px;background:linear-gradient(135deg,#131a15 0%,#0e2f20 45%,#14532d 78%,#0f3d2a 100%);border:1px solid rgba(201,169,98,.45);color:#e8d5a3;font-size:12.5px;font-weight:900;text-decoration:none;white-space:nowrap;box-shadow:0 4px 12px -2px rgba(10,40,28,.55),inset 0 1px 0 rgba(255,255,255,.09),inset 0 0 14px rgba(201,169,98,.08);transition:all .2s}
.back-chip:hover{border-color:rgba(201,169,98,.85);filter:brightness(1.14);transform:translateY(-1px)}

/* ---------- صف السيرفرات والقوائم المنسدلة ---------- */
.server-row{display:flex;flex-wrap:wrap;align-items:center;gap:10px;padding:8px 24px 0;max-width:1060px;margin:0 auto;width:100%}
/* مجموعات الأزرار تتوزع كوحدات كاملة — العناصر جوه المجموعة ماتفترقش أبداً */
.ctrl-group{display:flex;align-items:center;gap:10px;flex-wrap:nowrap}
.srv-dd,.pick-dd{position:relative;flex-shrink:0}
.srv-dd-btn{display:inline-flex;align-items:center;gap:10px;height:40px;padding:0 16px;border-radius:12px;border:1.5px solid rgba(148,163,184,.4);background:linear-gradient(to bottom,rgba(30,41,59,.95),rgba(2,6,23,.95));box-shadow:inset 0 1px 0 rgba(255,255,255,.1),inset 0 -1px 0 rgba(0,0,0,.5);color:#f1f5f9;font-size:13.5px;font-weight:800;cursor:pointer;white-space:nowrap;transition:all .2s}
.srv-dd-btn:hover{border-color:rgba(34,211,238,.55);box-shadow:inset 0 1px 0 rgba(255,255,255,.1),inset 0 -1px 0 rgba(0,0,0,.5),0 0 14px rgba(34,211,238,.2)}
.srv-dd-btn[aria-expanded="true"]{border-color:rgba(34,211,238,.7)}
.srv-live{width:8px;height:8px;border-radius:999px;background:#22c55e;box-shadow:0 0 6px #22c55e;flex-shrink:0;animation:pulse 1.6s ease-in-out infinite}
@keyframes pulse{0%,100%{opacity:1}50%{opacity:.35}}
.dd-chev{width:15px;height:15px;transition:transform .2s;color:var(--muted)}
[aria-expanded="true"] .dd-chev{transform:rotate(180deg)}
.srv-dd-menu,.pick-menu{position:absolute;top:calc(100% + 8px);right:0;overflow-y:auto;overflow-x:hidden;overscroll-behavior:contain;touch-action:pan-y;-webkit-overflow-scrolling:touch;background:linear-gradient(to bottom,#141824,#0a0c14);border:1px solid rgba(255,255,255,.1);border-radius:12px;box-shadow:-15px 20px 50px -12px rgba(0,0,0,.85);padding:2px;z-index:1500;animation:menuIn .18s ease-out}
.srv-dd-menu{min-width:172px;max-height:262px}
.pick-menu{min-width:184px;max-height:262px}
.srv-dd-menu[hidden],.pick-menu[hidden]{display:none}
/* سكرول بار عريض دائم الظهور — تدرج أحمر→عنبري على مسار زجاجي */
.srv-dd-menu::-webkit-scrollbar,.pick-menu::-webkit-scrollbar{width:10px}
.srv-dd-menu::-webkit-scrollbar-track,.pick-menu::-webkit-scrollbar-track{background:rgba(255,255,255,.06);border-radius:6px;margin:2px}
.srv-dd-menu::-webkit-scrollbar-thumb,.pick-menu::-webkit-scrollbar-thumb{background:linear-gradient(to bottom,#dc2626,#f59e0b);border-radius:6px;border:2px solid rgba(10,12,20,.9)}
.srv-dd-menu::-webkit-scrollbar-thumb:hover,.pick-menu::-webkit-scrollbar-thumb:hover{background:linear-gradient(to bottom,#ef4444,#f59e0b)}
/* كروم الحديث + فايرفوكس: شريط كلاسيكي دائم الظهور ملون (بيحجز مساحة فعليًا) —
   والخصائص القياسية دي بتتقدم على قواعد webkit في كروم الحديث */
.srv-dd-menu,.pick-menu{scrollbar-width:auto;scrollbar-color:#dc2626 rgba(255,255,255,.08)}
@keyframes menuIn{from{opacity:0;transform:translateY(-6px)}to{opacity:1;transform:translateY(0)}}
.srv-dd-head{padding:5px 10px 6px;font-size:11px;font-weight:800;color:#71717a;text-transform:uppercase;letter-spacing:.06em;border-bottom:1px solid rgba(255,255,255,.08);margin-bottom:3px}
.srv-item,.pick-item{display:flex;align-items:center;gap:7px;width:100%;padding:6px 8px;border:none;border-radius:7px;background:transparent;color:#e2e8f0;font-size:12.5px;font-weight:700;cursor:pointer;text-align:right;transition:background .15s,color .15s;white-space:nowrap}
.srv-item>span:nth-child(2),.pick-item>span:first-child{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;text-align:right}
.pick-badge{white-space:nowrap}
.srv-item:hover,.pick-item:hover{background:rgba(255,255,255,.08);color:#fff}
.srv-item.active,.pick-item.active{background:linear-gradient(135deg,rgba(220,38,38,.28),rgba(245,158,11,.16));color:#fff}
.srv-num{width:22px;height:22px;flex-shrink:0;display:flex;align-items:center;justify-content:center;border-radius:6px;background:rgba(255,255,255,.08);font-size:11px;font-weight:900;color:var(--muted)}
.srv-item.active .srv-num{background:linear-gradient(135deg,#dc2626,#f59e0b);color:#020617}
.srv-check,.pick-check{width:15px;height:15px;flex-shrink:0;opacity:0;color:#22c55e;transition:opacity .15s}
.srv-item.active .srv-check,.pick-item.active .pick-check{opacity:1}
.srv-item .plus18{display:inline-flex;align-items:center;flex-shrink:0}
.srv-item .plus18 svg{width:14px;height:14px}
.srv-dd-legend{display:flex;align-items:center;gap:8px;padding:6px 10px 4px;font-size:11.5px;font-weight:700;color:var(--muted);border-top:1px solid rgba(255,255,255,.08);margin-top:3px}
.pick-badge{min-width:24px;height:20px;padding:0 7px;display:inline-flex;align-items:center;justify-content:center;border-radius:6px;background:rgba(255,255,255,.08);font-size:11px;font-weight:900;color:var(--muted)}
.pick-item.active .pick-badge{background:linear-gradient(135deg,#dc2626,#f59e0b);color:#020617}
.pick-emoji{font-size:15px;line-height:1}

/* أزرار الحلقة السابقة/التالية — الأيقونة شمال الكلمة ومعكوسة */
.ep-nav-btn{display:inline-flex;align-items:center;gap:8px;height:40px;padding:0 16px;border-radius:12px;font-size:13px;font-weight:800;cursor:pointer;white-space:nowrap;transition:all .2s}
.ep-nav-btn span{order:1}
.ep-nav-btn svg{order:2;width:17px;height:17px;flex-shrink:0}
.next-btn{border:1px solid rgba(16,185,129,.4);background:linear-gradient(to bottom,rgba(6,78,59,.9),rgba(2,6,23,.95));color:#6ee7b7}
.next-btn:hover{border-color:rgba(16,185,129,.8);box-shadow:0 0 14px rgba(16,185,129,.25);color:#a7f3d0}
.prev-btn{border:1.5px solid rgba(148,163,184,.4);background:linear-gradient(to bottom,rgba(30,41,59,.95),rgba(2,6,23,.95));color:#cbd5e1}
.prev-btn:hover{border-color:rgba(148,163,184,.8);color:#f1f5f9}

/* ---------- التخطيط — المشغّل أصغر 30% على الشاشات الكبيرة ---------- */
/* ---------- التخطيط — عمود واحد متمركز (المشغّل 1012px والكل متوسط على نفس المحور) ---------- */
.layout{display:grid;grid-template-columns:minmax(0,1fr);grid-template-rows:auto auto auto;grid-template-areas:"player" "undervideo" "hint";gap:4px 0;padding:0 24px;max-width:1060px;margin:0 auto;width:100%;min-height:0}
.player-area{grid-area:player;min-width:0}
/* حجز 16:9 وحيد وقانوني — padding-top على الحاوية نفسها، بلا aspect-ratio */
.player-wrap{position:relative;align-self:start;width:100%;max-width:100%;min-width:0;padding-top:56.25%;overflow:hidden;border-radius:12px;border:1px solid var(--border);background:#000;box-shadow:0 14px 34px -12px rgba(0,0,0,.65)}
.player-wrap iframe{position:absolute;top:0;left:0;width:100%;height:100%;border:none;display:block;background:#000}
.status{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:10px;background:rgba(2,6,23,.85);color:var(--muted);font-size:14px;text-align:center;padding:20px;z-index:5}
.status-title{font-size:15px;font-weight:800;color:#fff}
.spinner{width:36px;height:36px;border:3px solid rgba(255,255,255,.15);border-top-color:var(--red);border-radius:50%;animation:spin .8s linear infinite}
@keyframes spin{to{transform:rotate(360deg)}}
.ad-under{grid-area:undervideo;display:flex;justify-content:center}
.sub-hint{grid-area:hint;display:flex;justify-content:center;align-items:center;padding:2px 0 4px}
.ad-under-inner{width:468px;height:60px;max-width:100%;border-radius:6px;background:rgba(255,255,255,.02);border:1px solid var(--border)}
.sticky-ad{position:fixed;bottom:0;right:0;left:0;z-index:900;display:flex;justify-content:center;visibility:hidden;padding:8px 10px calc(8px + env(safe-area-inset-bottom));background:rgba(2,6,23,.88);border-top:1px solid var(--border)}
.sticky-ad.ad-filled{visibility:visible}
.sticky-ad .sticky-inner{width:320px;height:50px;max-width:100%;position:relative}
.sticky-close{position:absolute;top:-34px;inset-inline-end:6px;width:26px;height:26px;border-radius:8px;background:rgba(15,23,42,.92);border:1px solid var(--border-strong);color:#e2e8f0;cursor:pointer;font-size:13px;line-height:1;display:flex;align-items:center;justify-content:center;z-index:2}
.sticky-close:hover{color:#f87171;border-color:rgba(248,113,113,.5)}

/* ---------- رسالة الترجمة — بطاقة زجاجية مصقولة ---------- */
.subhint-card{position:relative;display:inline-flex;max-width:100%;padding:1.5px;border-radius:16px;background:linear-gradient(to left,rgba(52,211,153,.4),rgba(255,255,255,.1),rgba(34,211,238,.4));box-shadow:0 12px 28px -10px rgba(0,0,0,.75)}
.subhint-card::before{content:'';position:absolute;inset:-4px;border-radius:20px;background:linear-gradient(to left,rgba(16,185,129,.12),transparent,rgba(6,182,212,.12));filter:blur(10px);opacity:.8;pointer-events:none}
.subhint-inner{position:relative;display:flex;align-items:center;gap:14px;padding:10px 20px;border-radius:14.5px;background:linear-gradient(to bottom,#111827,#020617);box-shadow:inset 0 1px 0 rgba(255,255,255,.08),inset 0 -1px 0 rgba(0,0,0,.5)}
.subhint-ico{width:42px;height:42px;flex-shrink:0;display:flex;align-items:center;justify-content:center;border-radius:12px;background:linear-gradient(to bottom,rgba(16,185,129,.18),rgba(16,185,129,.05));border:1px solid rgba(52,211,153,.4);box-shadow:0 0 16px rgba(16,185,129,.22),inset 0 1px 0 rgba(255,255,255,.1)}
.subhint-ico svg{width:26px;height:26px}
.subhint-text{font-size:14.5px;font-weight:700;color:#cbd5e1;line-height:1.9}
.subhint-text .hl-g{color:#34d399;font-weight:900}
.subhint-text .hl-c{color:#22d3ee;font-weight:900}
.subhint-inline-ico{display:inline-flex;align-items:center;justify-content:center;vertical-align:bottom;height:1.9em;margin:0 3px}
.subhint-inline-ico svg{width:20px;height:20px}

/* ---------- خانات الإعلانات (ظهور عند الامتلاء) ---------- */
.ad-box{visibility:hidden;overflow:hidden}
.ad-box.ad-filled{visibility:visible}
/* الخانات الأفقية (تحت الفيديو + العريضة): تنهار تمامًا وهي فاضية عشان
   ميبقاش فراغ تحت المشغّل، وبتفتح بس لما الإعلان يرسم فعليًا */
.ad-under-inner,.ad-wide-inner{transition:max-height .25s ease,border-width .25s ease}
.ad-box.ad-under-inner:not(.ad-filled),.ad-box.ad-wide-inner:not(.ad-filled){max-height:0;border-width:0}
.ad-box.ad-under-inner.ad-filled,.ad-box.ad-wide-inner.ad-filled{max-height:220px}
.wide-banner{display:flex;justify-content:center;padding:6px 24px 2px;max-width:1060px;margin:0 auto;width:100%}
.ad-wide-inner{width:728px;height:90px;max-width:100%;border-radius:6px;background:rgba(255,255,255,.02);border:1px solid var(--border)}
/* النيتف — شريط تيزرات متموه مع المحتوى (ديسكتوب + موبايل — أول خانة عريضة للموبايل) */
.native-banner{display:flex;justify-content:center;padding:6px 16px 2px;max-width:1060px;margin:0 auto;width:100%}
.ad-native-inner{width:100%;max-width:860px;border-radius:6px;background:rgba(255,255,255,.02);border:1px solid var(--border);transition:max-height .25s ease,border-width .25s ease}
.ad-box.ad-native-inner:not(.ad-filled){max-height:0;border-width:0}
.ad-box.ad-native-inner.ad-filled{max-height:220px}
/* ---------- القائمة الجانبية — نسخة حرفية من QuantumNavbar ---------- */
.menu-backdrop{position:fixed;inset:0;background:rgba(0,0,0,.6);z-index:1100}
.menu-backdrop[hidden]{display:none}
.menu-panel{position:fixed;top:52px;right:0;max-height:calc(100% - 3.25rem);width:320px;max-width:92vw;background:linear-gradient(to bottom,#141824,#0f121c,#0a0c14);border-left:1px solid rgba(255,255,255,.1);border-top:1px solid rgba(255,255,255,.1);border-bottom:1px solid rgba(255,255,255,.1);border-radius:28px 0 0 28px;overflow:hidden;z-index:1200;display:flex;flex-direction:column;box-shadow:-20px 0 60px -15px rgba(0,0,0,.9);animation:panelIn .3s cubic-bezier(.2,.9,.3,1.05)}
.menu-panel[aria-hidden="true"]{display:none}
@keyframes panelIn{from{transform:translateX(100%)}to{transform:translateX(0)}}
.menu-glow{height:3px;width:100%;flex-shrink:0;background:linear-gradient(to left,rgba(251,113,133,.5),rgba(252,211,77,.5),rgba(56,189,248,.5))}
.menu-head{display:flex;align-items:center;justify-content:space-between;gap:8px;padding:10px 12px;border-bottom:1px solid rgba(255,255,255,.1);flex-shrink:0}
/* زر الإغلاق — الوصفة الوردية المجسمة (يدور عند المرور) */
.menu-close{position:relative;border:none;border-radius:12px;padding:1.5px;background:linear-gradient(to bottom,rgba(159,18,57,.5),rgba(76,5,25,.5));box-shadow:0 6px 16px -6px rgba(0,0,0,.8);cursor:pointer;transition:box-shadow .3s}
.menu-close:hover{box-shadow:0 0 18px rgba(190,18,60,.4)}
.menu-close:active{transform:translateY(1px);box-shadow:inset 0 2px 8px rgba(0,0,0,.6)}
.menu-close-inner{width:32px;height:32px;display:flex;align-items:center;justify-content:center;border-radius:10px;background:linear-gradient(to bottom,#8b1a2b,#38060f);box-shadow:inset 0 1px 0 rgba(255,255,255,.14),inset 0 -2px 5px rgba(0,0,0,.55);transition:transform .3s}
.menu-close-inner svg{width:16px;height:16px;stroke:#fecdd3;stroke-width:2.5;stroke-linecap:round;transition:transform .3s,color .3s;fill:none}
.menu-close:hover .menu-close-inner svg{transform:rotate(90deg);stroke:#fff}
/* شيب الدخول — الوصفة ثلاثية الأبعاد العنبرية */
.login-chip{display:inline-flex;padding:1.5px;border-radius:12px;background:linear-gradient(to bottom,rgba(252,211,77,.45),rgba(245,158,11,.15));text-decoration:none;transition:box-shadow .3s}
.login-chip:hover{box-shadow:0 0 18px rgba(252,211,77,.25)}
.login-chip:active{transform:translateY(1px)}
.login-chip-inner{display:inline-flex;align-items:center;gap:6px;padding:6px 12px;border-radius:10.5px;background:linear-gradient(to bottom,#1e293b,#020617);box-shadow:inset 0 1px 0 rgba(255,255,255,.1),inset 0 -1px 0 rgba(0,0,0,.5);color:#e2e8f0;font-size:12px;font-weight:800;letter-spacing:.02em}
.login-chip-inner svg{width:15px;height:15px;color:#fcd34d;transition:transform .3s}
.login-chip:hover .login-chip-inner svg{transform:translateX(-2px) scale(1.1)}
/* شيب المستخدم — الوصفة السماوية */
.user-chip{display:inline-flex;padding:1.5px;border-radius:12px;background:linear-gradient(to bottom,rgba(103,232,249,.4),rgba(14,165,233,.15));transition:box-shadow .3s;position:relative}
.user-chip:hover{box-shadow:0 0 18px rgba(56,189,248,.3)}
.user-chip.open{box-shadow:0 0 0 1px rgba(103,232,249,.6)}
.user-chip-main{display:flex;align-items:center;gap:8px;padding:4px 10px 4px 6px;border-radius:10.5px;background:linear-gradient(to bottom,#1e293b,#020617);box-shadow:inset 0 1px 0 rgba(255,255,255,.1),inset 0 -1px 0 rgba(0,0,0,.5)}
.menu-avatar{width:24px;height:24px;flex-shrink:0;border-radius:999px;object-fit:cover;box-shadow:0 0 0 1px rgba(103,232,249,.4);display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:800;color:#fff;background:linear-gradient(135deg,#dc2626,#f59e0b)}
.menu-user-name{max-width:80px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:12px;font-weight:800;letter-spacing:.02em;color:#e2e8f0}
.user-chip .dd-chev{color:#67e8f9;width:13px;height:13px}
/* قايمة المستخدم — إطار متدرج + شريط توهج + أزرار مجسمة */
.menu-dropdown{position:absolute;top:calc(100% + 8px);inset-inline-start:0;width:224px;max-width:calc(100vw - 24px);z-index:1400}
.menu-dropdown[hidden]{display:none}
.menu-drop-frame{position:relative;border-radius:16px;padding:1.5px;background:linear-gradient(to bottom,rgba(251,113,133,.35),rgba(252,211,77,.35),rgba(56,189,248,.35));box-shadow:0 20px 45px -12px rgba(0,0,0,.95)}
.menu-drop-glow{position:absolute;inset:-4px;border-radius:24px;background:linear-gradient(to bottom,rgba(244,63,94,.1),rgba(251,191,36,.1),rgba(14,165,233,.1));filter:blur(10px);opacity:.7;pointer-events:none}
.menu-drop-inner{position:relative;overflow:hidden;border-radius:14px;background:linear-gradient(to bottom,#141824,#0a0c14)}
.menu-drop-glow-strip{height:3px;width:100%;background:linear-gradient(to left,rgba(251,113,133,.5),rgba(252,211,77,.5),rgba(56,189,248,.5))}
.menu-drop-user{display:flex;align-items:center;gap:10px;border-bottom:1px solid rgba(255,255,255,.1);padding:10px 12px}
.menu-drop-user img,.menu-drop-user .menu-avatar-lg{width:36px;height:36px;flex-shrink:0;border-radius:999px;object-fit:cover;box-shadow:0 4px 10px -3px rgba(0,0,0,.8),0 0 0 2px rgba(255,255,255,.1)}
.menu-avatar-lg{display:flex;align-items:center;justify-content:center;font-size:15px;font-weight:800;color:#fff;background:linear-gradient(135deg,#dc2626,#f59e0b)}
.menu-drop-name{font-size:12.5px;font-weight:800;color:#f1f5f9;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.menu-drop-sub{font-size:10.5px;color:#94a3b8;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.role-badge{display:inline-block;margin-top:4px;border-radius:6px;background:rgba(34,211,238,.1);padding:2px 6px;font-size:9.5px;font-weight:700;color:#67e8f9;box-shadow:0 0 0 1px rgba(34,211,238,.3)}
.menu-drop-items{display:flex;flex-direction:column;gap:6px;padding:8px}
.drop-item{display:flex;padding:1.5px;border-radius:12px;text-decoration:none;transition:box-shadow .3s;cursor:pointer;border:none;background:none;text-align:right}
.drop-item:active{transform:translateY(1px)}
.drop-item-inner{display:flex;align-items:center;gap:10px;width:100%;border-radius:10px;background:linear-gradient(to bottom,#1e293b,#020617);box-shadow:inset 0 1px 0 rgba(255,255,255,.1),inset 0 -1px 0 rgba(0,0,0,.5);padding:8px 12px;font-size:12px;font-weight:800;letter-spacing:.02em;color:#e2e8f0;transition:color .3s}
.drop-item svg{width:15px;height:15px;flex-shrink:0;transition:transform .3s}
.drop-item:hover .drop-item-inner{color:#fff}
.drop-item:hover svg{transform:scale(1.1)}
.drop-amber{background:linear-gradient(to bottom,rgba(252,211,77,.45),rgba(245,158,11,.15))}
.drop-amber:hover{box-shadow:0 0 18px rgba(252,211,77,.25)}
.drop-amber svg{color:#fcd34d}
.drop-sky{background:linear-gradient(to bottom,rgba(56,189,248,.45),rgba(14,165,233,.15))}
.drop-sky:hover{box-shadow:0 0 18px rgba(56,189,248,.25)}
.drop-sky svg{color:#7dd3fc}
.drop-rose{background:linear-gradient(to bottom,rgba(251,113,133,.45),rgba(244,63,94,.15))}
.drop-rose:hover{box-shadow:0 0 18px rgba(251,113,133,.25)}
.drop-rose svg{color:#fda4af}
/* التقسيمة الثلاثية أفلام | الرئيسية | مسلسلات — وصفة QuantumNavbar */
.menu-scroll{flex:1;overflow-y:auto;overscroll-behavior:contain;-webkit-overflow-scrolling:touch}
.tri-wrap{position:relative;margin:12px 10px 0;padding:1.5px;border-radius:16px;background:linear-gradient(to left,rgba(251,113,133,.4),rgba(252,211,77,.4),rgba(56,189,248,.4));box-shadow:0 14px 30px -10px rgba(0,0,0,.9)}
.tri-glow{position:absolute;inset:-4px;border-radius:24px;background:linear-gradient(to left,rgba(244,63,94,.15),rgba(251,191,36,.1),rgba(14,165,233,.15));opacity:.7;filter:blur(10px);pointer-events:none}
.tri-inner{position:relative;display:grid;grid-template-columns:repeat(3,1fr);overflow:hidden;border-radius:15px;background:linear-gradient(to bottom,#1e293b,#020617)}
.tri-link{position:relative;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:8px;padding:16px 6px;color:#f1f5f9;font-size:12px;font-weight:800;letter-spacing:.02em;text-decoration:none;transition:background .3s}
.tri-link + .tri-link{border-inline-start:1px solid rgba(0,0,0,.5)}
.tri-link::before{content:'';position:absolute;top:0;inset-inline:8px;height:1px;background:rgba(255,255,255,.1)}
.tri-link svg{width:19px;height:19px;filter:drop-shadow(0 2px 3px rgba(0,0,0,.7));transition:transform .3s}
.tri-link:hover{background:rgba(255,255,255,.045)}
.tri-link:hover svg{transform:translateY(-2px) scale(1.1)}
.tri-link::after{content:'';position:absolute;bottom:0;inset-inline:12px;height:2px;border-radius:999px;background:linear-gradient(90deg,transparent,var(--tint),transparent);opacity:0;transition:opacity .3s}
.tri-link:hover::after{opacity:.5}
/* الأعمدة الثلاثة: تصنيفات أفلام | لغات | تصنيفات مسلسلات */
.menu-cols{display:grid;grid-template-columns:repeat(3,1fr);overflow:hidden;border-radius:16px;border:1px solid rgba(255,255,255,.06);background:rgba(15,23,42,.5);box-shadow:inset 0 1px 0 rgba(255,255,255,.04);margin:8px 10px 16px}
.mcol{display:flex;flex-direction:column;min-width:0}
.mcol-sep{border-inline-end:1px solid rgba(0,0,0,.4)}
.mcol-genres{flex:1;display:flex;flex-direction:column;padding:10px 0 8px}
.mgenre{flex:1;display:flex;align-items:center;gap:8px;padding:6px 10px;font-size:12px;font-weight:700;color:#94a3b8;text-decoration:none;transition:background .2s,color .2s;min-height:29px}
.mgenre:hover{background:rgba(255,255,255,.04);color:#f1f5f9}
.mgenre .dot{width:6px;height:6px;flex-shrink:0;border-radius:999px}
.mgenre-movie .dot{background:rgba(251,113,133,.7)}
.mgenre-series .dot{background:rgba(56,189,248,.7)}
.mgenre-series{flex-direction:row-reverse}
.mcol-langs{flex:1;display:flex;flex-direction:column;gap:6px;padding:10px 6px 8px}
.lang3d{position:relative;flex:1;border-radius:10px;padding:1.5px;background:linear-gradient(to left,rgba(251,113,133,.3),rgba(255,255,255,.1),rgba(56,189,248,.3));box-shadow:0 2px 6px rgba(0,0,0,.5)}
.lang3d-inner{position:absolute;inset:1.5px;overflow:hidden;border-radius:8.5px;background:rgba(255,255,255,.03);box-shadow:inset 0 1px 0 rgba(255,255,255,.14),inset 0 -1px 2px rgba(0,0,0,.45)}
.lang3d-inner::before{content:'';position:absolute;top:0;inset-inline:8px;height:1px;background:rgba(255,255,255,.15)}
.lang3d-label{display:flex;align-items:center;justify-content:center;height:100%;padding:6px 0;font-size:11.5px;font-weight:700;color:#f1f5f9;user-select:none;white-space:nowrap}
.lang3d-movies,.lang3d-series{position:absolute;top:0;bottom:0;width:33.34%;text-decoration:none;transition:background .2s}
.lang3d-movies{inset-inline-start:0;border-start-end-radius:8.5px;border-end-end-radius:8.5px;background:rgba(244,63,94,.1)}
.lang3d-movies:hover{background:rgba(244,63,94,.28)}
.lang3d-series{inset-inline-end:0;border-start-start-radius:8.5px;border-end-start-radius:8.5px;background:rgba(14,165,233,.1)}
.lang3d-series:hover{background:rgba(14,165,233,.28)}

/* ---------- الإعلان الجانبي (مساحات الشاشات العريضة) ----------
   ريل واحد ثابت على حافة الشاشة عموديًا بالمنتصف — يظهر فقط
   لما الشاشة تكفي (≥1440px) عشان ما يغطش المحتوى أبدًا */
.side-rail{position:fixed;top:50%;transform:translateY(-50%);z-index:20;display:none;width:160px}
.rail-right{right:20px}
@media(min-width:1440px){.side-rail{display:block}}

/* ---------- الفوتر (وصفة الموقع الرئيسي — ملاصق للمحتوى) ---------- */
.site-footer{position:relative}
.footer-hairline{position:relative;height:1px;background:rgba(39,39,42,.5);overflow:hidden}
.footer-hairline::before{content:'';position:absolute;inset:0;background:linear-gradient(to left,transparent,rgba(6,182,212,.35),transparent);animation:hairPulse 4s ease-in-out infinite}
.footer-hairline::after{content:'';position:absolute;top:0;bottom:0;left:50%;transform:translateX(-50%);width:128px;background:linear-gradient(to left,transparent,rgba(6,182,212,.8),transparent);box-shadow:0 0 15px rgba(6,182,212,.8)}
@keyframes hairPulse{0%,100%{opacity:.4}50%{opacity:1}}
.footer-body{max-width:1060px;margin:0 auto;padding:18px 24px;display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:12px}
.trust{display:flex;flex-wrap:wrap;gap:8px}
.trust-badge{display:inline-flex;align-items:center;gap:5px;padding:5px 12px;border-radius:999px;background:rgba(15,23,42,.3);border:1px solid rgba(30,41,59,.5);font-size:11px;font-weight:700;color:var(--muted)}
.trust-badge svg{width:12px;height:12px}
.trust-badge.tb-ssl{color:#34d399}
.trust-badge.tb-safe{color:#60a5fa}
.trust-badge.tb-fast{color:#fbbf24}
.copyright{font-size:12px;color:#71717a;line-height:1.8}
.copyright b{background:linear-gradient(to left,#ef4444,#f59e0b);-webkit-background-clip:text;background-clip:text;-webkit-text-fill-color:transparent;font-weight:900}
.copyright a{color:var(--muted);text-decoration:none}
.copyright a:hover{color:var(--cyan)}

/* ---------- التجاوب ---------- */
@media(max-width:1023px){
  .ad-under,.wide-banner{display:none}
  .server-row{flex-wrap:wrap}
  .titles-bar{padding-top:56px}
  /* الشريط الإعلاني السفلي الثابت — نحجز له مساحة عشان ماحاجة ما تتقص وراه */
  body{padding-bottom:72px}
  .subhint-text{font-size:13px}
  .subhint-inner{padding:8px 14px;gap:10px}
  .subhint-ico{width:36px;height:36px}
  .subhint-ico svg{width:22px;height:22px}
}
/* ---------- الشاشات الضيقة (موبايلات 360-420px) ----------
   كثافة عالية: العنوان والنوع في سطر واحد، الشرائح أصغر، وأزرار
   السيرفر/الموسم/الحلقة تتوزع صفين بدل ما كل واحد يقع لوحده */
@media(max-width:420px){
  .header-inner{padding:0 14px}
  .titles-bar{padding:56px 14px 0;gap:8px;flex-wrap:nowrap}
  .chip3d{min-width:0;flex:1 1 auto}
  .chip3d-inner{padding:6px 2px;gap:8px}
  .t-ar{font-size:17px}
  .t-en{font-size:12.5px}
  .info-row{padding:6px 14px 0;gap:6px}
  .info-genre{padding:3px 9px;font-size:11px}
  .info-chip{padding:3px 9px;font-size:11.5px}
  .back-chip{padding:4px 12px;font-size:11.5px}
  .server-row{padding:8px 14px 0;gap:8px}
  .ctrl-group{gap:8px}
  .srv-dd-btn{height:36px;padding:0 12px;font-size:12.5px;gap:7px}
  .ep-nav-btn{height:36px;padding:0 12px;font-size:12.5px}
  .layout{padding:0 14px}
  .srv-dd-menu{min-width:150px}
  .pick-menu{min-width:160px}
}
@media(min-width:1024px){
  .sticky-ad{display:none}
}
/* شاشات اللمس (موبايل/تابلت): مفيش سكرول بار — السحب بالإصبع والتطبيقات العالمية بتفضله مخفي */
@media (hover: none) and (pointer: coarse) {
  *{scrollbar-width:none!important}
  *::-webkit-scrollbar{display:none!important;width:0!important;height:0!important}
}
`;

export const CHEVRON_SVG = '<svg class="dd-chev" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="6 9 12 15 18 9"/></svg>';

// أيقونات السابق/التالي — معكوسة للاتجاه العربي (التالي يشير يسارًا)
export const ICON_NEXT = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polygon points="18 5 8 12 18 19" fill="currentColor" stroke="none"/><line x1="6" y1="5" x2="6" y2="19"/></svg>';
export const ICON_PREV = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polygon points="6 5 16 12 6 19" fill="currentColor" stroke="none"/><line x1="18" y1="5" x2="18" y2="19"/></svg>';
