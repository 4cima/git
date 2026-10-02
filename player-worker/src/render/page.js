/**
 * قوالب HTML: صفحة المشغّل + الصفحة الرئيسية + صفحة الخطأ.
 * التصميم بنظام توكنز الموقع الرئيسي (انظر styles.js).
 * القائمة الجانبية = نسخة حرفية من QuantumNavbar (بلا بحث).
 */

import { stylesCss, CHEVRON_SVG, ICON_NEXT, ICON_PREV } from './styles.js';
import { clientScript } from './client.js';
import { adsScript } from './ads-client.js';
import { STREAM_ADS } from '../ads-config.js';

const esc = (v) => String(v == null ? '' : v)
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&#39;');

// تسريب آمن داخل <script> — منع "</script>" من كسر الصفحة.
const jsonForScript = (obj) => JSON.stringify(obj).replace(/</g, '\\u003c');

// ألوان شيبات التصنيفات — منقولة 1:1 من src/utils/genreColors.ts [خلفية, حد]
const GENRE_COLORS = {
  'action': '#450a0a,#7f1d1d',           'أكشن': '#450a0a,#7f1d1d',
  'drama': '#6b21a8,#7e22ce',            'دراما': '#6b21a8,#7e22ce',
  'comedy': '#a16207,#ca8a04',           'كوميديا': '#a16207,#ca8a04',
  'horror': '#1f2937,#374151',           'رعب': '#1f2937,#374151',
  'romance': '#9d174d,#be185d',          'رومانسي': '#9d174d,#be185d',
  'science fiction': '#155e75,#0e7490',  'sci-fi': '#155e75,#0e7490', 'خيال علمي': '#155e75,#0e7490',
  'adventure': '#065f46,#047857',        'مغامرة': '#065f46,#047857',
  'thriller': '#9a3412,#c2410c',         'إثارة': '#9a3412,#c2410c',
  'crime': '#450a0a,#7f1d1d',            'جريمة': '#450a0a,#7f1d1d',
  'fantasy': '#3730a3,#4338ca',          'فانتازيا': '#3730a3,#4338ca',
  'animation': '#1e40af,#1d4ed8',        'أنيميشن': '#1e40af,#1d4ed8', 'رسوم متحركة': '#1e40af,#1d4ed8',
  'family': '#166534,#15803d',           'عائلي': '#166534,#15803d',
  'war': '#334155,#475569',              'حرب': '#334155,#475569',
  'history': '#92400e,#b45309',          'تاريخي': '#92400e,#b45309',
  'mystery': '#5b21b6,#6d28d9',          'غموض': '#5b21b6,#6d28d9',
  'documentary': '#115e59,#0f766e',      'وثائقي': '#115e59,#0f766e',
  'western': '#7c2d12,#9a3412',          'غربي': '#7c2d12,#9a3412',
  'music': '#86198f,#a21caf',            'موسيقي': '#86198f,#a21caf',
};
const GENRE_DEFAULT = '#3f3f46,#52525b';

function genreChipStyle(genre) {
  const pair = GENRE_COLORS[String(genre || '').toLowerCase().trim()] || GENRE_DEFAULT;
  const [bg, bd] = pair.split(',');
  return `background:${bg};border:1px solid ${bd};`;
}

// لون شيب السنة حسب العصر — نفس قواعد MovieCard في الموقع الرئيسي
function yearChipClass(year) {
  const y = parseInt(year, 10);
  if (!Number.isFinite(y) || y <= 0) return '';
  const current = new Date().getFullYear();
  if (y >= current) return 'year-current';
  if (y >= 2020) return 'year-2020s';
  if (y >= 2010) return 'year-2010s';
  if (y >= 2000) return 'year-2000s';
  return 'year-old';
}

// الشعار الملوّن — نفس ألوان SiteLogo في الموقع الرئيسي
const LOGO_HTML = '<a class="logo" href="https://4cima.com" title="4cima.com"><span class="l4">4</span><span class="lc">c</span><span class="li">i</span><span class="lm">m</span><span class="la">a</span></a>';

