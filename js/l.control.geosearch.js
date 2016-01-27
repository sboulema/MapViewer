/*
 * L.Control.GeoSearch - search for an address and zoom to its location
 * https://github.com/smeijer/L.GeoSearch
 */

L.GeoSearch = {};
L.GeoSearch.Provider = {};

L.GeoSearch.Result = function (x, y, label, bounds, details) {
    this.X = x;
    this.Y = y;
    this.Label = label;
    this.bounds = bounds;

    if (details)
        this.details = details;
};

L.Control.GeoSearch = L.Control.extend({
    options: {
        position: 'topcenter',
        showMarker: true,
        retainZoomLevel: false,
        draggable: false
    },

    _config: {
        country: '',
        searchLabel: 'search for address ...',
        notFoundMessage: 'Sorry, that address could not be found.',
        messageHideDelay: 3000,
        zoomLevel: 18,
		enableButtons: false,
		enableAutocomplete: false,              
		autocompleteMinQueryLen: 3,                                                        
		autocompleteQueryDelay_ms: 600
    },

    initialize: function (options) {
        L.Util.extend(this.options, options);
        L.Util.extend(this._config, options);
    },

    onAdd: function (map) {
        var $controlContainer = map._controlContainer,
            nodes = $controlContainer.childNodes,
            topCenter = false;

        for (var i = 0, len = nodes.length; i < len; i++) {
            var klass = nodes[i].className;
            if (/leaflet-top/.test(klass) && /leaflet-center/.test(klass)) {
                topCenter = true;
                break;
            }
        }

        if (!topCenter) {
            var tc = document.createElement('div');
            tc.className += 'leaflet-top leaflet-center';
            $controlContainer.appendChild(tc);
            map._controlCorners.topcenter = tc;
        }

        this._map = map;
        this._container = L.DomUtil.create('div', 'leaflet-control-geosearch');

        var searchbox = document.createElement('input');
        searchbox.id = 'leaflet-control-geosearch-qry';
        searchbox.type = 'text';
        searchbox.placeholder = this._config.searchLabel;
        this._searchbox = searchbox;

        if (this._autocomplete) {
            this._autocomplete.recordLastUserInput('');
        }

        if (this._config.enableButtons) {
            var submitContainer = L.DomUtil.create('div', 'leaflet-geosearch-submit-button-container', this._container);
            L.DomUtil.create('span', 'leaflet-geosearch-submit-button', submitContainer);
            var cancelButton = L.DomUtil.create('span', 'leaflet-geosearch-cancel-button', this._container);
            L.DomEvent.on(submitContainer, 'click', this._submitRequest, this);
            L.DomEvent.on(cancelButton, 'click', this._clearUserSearchInput, this);
        }
		
        var msgbox = document.createElement('div');
        msgbox.id = 'leaflet-control-geosearch-msg';
        msgbox.className = 'leaflet-control-geosearch-msg';
        this._msgbox = msgbox;

        var resultslist = document.createElement('ul');
        resultslist.id = 'leaflet-control-geosearch-results';
        this._resultslist = resultslist;

        this._msgbox.appendChild(this._resultslist);
        this._container.appendChild(this._searchbox);
        this._container.appendChild(this._msgbox);

        if (this._config.enableAutocomplete) {
            this._autocomplete = new L.AutoComplete({}).addTo(this._container, function (suggestionText) {
                this._searchbox.value = suggestionText;
            }.bind(this));
            $(this._container).append(this._autocomplete);
        }
		
        L.DomEvent
          .addListener(this._container, 'click', L.DomEvent.stop)
          .addListener(this._container, 'keyup', this._onKeyUp, this)
          .addListener(this._container, 'change', this._onInputUpdate, this)
          .addListener(this._container, 'paste', this._onPasteToInput, this);

        L.DomEvent.disableClickPropagation(this._container);

        return this._container;
    },

    geosearch: function (qry) {
		this.geosearch_ext(qry, this._processResults.bind(this), this._printError.bind(this));
    },
	
	geosearch_ext: function(qry, onSuccess, onFailure) {
        var that = this;
        try {
            var provider = this._config.provider;

            if(typeof provider.GetLocations == 'function') {
                var results = provider.GetLocations(qry, function(results) {
                    onSuccess(results);
                });
            }
            else {
                var url = provider.GetServiceUrl(qry);
                this.sendRequest(provider, url, onSuccess, onFailure);
            }
        }
        catch (error) {
            onFailure(error);
        }
    },

    // qry may be a String or a function
    geosearch_autocomplete: function (qry, requestDelay_ms) {
        if (!this._config.enableAutocomplete) {
            return;
        }

        clearTimeout(this._autocompleteRequestTimer);

        this._autocompleteRequestTimer = setTimeout(function () {
            var q = qry;
            if (typeof qry === 'function') {
                q = qry();
            }
            if (q.length >= this._config.autocompleteMinQueryLen) {
                this.geosearch_ext(q, this._autocomplete.show.bind(this._autocomplete), this._autocomplete.hide.bind(this._autocomplete));
            } else {
               this._autocomplete.hide();
            }
        }.bind(this), requestDelay_ms);
    },
	
    sendRequest: function (provider, url, onSuccess, onFailure) {
        var that = this;

        window.parseLocation = function (response) {
            var results = provider.ParseJSON(response);
            that._processResults(results);

            document.body.removeChild(document.getElementById('getJsonP'));
            delete window.parseLocation;
        };

        function getJsonP (url) {
            url = url + '&callback=parseLocation';
            var script = document.createElement('script');
            script.id = 'getJsonP';
            script.src = url;
            script.async = true;
            document.body.appendChild(script);
        }

        if (XMLHttpRequest) {
            var xhr = new XMLHttpRequest();

            if ('withCredentials' in xhr) {
                var xhr = new XMLHttpRequest();

                xhr.onreadystatechange = function () {
                    if (xhr.readyState == 4) {
                        if (xhr.status == 200) {
							if (xhr.getResponseHeader('content-type').indexOf('application/json') > -1) {
								var response = JSON.parse(xhr.responseText),
                                results = provider.ParseJSON(response);
							} else {
								results = provider.ParseJSON(xhr.responseText);
							}							
                            onSuccess(results);
                        } else if (xhr.status == 0 || xhr.status == 400) {
                            getJsonP(url);
                        } else {
                            onFailure(xhr.responseText);
                        }
                    }
                };

                xhr.open('GET', url, true);
                xhr.send();
            } else if (XDomainRequest) {
                var xdr = new XDomainRequest();

                xdr.onerror = function (err) {
                    onFailure(err);
                };

                xdr.onload = function () {
                    var response = JSON.parse(xdr.responseText),
                        results = provider.ParseJSON(response);

                    onSuccess(results);
                };

                xdr.open('GET', url);
                xdr.send();
            } else {
                getJsonP(url);
            }
        }
    },

    _processResults: function(results) {
        if (results.length > 0) {
            this._map.fireEvent('geosearch_foundlocations', {Locations: results});
            this._showLocation(results[0]);
        } else {
            this._printError(this._config.notFoundMessage);
        }
    },

    _showLocation: function (location) {
        if (this.options.showMarker == true) {
            if (typeof this._positionMarker === 'undefined') {
                this._positionMarker = L.marker(
                    [location.Y, location.X],
                    {draggable: this.options.draggable}
                ).addTo(this._map);
            }
            else {
                this._positionMarker.setLatLng([location.Y, location.X]);
            }
        }
        if (!this.options.retainZoomLevel && location.bounds && location.bounds.isValid()) {
            this._map.fitBounds(location.bounds);
        }
        else {
            this._map.setView([location.Y, location.X], this._getZoomLevel(), false);
        }

        this._map.fireEvent('geosearch_showlocation', {
          Location: location,
          Marker : this._positionMarker
        });
    },

    _printError: function(message) {
        var elem = this._resultslist;
        elem.innerHTML = '<li>' + message + '</li>';
        elem.style.display = 'block';

        this._map.fireEvent('geosearch_error', {message: message});

        setTimeout(function () {
            elem.style.display = 'none';
        }, 3000);
    },

    _submitRequest: function () {
        var q = $('#leaflet-control-geosearch-qry').val();
        if (q.length > 0) {
            this._hideAutocomplete();
            this.geosearch(q);
        }
    },

    _hideAutocomplete: function () {
        clearTimeout(this._autocompleteRequestTimer);
        if (this._config.enableAutocomplete && this._autocomplete.isVisible()) {
            this._autocomplete.hide();
            return true;
        }
        return false;
    },

    _clearUserSearchInput: function () {
        this._hideAutocomplete();
        $('#leaflet-control-geosearch-qry').val('');
        $('.leaflet-geosearch-cancel-button').hide();
    },
     
    _onPasteToInput: function () {
        // onpaste requires callback to allow for input update do this by default.
        setTimeout(this._onInputUpdate.bind(this), 0);
    },

    _onInputUpdate: function () {
        // define function for requery of user input after delay
        function getQuery() {
            return $('#leaflet-control-geosearch-qry').val();
        }
        var qry = getQuery();

        if (this._config.enableAutocomplete) {
            this._autocomplete.recordLastUserInput(qry);
            if (qry.length >= this._config.autocompleteMinQueryLen) {
                this.geosearch_autocomplete(getQuery, this._config.autocompleteQueryDelay_ms);
            } else {
                this._autocomplete.hide();
            }
        }

        if (qry.length > 0) {
            $('.leaflet-geosearch-cancel-button').show();
        } else {
            $('.leaflet-geosearch-cancel-button').hide();
        }
    },

     _onKeyUp: function (e) {
        var REQ_DELAY_MS = 800;
        var MIN_AUTOCOMPLETE_LEN = 3;
        var enterKey = 13;
        var shift = 16;
        var ctrl = 17;
        var escapeKey = 27;
        var leftArrow = 37;
        var upArrow = 38;
        var rightArrow = 39;
        var downArrow = 40;
 
        switch (e.keyCode) {
            case escapeKey:
                // ESC first closes autocomplete if open. If closed then clears input.
                if (!this._hideAutocomplete()) {
                    this._clearUserSearchInput();
                }
                break;
            case enterKey:
                this._submitRequest();
                break;
            case upArrow:
                if (this._config.enableAutocomplete && this._autocomplete.isVisible()) {
                    this._autocomplete.moveUp();
                }
                break;
            case downArrow:
                if (this._config.enableAutocomplete && this._autocomplete.isVisible()) {
                    this._autocomplete.moveDown();
                }
                break;
            case leftArrow:
            case rightArrow:
            case shift:
            case ctrl:
                break;
            default:
                this._onInputUpdate();
         }
     },

    _getZoomLevel: function() {
        if (! this.options.retainZoomLevel) {
            return this._config.zoomLevel;
        }
        return this._map.zoom;
    }

});

