var fs = require('fs');
var insertCss = require('insert-css');
var inherits = require('inherits');
var EventEmitter = require('events').EventEmitter;
var d3 = require('d3');
var transform = require('./lib/transform.js');

inherits(Wheel, EventEmitter);
module.exports = Wheel;

function Wheel(settings) {
    var me = this;
    if (!(this instanceof Wheel)) return new Wheel(settings);
    this.settings = settings;

    if (me.settings.searchContext) {
        me.searchContext = me.settings.searchContext;
        delete me.settings.searchContext;
    }

    if (me.searchContext) {
        me.searchContext.on('globisearch:resultsetchanged', function (json) {
            me.settings.json = json;
            me.draw();
        });
    }
}

Wheel.prototype.appendTo = function (target) {
    if (typeof target === 'string') target = document.querySelector(target);
    this.settings.target = target;
    var css = fs.readFileSync(__dirname + '/style.css', 'utf8');
    insertCss(css);
    if (this.settings.json && this.settings.json.length > 0) {
        this.draw();
    }
    this.emit('append', target);
};


Wheel.prototype.draw = function () {
    this.settings.target.innerHTML = '';
    this._buildDependencyWheel(this.settings.target, this.settings.json, this.settings.canvasDimension)
};

Wheel.prototype._buildDependencyWheel = function (target, json, canvasDimension) {
    if (json.length === 0) return;
    var chart = this.dependencyWheel()
        .width(canvasDimension.width)
        .height(canvasDimension.height);

    var data = transform.convertJsonForDependencyWheel(json);

    d3.select(target)
        .datum(data)
        .call(chart);

}

Wheel.prototype.dependencyWheel = function () {
    var me = this;
    var width = 1200;
    var height = 800;
    var margin = 130;
    var padding = 0.02;

    function chart(selection) {

        selection.each(function (data) {

            var matrix = data.matrix,
                nodeNames = data.names,
                radius = height - margin;

            var chord = d3.layout.chord()
                .padding(padding)
                .sortSubgroups(d3.descending);

            var svg = d3.select(this).selectAll('svg').data([ data ]);

            var gElement = svg.enter().append('svg:svg')
                .attr('width', height * 2)
                .attr('height', height * 2)
                .attr('viewBox', '0 0 ' + height * 2 + ' ' + height * 2)
                .attr('class', 'dependencyWheel')
                .attr('zoomAndPan', 'magnify')
                .append('g')
                .attr('transform', 'translate(' + ( height ) + ',' + ( height ) + ')');

            var arc = d3.svg.arc()
                .innerRadius(radius)
                .outerRadius(radius + 20);

            var fill = function (d) {
                if (d.index === 0) {
                    return '#ccc';
                }
                return 'hsl(' + parseInt(( ( nodeNames[ d.index ][ 0 ].charCodeAt() - 97 ) / 26 ) * 360, 10) + ',90%,70%)';
            };

            var fade = function (opacity) {

                return function (g, i) {

                    svg.selectAll('.chord')
                        .filter(function (d) {
                            return d.source.index !== i && d.target.index !== i;
                        })
                        .transition()
                        .style('opacity', opacity);
                    var groups = [];
                    svg.selectAll('.chord')
                        .filter(function (d) {
                            if (d.source.index === i) {
                                groups.push(d.target.index);
                            }
                            if (d.target.index === i) {
                                groups.push(d.source.index);
                            }
                        });
                    groups.push(i);
                    var length = groups.length;
                    svg.selectAll('.group')
                        .filter(function (d) {
                            for (var i = 0; i < length; i++) {
                                if (groups[ i ] === d.index) {
                                    return false;
                                }
                            }
                            return true;
                        })
                        .transition()
                        .style('opacity', opacity);
                };
            };

            chord.matrix(matrix);

            var rootGroup = chord.groups()[ 0 ];
            var rotation = -( rootGroup.endAngle - rootGroup.startAngle ) / 2 * ( 180 / Math.PI );

            var g = gElement.selectAll('g.group')
                .data(chord.groups)
                .enter().append('svg:g')
                .attr('class', 'group')
                .attr('transform', function (d) {
                    return 'rotate(' + rotation + ')';
                });
            g.on('mouseover', fade(0.1))
                .on('mouseout', fade(1));
            g.append('svg:path')
                .style('fill', fill)
                .style('stroke', fill)
                .attr('d', arc)
                .attr('data-index', function (d) {
                    return 'path-' + d.index;
                });

            g.append('svg:text')
                .each(function (d) {
                    d.angle = ( d.startAngle + d.endAngle ) / 2;
                })
                .attr('dy', '.35em')
                .attr('text-anchor', function (d) {
                    return d.angle > Math.PI ? 'end' : null;
                })
                .attr('transform', function (d) {
                    return 'rotate(' + ( d.angle * 180 / Math.PI - 90 ) + ')' +
                        'translate(' + ( radius + 26 ) + ')' +
                        ( d.angle > Math.PI ? 'rotate(180)' : '' );
                })
                .text(function (d) {
                    return nodeNames[ d.index ].length > 20 ? nodeNames[ d.index ].substring(0, 19) + '...' : nodeNames[ d.index ];
                })
                .on('click', function (d) {
                    me.searchContext.updateSearchParameter('sourceTaxon', nodeNames[ d.index ]);
                })
                .attr('style', 'cursor: pointer;')
                .append("title").text(function (d) {
                    return nodeNames[ d.index ];
                });

            gElement.selectAll('path.chord')
                .data(chord.chords)
                .enter().append('svg:path')
                .attr('class', 'chord')
                .style('stroke', function (d) {
                    return d3.rgb(fill(d.source)).darker();
                })
                .style('fill', function (d) {
                    return fill(d.source);
                })
                .attr('d', d3.svg.chord().radius(radius))
                .attr('transform', function (d) {
                    return 'rotate(' + rotation + ')';
                })
                .style('opacity', 1);
        });
    }

    chart.width = function (value) {
        if (!arguments.length) {
            return width;
        }
        width = value;
        return chart;
    };

    chart.height = function (value) {
        if (!arguments.length) {
            return height;
        }
        height = value;
        return chart;
    };

    chart.margin = function (value) {
        if (!arguments.length) {
            return margin;
        }
        margin = value;
        return chart;
    };

    chart.padding = function (value) {
        if (!arguments.length) {
            return padding;
        }
        padding = value;
        return chart;
    };

    return chart;
};


