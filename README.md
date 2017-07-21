# Mapping A Colony webapp

Clientside webapp stuff for Mapping A Colony. The project is running
two WordPress websites, one for English and one for Danish
language. This webapp is generic across the language versions, and
extends the functionality of the WordPress websites.

The clientside interacts with the [middleware
API](https://github.com/xmacex/mappingacolonyapi), most importantly to
pull data from storage. The division of labour is somewhat messy, and
as it is currently, parsing of CSV to more structured data model is
done by the client. In terms of lines, this is much of the clientside
program. Primary storage format on the client side is
[GeoJSON](http://geojson.org/), from which
[StoryMap](https://storymap.knightlab.com/advanced/#json-syntax)
format is generated, based on the narratives. The gallery is modelled
in generated, D3 nested HTML, which Fancybox interprets for the
gallery function.

## Codes

A number of HTML elements trigger parts of the code, for rendeing UI
elements. They are

* `#vi` for U.S. Virgin Islands tilemap
* `#cph` for Copenhagen tilemap
* `#storymap` A storymap interactive exploration thing
* `#photoGallery` A photo gallery, with Fancybox
* `#d3globalProjection` for a small, 3D-lookalike map silhouette to give global context

Each one of which requires access to the various types of data in the
project. The first three require the main map data items, parsed into
GeoJSON by this program. The third one additionally requires the
narratives. The third one requires access to the gallery data, and the
last one is a project non-specific overview map, relying on a dataset
of countries.

## Dependencies

A couple of JavaScript libraries are used.

* [Leaflet](https://leafletjs.com) for tilemaps
* [D3](https://d3js.org) for CSV parsing, global map etc.
* [Knight Lab StoryMapsJS](https://storymap.knightlab.com) for the narratives story maps. This uses a legacy version of Leaflet, which is a hassle
* [Fancybox](http://fancybox.net) Image gallery
* [jQuery](https://jquery.com) is required by Fancybox and others
