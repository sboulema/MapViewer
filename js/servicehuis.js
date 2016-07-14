function nprMarkerOnClick(e) {
	var marker = e.target;
	
	var popupContent = getTariffInfo(marker.areaId, marker.areaManagerId, marker);
	
	marker.bindPopup(popupContent);
	marker.openPopup();
}

function getTariffInfo(areaId, areaManagerId, marker) {
	var uuid;
	var days = ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"];
	
	$.ajax("https://opendata.rdw.nl/resource/svfa-juwh.json?areaid=" + areaId.toUpperCase() + "&areamanagerid=" + areaManagerId).done(function(data) {
		uuid = data[0].uuid;
		
		var popupContent = "<table>";
		popupContent += "<tr><th>Day</th><th>Time frame</th><th>Charge</th><th>Description</th></tr>";
		
		$.ajax("http://cors.sboulema.nl/" + "http://npropendata.rdw.nl/parkingdata/v2/static/" + uuid).done(function(data) {
			
			data.parkingFacilityInformation.tariffs.sort(function(a,b) { return days.indexOf(a.validityDays[0]) > days.indexOf(b.validityDays[0]); });
			
			$.each(data.parkingFacilityInformation.tariffs, function(index, tariff) {
				popupContent += parseTariff(tariff);					
			});
			marker.bindPopup(popupContent);
			marker.openPopup();
			
			popupContent += "</table>";
			return popupContent;
		});
	});
}

function parseTariff(tariff) {
	if (tariff.endOfPeriod !== null && tariff.endOfPeriod < Date.now()) {
		return "";
	}
	
	var text = "<tr><td>" + tariff.validityDays + "</td><td>" + 
	formatTime(tariff.validityFromTime.h) + ":" + formatTime(tariff.validityFromTime.m) + " - " + formatTime(tariff.validityUntilTime.h) + ":" + formatTime(tariff.validityUntilTime.m) + "</td><td>";
	
	$.each(tariff.intervalRates, function(index, interval) {
		text += parseInterval(interval);				
	});
	
	text += "</td><td>" + tariff.tariffDescription + "</td></tr>";
	
	return text;
}

function startsWith(str, word) {
    return str.lastIndexOf(word, 0) === 0;
}

function formatTime(min) {
	if (min < 10) {
		return "0" + min;
	}
	return min;
}

function parseInterval(interval) {
	if (interval.validityEndOfPeriod !== null && interval.validityEndOfPeriod < Date.now()) {
		return "";
	}

    var text = "";
	
	if (interval.durationUntil !== null && interval.durationUntil > 0) {
		text += " " + interval.durationFrom + " - " + interval.durationUntil;
	}
	
	text += interval.charge + "€/";
	
	if (interval.chargePeriod !== null && interval.chargePeriod > 1) {
		text += interval.chargePeriod + " ";
	}
	
	text += interval.durationType + "<br/>";
	
	return text;
}