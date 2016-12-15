/**
 * L.Control.GeoSearch - search for an address and zoom to it's location
 * L.GeoSearch.Provider.Parkmobile uses Parkmobile geocoding service
 * https://github.com/smeijer/L.GeoSearch
 */

var searchType = 0;
 
L.GeoSearch.Provider.Pm = L.Class.extend({	
    options: {},

    initialize: function(options) {
        options = L.Util.setOptions(this, options);
    },

    GetServiceUrl: function (qry) {
		if (/^\d+$/.test(qry)) {
			searchType = 1;
			return 'https://nl.parkmobile.com/api/search/locations?supplierId=20&query=' + qry;
		} else {
			searchType = 0;
			var parameters = L.Util.extend({
				q: qry,
				format: 'json'
			}, this.options);

			return 'http://nominatim.openstreetmap.org/search' + L.Util.getParamString(parameters); 
		}		
    },

    ParseJSON: function (data) {
        var results = [];
		
		if(searchType === 1) {
			results.push(new L.GeoSearch.Result(
				data.zones.zones[0].zoneInfo.longitude,
				data.zones.zones[0].zoneInfo.latitude,
				data.zones.zones[0].locationName,
				new L.LatLngBounds([
					data.zones.zones[0].zoneInfo.longitude,
					data.zones.zones[0].zoneInfo.latitude
				]),
				data.zones.zones[0].locationName
			));					
		} else {
			for (var i = 0; i < data.length; i++) {
				var boundingBox = data[i].boundingbox,
					northEastLatLng = new L.LatLng( boundingBox[1], boundingBox[3] ),
					southWestLatLng = new L.LatLng( boundingBox[0], boundingBox[2] );

				if (data[i].address)
					data[i].address.type = data[i].type;

				results.push(new L.GeoSearch.Result(
					data[i].lon,
					data[i].lat,
					data[i].display_name,
					new L.LatLngBounds([
						northEastLatLng,
						southWestLatLng
					]),
					data[i].address
				));
			}		
		}

        return results;
    }
});
