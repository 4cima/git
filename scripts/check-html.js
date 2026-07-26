async function test() {
  try {
    const res = await fetch('http://localhost:3000');
    const text = await res.text();
    const matches = text.match(/<img[^>]*src="([^"]*)"[^>]*>/g);
    if (matches) {
      console.log('--- FOUND IMAGES ---');
      console.log(matches.slice(0, 10).join('\n'));
    } else {
      console.log('No matches');
    }
  } catch (err) {
    console.error('Fetch error:', err);
  }
}
test();
