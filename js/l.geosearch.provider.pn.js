var searchType = 0;

window.GeoSearch.Provider.Pn = L.Class.extend({
  constructor(options = {}) {
    this.options = options;
  },

  endpoint({ query, protocol } = {}) {
    const { params } = options;

    const paramString = this.getParamString({
      params,
      format: 'json',
      q: query,
    });

    if (/^\d+$/.test(query)) {
        searchType = 1;
        return 'https://nl.parkmobile.com/api/search/locations?supplierId=20&query=' + query;
    } else {
        searchType = 0;
        return `${protocol}//nominatim.openstreetmap.org/search?${paramString}`;
    }
  },

  parse({ data }) {
    if(searchType === 1) {
        return data.zones.zones.map(r => ({
            x: r.zoneInfo.longitude,
            y: r.zoneInfo.latitude,
            label: r.internalZoneCode,
            bounds: [
                [parseFloat(r.zoneInfo.latitude) - 0.01, parseFloat(r.zoneInfo.longitude) - 0.01], // s, w
                [parseFloat(r.zoneInfo.latitude) + 0.01, parseFloat(r.zoneInfo.longitude) + 0.01], // n, e
            ],
            raw: r,
        }));		
    } else {
        return data.map(r => ({
        x: r.lon,
        y: r.lat,
        label: r.display_name,
        bounds: [
            [parseFloat(r.boundingbox[0]), parseFloat(r.boundingbox[2])], // s, w
            [parseFloat(r.boundingbox[1]), parseFloat(r.boundingbox[3])], // n, e
        ],
        raw: r,
        }));
    }
  },

  getParamString(params) {
    return Object.keys(params).map(key => 
      `${encodeURIComponent(key)}=${encodeURIComponent(params[key])}`
    ).join('&');
  },

  async search({ query }) {
    // eslint-disable-next-line no-bitwise
    const protocol = ~location.protocol.indexOf('http') ? location.protocol : 'https:';
    const url = this.endpoint({ query, protocol });

    const request = await fetch(url);
    const json = await request.json();
    return this.parse({ data: json });
  }
});