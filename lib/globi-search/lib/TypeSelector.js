var inherits = require('util').inherits;
var EventEmitter = require('events').EventEmitter;
var extend = require('extend');
var forEach = require('foreach');

var __EMPTY_OPTION_LABEL__ = '--- choose ---';
var __EMPTY_OPTION_VALUE__ = '--';

inherits(TypeSelector, EventEmitter);

function TypeSelector(settings) {
    this.settings = extend({
        options: [],
        type: '',
        usePlaceholder: true,
        startValue: ''
    }, settings);

    this.init();
}

extend(TypeSelector.prototype, {
    init: function() {
        var me = this;
        me.options = [];

        var select = document.createElement('select');
        select.className = 'eol-interaction-type-selector';
        me.el = select;

        me.events();

        if (me.settings['usePlaceholder']) {
            me.addOption(__EMPTY_OPTION_LABEL__, __EMPTY_OPTION_VALUE__);
        }

        forEach(me.settings['options'], function(option) {
            me.addOption(option);
        });
    },

    events: function() {
        var me = this;

        me.el.addEventListener('change', proxy(me.onChange, me));

        me.addListener('typeselector:addoption', me.render);
        me.addListener('typeselector:removeoption', me.render);
        me.addListener('typeselector:cleared', me.render);
        me.addListener('typeselector:update', me.render);
    },

    update: function(search) {
        this.settings['startValue'] = search.searchContext.searchParameters.interactionType;
        this.emit('typeselector:update');
    },

    clear: function() {
        var me = this;
        me.options = [];
        me.emit('typeselector:cleared');
        return this;
    },

    disable: function() {
        this.el.setAttribute('disabled', true);
        return this;
    },

    enable: function() {
        this.el.removeAttribute('disabled');
        return this;
    },

    render: function() {
        var me = this, optionElement;
        me.el.innerHTML = '';
        me.options.sort(compare);
        forEach(me.options, function(option) {
            optionElement = document.createElement('option');
            optionElement.setAttribute('value', option.value);
            if (option.value === me.settings.startValue) {
                optionElement.setAttribute('selected', 'selected');
            }
            optionElement.innerHTML = option.label;
            me.el.appendChild(optionElement);
        });
        me.emit('typeselector:render');
        return me.el;
    },

    addOption: function(label, value) {
        var me = this;
        if (arguments.length === 1){
            if (typeof label === 'object') {
                value = label.value;
                label = label.label;
            } else {
                value = label;
            }
        }

        var isNewEntry = true;
        forEach(me.options, function(option) {
            if (option.value === value) {
                isNewEntry = isNewEntry && false;
            }
        });

        if (isNewEntry) {
            var option = { value: value, label: label };
            this.options.push({ value: value, label: label });
            me.emit('typeselector:addoption', option);
        }
    },

    removeOption: function(option) {
        var me = this;
        if (typeof option === 'object') {
            value = option.value;
        } else {
            value = option;
        }

        var newOptionSet = [];
        forEach(me.options, function(option) {
            if (option.value !== value) {
                newOptionSet.push(option);
            }
        });
        me.options = newOptionSet;

        me.emit('typeselector:removeoption', option);
    },

    onChange: function(event) {
        var me = this;
        var value = me.el.value;
        if (value === __EMPTY_OPTION_VALUE__) {
            value = null;
        }
        me.emit('typeselector:change', value);
        me.settings.searchContext.emit('typeselector:selected', { emitter: me.settings.type, data: value });
    }

});

function compare(a, b) {
    if (a.label < b.label) {
        return -1;
    }
    if (a.label > b.label) {
        return 1;
    }
    return 0;
}

function proxy(fn, context) {
    return function() {
        return fn.apply(context, arguments);
    };
}



module.exports = TypeSelector;