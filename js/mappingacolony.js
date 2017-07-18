// var dataUrl = "https://www.itu.dk/people/maco/mappingacolony/api.php?format=csv&cached=false";
var dataUrl = "https://www.itu.dk/people/maco/mappingacolony/api/v3/api.php?controller=mapData&action=dumpstorage&format=csv";
var galleryUrl = "https://www.itu.dk/people/maco/mappingacolony/api/v3/api.php?controller=photoGallery&action=dumpstorage&format=csv";

var macdata = undefined; // for inspection purposes
var macgallery = undefined; // for inspection purposes
var lang = "en"; // default language
var maps = {};

var mapConf = {
	"osm": {
		"baseUrl": "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
		"attribution": "Map data &copy; <a href='http://openstreetmap.org'>OpenStreetMap</a> contributors",
	},
	"bwmapnik": {
		"baseUrl": "https://tiles.wmflabs.org/bw-mapnik/{z}/{x}/{y}.png",
		"attribution": " © 2017 BBBike.org & Geofabrik GmbH - map data (©) OpenStreetMap.org contributors"
	},
	"cartodb": {
		"baseUrl": "http://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png",
		"attribution": "Map tiles by Carto, under CC BY 3.0. Data by OpenStreetMap, under ODbL."
	},
}

var storymapOptions = {
	calculate_zoom: false, // This maybe worth changing, but I am deciding to not zoom out because Mercator projection
	map_type: mapConf.bwmapnik.baseUrl
};

var regionCenters = {
	"vi": [-64.8, 18.05],
	"cph": [12.5, 55.7]
}

switch (window.location.pathname.split("/")[1]) {
case "mappingacolonyda":
	lang = "da";
	break;
case "mappingacolonyda":
	lang = "en";
	break;
}

// a helper for empty strings
function p(s) {
	// return s == "" ? undefined : s; // No 'undefined' in JSON 
	return s == "" ? null : s;
};

function googleSheetCsvToGeoJson(gsheet) {
	// JSON object
	var json = {
		"type": "FeatureCollection",
		"features": []
	};
	// parse CSV
	json.features = gsheet.map(function(row) {
		return {
			"type": "Feature",
			"geometry": {
				"type": "Point",
				"coordinates": [+p(row.Longtitude), +p(row.Latitude)]
			},
			"properties": {
				"refno": p(+row['Refno.']),
				"published": p(row["Published"].toLowerCase()) == "yes" ? true : false,
				"type": p(row['Type'].toLowerCase()),
				"region": p(row['Region']),
				"address": p(row['Address']),
				"name": {
					"da": p(row['Place or institution name (Danish)']),
					"en": p(row['Place or institution name (English)'])
				},
				"persons": p(row['Person(s) (seperated by comma)'].split(',').map(n => n.trim())),
				"themes": p(row['Themes (seperated by comma)'].split(',').map(t => t.trim())),
				"story": {
					"da": p(row['Story (Danish)'].replace(/\n/g, "<br>")),
					"en": p(row['Story (English)'].replace(/\n/g, "<br>"))
				},
				"sources": p(row['Sources']),
				"pic": {
					"url": p(row['Media URL']),
					"source": p(row['Media source']),
					"caption": {
						"da": p(row['Media caption (Danish)']),
						"en": p(row['Media caption (English)'])
					},
				},
				"links": p(row['External links and references (for website)']),
				"quotes": p(row['Quotes']),
				"quotes_translated": p(row['Translated quotes']),
				"text": {
					"da": p(row['Text (Danish)']),
					"en": p(row['Text (English)'])
				},
				"contributor": p(row['Project contributor initials']),
				"other": p(row['Other/Comments'])
			}
		}
	}).filter(function(feature) {
		return feature.properties.published
	});
	return json;
};