// مصادر الأيقونات (Lucide نفسها المستخدمة في الموقع الرئيسي)
const MENU_SVGS = {
  film: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="M7 4v16M17 4v16M2 9h5M2 15h5M17 9h5M17 15h5"/></svg>',
  home: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 10.5 12 3l9 7.5"/><path d="M5 9.5V21h14V9.5"/></svg>',
  tv: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="2" y="7" width="20" height="14" rx="2"/><polyline points="17 2 12 7 7 2"/></svg>',
  login: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/><polyline points="10 17 15 12 10 7"/><line x1="15" y1="12" x2="3" y2="12"/></svg>',
  user: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>',
  settings: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/></svg>',
  logout: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>',
  heart: '<svg viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>',
  star: '<svg viewBox="0 0 24 24" aria-hidden="true"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>',
  hamburger: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>',
  x: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" aria-hidden="true"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>',
  cc: '<svg viewBox="0 0 30 22" fill="none" aria-hidden="true"><rect x="1.2" y="1.2" width="27.6" height="19.6" rx="4.5" stroke="#34d399" stroke-width="1.8"/><path d="M13 8.2a3.2 3.2 0 1 0 0 5.6M21.5 8.2a3.2 3.2 0 1 0 0 5.6" stroke="#34d399" stroke-width="1.8" stroke-linecap="round" fill="none"/></svg>',
  gearSm: '<svg viewBox="0 0 24 24" fill="none" stroke="#22d3ee" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>',
  ssl: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>',
  shield: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>',
  zap: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>',
};

// قوائم القايمة الجانبية — مطابقة حرفيًا لـ QuantumNavbar (genreLinks + NAVBAR_LANGUAGES)
const GENRE_LINKS = [
  { slug: 'action', label: 'أكشن' }, { slug: 'comedy', label: 'كوميديا' },
  { slug: 'drama', label: 'دراما' }, { slug: 'romance', label: 'رومانسي' },
  { slug: 'thriller', label: 'إثارة' }, { slug: 'horror', label: 'رعب' },
  { slug: 'crime', label: 'جريمة' }, { slug: 'adventure', label: 'مغامرات' },
  { slug: 'fantasy', label: 'فانتازيا' }, { slug: 'animation', label: 'أنمي' },
];
const NAVBAR_LANGUAGES = [
  { code: 'ar', label: 'عربي' }, { code: 'en', label: 'أجنبي' },
  { code: 'tr', label: 'تركي' }, { code: 'hi', label: 'هندي' },
  { code: 'ko', label: 'كوري' }, { code: 'zh', label: 'صيني' },
  { code: 'ja', label: 'ياباني' }, { code: 'fr', label: 'فرنسي' },
  { code: 'es', label: 'إسباني' }, { code: 'de', label: 'ألماني' },
];

