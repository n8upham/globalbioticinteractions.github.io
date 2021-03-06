var fs = require('fs');
var insertCss = require('insert-css');
var inherits = require('inherits');
var EventEmitter = require('events').EventEmitter;
var bboxUtil = require('./lib/bboxUtil.js');
var d3 = require('globi').d3;
var L = require('leaflet');
var Ldraw = require('leaflet-draw');

inherits(SpatialSelector, EventEmitter);
module.exports = SpatialSelector;

function SpatialSelector(searchContext) {
    if (!(this instanceof SpatialSelector)) return new SpatialSelector(searchContext);
    this.searchContext = searchContext;
}


SpatialSelector.prototype.appendTo = function (target) {
    if (typeof target === 'string') target = document.querySelector(target);
    var leafletCss = fs.readFileSync(__dirname + '/../../node_modules/leaflet/dist/leaflet.css', 'utf8');
    insertCss(leafletCss);
    var leafletDrawCss = fs.readFileSync(__dirname + '/../../node_modules/leaflet-draw/dist/leaflet.draw.css', 'utf8');
    insertCss(leafletDrawCss);
    var globiStyle = fs.readFileSync(__dirname + '/style.css', 'utf8');
    insertCss(globiStyle);
    this.appendMap(target, this.searchContext.searchParameters);
    this.emit('append', target);
};

SpatialSelector.prototype.appendMap = function (target, params) {
    var me = this;
    var location = location || { latitude: 0, longitude: 0 };
    var zoom = 1;

    var map = L.map(target).setView([location.latitude, location.longitude], zoom);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: 'Map data &copy; <a href="http://openstreetmap.org">OpenStreetMap</a> contributors, <a href="http://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA</a>',
        maxZoom: 18
    }).addTo(map);

    var drawnItems = new L.FeatureGroup();

    var addSelectedArea = function (searchParams) {
        if (searchParams.bbox) {
            var latLngBounds = bboxUtil.toBounds(searchParams.bbox.split(','));
            var rectangle = L.rectangle(latLngBounds);
            drawnItems.addLayer(rectangle);
        }
    };

    addSelectedArea(params);
    map.addLayer(drawnItems);

    var drawControl = new L.Control.Draw({
        draw: {
            marker: false,
            circle: false,
            polygon: false,
            polyline: false
        },
        edit: {
            featureGroup: drawnItems
        }
    });
    map.addControl(drawControl);

    var fitBounds = function () {
        if (drawnItems.getLayers().length == 0) {
            map.setView([0, 0], 1);
        } else {
            map.fitBounds(drawnItems.getBounds().pad(0.1));
        }
    };
    fitBounds();

    var deleteSelectedArea = function () {
        drawnItems.getLayers().forEach(function (layer) {
            drawnItems.removeLayer(layer);
        });
    };


    var updateSearchContext = function (param) {
        me.searchContext.updateSearchParameter('bbox', param);
        fitBounds();
    };

    map.on('draw:created', function (e) {
        updateSearchContext(bboxUtil.fromBounds(e.layer.getBounds())['bbox']);
    });

    map.on('draw:edited', function (e) {
        var param = null;
        var layers = e.layers.getLayers();
        if (layers.length > 0) {
            param = bboxUtil.fromBounds(layers[0].getBounds())['bbox'];
        }
        updateSearchContext(param);
    });

    map.on('draw:deleted', function () {
        updateSearchContext();
    });

    me.searchContext.on('searchcontext:searchparameterchange', function (searchParameters) {
        deleteSelectedArea();
        addSelectedArea(searchParameters);
        fitBounds();
    });

};