function googleSheetCsvToNarratives(data) {
	narratives = [];
	for(var i = 1; i < data.values.length; i++) {
		// require id, name and items at the minimum
		if(data.values[i][0] // id
		   && (lang == "en" ? data.values[i][1] : data.values[i][2])
		   && data.values[i][9]) { // items
			narratives.push({
				"id": data.values[i][0],
				"name": {
					"da": data.values[i][2],
					"en": data.values[i][1]
				},
				"intro": {
					"da": data.values[i][3],
					"en": data.values[i][4]
				},
				"pic": {
					"url": data.values[i][5],
					"credit": data.values[i][6],
					"caption": {
						"da": data.values[i][8],
						"en": data.values[i][7],
					}
				},
				"items": data.values[i][9].split(",").map(i => +i)
			});
		}
	};
	return narratives;
};

function googleSheetCsvToImageGallery(gsheet) {
	var json = {
		"images": []
	};

	json.images = gsheet.map(function(row) {
		return {
			"refno": +row['Refno.'],
			"published": row['Published'].toLowerCase() == 'yes' ? true : false,
			"theme": {
				"da": p(row['Theme (Danish)']),
				"en": p(row['Theme (English)'])
			},
			"url": p(row['Media URL']),
			"source": p(row['Media source']),
			"caption": {
				"da": p(row['Caption (Danish)']),
				"en": p(row['Caption (English)'])
			}
		}
	})
	return json;
}
	

function buildNarrativeButtons(narratives, smSelectorElement, smElement) {
	narratives.forEach(function(n) {
		var button = document.createElement("button");
		button.classList.add("narrative-button");
		button.innerText = n.name[lang];
		button.onclick = function(e) {
			Array.from(document.getElementsByClassName("narrative-button")).forEach(function(b) {
				console.log(b);
				b.disabled = false;
			});
			e.target.disabled = true;
			buildStoryMap(smElement, macdata, n, storymapOptions);
		}
		smSelectorElement.append(button);
	});
};

function geoJsonFeatureToStoryMapSlide(f) {
	return {
		"text": {
			"headline": f.properties.name[lang] || "",
			"text": f.properties.story[lang] || ""
		},
		"location": {
			"name": f.properties.name[name],
			"lat": f.geometry.coordinates[1] || 0.00001,
			"lon": f.geometry.coordinates[0] || 0.00001,
			"zoom": 12 // automatic instead?
		},
		"media": {
			"url": f.properties.pic.url,
			"caption": f.properties.pic.caption[lang],
			"credit": f.properties.pic.source
		}
	};
}

function geoJsonToStoryMap(geojson, narrative) {
	var overviewslide = {
		"type": "overview",
		"text": {
			"headline": narrative.name[lang],
			"text": narrative.intro[lang]
		},
		"media": {
			"url": narrative.pic.url,
			"caption": narrative.pic.caption[lang],
			"credit": narrative.pic.source
		}
	};
	
	var storymap = {
		"width": 400,			// required for embed tool
		"height": 600,			// required for embed tool
		"storymap": {
			"language": lang,
			// "slides": [overviewslide].concat(narrative.items.map(n => geoJsonFeatureToStoryMapSlide(geojson.features.find(f => f.properties.refno == n))))
			"slides": [overviewslide]
				.concat(narrative.items
						.filter(i => geojson.features
								.find(f => f.properties.refno == i
									  && f.properties.published))
						.map(n => geoJsonFeatureToStoryMapSlide(geojson.features.find(f => f.properties.refno == n))))
		}
	};
	return storymap;
}

// Sketching Europeana connection
function nearbyEuropeanaItems(feature, callback) {
	var europeanaRestUrl = "https://www.itu.dk/people/maco/mappingacolony/api/v3/api.php?controller=europeana&action=nearby";
	var europeanaQuery = europeanaRestUrl + "&lat=" + feature.geometry.coordinates[0] + "&long=" + feature.geometry.coordinates[1];
	var xhr = new XMLHttpRequest();
	xhr.onload = function() {
		callback(JSON.parse(xhr.responseText));
	}
	xhr.open('GET', europeanaQuery);
	xhr.send();
}