function menuHtml({ displayName, avatarUrl, sessionUser, loginUrl, logoutUrl }) {
  // ترويسة القايمة: شيب المستخدم السماوي / شيب الدخول العنبري + زر إغلاق وردي مجسم
  const headHtml = displayName
    ? `<div class="user-chip" id="userChip">
         <button type="button" id="menuUserToggle" class="user-chip-main" aria-label="حساب المستخدم" aria-expanded="false">
           ${avatarUrl
             ? `<img class="menu-avatar" src="${esc(avatarUrl)}" alt="" referrerpolicy="no-referrer"/>`
             : `<span class="menu-avatar">${esc(displayName.charAt(0).toUpperCase())}</span>`}
           <span class="menu-user-name" title="${esc(displayName)}">${esc(displayName)}</span>
           ${CHEVRON_SVG}
         </button>
         <div class="menu-dropdown" id="menuDropdown" hidden>
           <div class="menu-drop-frame">
             <div class="menu-drop-glow" aria-hidden="true"></div>
             <div class="menu-drop-inner">
               <div class="menu-drop-glow-strip" aria-hidden="true"></div>
               <div class="menu-drop-user">
                 ${avatarUrl
                   ? `<img src="${esc(avatarUrl)}" alt="" referrerpolicy="no-referrer"/>`
                   : `<span class="menu-avatar-lg">${esc(displayName.charAt(0).toUpperCase())}</span>`}
                 <div style="min-width:0;flex:1">
                   <div class="menu-drop-name">${esc(displayName)}</div>
                   ${(sessionUser && sessionUser.role === 'admin') || (sessionUser && sessionUser.role === 'supervisor')
                     ? '<span class="role-badge">مشرف</span>'
                     : ''}
                 </div>
               </div>
               <div class="menu-drop-items">
                 <a href="https://4cima.com/profile" target="_blank" rel="noopener" class="drop-item drop-amber"><span class="drop-item-inner">${MENU_SVGS.user}<span>الملف الشخصي</span></span></a>
                 ${(sessionUser && (sessionUser.role === 'admin' || sessionUser.role === 'supervisor'))
                   ? `<a href="https://4cima.com/admin" target="_blank" rel="noopener" class="drop-item drop-sky"><span class="drop-item-inner">${MENU_SVGS.settings}<span>لوحة التحكم</span></span></a>`
                   : ''}
                 <a href="${logoutUrl}" class="drop-item drop-rose"><span class="drop-item-inner">${MENU_SVGS.logout}<span>تسجيل الخروج</span></span></a>
               </div>
             </div>
           </div>
         </div>
       </div>`
    : `<a href="${loginUrl}" class="login-chip"><span class="login-chip-inner">${MENU_SVGS.login}<span>الدخول</span></span></a>`;

  // الزر الثلاثي: أفلام (يمين) | الرئيسية (وسط) | مسلسلات (يسار) — بألوان الرئيسية
  const segments = [
    { to: '/movies', label: 'أفلام', icon: MENU_SVGS.film, tint: '#fb7185' },
    { to: '/', label: 'الرئيسية', icon: MENU_SVGS.home, tint: '#fcd34d' },
    { to: '/series', label: 'مسلسلات', icon: MENU_SVGS.tv, tint: '#38bdf8' },
  ];
  const triNav = `<div class="tri-wrap"><div class="tri-glow" aria-hidden="true"></div><div class="tri-inner">${segments.map((s) =>
    `<a class="tri-link" style="--tint:${s.tint}" href="https://4cima.com${s.to}" target="_blank" rel="noopener">${s.icon}<span>${s.label}</span></a>`).join('')}</div></div>`;

  // الأعمدة الثلاثة: تصنيفات أفلام | اللغات الزجاجية بثلثين | تصنيفات مسلسلات
  const moviesCol = `<div class="mcol mcol-sep"><div class="mcol-genres">${GENRE_LINKS.map((g) =>
    `<a class="mgenre mgenre-movie" href="https://4cima.com/movies/genres/${encodeURIComponent(g.slug)}" target="_blank" rel="noopener"><span class="dot"></span><span style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${g.label}</span></a>`).join('')}</div></div>`;
  const langsCol = `<div class="mcol mcol-sep"><div class="mcol-langs">${NAVBAR_LANGUAGES.map((l) =>
    `<div class="lang3d"><div class="lang3d-inner"><span class="lang3d-label" title="${l.label}">${l.label}</span>
      <a class="lang3d-movies" href="https://4cima.com/movies/lang/${encodeURIComponent(l.code)}" target="_blank" rel="noopener" title="${l.label} — أفلام" aria-label="أفلام ${l.label}"></a>
      <a class="lang3d-series" href="https://4cima.com/series/lang/${encodeURIComponent(l.code)}" target="_blank" rel="noopener" title="${l.label} — مسلسلات" aria-label="مسلسلات ${l.label}"></a>
    </div></div>`).join('')}</div></div>`;
  const seriesCol = `<div class="mcol"><div class="mcol-genres">${GENRE_LINKS.map((g) =>
    `<a class="mgenre mgenre-series" href="https://4cima.com/series/genres/${encodeURIComponent(g.slug)}" target="_blank" rel="noopener"><span class="dot"></span><span style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${g.label}</span></a>`).join('')}</div></div>`;

  return `<div class="menu-backdrop" id="menuBackdrop" hidden></div>
<aside class="menu-panel" id="menuPanel" aria-hidden="true">
  <div class="menu-glow"></div>
  <div class="menu-head">
    ${headHtml}
    <button type="button" id="menuClose" class="menu-close" aria-label="إغلاق"><span class="menu-close-inner">${MENU_SVGS.x}</span></button>
  </div>
  <div class="menu-scroll">
    ${triNav}
    <div class="menu-cols">
      ${moviesCol}
      ${langsCol}
      ${seriesCol}
    </div>
  </div>
</aside>`;
}

