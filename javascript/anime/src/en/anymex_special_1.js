const mangayomiSources = [{
    "name": "AnymeX Special #1",
    "lang": "en",
    "baseUrl": "https://xprime.tv",
    "apiUrl": "",
    "iconUrl":
      "https://raw.githubusercontent.com/RyanYuuki/AnymeX/main/assets/images/logo.png",
    "typeSource": "single",
    "itemType": 1,
    "version": "0.0.4",
    "pkgPath": "anime/src/en/anymex_special_1.js"
  }];

class DefaultExtension extends MProvider {
  constructor() {
    super();
    this.client = new Client();
    this.preferDub = true; // Default preference for dub
  }

  getHeaders(url) {
    throw new Error("getHeaders not implemented");
  }

  mapToManga(dataArr, isMovie, isDub = false) {
    var type = isMovie ? "movie" : "tv";
    return dataArr.map((e) => {
      const baseName = e.title ?? e.name;
      const dubSuffix = isDub ? " (Dub)" : "";
      
      return {
        name: baseName + dubSuffix,
        link: `https://tmdb.hexa.watch/api/tmdb/${type}/${e.id}?dub=${isDub}`,
        imageUrl:
          "https://image.tmdb.org/t/p/w500" +
          (e.poster_path ?? e.backdrop_path),
        description: e.overview,
        isDub: isDub,
      };
    });
  }

  async requestSearch(query, isMovie, includeDub = true) {
    const type = isMovie ? "movie" : "tv";
    const baseUrl = `https://tmdb.hexa.watch/api/tmdb/search/${type}?language=en-US&query=${encodeURIComponent(
      query
    )}&page=1&include_adult=false`;

    const resp = await this.client.get(baseUrl);
    const data = JSON.parse(resp.body);
    
    const results = [];
    
    if (data.results) {
      // Add dub versions first if preference is set
      if (includeDub && this.preferDub) {
        const dubResults = this.mapToManga(data.results.slice(0, 10), isMovie, true);
        results.push(...dubResults);
      }
      
      // Add sub/original versions
      const subResults = this.mapToManga(data.results, isMovie, false);
      results.push(...subResults);
    }
    
    return { results };
  }

  async getPopular(page) {
    try {
      // Get popular movies and TV shows
      const [movieResp, tvResp] = await Promise.all([
        this.client.get(`https://tmdb.hexa.watch/api/tmdb/movie/popular?language=en-US&page=${page}`),
        this.client.get(`https://tmdb.hexa.watch/api/tmdb/tv/popular?language=en-US&page=${page}`)
      ]);

      const movieData = JSON.parse(movieResp.body);
      const tvData = JSON.parse(tvResp.body);

      const results = [];
      
      // Add dub versions first for popular anime/shows
      if (this.preferDub) {
        const movieDubs = this.mapToManga(movieData.results?.slice(0, 10) || [], true, true);
        const tvDubs = this.mapToManga(tvData.results?.slice(0, 10) || [], false, true);
        results.push(...movieDubs, ...tvDubs);
      }
      
      // Add original versions
      const movies = this.mapToManga(movieData.results || [], true, false);
      const tvShows = this.mapToManga(tvData.results || [], false, false);
      
      // Mix results
      const maxLength = Math.max(movies.length, tvShows.length);
      for (let i = 0; i < maxLength; i++) {
        if (i < movies.length) results.push(movies[i]);
        if (i < tvShows.length) results.push(tvShows[i]);
      }

      return {
        list: results,
        hasNextPage: movieData.page < movieData.total_pages || tvData.page < tvData.total_pages,
      };
    } catch (error) {
      console.error("Popular error:", error);
      return { list: [], hasNextPage: false };
    }
  }

  get supportsLatest() {
    return true;
  }

