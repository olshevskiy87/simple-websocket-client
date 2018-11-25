(function() {
    var ws = null;
    var connected = false;

    var serverSchema   = '',
        serverHost     = '',
        serverPort     = '',
        serverParams   = '',
        filterMessage  = '',
        binaryType     = '',
        urlHistory     = '',
        favorites      = '',
        favApplyButton = '',
        favDelButton   = '',
        favAddButton   = '';
    var connectionStatus;
    var sendMessage,
        messages;
    var connectButton,
        disconnectButton,
        sendButton,
        clearMsgButton;
    var MAX_LINES_COUNT    = 1000,
        STG_URL_HIST_KEY   = 'ext_swc_url_history',
        STG_URL_FAV_KEY    = 'ext_swc_favorites',
        STG_URL_SCHEMA_KEY = 'ext_swc_schema',
        STG_URL_HOST_KEY   = 'ext_swc_host',
        STG_URL_PORT_KEY   = 'ext_swc_port',
        STG_URL_PARAMS_KEY = 'ext_swc_params';
        STG_BIN_TYPE_KEY   = 'ext_swc_bintype';

    var isBinaryTypeArrayBuffer = function() {
        return binaryType.val() == 'arraybuffer';
    }

    var enableUrl = function() {
        serverSchema.removeAttr('disabled');
        serverHost.removeAttr('disabled');
        serverPort.removeAttr('disabled');
        serverParams.removeAttr('disabled');
        binaryType.removeAttr('disabled');
    };

    var getUrl = function() {
        var url = serverSchema.val() + '://' + serverHost.val();
        if (serverPort.val()) {
            url += ':' + serverPort.val();
        }
        if (serverParams.val()) {
            url += '?' + serverParams.val();
        }
        return url;
    };

    var getDataFromStorage = function(isFavorites) {
        var stg_data = localStorage.getItem(isFavorites ? STG_URL_FAV_KEY : STG_URL_HIST_KEY),
            ret = {};
        if (stg_data !== null) {
            try {
                ret = JSON.parse(stg_data);
            } catch (e) {
                console.error('could not parse json from storage: ' + e.message);
            }
        }
        return ret;
    };

    var updateDataInStorage = function (isFavorites) {
        var data = getDataFromStorage(isFavorites);
        var url = getUrl();

        data[url] = {
            schema:     serverSchema.val(),
            host:       serverHost.val(),
            port:       serverPort.val(),
            params:     serverParams.val(),
            binaryType: binaryType.val(),
        };
        localStorage.setItem(isFavorites ? STG_URL_FAV_KEY : STG_URL_HIST_KEY, JSON.stringify(data));
    };

    var disableUrl = function() {
        serverSchema.attr('disabled', 'disabled');
        serverHost.attr('disabled',   'disabled');
        serverPort.attr('disabled',   'disabled');
        serverParams.attr('disabled', 'disabled');
        binaryType.attr('disabled',   'disabled');
    };

    var enableConnectButton = function() {
        connectButton.hide();
        disconnectButton.show();
    };

    var disableConnectButton = function() {
        connectButton.show();
        disconnectButton.hide();
    };

    var wsIsAlive = function() {
        return (typeof(ws) === 'object'
            && ws !== null
            && 'readyState' in ws
            && ws.readyState === ws.OPEN
        );
    };

    var updateSelect = function(isFavorites, isFirstStart) {
        var hist = JSON.parse(localStorage.getItem(isFavorites ? STG_URL_FAV_KEY : STG_URL_HIST_KEY));
        var selectElement = isFavorites ? favorites : urlHistory;
        selectElement.find('option').remove().end();
        for (var url in hist) {
            selectElement.append($('<option></option>')
                .attr('value', url)
                .text(url));
        }
        if (isFavorites && isFirstStart) {
            selectElement.prop('selectedIndex', -1);
        }
    };

    var open = function() {
        var url = getUrl();
        ws = new WebSocket(url);
        if (isBinaryTypeArrayBuffer()) {
            ws.binaryType = 'arraybuffer';
        }
        ws.onopen    = onOpen;
        ws.onclose   = onClose;
        ws.onmessage = onMessage;
        ws.onerror   = onError;

        console.log('OPENING ' + url + ' ...');
        connectionStatus.css('color', '#999900');
        connectionStatus.text('OPENING ...');
        disableUrl();
        enableConnectButton();

        localStorage.setItem(STG_URL_SCHEMA_KEY, serverSchema.val());
        localStorage.setItem(STG_URL_HOST_KEY,   serverHost.val());
        localStorage.setItem(STG_URL_PORT_KEY,   serverPort.val());
        localStorage.setItem(STG_URL_PARAMS_KEY, serverParams.val());
        localStorage.setItem(STG_BIN_TYPE_KEY,   binaryType.val());

        updateDataInStorage();
        updateSelect();
    };

    var close = function() {
        if (wsIsAlive()) {
            console.log('CLOSING ...');
            ws.close();
        }
        connected = false;
        connectionStatus.css('color', '#000');
        connectionStatus.text('CLOSED');
        console.log('CLOSED: ' + getUrl());

        enableUrl();
        disableConnectButton();
        sendMessage.attr('disabled', 'disabled');
        sendButton.attr('disabled', 'disabled');
    };

    var clearLog = function() {
        messages.html('');
    };

    var onOpen = function() {
        console.log('OPENED: ' + getUrl());
        connected = true;
        connectionStatus.css('color', '#009900');
        connectionStatus.text('OPENED');
        sendMessage.removeAttr('disabled');
        sendButton.removeAttr('disabled');
    };

    var onClose = function(event) {
        ws = null;
    };

    var onMessage = function(event) {
        var data = event.data;
        if (isBinaryTypeArrayBuffer()) {
            var buffer = new Uint8Array(data);
            data = new TextDecoder().decode(buffer).slice(1);
        }
        addMessage(data);
    };

    var onError = function(event) {
        console.error('ERROR: ' + event.data);
    };

    var onFilter = function (event) {
        var filteredMessages = messages
            .find('pre')
            .each(function () {
                var element = $(this);

                if (element.html().indexOf(event.target.value) === -1) {
                    element.attr('hidden', true);
                } else {
                    element.removeAttr('hidden');
                }
            });
    };

    var addMessage = function(data, type) {
        var msg = $('<pre>').text('[' + moment().format('YYYY-MM-DD HH:mm:ss') + '] ' + data);
        var filterValue = filterMessage.val();

        if (filterValue && data.indexOf(filterValue) === -1) {
            msg.attr('hidden', true);
        }

        if (type === 'SENT') {
            msg.addClass('sent');
        }
        var messages = $('#messages');
        messages.append(msg);

        var msgBox = messages.get(0);
        while (msgBox.childNodes.length > MAX_LINES_COUNT) {
            msgBox.removeChild(msgBox.firstChild);
        }
        msgBox.scrollTop = msgBox.scrollHeight;
    };

    var urlKeyDown = function(e) {
        if (e.which == 13) {
            connectButton.click();
            return false;
        }
    };

    var applyCurrentFavorite = function(e) {
        var url = favorites.val(),
            data = getDataFromStorage(true);
        if (!(url in data)) {
            console.warn('could not retrieve favorites item');
            return;
        }
        var url_data = data[url];
        serverSchema.val(url_data.schema);
        serverHost.val(url_data.host);
        serverPort.val(url_data.port);
        serverParams.val(url_data.params);
        binaryType.val(url_data.binaryType);
        close();
    };

    WebSocketClient = {
        init: function() {
            serverSchema  = $('#serverSchema');
            serverHost    = $('#serverHost');
            serverPort    = $('#serverPort');
            serverParams  = $('#serverParams');
            binaryType    = $('#binaryType');
            filterMessage = $('#filterMessage');
            urlHistory    = $('#urlHistory');
            favorites     = $('#favorites');

            updateSelect();
            updateSelect(true, true);

            var stg_url_schema = localStorage.getItem(STG_URL_SCHEMA_KEY);
            if (stg_url_schema !== null) {
                serverSchema.val(stg_url_schema);
            }
            var stg_url_host = localStorage.getItem(STG_URL_HOST_KEY);
            if (stg_url_host !== null) {
                serverHost.val(stg_url_host);
            }
            var stg_url_port = localStorage.getItem(STG_URL_PORT_KEY);
            if (stg_url_port !== null) {
                serverPort.val(stg_url_port);
            }
            var stg_url_params = localStorage.getItem(STG_URL_PARAMS_KEY);
            if (stg_url_params !== null) {
                serverParams.val(stg_url_params);
            }
            var stg_bin_type = localStorage.getItem(STG_BIN_TYPE_KEY);
            if (stg_bin_type !== null) {
                binaryType.val(stg_bin_type);
            }

            connectionStatus = $('#connectionStatus');
            sendMessage      = $('#sendMessage');

            delButton        = $('#delButton');
            favApplyButton   = $('#favApplyButton');
            favDelButton     = $('#favDelButton');
            favAddButton     = $('#favAddButton');
            connectButton    = $('#connectButton');
            disconnectButton = $('#disconnectButton');
            sendButton       = $('#sendButton');
            clearMsgButton   = $('#clearMessage');

            messages         = $('#messages');

            urlHistory.change(function(e) {
                var url = urlHistory.val(),
                    url_hist = getDataFromStorage();
                if (!(url in url_hist)) {
                    console.warn('could not retrieve history item');
                }
                var url_data = url_hist[url];
                serverSchema.val(url_data.schema);
                serverHost.val(url_data.host);
                serverPort.val(url_data.port);
                serverParams.val(url_data.params);
                binaryType.val(url_data.binaryType);
                close();
            });

            favorites.change(applyCurrentFavorite);

            delButton.click(function(e) {
                var url = urlHistory.val(),
                    url_hist = getDataFromStorage();
                if (url in url_hist) {
                    delete url_hist[url];
                }
                localStorage.setItem(STG_URL_HIST_KEY, JSON.stringify(url_hist));
                updateSelect();
            });

            favDelButton.click(function(e) {
                var url = favorites.val(),
                    fav = getDataFromStorage(true);
                if (url in fav) {
                    delete fav[url];
                }
                localStorage.setItem(STG_URL_FAV_KEY, JSON.stringify(fav));
                updateSelect(true);
            });

            favApplyButton.click(function(e) {
                applyCurrentFavorite();
            });

            favAddButton.click(function(e) {
                updateDataInStorage(true);
                updateSelect(true);
            });

            connectButton.click(function(e) {
                if (wsIsAlive()) {
                    close();
                }
                open();
            });

            disconnectButton.click(function(e) {
                close();
            });

            sendButton.click(function(e) {
                var msg = sendMessage.val();
                addMessage(msg, 'SENT');
                ws.send(msg);
            });

            clearMsgButton.click(function(e) {
                clearLog();
            });

            filterMessage.on('input', onFilter);

            var isCtrl;
            sendMessage.keyup(function (e) {
                if(e.which == 17) isCtrl=false;
            }).keydown(function (e) {
                if(e.which == 17) isCtrl=true;
                if(e.which == 13 && isCtrl === true) {
                    sendButton.click();
                    return false;
                }
            });
            serverSchema.keydown(urlKeyDown);
            serverHost.keydown(urlKeyDown);
            serverPort.keydown(urlKeyDown);
            serverParams.keydown(urlKeyDown);
        }
    };
})();

$(function() {
    WebSocketClient.init();
});