const FOOTER_HTML = `<footer class="site-footer">
  <div class="footer-hairline"></div>
  <div class="footer-body">
    <div class="trust">
      <span class="trust-badge tb-ssl">${MENU_SVGS.ssl}<span>SSL مشفّر</span></span>
      <span class="trust-badge tb-safe">${MENU_SVGS.shield}<span>آمن</span></span>
      <span class="trust-badge tb-fast">${MENU_SVGS.zap}<span>سريع</span></span>
    </div>
    <div class="copyright">شاهد أحدث الأفلام والمسلسلات بجودة عالية على <a href="https://4cima.com" target="_blank" rel="noopener"><b>4cima.com</b></a> — بث مباشر عبر <a href="https://4cima.stream" target="_blank" rel="noopener"><b>4cima.stream</b></a></div>
  </div>
</footer>`;

const STICKY_AD_HTML = `<div class="sticky-ad ad-box" id="stickyAd">
  <button type="button" id="stickyClose" class="sticky-close" aria-label="إغلاق الإعلان">✕</button>
  <div class="sticky-inner" id="adSticky"></div>
</div>`;

// الريل الجانبي — استغلال مساحة الشاشات العريضة
const SIDE_RAILS_HTML = `<div class="side-rail rail-right ad-box" id="adRailRightBox" aria-label="إعلان"><div id="adRailRight"></div></div>`;

const HEAD_ICONS = `<link rel="icon" href="/favicon.ico"/>
<link rel="shortcut icon" href="/favicon.ico"/>
<link rel="apple-touch-icon" href="https://4cima.com/icons/apple-touch-icon.png"/>`;

