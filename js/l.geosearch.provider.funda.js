/**
 * L.Control.GeoSearch - search for an address and zoom to it's location
 * L.GeoSearch.Provider.Funda uses funda geocoding service
 * https://github.com/smeijer/L.GeoSearch
 */

var searchType = 0;

function isGuid(value) {    
    var regex = /[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}/i;
    var match = regex.exec(value);
    return match != null;
}

function descramble(scrambledGetal) {
    if (!scrambledGetal)
        return "";

    var scrambleKey = parseInt(scrambledGetal.charAt(0)); //scramble key is eerste cijfer

    //de rest van het getal gaan we descramble-en
    var strGetal = scrambledGetal.substring(1);
    var cijferArray = [];
    for (var i = 0; i < strGetal.length; i++) {
        cijferArray.push(parseInt(strGetal.charAt(i)));
    }

    //cijfer-shift terug
    for (i = 0; i < strGetal.length; i++) {
        var increment = parseInt((((i % 2) * 2 - 1) * (scrambleKey + i / 2)) % 10);
        cijferArray[i] = (cijferArray[i] - increment + 10) % 10;
    }

    return cijferArray.length === 0 ? 0 : cijferArray.join("");
}
 
L.GeoSearch.Provider.Funda = L.Class.extend({	
    options: {},

    initialize: function(options) {
        options = L.Util.setOptions(this, options);
    },

    GetServiceUrl: function (qry) {
		if (isGuid(qry)) {
			searchType = 1;
			return 'https://crossorigin.me/http://partnerapi.funda.nl/feeds/Aanbod.svc/json/detail/5955322d-ba58-4b91-ae86-e40168d69998/koop/' + qry;
		} else if (/^\d+$/.test(qry)) {
			var globalId = descramble(qry);
			searchType = 2;
			return 'https://crossorigin.me/http://partnerapi.funda.nl/feeds/Aanbod.svc/detail/5955322d-ba58-4b91-ae86-e40168d69998/koop/globalid/' + globalId;
		} else {
			searchType = 0;
			var parameters = L.Util.extend({
				q: qry,
				format: 'json'
			}, this.options);

			return 'https://nominatim.openstreetmap.org/search' + L.Util.getParamString(parameters); 
		}		
    },

    ParseJSON: function (data) {
        var results = [];
		
		if(searchType === 1) {
			results.push(new L.GeoSearch.Result(
				data.WGS84_X,
				data.WGS84_Y,
				data.Adres,
				new L.LatLngBounds([
					data.WGS84_X,
					data.WGS84_Y
				]),
				data.Adres
			));
		} else if(searchType === 2) {
			var xmlDoc = new DOMParser().parseFromString(data,"text/xml");
			results.push(new L.GeoSearch.Result(
				xmlDoc.getElementsByTagName("WGS84_X")[xmlDoc.getElementsByTagName("WGS84_X").length - 1].childNodes[0].nodeValue,
				xmlDoc.getElementsByTagName("WGS84_Y")[xmlDoc.getElementsByTagName("WGS84_Y").length - 1].childNodes[0].nodeValue,
				xmlDoc.getElementsByTagName("Adres")[0].childNodes[0].nodeValue,
				new L.LatLngBounds([
					parseFloat(xmlDoc.getElementsByTagName("WGS84_X")[xmlDoc.getElementsByTagName("WGS84_X").length - 1].childNodes[0].nodeValue),
					parseFloat(xmlDoc.getElementsByTagName("WGS84_Y")[xmlDoc.getElementsByTagName("WGS84_Y").length - 1].childNodes[0].nodeValue)
				]),
				xmlDoc.getElementsByTagName("Adres")[0].childNodes[0].nodeValue
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
