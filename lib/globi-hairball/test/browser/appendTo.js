var hairball = require('globi-hairball');
var test = require('tape');

var EventEmitter = require('events').EventEmitter;
var PubSub = new EventEmitter();


test('check append hairball to body single interaction', function (t) {
    t.plan(3);
    var elem = document.createElement('div');
    var data = [ { source: { name: 'taxon1', path: 'taxonpath1', id: 'id1' },
        type: 'preysOn',
        target: { name: 'taxon1', path: 'taxonpath1', id: 'id2'}}];
    var w = hairball({ json: data, canvasDimension: { height: 3000, width: 1234}});
    t.equal(w.settings.canvasDimension.height, 3000);
    w.on('append', function (target) {
        t.equal(target, elem);
        t.ok(elem.querySelectorAll('.hairball-node').length > 0);
    });
    w.appendTo(elem);
});

test('check append hairball to body no data', function (t) {
    t.plan(2);
    var elem = document.createElement('div');
    var w = hairball({ json: [], canvasDimension: { height: 123, width: 1234}});
    t.equal(w.settings.canvasDimension.height, 123);
    w.on('append', function (target) {
        t.equal(target, elem);
    });
    w.appendTo(elem);
});

test('check append hairball to body no data then update', function (t) {
    t.plan(2);
    var w = hairball({ searchContext: PubSub, json: [], canvasDimension: { height: 123, width: 1234}});
    var elem = document.createElement('div');
    w.on('append', function (target) {
        t.equal(target, elem);
    });
    w.appendTo(elem);

    var data = [ { source: { name: 'taxon1', path: 'taxonpath1', id: 'id1' },
        type: 'preysOn',
        target: { name: 'taxon1', path: 'taxonpath1', id: 'id2'}}];

    PubSub.emit('globisearch:resultsetchanged', data);

    t.ok(elem.querySelector(".hairball-node"));

});