  async getLatestUpdates(page) {
    try {
      // Get latest/now playing content
      const [movieResp, tvResp] = await Promise.all([
        this.client.get(`https://tmdb.hexa.watch/api/tmdb/movie/now_playing?language=en-US&page=${page}`),
        this.client.get(`https://tmdb.hexa.watch/api/tmdb/tv/airing_today?language=en-US&page=${page}`)
      ]);

      const movieData = JSON.parse(movieResp.body);
      const tvData = JSON.parse(tvResp.body);

      const results = [];
      
      // Prioritize dub versions for latest content
      if (this.preferDub) {
        const movieDubs = this.mapToManga(movieData.results?.slice(0, 8) || [], true, true);
        const tvDubs = this.mapToManga(tvData.results?.slice(0, 8) || [], false, true);
        results.push(...movieDubs, ...tvDubs);
      }
      
      const movies = this.mapToManga(movieData.results || [], true, false);
      const tvShows = this.mapToManga(tvData.results || [], false, false);
      
      // Mix results
      const maxLength = Math.max(movies.length, tvShows.length);
      for (let i = 0; i < maxLength; i++) {
        if (i < movies.length) results.push(movies[i]);
        if (i < tvShows.length) results.push(tvShows[i]);
      }

      return {
        list: results,
        hasNextPage: movieData.page < movieData.total_pages || tvData.page < tvData.total_pages,
      };
    } catch (error) {
      console.error("Latest updates error:", error);
      return { list: [], hasNextPage: false };
    }
  }

  async search(query, page = 1, filters) {
    try {
      const cleanedQuery = query.replace(/\bseasons?\b/gi, "").trim();

      const [movieData, seriesData] = await Promise.all([
        this.requestSearch(cleanedQuery, true, true),
        this.requestSearch(cleanedQuery, false, true),
      ]);

      const movies = movieData.results || [];
      const series = seriesData.results || [];

      const maxLength = Math.max(movies.length, series.length);
      const mixedResults = [];

      for (let i = 0; i < maxLength; i++) {
        if (i < movies.length) mixedResults.push(movies[i]);
        if (i < series.length) mixedResults.push(series[i]);
      }

      return {
        list: mixedResults,
        hasNextPage: false,
      };
    } catch (error) {
      console.error("Search error:", error);
      throw error;
    }
  }

  async getDetail(url) {
    const resp = await this.client.get(url);
    const parsedData = JSON.parse(resp.body);
    const isMovie = url.includes("movie");
    const isDub = url.includes("dub=true");

    const baseName = parsedData.name ?? parsedData.title;
    const name = isDub ? `${baseName} (Dub)` : baseName;
    const chapters = [];

    const idMatch = url.match(/(?:movie|tv)\/(\d+)/);
    const tmdbId = idMatch ? idMatch[1] : null;
    const imdbId = parsedData.imdb_id;

    if (!tmdbId) throw new Error("Invalid TMDB ID in URL");

    if (isMovie) {
      const releaseDate = parsedData.release_date;
      chapters.push({
        name: isDub ? "Movie (Dub)" : "Movie",
        url: `movie/${baseName}/${releaseDate.split("-")[0]}/${tmdbId}/${imdbId}${isDub ? '/dub' : ''}`,
      });
    } else {
      const seasons = parsedData.seasons || [];

      for (const season of seasons) {
        if (season.season_number === 0) continue;

        const episodeCount = season.episode_count;

        for (let ep = 1; ep <= episodeCount; ep++) {
          const episodeName = isDub ? `S${season.season_number} · E${ep} (Dub)` : `S${season.season_number} · E${ep}`;
          chapters.push({
            name: episodeName,
            url: `tv/${baseName}/${
              season.air_date.split("-")[0]
            }/${tmdbId}/${imdbId}/${season.season_number}/${ep}${isDub ? '/dub' : ''}`,
          });
        }
      }
    }

    return {
      name,
      chapters: chapters.reverse(),
      isDub: isDub,
    };
  }

  // For novel html content
  async getHtmlContent(url) {
    throw new Error("getHtmlContent not implemented");
  }

  // Clean html up for reader
  async cleanHtmlContent(html) {
    throw new Error("cleanHtmlContent not implemented");
  }