// Accepts a GeoJSON feature, and a callback function
function relatedEuropeanaItems(feature, callback) {
	var europeanaRestUrl = "https://www.itu.dk/people/maco/mappingacolony/api/v3/api.php?controller=europeana&action=subject";
	var europeanaQuery = europeanaRestUrl + "&s=" + feature.properties.themes[0]
	var xhr = new XMLHttpRequest();
	xhr.onload = function() {
		callback(JSON.parse(xhr.responseText));
	}
	xhr.open('GET', europeanaQuery);
	xhr.send();
}

// Accepts a string, and a callback function
function relatedEuropeanaItemsForSubject(subject, callback) {
	var europeanaRestUrl = "https://www.itu.dk/people/maco/mappingacolony/api/v3/api.php?controller=europeana&action=subject";
	var europeanaQuery = europeanaRestUrl + "&s=" + subject;
	var xhr = new XMLHttpRequest();
	xhr.onload = function() {
		callback(JSON.parse(xhr.responseText));
	}
	xhr.open('GET', europeanaQuery);
	xhr.send();
}

// Read Leaflet API and search for a way to just update the data
function buildStoryMap(elem, data, narrative, options) {
	elem.innerHTML = "";
	var storymap = new VCO.StoryMap(elem.id, geoJsonToStoryMap(data, narrative), options);
	console.log(storymap);
}

function indicateDivLoading(element, isLoading) {
	if (isLoading) {
		element.classList.add("loading");
		var throbber = document.createElement("span");
		throbber.classList.add("loading-text");
		throbber.innerText = "Loading...";
		element.innerHTML = "";
		element.append(throbber);
	} else {
		element.innerHTML = "";
		element.classList.remove("loading");
	}
}

var roundIcon = L.divIcon();

function pointToLayer(feature, latlng) {
	var m = L.circleMarker(latlng, {
		className: feature.properties.type,
		radius: 5,
	});
	m.bindTooltip(feature.properties.name[lang]);
	m.on("mouseover", function(event) {
		console.log(event);
		event.target.openTooltip();
	});
	m.on("click", function(event) {
		event.target.closeTooltip();
	});

	return m;
}

function onEachFeature(feature, layer) {
	if(feature.geometry.coordinates[0] && feature.geometry.coordinates[1]) {
		var title = feature.properties.name ? "<h3>" + (feature.properties.name[lang] || "") + "</h3>" : "";
		var address = feature.properties.address ? "<div class='popupAddress'>" + (feature.properties.address || "") + "</div>" : "";
		var img = feature.properties.pic.url ? '<img src="' + feature.properties.pic.url + '" class="popup"/>' : "";
		var caption = feature.properties.pic.caption[lang] ? "<div class='popupCaption'>" + (feature.properties.pic.caption[lang] || "") + "</div>" : "";
		var content = feature.properties.story[lang] ? "<p>" + feature.properties.story[lang] + "</p>" : "";
		var contributor = feature.properties.contributor ? "<div class='contributor'>" + (feature.properties.contributor || "") + "</div>" : "";
		var sources = feature.properties.sources ? "<div class='sources'>" + (feature.properties.sources || "") + "</div>" : "";
		var contentHtml = title + address + img + caption + content + contributor + sources;
		layer.bindPopup(contentHtml, {
			maxHeight: 400,
			autoPan: true
		});
		// Brace yourself for spaghetti code. When popups are opened,
		// This connects to Europeana, pulls numbers of items in their
		// dc:Subject, and dynamically appends them to the bottom of
		// the popups
		if(feature.properties.themes) {
			layer.on("popupopen", function(event) {
				if(!event.popup.europeanaretrieved) {
					event.popup.setContent(event.popup.getContent() + '<div class="europeana-subjects"><div class="europeana-logo"><img class="europeana-logo" src="https://blogit.itu.dk/mappingacolonyen/wp-content/uploads/sites/44/2017/07/EU_basic_logo_landscape_black.png" /></div><div class="europeana-links"></div></div>');
					event.target.feature.properties.themes.forEach(function(theme) {
						relatedEuropeanaItemsForSubject(theme, function(res) {
							var sElem = document.createElement("a");
							sElem.classList.add("europeana-link");
							sElem.href = "http://www.europeana.eu/portal/en/search?q=proxy_dc_subject:" + theme;
							sElem.title = "See cultural heritage content about " + theme + " on Europeana";
							sElem.target = "_blank";
							sElem.text = theme + " (" + res.totalResults + "), ";
							var ssElem = event.popup.getElement().getElementsByClassName("europeana-links")[0];
							ssElem.appendChild(sElem);
						});
					});
				}
			});
		}
	};
};