export function htmlPage({
  slug, mediaType, tmdbId, title, titleEn, season, episode, servers, seasons, episodes,
  backdropUrl, refUrl, who, avatar, selfUrl, cleanSelf, bridge, pt, posterPath,
  year, runtime, rating, genres,
}) {
  const isTv = mediaType === 'tv';
  const sessionUser = (bridge && bridge.user) || null;
  const displayName = (sessionUser?.name || who || '').trim();
  const avatarUrl = (sessionUser?.avatar || avatar || '').trim();
  const heartState = (bridge && bridge.heartState) || 'neutral';
  const nextParam = encodeURIComponent(selfUrl || 'https://4cima.stream/');
  const loginUrl = `https://4cima.com/login?next=${nextParam}`;
  const logoutUrl = `https://4cima.com/api/auth/logout?next=${encodeURIComponent(cleanSelf || selfUrl || 'https://4cima.stream/')}`;
  const pageTitle = title
    ? (isTv ? `مشاهدة ${title} — موسم ${season} حلقة ${episode}` : `مشاهدة ${title}`) + ' | 4cima'
    : '4cima Player';

  // الخلفية: طبقة تعتيم سليت فوق خلفية العمل فوق 6565.jpg (هوية الرئيسية)
  const bgStyle = backdropUrl
    ? `background:linear-gradient(rgba(2,6,23,.72),rgba(2,6,23,.9)),url('${esc(backdropUrl)}') center/cover no-repeat fixed,url('https://4cima.com/6565.jpg') center/cover no-repeat fixed #020617;`
    : `background:linear-gradient(rgba(2,6,23,.78),rgba(2,6,23,.92)),url('https://4cima.com/6565.jpg') center/cover no-repeat fixed #020617;`;

  const boot = jsonForScript({
    slug, mediaType, tmdbId, season, episode,
    servers, seasons, episodes, who: displayName, avatar: avatarUrl,
    loginUrl, pt, heartState, title, posterPath: posterPath || '',
  });

  const runtimeLabel = typeof runtime === 'number' && runtime > 0
    ? `${Math.floor(runtime / 60)}س ${runtime % 60}د`
    : '';

  // شريط العناوين: «أول ورقة» — مكوّن كبير بيضم شارة النوع + الاسمين، وقاعه يتلاشي في الصفحة + القلب جنب
  const typeBadge = title ? `<span class="type-badge ${isTv ? 'series' : 'movie'}">${isTv ? 'مسلسل' : 'فيلم'}</span>` : '';
  const arHtml = title ? `<span class="t-ar" dir="auto">${esc(title)}</span>` : '';
  const enHtml = titleEn && titleEn !== title ? `<span class="t-en" dir="ltr">${esc(titleEn)}</span>` : '';
  const titleChip = (arHtml || enHtml)
    ? `<span class="chip3d ${isTv ? 'chip3d-series' : 'chip3d-movie'}"><span class="chip3d-inner">${typeBadge}${arHtml}${enHtml}</span></span>` : '';
  const heartBtn = sessionUser
    ? `<button type="button" id="favBtn" class="fav-btn" data-state="${esc(heartState)}" title="إضافة للمفضلة" aria-label="إضافة للمفضلة"><span class="fav-ico">${MENU_SVGS.heart}</span></button>`
    : '';
  const titlesBar = (titleChip || heartBtn)
    ? `<div class="titles-bar">${titleChip}${heartBtn}</div>` : '';

  // صف المعلومات: التصنيفات + السنة + المدة + التقييم + زر العودة بجانب التقييم
  const infoGenres = (genres || []).map((g) => `<span class="info-genre" style="${genreChipStyle(g)}">${esc(g)}</span>`).join('');
  const yearCls = yearChipClass(year);
  const backLabel = isTv ? 'العودة للمسلسل' : 'العودة للفيلم';
  const infoRight = [
    (year ? `<span class="info-chip info-chip-year ${yearCls}" dir="ltr">${esc(year)}</span>` : ''),
    (runtimeLabel ? `<span class="info-chip info-chip-runtime">${runtimeLabel}</span>` : ''),
    (rating ? `<span class="info-chip info-chip-rating">${MENU_SVGS.star} ${esc(rating)}</span>` : ''),
    `<a class="back-chip" href="${esc(refUrl)}">↩ ${backLabel}</a>`,
  ].join('');
  const infoRowHtml = (infoGenres || infoRight)
    ? `<div class="info-row"><div class="ctrl-group">${infoGenres}</div><div class="ctrl-group">${infoRight}</div></div>` : '';

  // صف الأزرار فوق المشغّل — الترتيب (من اليمين): سيرفر ← موسم ← حلقة ← السابق ← التالي
  const seasonSelect = isTv
    ? `<div class="pick-dd"><button type="button" class="srv-dd-btn" id="seasonBtn" aria-expanded="false"><span class="pick-emoji">📺</span><span id="seasonLabel"></span>${CHEVRON_SVG}</button><div class="pick-menu" id="seasonMenu" hidden></div></div>`
    : '';
  const episodeSelect = isTv
    ? `<div class="pick-dd"><button type="button" class="srv-dd-btn" id="episodeBtn" aria-expanded="false"><span class="pick-emoji">🎬</span><span id="episodeLabel"></span>${CHEVRON_SVG}</button><div class="pick-menu" id="episodeMenu" hidden></div></div>`
    : '';
  const prevEpBtn = isTv
    ? `<button type="button" id="prevEpBtn" class="ep-nav-btn prev-btn" title="الحلقة السابقة" style="display:none"><span>السابق</span>${ICON_PREV}</button>`
    : '';
  const nextEpBtn = isTv
    ? `<button type="button" id="nextEpBtn" class="ep-nav-btn next-btn" title="الحلقة التالية" style="display:none"><span>التالي</span>${ICON_NEXT}</button>`
    : '';

  const menu = menuHtml({ displayName, avatarUrl, sessionUser, loginUrl, logoutUrl });

  // رسالة الترجمة — بطاقة زجاجية مصقولة (الأيقونات تكفي بلا حروف)
  const subHint = `<div class="sub-hint" id="subHint">
  <div class="subhint-card">
    <div class="subhint-inner">
      <span class="subhint-ico">${MENU_SVGS.cc}</span>
      <span class="subhint-text">إذا لم تظهر الترجمة، ابحث عن زر <span class="hl-g">الترجمة</span> داخل المشغّل، أو افتح <span class="subhint-inline-ico">${MENU_SVGS.gearSm}</span> <span class="hl-c">الإعدادات</span> واختر الترجمة العربية</span>
    </div>
  </div>
</div>`;

  return `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<meta name="robots" content="noindex, nofollow"/>
<title>${esc(pageTitle)}</title>
${HEAD_ICONS}
<link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800;900&display=swap" rel="stylesheet"/>
<style>${stylesCss}</style>
</head>
<body style="${bgStyle}">
${menu}
<header class="site-header">
  <div class="header-inner">
    <button type="button" id="menuBtn" class="menu-btn" aria-label="القائمة" aria-expanded="false">${MENU_SVGS.hamburger}</button>
    ${LOGO_HTML}
  </div>
</header>
<div class="top-sheet">
${titlesBar}
${infoRowHtml}
<div class="server-row">
  <div class="ctrl-group">
    <div class="srv-dd" id="serverBar" aria-label="مصادر المشاهدة">
      <button type="button" id="srvDdBtn" class="srv-dd-btn" aria-expanded="false">
        <span class="srv-live" aria-hidden="true"></span>
        <span id="srvDdLabel">اختر السيرفر</span>
        ${CHEVRON_SVG}
      </button>
      <div class="srv-dd-menu" id="srvDdMenu" hidden></div>
    </div>
    ${seasonSelect}
  </div>
  <div class="ctrl-group">
    ${episodeSelect}
    ${prevEpBtn}
    ${nextEpBtn}
  </div>
</div>
</div>
<main>
  <div class="layout">
    <div class="player-area">
      <div class="player-wrap">
        <div class="status" id="status">
          <div class="spinner"></div>
          <span class="status-title">جاري تحميل المشغّل…</span>
        </div>
        <iframe id="player" allow="fullscreen;autoplay;encrypted-media" allowfullscreen title="4cima Player"></iframe>
      </div>
    </div>
    <div class="ad-under">
      <div class="ad-box ad-under-inner" id="adUnderVideoBox"><div id="adUnderVideo"></div></div>
    </div>
    ${subHint}
  </div>
  <div class="wide-banner">
    <div class="ad-box ad-wide-inner" id="adWideBox"><div id="adWide"></div></div>
  </div>
  <div class="native-banner">
    <div class="ad-box ad-native-inner" id="adNativeBox"><div id="adNative"></div></div>
  </div>
</main>
${FOOTER_HTML}
${STICKY_AD_HTML}
${SIDE_RAILS_HTML}
<script>window.__PLAYER__ = ${boot};</script>
<script>${clientScript()}</script>
<script>${adsScript(jsonForScript(STREAM_ADS))}</script>
</body>
</html>`;
}

