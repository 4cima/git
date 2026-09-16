require('dotenv').config({ path: '.env.local' });
const KEY = process.env.TMDB_API_KEY;
(async () => {
  const ids = [1764247, 1764246, 1764245, 1764242, 1764241];
  for (const id of ids) {
    try {
      const r = await fetch(`https://api.themoviedb.org/3/movie/${id}?api_key=${KEY}&language=en-US`);
      if (!r.ok) { console.log(id + ' HTTP=' + r.status); continue; }
      const j = await r.json();
      console.log(JSON.stringify({ id, title: j.title, release_date: j.release_date, vote_average: j.vote_average, status: j.status, adult: j.adult }));
    } catch (e) { console.log(id + ' ERR ' + e.message); }
    await new Promise(r => setTimeout(r, 300));
  }
})();