function getBoundingFeature(map) {
	var b = map.getBounds();
	return {
		"type": "LineString",
		"coordinates": [
			[b.getWest() - 1, b.getNorth() + 1],
			[b.getEast() + 1, b.getNorth() + 1],
			[b.getEast() + 1, b.getSouth() - 1],
			[b.getWest() - 1, b.getSouth() - 1],
			[b.getWest() - 1, b.getNorth() + 1]
		]
	};
}

// Leaflet map stuff
var mapOptions = {
	maxZoom: 14, // because BW Mapnik tiles do not seem to be provided closer at the moment 2017-06-20
	scrollWheelZoom: false,
	zoom: 10
};

if(document.getElementById("vi")) {
	maps.vi = L.map("vi", mapOptions)
		.setView([regionCenters.vi[1], regionCenters.vi[0]]);
	L.tileLayer(mapConf.bwmapnik.baseUrl, {
		attribution: mapConf.bwmapnik.attribution}).addTo(maps.vi);
	L.control.scale().addTo(maps.vi)
}
if(document.getElementById("cph")) {
	maps.cph = L.map("cph", mapOptions)
		.setView([regionCenters.cph[1], regionCenters.cph[0]])
	L.tileLayer(mapConf.bwmapnik.baseUrl, {
		attribution: mapConf.bwmapnik.attribution}).addTo(maps.cph);
	L.control.scale().addTo(maps.cph)
}

// Prepare D3 for some JSON fun
/*
var svg = d3.select("#d3element")
	.append("svg")
	.attr("id", "d3svgElement")
	.attr("height", "50")
	.attr("width", "100%");
*/

var svgGlobalProjection = d3.select("#d3globalProjection")
	.append("svg")
	.attr("id", "d3svgGlobalProjectionElement")
	.attr("height", 100)
	.attr("width", "100%");

var x = d3.scaleLinear();
var h = d3.scaleSqrt();

// d3.json(dataUrl, function(error, data) {
d3.request(dataUrl, function(error, xhr) {
	if(error) throw error;
	
	console.log(xhr);
	data = googleSheetCsvToGeoJson(d3.csvParse(xhr.response)); // because my middleware is not yet complete, and negotiated with the (a) data model
	macdata = data;

	// do StoryMap, if this is a storymap page
	if (smContainerElement = document.getElementById("storymap")) {
		console.log("storymap page");
		d3.json('https://www.itu.dk/people/maco/mappingacolony/api/v3/api.php?controller=narrative&action=get', function(narrativeError, narrativeData) {
			if(narrativeError) {throw narrativeError};
			console.log(narrativeData)

			var smSelectorElement = document.createElement("div")
			smSelectorElement.id = "sm-selector";
			smContainerElement.append(smSelectorElement);
			
			// var narratives = [];
			// narratives = googleSheetCsvToNarratives(narrativeData);
			narratives = narrativeData;
			console.log(narratives);

			var smElement = document.createElement("div")
			smElement.id = "makestorymaphereplease";
			smContainerElement.append(smElement);
			
			buildNarrativeButtons(narratives, smSelectorElement, smElement);

			indicateDivLoading(smElement, true);
			jQuery.getScript("https://cdn.knightlab.com/libs/storymapjs/latest/js/storymap-min.js", function() {
				
				demoNarrative = narratives[0];
				console.log("About to build storymap from ", demoNarrative);
				
				indicateDivLoading(smElement, false);
				buildStoryMap(smElement, data, demoNarrative, storymapOptions);
			});
		});
	};

	if(noElem = document.getElementById("numOfData")) {
		document.getElementById("numOfData").innerText = data.features.length;
	}

	// Leaflet (>= 1.0.3) load GeoJSON objects
	if(maps.vi) {
		L.geoJSON(data, {
			pointToLayer: pointToLayer,
			onEachFeature: onEachFeature
		}).addTo(maps.vi);
	}
	if(maps.cph) {
		L.geoJSON(data, {
			pointToLayer: pointToLayer,
			onEachFeature: onEachFeature
		}).addTo(maps.cph);
	}
});
		   