// الصفحة الرئيسية للمشغّل — لاند بج بهوية الموقع الرئيسي
export function homePage() {
  return `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<meta name="robots" content="noindex, nofollow"/>
<title>4cima Player</title>
${HEAD_ICONS}
<link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800;900&display=swap" rel="stylesheet"/>
<style>
*{box-sizing:border-box;margin:0;padding:0}
body{min-height:100vh;display:flex;align-items:center;justify-content:center;padding:24px;font-family:Cairo,'DM Sans',system-ui,sans-serif;color:#e8e4dc;background:linear-gradient(rgba(2,6,23,.78),rgba(2,6,23,.92)),url('https://4cima.com/6565.jpg') center/cover no-repeat fixed #020617}
.card{max-width:460px;width:100%;padding:40px 32px;border-radius:16px;background:rgba(15,15,20,.75);border:1px solid rgba(255,255,255,.08);backdrop-filter:blur(16px);text-align:center;box-shadow:0 24px 48px -12px rgba(0,0,0,.5)}
.logo{display:inline-flex;align-items:center;font-size:44px;font-weight:900;letter-spacing:-.02em;margin-bottom:6px;direction:ltr}
.logo .l4{color:#dc2626;text-shadow:0 1px 0 #991b1b,0 2px 0 #7f1d1d,0 3px 0 #450a0a}
.logo .lc{color:#38bdf8;text-shadow:0 1px 0 #0284c7,0 2px 0 #0369a1,0 3px 0 #075985}.logo .li{color:#10b981;text-shadow:0 1px 0 #059669,0 2px 0 #047857,0 3px 0 #065f46}.logo .lm{color:#d946ef;text-shadow:0 1px 0 #c026d3,0 2px 0 #a21caf,0 3px 0 #86198f}.logo .la{color:#fbbf24;text-shadow:0 1px 0 #d97706,0 2px 0 #b45309,0 3px 0 #92400e}
.sub{font-size:14px;color:#b3afaa;margin-bottom:26px;line-height:1.8}
.btn{display:inline-flex;align-items:center;gap:8px;padding:12px 30px;border-radius:12px;background:linear-gradient(to left,#dc2626,#f59e0b);color:#020617;font-weight:900;font-size:15px;text-decoration:none;box-shadow:0 10px 15px -3px rgba(2,6,23,.35);transition:all .2s}
.btn:hover{filter:brightness(1.08);transform:translateY(-1px)}
.hint{margin-top:18px;font-size:11.5px;color:#71717a}
</style>
</head>
<body>
<div class="card">
  <div class="logo"><span class="l4">4</span><span class="lc">c</span><span class="li">i</span><span class="lm">m</span><span class="la">a</span></div>
  <p class="sub">مشغّل المشاهدة الرسمي — افتح أي فيلم أو مسلسل من الموقع الرئيسي وابدأ المشاهدة فورًا.</p>
  <a class="btn" href="https://4cima.com">تصفح 4cima.com</a>
  <p class="hint">الترجمة العربية متاحة داخل المشغّل من زر CC أو الإعدادات</p>
</div>
</body>
</html>`;
}