  async getVideoList(url) {
    const splitParts = url.split("/");
    const isMovie = url.includes("movie");
    const isDub = url.includes("/dub") || splitParts.includes("dub");

    const title = decodeURIComponent(splitParts[1]);
    const releaseDate = splitParts[2];
    const id = splitParts[3];
    const imdbId = splitParts[4];

    let baseUrl = `https://backend.xprime.tv/primebox?name=${encodeURIComponent(
      title
    )}&fallback_year=${releaseDate}&id=${id}&imdb=${imdbId}`;

    // Add dub parameter to API calls
    if (isDub) {
      baseUrl += `&dub=true&lang=en`;
    }

    if (!isMovie) {
      const season = isDub ? splitParts[5] : splitParts[5];
      const episode = isDub ? splitParts[6] : splitParts[6];
      baseUrl += `&season=${season}&episode=${episode}`;
    }

    const [primeboxResp, primenetResp, phoenixResp] = await Promise.all([
      this.client.get(baseUrl),
      this.client.get(baseUrl.replace("primebox", "primenet")),
      this.client.get(baseUrl.replace("primebox", "phoenix")),
    ]);

    const result = [];

    try {
      const primeboxData = JSON.parse(primeboxResp.body);
      const primeboxStreams = Object.entries(primeboxData.streams || {}).map(
        ([quality, url]) => ({
          url,
          quality: `Primebox - ${quality}${isDub ? ' (Dub)' : ''}`,
          originalUrl: url,
          subtitles:
            primeboxData.subtitles?.map((sub) => ({
              file: sub.file,
              label: sub.label,
            })) || [],
          isDub: isDub,
        })
      );
      result.push(...primeboxStreams);
    } catch (e) {
      console.warn("Failed to parse Primebox response:", e);
    }

    try {
      const primenetData = JSON.parse(primenetResp.body);
      if (primenetData.url) {
        result.push({
          url: primenetData.url,
          headers: {
            Referer: "https://xprime.tv",
            Origin: "https://xprime.tv",
          },
          quality: `Primenet - Auto${isDub ? ' (Dub)' : ''}`,
          originalUrl: primenetData.url,
          subtitles: [],
          isDub: isDub,
        });
      }
    } catch (e) {
      console.warn("Failed to parse Primenet response:", e);
    }

    try {
      const phoenixData = JSON.parse(phoenixResp.body);
      if (phoenixData.url) {
        result.push({
          url: phoenixData.url,
          headers: {
            Referer: "https://xprime.tv",
            Origin: "https://xprime.tv",
          },
          quality: `Phoenix - Auto${isDub ? ' (Dub)' : ''}`,
          originalUrl: phoenixData.url,
          subtitles:
            phoenixData.subs?.length > 0 ? phoenixData.subtitles || [] : [],
          isDub: isDub,
        });
      }
    } catch (e) {
      console.warn("Failed to parse Phoenix response:", e);
    }

    // If no dub results found but dub was requested, try sub version as fallback
    if (isDub && result.length === 0) {
      console.warn("No dub version found, falling back to sub");
      return this.getVideoList(url.replace("/dub", ""));
    }

    return result;
  }

  // For manga chapter pages
  async getPageList(url) {
    throw new Error("getPageList not implemented");
  }

  getFilterList() {
    return [
      {
        type: "select",
        name: "Audio Language",
        key: "audio_lang",
        values: [
          { key: "dub", value: "English Dub" },
          { key: "sub", value: "Japanese Sub" },
          { key: "both", value: "Both" }
        ],
        defaultValue: "dub"
      }
    ];
  }

  getSourcePreferences() {
    return [
      {
        key: "prefer_dub",
        title: "Prefer Dubbed Content",
        summary: "Show dubbed versions first when available",
        defaultValue: true,
        type: "boolean"
      },
      {
        key: "dub_fallback", 
        title: "Sub Fallback",
        summary: "Show sub version if dub not available",
        defaultValue: true,
        type: "boolean"
      }
    ];
  }
}