// A global projection
if(!svgGlobalProjection.empty()) {
	projection = d3.geoOrthographic()
		.scale(150)
		.rotate([30, -45, -20])
		.translate(
			[svgGlobalProjection.node().getBoundingClientRect().width / 2,
			 svgGlobalProjection.node().getBoundingClientRect().height / 2])
	
	var graticule = d3.geoGraticule();
	var path = d3.geoPath()
		.projection(projection);

	svgGlobalProjection.append("path")
		.datum(graticule)
		.classed("graticule", true)
		.attr("d", path);
	
	d3.json("https://raw.githubusercontent.com/johan/world.geo.json/master/countries.geo.json", function(error, world) {
		if(error) throw error;
		
		console.log(world);
		svgGlobalProjection.selectAll("path.land")
			.data(world.features) // .datum() instead maybe?
			.enter()
			.append("path")
			.classed("land", true)
			.attr("d", path)
		
		svgGlobalProjection
			.datum(getBoundingFeature(maps.vi))
			.append("path")
			.attr("id", "vi")
			.classed("global-bounds", true)
			.attr("d", path)
			.on("mouseover", function(e) {
				maps.vi.getContainer().classList.add("map-highlight");
			})
			.on("mouseout", function(e) {
				maps.vi.getContainer().classList.remove("map-highlight");
			});
		
		svgGlobalProjection
			.datum(getBoundingFeature(maps.cph))
			.append("path")
			.attr("id", "cph")
			.classed("global-bounds", true)
			.attr("d", path)
			.on("mouseover", function(e) {
				maps.cph.getContainer().classList.add("map-highlight");
			})
			.on("mouseout", function(e) {
				maps.cph.getContainer().classList.remove("map-highlight");
			})					
	});
}

// If this is a gallery page, build the gallery
if(galleryElem = document.getElementById("photoGallery")) {
	console.log("Gallery found", galleryElem);
	d3.request(galleryUrl, function(error, xhr) {
		if(error) throw error;

		data = googleSheetCsvToImageGallery(d3.csvParse(xhr.response));
		macgallery = data;

		console.log(data);

		var nests = d3.nest()
			.key(function(image) {return image.theme[lang]})
			.entries(data.images.filter(function(image) {return image.published}));
		
		console.log(nests);

		nests.forEach(function(nest) {
			// D3 or jQuery would be prettier here
			var nestDiv = document.createElement("div");
			nestDiv.classList.add("gallery-nest");

			var nestHead = document.createElement("h3");
			nestHead.innerText = nest.key;
			nestDiv.appendChild(nestHead);

			var nestItems = document.createElement("div");
			nestItems.classList.add("gallery-nest-items");
			nest.values.forEach(function(image) {
				var a = document.createElement("a");
				a.classList.add("gallery-image");
				a.setAttribute("href", image.url);
				a.dataset.fancybox = image.theme[lang];
				a.dataset.caption = image.caption[lang] || "";
				var img = document.createElement("img");
				img.classList.add("gallery-thumbnail");
				img.setAttribute("src", image.url);
				img.setAttribute("alt", image.caption[lang] || "");
				a.appendChild(img);

				nestItems.appendChild(a);
			});
			nestDiv.appendChild(nestItems);
			galleryElem.appendChild(nestDiv);
		});

		jQuery("[data-fancybox]").fancybox();
	});
}
