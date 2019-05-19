(function() {
    var ws = null;
    var connected = false;

    var serverSchema   = '',
        serverHost     = '',
        serverPort     = '',
        serverPath     = '',
        serverParams   = '',
        filterMessage  = '',
        lastMsgsNum    = '',
        binaryType     = '',
        urlHistory     = '',
        favorites      = '',
        favApplyButton = '',
        favDelButton   = '',
        favAddButton   = '',
        showMsgTsMilliseconds = '';
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
        STG_URL_PATH_KEY   = 'ext_swc_path';
        STG_URL_PARAMS_KEY = 'ext_swc_params';
        STG_BIN_TYPE_KEY   = 'ext_swc_bintype';
        STG_REQUEST_KEY    = 'ext_swc_request';
        STG_MSG_TS_MS_KEY  = 'ext_swc_msg_ts_ms';
        STG_MSGS_NUM_KEY   = 'ext_swc_msgs_num';
    var lastMsgsNumCur = MAX_LINES_COUNT;

    var isBinaryTypeArrayBuffer = function() {
        return binaryType.val() == 'arraybuffer';
    }

    var enableUrl = function() {
        serverSchema.removeAttr('disabled');
        serverHost.removeAttr('disabled');
        serverPort.removeAttr('disabled');
        serverPath.removeAttr('disabled');
        serverParams.removeAttr('disabled');
        binaryType.removeAttr('disabled');
    };

    var getUrl = function() {
        var url = serverSchema.val() + '://' + serverHost.val();
        if (serverPort.val()) {
            url += ':' + serverPort.val();
        }
        if (serverPath.val()) {
            url += '/' + serverPath.val();
        }
        if (serverParams.val()) {
            url += '?' + serverParams.val();
        }
        return url;
    };

    var getNowDateStr = function() {
        var now = new Date();
        String(now.getDate()).padStart(2, "0");
        var res = now.getFullYear()
            + '-' + String(now.getMonth() + 1).padStart(2, "0")
            + '-' + String(now.getDate()).padStart(2, "0")
            + ' ' + String(now.getHours()).padStart(2, "0")
            + ':' + String(now.getMinutes()).padStart(2, "0")
            + ':' + String(now.getSeconds()).padStart(2, "0");
        if (showMsgTsMilliseconds.is(':checked')) {
            res += '.' + String(now.getMilliseconds()).padStart(3, "0");
        }
        return res;
    }

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
            path:       serverPath.val(),
            params:     serverParams.val(),
            binaryType: binaryType.val(),
        };
        localStorage.setItem(isFavorites ? STG_URL_FAV_KEY : STG_URL_HIST_KEY, JSON.stringify(data));
    };

    var disableUrl = function() {
        serverSchema.attr('disabled', 'disabled');
        serverHost.attr('disabled',   'disabled');
        serverPort.attr('disabled',   'disabled');
        serverPath.attr('disabled',   'disabled');
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
        lastMsgsNumCur = MAX_LINES_COUNT;
        var lastMsgsNumParsed = parseInt(lastMsgsNum.val(), 10);
        if (!isNaN(lastMsgsNumParsed)) {
            lastMsgsNumCur = lastMsgsNumParsed;
        }

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
        localStorage.setItem(STG_URL_PATH_KEY,   serverPath.val());
        localStorage.setItem(STG_URL_PARAMS_KEY, serverParams.val());
        localStorage.setItem(STG_BIN_TYPE_KEY,   binaryType.val());
        localStorage.setItem(STG_MSGS_NUM_KEY,   lastMsgsNum.val());

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
        lastMsgsNum.removeAttr('disabled');
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
        lastMsgsNum.attr('disabled', 'disabled');
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
        if (event.data !== undefined) {
            console.error('ERROR: ' + event.data);
        }
        close();
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
        var msg = $('<pre>').text('[' + getNowDateStr() + '] ' + data);
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
        while (msgBox.childNodes.length > lastMsgsNumCur) {
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

    var applyUrlData = function(data) {
        if (data.schema !== undefined) {
            serverSchema.val(data.schema);
        }
        if (data.host !== undefined) {
            serverHost.val(data.host);
        }
        if (data.port !== undefined) {
            serverPort.val(data.port);
        }
        if (data.path !== undefined) {
            serverPath.val(data.path);
        }
        if (data.params !== undefined) {
            serverParams.val(data.params);
        }
        if (data.binaryType !== undefined) {
            binaryType.val(data.binaryType);
        }
    };

    var applyCurrentFavorite = function(e) {
        var url = favorites.val(),
            data = getDataFromStorage(true);
        if (!(url in data)) {
            console.warn('could not retrieve favorites item');
            return;
        }
        applyUrlData(data[url]);
        close();
    };

    WebSocketClient = {
        init: function() {
            serverSchema  = $('#serverSchema');
            serverHost    = $('#serverHost');
            serverPort    = $('#serverPort');
            serverPath    = $('#serverPath');
            serverParams  = $('#serverParams');
            binaryType    = $('#binaryType');
            filterMessage = $('#filterMessage');
            lastMsgsNum   = $('#lastMsgsNum');
            urlHistory    = $('#urlHistory');
            favorites     = $('#favorites');

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
            showMsgTsMilliseconds = $('#showMsgTsMilliseconds');

            messages         = $('#messages');

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
            var stg_url_path = localStorage.getItem(STG_URL_PATH_KEY);
            if (stg_url_path !== null) {
                serverPath.val(stg_url_path);
            }
            var stg_url_params = localStorage.getItem(STG_URL_PARAMS_KEY);
            if (stg_url_params !== null) {
                serverParams.val(stg_url_params);
            }
            var stg_bin_type = localStorage.getItem(STG_BIN_TYPE_KEY);
            if (stg_bin_type !== null) {
                binaryType.val(stg_bin_type);
            }
            var stg_request = localStorage.getItem(STG_REQUEST_KEY);
            if (stg_request !== null) {
                sendMessage.val(stg_request);
            }
            var stg_msg_ts_ms = localStorage.getItem(STG_MSG_TS_MS_KEY);
            if (stg_msg_ts_ms !== null && stg_msg_ts_ms === 'true') {
                showMsgTsMilliseconds.prop('checked', true);
            }
            var stg_msgs_num = localStorage.getItem(STG_MSGS_NUM_KEY);
            if (stg_msgs_num !== null) {
                lastMsgsNum.val(stg_msgs_num);
            }

            urlHistory.change(function(e) {
                var url = urlHistory.val(),
                    url_hist = getDataFromStorage();
                if (!(url in url_hist)) {
                    console.warn('could not retrieve history item');
                    return;
                }
                applyUrlData(url_hist[url]);
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
                localStorage.setItem(STG_REQUEST_KEY, sendMessage.val());
            });

            clearMsgButton.click(function(e) {
                clearLog();
            });

            filterMessage.on('input', onFilter);

            var isCtrl;
            sendMessage.keyup(function (e) {
                if (e.which == 17) {
                    isCtrl = false;
                }
            }).keydown(function (e) {
                if (e.which == 17) {
                    isCtrl = true;
                }
                if (e.which == 13 && isCtrl === true) {
                    sendButton.click();
                    return false;
                }
            });

            showMsgTsMilliseconds.change(function() {
                localStorage.setItem(STG_MSG_TS_MS_KEY, showMsgTsMilliseconds.is(':checked'));
            });

            serverSchema.keydown(urlKeyDown);
            serverHost.keydown(urlKeyDown);
            serverPort.keydown(urlKeyDown);
            serverPath.keydown(urlKeyDown);
            serverParams.keydown(urlKeyDown);
        }
    };
})();

$(function() {
    WebSocketClient.init();
});