L.AutoComplete = L.Class.extend({
    initialize: function (options) {
        this._config = {};
        this.setConfig(options);
    },

    setConfig: function (options) {
        this._config = {
            'maxResultCount': options.maxResultCount || 10,
            'onMakeSuggestionHTML': options.onMakeSuggestionHTML || function (geosearchResult) {
                return this._htmlEscape(geosearchResult.Label);
            }.bind(this),
        };
    },

    addTo: function (container, onSelectionCallback) {
        this._container = container;
        this._onSelection = onSelectionCallback;
        return this._createUI(container, 'leaflet-geosearch-autocomplete');
    },

    recordLastUserInput: function (str) {
        this._lastUserInput = str;
    },

    _createUI: function (container, className) {
        this._tool = L.DomUtil.create('div', className, container);
        this._tool.style.display = 'none';
        L.DomEvent
            .disableClickPropagation(this._tool)
            // consider whether to make delayed hide onBlur.
            // If so, consider canceling timer on mousewheel and mouseover.
            .on(this._tool, 'blur', this.hide, this) 
            .on(this._tool, 'mousewheel', function(e) {
                L.DomEvent.stopPropagation(e); // to prevent map zoom
                if (e.axis === e.VERTICAL_AXIS) {
                    if (e.detail > 0) {
                        this.moveDown();
                    } else {
                        this.moveUp();
                    }
                }
            }, this);
        return this;
    },


    show: function (results) {
        this._tool.innerHTML = '';
        this._tool.currentSelection = -1;
        var count = 0;
        while (count < results.length && count < this._config.maxResultCount) {
            var entry = this._newSuggestion(results[count]);
            this._tool.appendChild(entry);
            ++count;
        }
        if (count > 0) {
            this._tool.style.display = 'block';
        } else {
            this.hide();
        }
        return count;
    },
    hide: function () {
        this._tool.style.display = 'none';
        this._tool.innerHTML = '';
    },

    isVisible: function() {
        return this._tool.style.display !== 'none';
    },

    _htmlEscape: function (str) {
        // implementation courtesy of http://stackoverflow.com/a/7124052
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;');
    },

    _newSuggestion: function (result) {
        var tip = L.DomUtil.create('li', 'leaflet-geosearch-suggestion');
        tip.innerHTML = this._config.onMakeSuggestionHTML(result);
        tip._text = result.Label;
        L.DomEvent
            .disableClickPropagation(tip)
            .on(tip, 'click', function(e) {
                this._onSelection(tip._text);
            }.bind(this), this);
        return tip;
    },
    _onSelectedUpdate: function () {
        var entries = this._tool.hasChildNodes() ? this._tool.childNodes : [];
        for (var ii=0; ii < entries.length; ++ii) {
            L.DomUtil.removeClass(entries[ii], 'leaflet-geosearch-suggestion-selected');
        }

        // if selection is -1, then show last user typed text
        if (this._tool.currentSelection >= 0) {
            L.DomUtil.addClass(entries[this._tool.currentSelection], 'leaflet-geosearch-suggestion-selected');

            // scroll:
            var tipOffsetTop = entries[this._tool.currentSelection].offsetTop;
            if (tipOffsetTop + entries[this._tool.currentSelection].clientHeight >= this._tool.scrollTop + this._tool.clientHeight) {
                this._tool.scrollTop = tipOffsetTop - this._tool.clientHeight + entries[this._tool.currentSelection].clientHeight;
            }
            else if (tipOffsetTop <= this._tool.scrollTop) {
                this._tool.scrollTop = tipOffsetTop;
            }

            this._onSelection(entries[this._tool.currentSelection]._text);
        } else {
            this._onSelection(this._lastUserInput);
        }
    },
    moveUp: function () {
        // permit selection to decrement down to -1 (none selected)
        if (this.isVisible() && this._tool.currentSelection >= 0) {
            --this._tool.currentSelection;
            this._onSelectedUpdate();
        }
        return this;
    },
    moveDown: function () {
        if (this.isVisible()) {
            this._tool.currentSelection = (this._tool.currentSelection + 1) % this.suggestionCount();
            this._onSelectedUpdate();
        }
        return this;
    },
    suggestionCount: function () {
        return this._tool.hasChildNodes() ? this._tool.childNodes.length : 0;
    },
});