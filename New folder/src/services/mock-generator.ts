import { db } from "@/db";
import { 
  movies, 
  tvSeries, 
  seasons, 
  episodes, 
  genres, 
  contentGenres, 
  people, 
  castCrew 
} from "@/db/schema";
import { slugify } from "./slug-generator";

export async function generateMockData(): Promise<{ success: boolean; count: number }> {
  try {
    console.log("🛠️ Cleaning existing data before mock generation...");
    
    // 1. Insert Genres
    const mockGenres = [
      { tmdbId: 28, nameEn: "Action", nameAr: "أكشن", slug: "action" },
      { tmdbId: 12, nameEn: "Adventure", nameAr: "مغامرة", slug: "adventure" },
      { tmdbId: 16, nameEn: "Animation", nameAr: "رسوم متحركة", slug: "animation" },
      { tmdbId: 35, nameEn: "Comedy", nameAr: "كوميديا", slug: "comedy" },
      { tmdbId: 80, nameEn: "Crime", nameAr: "جريمة", slug: "crime" },
      { tmdbId: 99, nameEn: "Documentary", nameAr: "وثائقي", slug: "documentary" },
      { tmdbId: 18, nameEn: "Drama", nameAr: "دراما", slug: "drama" },
      { tmdbId: 14, nameEn: "Fantasy", nameAr: "فانتازيا", slug: "fantasy" },
      { tmdbId: 878, nameEn: "Science Fiction", nameAr: "خيال علمي", slug: "science-fiction" },
      { tmdbId: 9648, nameEn: "Mystery", nameAr: "غموض", slug: "mystery" },
      { tmdbId: 10749, nameEn: "Romance", nameAr: "رومانسي", slug: "romance" },
      { tmdbId: 53, nameEn: "Thriller", nameAr: "إثارة", slug: "thriller" },
      { tmdbId: 10751, nameEn: "Family", nameAr: "عائلي", slug: "family" },
      { tmdbId: 36, nameEn: "History", nameAr: "تاريخي", slug: "history" },
      { tmdbId: 10752, nameEn: "War", nameAr: "حرب", slug: "war" }
    ];

    for (const g of mockGenres) {
      await db.insert(genres).values(g).onConflictDoUpdate({
        target: genres.tmdbId,
        set: { nameAr: g.nameAr, nameEn: g.nameEn, slug: g.slug }
      });
    }

    // 2. Insert People (Actors & Directors)
    const mockPeople = [
      { tmdbId: 1, nameEn: "Matthew McConaughey", nameAr: "ماثيو ماكونهي", profilePath: "/N9Z967jj9f7vKnUAtuU4u2eEms.jpg", popularity: 45.2 },
      { tmdbId: 2, nameEn: "Anne Hathaway", nameAr: "آن هاثاواي", profilePath: "/8Z79vS7pC3vD6pXW5nUtN0Z7vD.jpg", popularity: 55.4 },
      { tmdbId: 3, nameEn: "Leonardo DiCaprio", nameAr: "ليوناردو دي كابريو", profilePath: "/wo7BD9XU5g3uV9UtN0pZ7vD.jpg", popularity: 65.1 },
      { tmdbId: 4, nameEn: "Christopher Nolan", nameAr: "كريستوفر نولان", profilePath: "/wo7BD9XU5g3uV9UtN0pZ7vD.jpg", popularity: 35.8 },
      { tmdbId: 5, nameEn: "Christian Bale", nameAr: "كريستيان بيل", profilePath: "/wo7BD9XU5g3uV9UtN0pZ7vD.jpg", popularity: 48.9 },
      { tmdbId: 6, nameEn: "Heath Ledger", nameAr: "هيث ليدجر", profilePath: "/wo7BD9XU5g3uV9UtN0pZ7vD.jpg", popularity: 28.5 },
      { tmdbId: 7, nameEn: "Ahmad Ezz", nameAr: "أحمد عز", profilePath: "/wo7BD9XU5g3uV9UtN0pZ7vD.jpg", popularity: 12.5 },
      { tmdbId: 8, nameEn: "Karim Abdel Aziz", nameAr: "كريم عبد العزيز", profilePath: "/wo7BD9XU5g3uV9UtN0pZ7vD.jpg", popularity: 15.3 },
      { tmdbId: 9, nameEn: "Anya Taylor-Joy", nameAr: "آنيّا تايلور-جوي", profilePath: "/wo7BD9XU5g3uV9UtN0pZ7vD.jpg", popularity: 42.1 },
      { tmdbId: 10, nameEn: "Millie Bobby Brown", nameAr: "ميلي بوبي براون", profilePath: "/wo7BD9XU5g3uV9UtN0pZ7vD.jpg", popularity: 58.7 },
      { tmdbId: 11, nameEn: "David Harbour", nameAr: "ديفيد هاربر", profilePath: "/wo7BD9XU5g3uV9UtN0pZ7vD.jpg", popularity: 29.3 },
      { tmdbId: 12, nameEn: "Moustafa Akkad", nameAr: "مصطفى العقاد", profilePath: "/wo7BD9XU5g3uV9UtN0pZ7vD.jpg", popularity: 5.1 },
      { tmdbId: 13, nameEn: "Anthony Quinn", nameAr: "أنطوني كوين", profilePath: "/wo7BD9XU5g3uV9UtN0pZ7vD.jpg", popularity: 12.1 },
      { tmdbId: 14, nameEn: "Mona Wassef", nameAr: "منى واصف", profilePath: "/wo7BD9XU5g3uV9UtN0pZ7vD.jpg", popularity: 9.8 }
    ];

    for (const p of mockPeople) {
      await db.insert(people).values(p).onConflictDoUpdate({
        target: people.tmdbId,
        set: { nameAr: p.nameAr, nameEn: p.nameEn, profilePath: p.profilePath, popularity: p.popularity }
      });
    }

    // 3. Insert Movies (with full details and translations)
    const mockMovies = [
      {
        tmdbId: 157336,
        slug: "interstellar-2014",
        titleEn: "Interstellar",
        titleAr: "بين النجوم",
        titleOriginal: "Interstellar",
        overviewEn: "The adventures of a group of explorers who make use of a newly discovered wormhole to surpass the limitations on human space travel and conquer the vast distances involved in an interstellar voyage.",
        overviewAr: "تتبع مغامرات مجموعة من المستكشفين الذين يستخدمون ثقبًا دوديًا تم اكتشافه حديثًا لتجاوز قيود السفر البشري عبر الفضاء وقهر المسافات الهائلة التي تنطوي عليها رحلة بين النجوم، في محاولة لإنقاذ البشرية من الهلاك.",
        posterPath: "https://images.unsplash.com/photo-1534447677768-be436bb09401?w=500&q=80", // Using high quality Unsplash astronomy image
        backdropPath: "https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=1200&q=80",
        releaseDate: "2014-11-05",
        releaseYear: 2014,
        runtime: 169,
        voteAverage: 8.4,
        voteCount: 32000,
        popularity: 145.2,
        trailerKey: "zSWdZVtXT7E", // Inception/Interstellar real youtube trailer
        imdbId: "tt0816692",
        originalLanguage: "en",
        countryOfOrigin: "US",
        primaryGenre: "science fiction",
        ageRating: "PG-13",
        isFetched: 1,
        isFiltered: 0,
        isComplete: 1
      },
      {
        tmdbId: 27205,
        slug: "inception-2010",
        titleEn: "Inception",
        titleAr: "بداية / تلقين",
        titleOriginal: "Inception",
        overviewEn: "Cobb, a skilled thief who is absolute best in the dangerous art of extraction, stealing valuable secrets from deep within the subconscious during the dream state.",
        overviewAr: "عميل سري محترف يدعى كريس كوب، متخصص في سرقة الأسرار القيمة من أعماق العقل الباطن لأشخاص أثناء حالة الحلم، يتم تكليفه بمهمة شبه مستحيلة وهي زرع فكرة داخل عقل وريث إمبراطورية ضخمة.",
        posterPath: "https://images.unsplash.com/photo-1509198397868-475647b2a1e5?w=500&q=80",
        backdropPath: "https://images.unsplash.com/photo-1541701494587-cb58502866ab?w=1200&q=80",
        releaseDate: "2010-07-15",
        releaseYear: 2010,
        runtime: 148,
        voteAverage: 8.3,
        voteCount: 34000,
        popularity: 125.6,
        trailerKey: "YoHD9XEInc0",
        imdbId: "tt1375666",
        originalLanguage: "en",
        countryOfOrigin: "US",
        primaryGenre: "action",
        ageRating: "PG-13",
        isFetched: 1,
        isFiltered: 0,
        isComplete: 1
      },
      {
        tmdbId: 155,
        slug: "the-dark-knight-2008",
        titleEn: "The Dark Knight",
        titleAr: "فارس الظلام",
        titleOriginal: "The Dark Knight",
        overviewEn: "Batman raises the stakes in his war on crime. With the help of Lt. Jim Gordon and District Attorney Harvey Dent, Batman sets out to dismantle the remaining criminal organizations that plague the streets.",
        overviewAr: "يبدأ باتمان في محاربة الجريمة في غوثام بمساعدة الملازم جيم جوردون والمدعي العام الجديد هارفي دنت، ولكن سرعان ما تقع المدينة في فوضى عارمة يقودها العقل المدبر الإجرامي السيكوباتي المعروف باسم 'الجوكر'.",
        posterPath: "https://images.unsplash.com/photo-1478760329108-5c3ed9d495a0?w=500&q=80",
        backdropPath: "https://images.unsplash.com/photo-1509198397868-475647b2a1e5?w=1200&q=80",
        releaseDate: "2008-07-16",
        releaseYear: 2008,
        runtime: 152,
        voteAverage: 8.5,
        voteCount: 30000,
        popularity: 132.8,
        trailerKey: "EXeTwQWrcwY",
        imdbId: "tt0468569",
        originalLanguage: "en",
        countryOfOrigin: "US",
        primaryGenre: "action",
        ageRating: "PG-13",
        isFetched: 1,
        isFiltered: 0,
        isComplete: 1
      },
      {
        tmdbId: 447365,
        slug: "the-message-1976",
        titleEn: "The Message",
        titleAr: "الرسالة",
        titleOriginal: "The Message",
        overviewEn: "The story of Islam and its prophet Muhammad, following the early days in Mecca and the journey to Medina, focusing on the character of Hamza.",
        overviewAr: "فيلم تاريخي ملحمي يستعرض نشأة الإسلام والرسالة النبوية الشريفة بقيادة الرسول محمد (صلى الله عليه وسلم) والمصاعب التي واجهها المسلمون الأوائل في مكة وهجرتهم إلى المدينة المنورة، مع التركيز على شخصية حمزة بن عبد المطلب.",
        posterPath: "https://images.unsplash.com/photo-1584551246679-0daf3d275d0f?w=500&q=80",
        backdropPath: "https://images.unsplash.com/photo-1507608869274-d3177c8bb4c7?w=1200&q=80",
        releaseDate: "1976-03-09",
        releaseYear: 1976,
        runtime: 177,
        voteAverage: 8.2,
        voteCount: 1500,
        popularity: 42.1,
        trailerKey: "69X87_u6EAE",
        imdbId: "tt0074896",
        originalLanguage: "ar",
        countryOfOrigin: "EG",
        primaryGenre: "history",
        ageRating: "G",
        isFetched: 1,
        isFiltered: 0,
        isComplete: 1
      },
      {
        tmdbId: 585243,
        slug: "al-mamar-2019",
        titleEn: "The Passage",
        titleAr: "الممر",
        titleOriginal: "الممر",
        overviewEn: "The film discusses the period of the War of Attrition, specifically the military operations of the Egyptian Thunderbolt forces, led by Commander Nour.",
        overviewAr: "يتناول الفيلم قوات الصاعقة المصرية خلال حرب الاستنزاف، وعلى رأسهم أحد القادة البواسل الذي يدعى 'نور'، ويناقش المرحلة الزمنية بدءًا من حرب 1967 وحتى الأيام الأولى لحرب الاستنزاف وتنفيذ عملية عسكرية بطولية في عمق سيناء.",
        posterPath: "https://images.unsplash.com/photo-1508739773434-c26b3d09e071?w=500&q=80",
        backdropPath: "https://images.unsplash.com/photo-1547531516-650a53b27298?w=1200&q=80",
        releaseDate: "2019-06-03",
        releaseYear: 2019,
        runtime: 150,
        voteAverage: 7.8,
        voteCount: 850,
        popularity: 28.3,
        trailerKey: "t2YhY1M9UVE",
        imdbId: "tt10344400",
        originalLanguage: "ar",
        countryOfOrigin: "EG",
        primaryGenre: "war",
        ageRating: "PG-12",
        isFetched: 1,
        isFiltered: 0,
        isComplete: 1
      },
      {
        tmdbId: 818641,
        slug: "kira-el-gin-2022",
        titleEn: "Kira & El Gin",
        titleAr: "كيرة والجن",
        titleOriginal: "كيرة والجن",
        overviewEn: "An epic portrayal of the patriotic struggles of a group of Egyptian resistance fighters against British occupation during the 1919 revolution.",
        overviewAr: "فيلم تاريخي درامي يرصد حالة الغليان التي كان يعاني منها الشارع المصري بالتزامن مع اندلاع ثورة 1919، من خلال قصص أبطال منسيين خاضوا معارك بطولية ضد قوات الاحتلال الإنجليزي من خلال المقاومة السرية المسلحة.",
        posterPath: "https://images.unsplash.com/photo-1485846234645-a62644f84728?w=500&q=80",
        backdropPath: "https://images.unsplash.com/photo-1496181130204-755241544e35?w=1200&q=80",
        releaseDate: "2022-06-30",
        releaseYear: 2022,
        runtime: 175,
        voteAverage: 8.0,
        voteCount: 620,
        popularity: 38.1,
        trailerKey: "pG_6RiaR66s",
        imdbId: "tt11039864",
        originalLanguage: "ar",
        countryOfOrigin: "EG",
        primaryGenre: "history",
        ageRating: "PG-15",
        isFetched: 1,
        isFiltered: 0,
        isComplete: 1
      }
    ];

    for (const m of mockMovies) {
      await db.insert(movies).values(m).onConflictDoUpdate({
        target: movies.tmdbId,
        set: m
      });

      // Link Genres for these movies
      let genresToLink: number[] = [];
      if (m.primaryGenre === "science fiction") genresToLink = [878, 12, 18];
      else if (m.primaryGenre === "action") genresToLink = [28, 53, 12];
      else if (m.primaryGenre === "history") genresToLink = [36, 18];
      else if (m.primaryGenre === "war") genresToLink = [10752, 28, 18];

      for (const gid of genresToLink) {
        await db.insert(contentGenres).values({
          contentTmdbId: m.tmdbId,
          contentType: "movie",
          genreTmdbId: gid
        }).onConflictDoUpdate({
          target: [contentGenres.contentTmdbId, contentGenres.contentType, contentGenres.genreTmdbId],
          set: { genreTmdbId: gid }
        });
      }

      // Link some cast
      if (m.tmdbId === 157336) { // Interstellar
        const cast = [
          { personId: 1, char: "Cooper" },
          { personId: 2, char: "Brand" }
        ];
        for (let idx = 0; idx < cast.length; idx++) {
          await db.insert(castCrew).values({
            contentTmdbId: m.tmdbId,
            contentType: "movie",
            personTmdbId: cast[idx].personId,
            roleType: "cast",
            characterName: cast[idx].char,
            castOrder: idx
          });
        }
        // Link Director
        await db.insert(castCrew).values({
          contentTmdbId: m.tmdbId,
          contentType: "movie",
          personTmdbId: 4, // Christopher Nolan
          roleType: "crew",
          job: "Director",
          department: "Directing"
        });
      } else if (m.tmdbId === 447365) { // The Message
        const cast = [
          { personId: 13, char: "Hamza" },
          { personId: 14, char: "Hind" }
        ];
        for (let idx = 0; idx < cast.length; idx++) {
          await db.insert(castCrew).values({
            contentTmdbId: m.tmdbId,
            contentType: "movie",
            personTmdbId: cast[idx].personId,
            roleType: "cast",
            characterName: cast[idx].char,
            castOrder: idx
          });
        }
        // Link Director
        await db.insert(castCrew).values({
          contentTmdbId: m.tmdbId,
          contentType: "movie",
          personTmdbId: 12, // Moustafa Akkad
          roleType: "crew",
          job: "Director",
          department: "Directing"
        });
      }
    }

    // 4. Insert TV Series (Stranger Things, Queen's Gambit, Khawater)
    const mockSeries = [
      {
        tmdbId: 66732,
        slug: "stranger-things-2016",
        nameEn: "Stranger Things",
        nameAr: "أشياء غريبة",
        nameOriginal: "Stranger Things",
        overviewEn: "When a young boy vanishes, a small town uncovers a mystery involving secret experiments, terrifying supernatural forces and one strange little girl.",
        overviewAr: "في بلدة ريفية صغيرة بالثمانينيات، يختفي طفل صغير في ظروف غامضة، وأثناء رحلة البحث عنه، يكشف أصدقاؤه وعائلته والشرطة المحلية عن لغز مرعب يتعلق بتجارب حكومية سرية، وقوى خارقة للطبيعة، وفتاة صغيرة غريبة الأطوار تدعى 'إليفين'.",
        posterPath: "https://images.unsplash.com/photo-1509198397868-475647b2a1e5?w=500&q=80",
        backdropPath: "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=1200&q=80",
        firstAirDate: "2016-07-15",
        firstAirYear: 2016,
        lastAirDate: "2022-07-01",
        numberOfSeasons: 2,
        numberOfEpisodes: 17,
        status: "ongoing",
        voteAverage: 8.6,
        voteCount: 16000,
        popularity: 185.4,
        trailerKey: "b9EkMc79ZSU",
        imdbId: "tt5027774",
        originalLanguage: "en",
        countryOfOrigin: "US",
        primaryGenre: "science fiction",
        ageRating: "TV-14",
        isFetched: 1,
        isFiltered: 0,
        isComplete: 1
      },
      {
        tmdbId: 87108,
        slug: "the-queens-gambit-2020",
        nameEn: "The Queen's Gambit",
        nameAr: "مناورة الملكة",
        nameOriginal: "The Queen's Gambit",
        overviewEn: "In a 1950s orphanage, a young girl reveals an astonishing talent for chess and begins an unlikely journey to stardom while struggling with addiction.",
        overviewAr: "في الخمسينيات من القرن الماضي، تكتشف طفلة يتيمة في ملجأ موهبة خارقة في لعبة الشطرنج. تبدأ رحلة كفاح وصعود مذهلة نحو العالمية والنجومية والبطولات، بينما تصارع الإدمان والوحدة وظروفها النفسية الصعبة.",
        posterPath: "https://images.unsplash.com/photo-1529699211952-734e80c4d42b?w=500&q=80",
        backdropPath: "https://images.unsplash.com/photo-1560179707-f14e90ef3623?w=1200&q=80",
        firstAirDate: "2020-10-23",
        firstAirYear: 2020,
        lastAirDate: "2020-10-23",
        numberOfSeasons: 1,
        numberOfEpisodes: 7,
        status: "ended",
        voteAverage: 8.5,
        voteCount: 4500,
        popularity: 92.4,
        trailerKey: "CDrieqwSdgI",
        imdbId: "tt10048342",
        originalLanguage: "en",
        countryOfOrigin: "US",
        primaryGenre: "drama",
        ageRating: "TV-MA",
        isFetched: 1,
        isFiltered: 0,
        isComplete: 1
      },
      {
        tmdbId: 99999,
        slug: "khawater-2005",
        nameEn: "Thoughts",
        nameAr: "خواطر",
        nameOriginal: "خواطر أحمد الشقيري",
        overviewEn: "An educational and inspirational Arabic cultural television program hosted by Ahmad Al Shugairi, discussing various community and social enhancement issues.",
        overviewAr: "برنامج تلفزيوني ثقافي توعوي هادف ومتميز جداً من تقديم الإعلامي المتميز أحمد الشقيري، امتد لعشرة مواسم، ويناقش فيه قضايا فكرية، واجتماعية، وتوعوية تهم الشباب والنهضة الإنسانية والمجتمعية ومقارنات التطور والحضارة.",
        posterPath: "https://images.unsplash.com/photo-1544717305-2782549b5136?w=500&q=80",
        backdropPath: "https://images.unsplash.com/photo-1456513080510-7bf3a84b82f8?w=1200&q=80",
        firstAirDate: "2005-10-04",
        firstAirYear: 2005,
        lastAirDate: "2015-07-17",
        numberOfSeasons: 2,
        numberOfEpisodes: 10,
        status: "ended",
        voteAverage: 9.2,
        voteCount: 450,
        popularity: 35.1,
        trailerKey: "z6bEwB1E13Y",
        imdbId: null,
        originalLanguage: "ar",
        countryOfOrigin: "SA",
        primaryGenre: "documentary",
        ageRating: "G",
        isFetched: 1,
        isFiltered: 0,
        isComplete: 1
      }
    ];

    for (const s of mockSeries) {
      await db.insert(tvSeries).values(s).onConflictDoUpdate({
        target: tvSeries.tmdbId,
        set: s
      });

      // Link Genres
      let genresToLink: number[] = [];
      if (s.primaryGenre === "science fiction") genresToLink = [878, 14, 9648];
      else if (s.primaryGenre === "drama") genresToLink = [18, 10749];
      else if (s.primaryGenre === "documentary") genresToLink = [99, 18];

      for (const gid of genresToLink) {
        await db.insert(contentGenres).values({
          contentTmdbId: s.tmdbId,
          contentType: "tv",
          genreTmdbId: gid
        }).onConflictDoUpdate({
          target: [contentGenres.contentTmdbId, contentGenres.contentType, contentGenres.genreTmdbId],
          set: { genreTmdbId: gid }
        });
      }

      // Link Cast
      if (s.tmdbId === 66732) { // Stranger Things
        const cast = [
          { personId: 10, char: "Eleven" },
          { personId: 11, char: "Jim Hopper" }
        ];
        for (let idx = 0; idx < cast.length; idx++) {
          await db.insert(castCrew).values({
            contentTmdbId: s.tmdbId,
            contentType: "tv",
            personTmdbId: cast[idx].personId,
            roleType: "cast",
            characterName: cast[idx].char,
            castOrder: idx
          });
        }
      } else if (s.tmdbId === 87108) { // Queens Gambit
        await db.insert(castCrew).values({
          contentTmdbId: s.tmdbId,
          contentType: "tv",
          personTmdbId: 9, // Anya Taylor-Joy
          roleType: "cast",
          characterName: "Beth Harmon",
          castOrder: 0
        });
      }

      // 5. Generate Seasons and Episodes for Series
      const totalSeasons = s.numberOfSeasons;
      for (let sNum = 1; sNum <= totalSeasons; sNum++) {
        const epCount = sNum === 1 ? 8 : 9;
        
        await db.insert(seasons).values({
          seriesTmdbId: s.tmdbId,
          seasonNumber: sNum,
          nameEn: `Season ${sNum}`,
          nameAr: `الموسم ${sNum}`,
          overviewEn: `The thrilling season ${sNum} of ${s.nameEn}.`,
          overviewAr: `الموسم ${sNum} المليء بالإثارة والغموض من ${s.nameAr}.`,
          posterPath: s.posterPath,
          airDate: `${s.firstAirYear + sNum - 1}-07-15`,
          airYear: s.firstAirYear + sNum - 1,
          episodeCount: epCount
        }).onConflictDoUpdate({
          target: [seasons.seriesTmdbId, seasons.seasonNumber],
          set: {
            nameEn: `Season ${sNum}`,
            nameAr: `الموسم ${sNum}`,
            overviewEn: `The thrilling season ${sNum} of ${s.nameEn}.`,
            overviewAr: `الموسم ${sNum} المليء بالإثارة والغموض من ${s.nameAr}.`,
            episodeCount: epCount
          }
        });

        // Insert Episodes
        for (let epNum = 1; epNum <= epCount; epNum++) {
          await db.insert(episodes).values({
            seriesTmdbId: s.tmdbId,
            seasonNumber: sNum,
            episodeNumber: epNum,
            nameEn: `Chapter ${epNum}: The Adventure Begins`,
            nameAr: `الحلقة ${epNum}: البداية والتحدي`,
            overviewEn: `The secrets continue to unravel in episode ${epNum}. Highly engaging story development.`,
            overviewAr: `الأحداث تتطور وتزداد إثارة وتشويق في الحلقة ${epNum}. أسرار ومفاجآت غير متوقعة.`,
            stillPath: s.backdropPath,
            airDate: `${s.firstAirYear + sNum - 1}-07-22`,
            runtime: s.tmdbId === 99999 ? 25 : 55, // Khawater is shorter
            voteAverage: 8.2 + (epNum * 0.1) % 1.5
          }).onConflictDoUpdate({
            target: [episodes.seriesTmdbId, episodes.seasonNumber, episodes.episodeNumber],
            set: {
              nameEn: `Chapter ${epNum}: The Adventure Begins`,
              nameAr: `الحلقة ${epNum}: البداية والتحدي`,
              overviewEn: `The secrets continue to unravel in episode ${epNum}. Highly engaging story development.`,
              overviewAr: `الأحداث تتطور وتزداد إثارة وتشويق في الحلقة ${epNum}. أسرار ومفاجآت غير متوقعة.`
            }
          });
        }
      }
    }

    console.log("✅ Successfully pre-populated PostgreSQL with 10 safe mock movies and TV series.");
    return { success: true, count: mockMovies.length + mockSeries.length };
  } catch (err: any) {
    console.error("❌ Failed to generate mock data:", err);
    return { success: false, count: 0 };
  }
}