// صفحة الخطأ — نفس الهوية (ترجع Response كاملة 404)
export function errorPage({ slug, mediaType, message }) {
  const backUrl = mediaType === 'movie'
    ? `https://4cima.com/movies/${encodeURIComponent(slug)}`
    : mediaType === 'tv'
    ? `https://4cima.com/series/${encodeURIComponent(slug)}`
    : 'https://4cima.com';
  const body = `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<meta name="robots" content="noindex, nofollow"/>
<title>تعذر العثور على العنوان | 4cima</title>
${HEAD_ICONS}
<link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800;900&display=swap" rel="stylesheet"/>
<style>
*{box-sizing:border-box;margin:0;padding:0}
body{min-height:100vh;display:flex;align-items:center;justify-content:center;padding:24px;font-family:Cairo,'DM Sans',system-ui,sans-serif;color:#e8e4dc;text-align:center;background:linear-gradient(rgba(2,6,23,.8),rgba(2,6,23,.94)),url('https://4cima.com/6565.jpg') center/cover no-repeat fixed #020617}
.card{max-width:520px;width:100%;padding:40px 32px;border-radius:16px;background:rgba(15,15,20,.75);border:1px solid rgba(255,255,255,.08);backdrop-filter:blur(16px);box-shadow:0 24px 48px -12px rgba(0,0,0,.5)}
h1{font-size:21px;margin-bottom:12px}
p{font-size:13.5px;color:#b3afaa;margin-bottom:8px;line-height:1.9;word-break:break-word}
code{font-size:12px;color:#94a3b8;background:rgba(255,255,255,.06);padding:2px 8px;border-radius:6px}
.btn{display:inline-flex;align-items:center;margin-top:16px;padding:11px 28px;border-radius:12px;background:linear-gradient(to left,#dc2626,#f59e0b);color:#020617;font-weight:900;font-size:14px;text-decoration:none;box-shadow:0 10px 15px -3px rgba(2,6,23,.35)}
.btn:hover{filter:brightness(1.08)}
</style>
</head>
<body>
<div class="card">
  <h1>⚠ تعذر العثور على هذا العنوان</h1>
  <p>لم نتمكن من مطابقة «<code>${esc(slug)}</code>» في كتالوج 4cima.</p>
  <p>${esc(message || '')}</p>
  <a class="btn" href="${esc(backUrl)}">العودة إلى 4cima</a>
</div>
</body>
</html>`;
  return new Response(body, {
    status: 404,
    // نفس رؤوس HTML_HEADERS في index.js (نسخة معزولة لتفادي الاستيراد الدائري)
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'no-store',
      'Content-Security-Policy': "frame-ancestors 'self' https://4cima.com https://www.4cima.com https://*.4cima.stream",
    },
  });
}
