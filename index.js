let ws = null;

let serverSchema = '';
let serverHost = '';
let serverPort = '';
let serverPath = '';
let serverParams = '';
let filterMessage = '';
let lastMsgsNum = '';
let binaryType = '';
let urlHistory = '';
let favorites = '';
let favApplyButton = '';
let favDelButton = '';
let favAddButton = '';
let delButton = '';
let showMsgTsMilliseconds = '';
let connectionStatus;
let sendMessage;
let oldSendMessageVal = '';
let messages;
let viewMessage;
let viewMessageChk;
let connectButton;
let disconnectButton;
let sendButton;
let sendButtonHelp;
let clearMsgButton;
let parseURLButton = '';

const MAX_LINES_COUNT = 1000;
const STG_URL_HIST_KEY = 'ext_swc_url_history';
const STG_URL_FAV_KEY = 'ext_swc_favorites';
const STG_URL_SCHEMA_KEY = 'ext_swc_schema';
const STG_URL_HOST_KEY = 'ext_swc_host';
const STG_URL_PORT_KEY = 'ext_swc_port';
const STG_URL_PATH_KEY = 'ext_swc_path';
const STG_URL_PARAMS_KEY = 'ext_swc_params';
const STG_BIN_TYPE_KEY = 'ext_swc_bintype';
const STG_REQUEST_KEY = 'ext_swc_request';
const STG_MSG_TS_MS_KEY = 'ext_swc_msg_ts_ms';
const STG_MSGS_NUM_KEY = 'ext_swc_msgs_num';

let lastMsgsNumCur = MAX_LINES_COUNT;

const JSONColorScheme = {
    keyColor: 'black',
    numberColor: 'blue',
    stringColor: 'green',
    trueColor: 'firebrick',
    falseColor: 'firebrick',
    nullColor: 'gray',
};

const isBinaryTypeArrayBuffer = function () {
    return binaryType.val() === 'arraybuffer';
};

const enableUrl = function () {
    serverSchema.removeAttr('disabled');
    serverHost.removeAttr('disabled');
    serverPort.removeAttr('disabled');
    serverPath.removeAttr('disabled');
    serverParams.removeAttr('disabled');
    binaryType.removeAttr('disabled');
};

const getUrl = function () {
    let url = `${serverSchema.val()}://${serverHost.val()}`;
    if (serverPort.val()) {
        url += `:${serverPort.val()}`;
    }
    if (serverPath.val()) {
        url += `/${serverPath.val()}`;
    }
    if (serverParams.val()) {
        url += `?${serverParams.val()}`;
    }
    return url;
};

const getNowDateStr = function () {
    const now = new Date();
    String(now.getDate()).padStart(2, '0');
    let res = `${now.getFullYear()}\
-${String(now.getMonth() + 1).padStart(2, '0')}\
-${String(now.getDate()).padStart(2, '0')}\
 ${String(now.getHours()).padStart(2, '0')}\
:${String(now.getMinutes()).padStart(2, '0')}\
:${String(now.getSeconds()).padStart(2, '0')}`;
    if (showMsgTsMilliseconds.is(':checked')) {
        res += `.${String(now.getMilliseconds()).padStart(3, '0')}`;
    }
    return res;
};

const getDataFromStorage = function (isFavorites) {
    const stgData = localStorage.getItem(isFavorites ? STG_URL_FAV_KEY : STG_URL_HIST_KEY);
    let ret = {};
    if (stgData !== null) {
        try {
            ret = JSON.parse(stgData);
        } catch (e) {
            console.error(`could not parse json from storage: ${e.message}`);
        }
    }
    return ret;
};

const updateDataInStorage = function (isFavorites) {
    const data = getDataFromStorage(isFavorites);
    const url = getUrl();

    data[url] = {
        schema: serverSchema.val(),
        host: serverHost.val(),
        port: serverPort.val(),
        path: serverPath.val(),
        params: serverParams.val(),
        binaryType: binaryType.val(),
    };
    localStorage.setItem(isFavorites ? STG_URL_FAV_KEY : STG_URL_HIST_KEY, JSON.stringify(data));
};

const disableUrl = function () {
    serverSchema.attr('disabled', 'disabled');
    serverHost.attr('disabled', 'disabled');
    serverPort.attr('disabled', 'disabled');
    serverPath.attr('disabled', 'disabled');
    serverParams.attr('disabled', 'disabled');
    binaryType.attr('disabled', 'disabled');
};

const enableConnectButton = function () {
    connectButton.hide();
    disconnectButton.show();
};

const disableConnectButton = function () {
    connectButton.show();
    disconnectButton.hide();
};

const wsIsAlive = function () {
    return (typeof (ws) === 'object'
        && ws !== null
        && 'readyState' in ws
        && ws.readyState === ws.OPEN
    );
};

const updateSelect = function (isFavorites, isFirstStart) {
    const hist = JSON.parse(localStorage.getItem(isFavorites ? STG_URL_FAV_KEY : STG_URL_HIST_KEY));
    const selectElement = isFavorites ? favorites : urlHistory;
    selectElement.find('option').remove().end();
    for (const url in hist) {
        selectElement.append($('<option></option>')
            .attr('value', url)
            .text(url));
    }
    if (isFavorites && isFirstStart) {
        selectElement.prop('selectedIndex', -1);
    }
};

const onOpen = function () {
    console.log(`OPENED: ${getUrl()}`);
    connectionStatus.css('color', '#009900');
    connectionStatus.text('OPENED');
    sendButton.removeAttr('disabled');
    sendButtonHelp.removeClass('disabledText');
    lastMsgsNum.attr('disabled', 'disabled');
};

const onClose = function () {
    ws = null;
};

const showViewMessagePanel = function () {
    if (viewMessage.is(':visible')) {
        return;
    }
    messages.css('width', 'calc(70vw - 54px)');
    viewMessage.attr('class', 'viewMessage');
    viewMessage.show();
    viewMessageChk.prop('checked', true);
};

const hideViewMessagePanel = function () {
    if (viewMessage.is(':hidden')) {
        return;
    }
    messages.css('width', 'calc(100vw - 54px)');
    viewMessage.hide();
    viewMessageChk.prop('checked', false);
};

const messageClickHandler = function (event) {
    if (!event.ctrlKey && !event.metaKey) {
        return;
    }
    viewMessage.text('');
    let dataDecoded;
    try {
        dataDecoded = JSON.parse(
            $(this).html().replace(/^\[[^\]]+?\]\s*/, ''),
        );
    } catch (e) {
        console.error(`could not parse json: ${e.message}`);
        return;
    }
    const colorizedJSON = jsonFormatHighlight(dataDecoded, JSONColorScheme);
    if (colorizedJSON === 'undefined') {
        return;
    }
    showViewMessagePanel();
    viewMessage.html(colorizedJSON);

    messages.find('pre').each(function () {
        $(this).css('background-color', '#fff');
    });
    $(this).css('background-color', '#eee');
};

const addMessage = function (data, type) {
    const msg = $('<pre>').text(`[${getNowDateStr()}] ${data}`);
    msg.click(messageClickHandler);
    const filterValue = filterMessage.val();

    if (filterValue && data.indexOf(filterValue) === -1) {
        msg.attr('hidden', true);
    }

    if (type === 'SENT') {
        msg.addClass('sent');
    }
    messages.append(msg);

    const msgBox = messages.get(0);
    while (msgBox.childNodes.length > lastMsgsNumCur) {
        msgBox.removeChild(msgBox.firstChild);
    }
    msgBox.scrollTop = msgBox.scrollHeight;
};

const onMessage = function (event) {
    let { data } = event;
    if (isBinaryTypeArrayBuffer()) {
        const buffer = new Uint8Array(data);
        data = new TextDecoder().decode(buffer).slice(1);
    }
    addMessage(data);
};

const close = function () {
    if (wsIsAlive()) {
        console.log('CLOSING ...');
        ws.close();
    }
    connectionStatus.css('color', '#000');
    connectionStatus.text('CLOSED');
    console.log(`CLOSED: ${getUrl()}`);

    enableUrl();
    disableConnectButton();
    sendButton.attr('disabled', 'disabled');
    sendButtonHelp.addClass('disabledText');
    lastMsgsNum.removeAttr('disabled');
};

const onError = function (event) {
    if (event.data !== undefined) {
        console.error(`ERROR: ${event.data}`);
    }
    close();
};

const open = function () {
    lastMsgsNumCur = Number(parseInt(lastMsgsNum.val(), 10));
    if (Number.isNaN(lastMsgsNumCur)) {
        lastMsgsNumCur = MAX_LINES_COUNT;
    } else {
        lastMsgsNum.val(lastMsgsNumCur);
    }

    const url = getUrl();
    ws = new WebSocket(url);
    if (isBinaryTypeArrayBuffer()) {
        ws.binaryType = 'arraybuffer';
    }
    ws.onopen = onOpen;
    ws.onclose = onClose;
    ws.onmessage = onMessage;
    ws.onerror = onError;

    console.log(`OPENING ${url} ...`);
    connectionStatus.css('color', '#999900');
    connectionStatus.text('OPENING ...');
    disableUrl();
    enableConnectButton();

    localStorage.setItem(STG_URL_SCHEMA_KEY, serverSchema.val());
    localStorage.setItem(STG_URL_HOST_KEY, serverHost.val());
    localStorage.setItem(STG_URL_PORT_KEY, serverPort.val());
    localStorage.setItem(STG_URL_PATH_KEY, serverPath.val());
    localStorage.setItem(STG_URL_PARAMS_KEY, serverParams.val());
    localStorage.setItem(STG_BIN_TYPE_KEY, binaryType.val());
    localStorage.setItem(STG_MSGS_NUM_KEY, lastMsgsNum.val());

    updateDataInStorage();
    updateSelect();
};

const clearLog = function () {
    messages.html('');
    viewMessage.html('');
    hideViewMessagePanel();
};

const onFilter = function (event) {
    messages.find('pre').each(function () {
        const element = $(this);

        if (element.html().indexOf(event.target.value) === -1) {
            element.attr('hidden', true);
        } else {
            element.removeAttr('hidden');
        }
    });
};

const urlKeyDown = function (e) {
    if (e.which === 13) {
        connectButton.click();
        return false;
    }
    return true;
};

const applyUrlData = function (data) {
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

const applyCurrentFavorite = function () {
    const url = favorites.val();
    const data = getDataFromStorage(true);
    if (!(url in data)) {
        console.warn('could not retrieve favorites item');
        return;
    }
    applyUrlData(data[url]);
    close();
};

const viewMessageToggle = function () {
    if ($(this).is(':checked')) {
        showViewMessagePanel();
    } else {
        hideViewMessagePanel();
    }
};

const urlHistoryOnChange = function () {
    const url = urlHistory.val();
    const urlHist = getDataFromStorage();
    if (!(url in urlHist)) {
        console.warn('could not retrieve history item');
        return;
    }
    applyUrlData(urlHist[url]);
    close();
};

const delButtonOnClick = function () {
    const url = urlHistory.val();
    const urlHist = getDataFromStorage();
    if (url in urlHist) {
        delete urlHist[url];
    }
    localStorage.setItem(STG_URL_HIST_KEY, JSON.stringify(urlHist));
    updateSelect();
};

const favDelButtonOnClick = function () {
    const url = favorites.val();
    const fav = getDataFromStorage(true);
    if (url in fav) {
        delete fav[url];
    }
    localStorage.setItem(STG_URL_FAV_KEY, JSON.stringify(fav));
    updateSelect(true);
};

const favAddButtonOnClick = function () {
    updateDataInStorage(true);
    updateSelect(true);
};

const parseURLButtonOnClick = function () {
    const urlRaw = window.prompt('enter ws connection URL');
    if (!urlRaw) {
        return;
    }
    let url = null;
    try {
        url = new URL(urlRaw);
    } catch (e) {
        alert(`could not parse URL: ${e.message}`);
        return;
    }
    serverSchema.val(url.protocol.replace(':', ''));
    let host = url.host.trim();
    if (url.port) {
        host = host.replace(new RegExp(`:${url.port}$`), '');
    }
    serverHost.val(host);
    serverPort.val(url.port);
    let path = url.pathname.trim();
    if (path.indexOf('/') === 0) {
        path = path.replace(/^\/+/, '');
    }
    serverPath.val(path);
    let params = url.search.trim();
    if (params.indexOf('?') === 0) {
        params = params.replace(/^\?+/, '');
    }
    serverParams.val(params);
};

const connectButtonOnClick = function () {
    if (wsIsAlive()) {
        close();
    }
    open();
};

const sendButtonOnClick = function () {
    const msg = sendMessage.val();
    addMessage(msg, 'SENT');
    ws.send(msg);
    localStorage.setItem(STG_REQUEST_KEY, msg);
};

const sendMessageOnKeydown = function (e) {
    if (wsIsAlive()
        && e.which === 13 && e.ctrlKey
    ) {
        sendButton.click();
    }
};

const sendMessageOnChange = function () {
    const msg = sendMessage.val();
    if (msg === oldSendMessageVal) {
        return;
    }
    oldSendMessageVal = msg;
    localStorage.setItem(STG_REQUEST_KEY, msg);
};

const showMsgTsMillisecondsOnChange = function () {
    localStorage.setItem(
        STG_MSG_TS_MS_KEY,
        showMsgTsMilliseconds.is(':checked'),
    );
};

const init = function () {
    serverSchema = $('#serverSchema');
    serverHost = $('#serverHost');
    serverPort = $('#serverPort');
    serverPath = $('#serverPath');
    serverParams = $('#serverParams');
    binaryType = $('#binaryType');
    filterMessage = $('#filterMessage');
    lastMsgsNum = $('#lastMsgsNum');
    urlHistory = $('#urlHistory');
    favorites = $('#favorites');

    connectionStatus = $('#connectionStatus');
    sendMessage = $('#sendMessage');

    delButton = $('#delButton');
    favApplyButton = $('#favApplyButton');
    favDelButton = $('#favDelButton');
    favAddButton = $('#favAddButton');
    connectButton = $('#connectButton');
    disconnectButton = $('#disconnectButton');
    sendButton = $('#sendButton');
    sendButtonHelp = $('#sendButtonHelp');
    clearMsgButton = $('#clearMessage');
    showMsgTsMilliseconds = $('#showMsgTsMilliseconds');
    viewMessageChk = $('#viewMessageChk');
    parseURLButton = $('#parseURLButton');

    messages = $('#messages');
    viewMessage = $('#viewMessage');

    updateSelect();
    updateSelect(true, true);

    const stgUrlSchema = localStorage.getItem(STG_URL_SCHEMA_KEY);
    if (stgUrlSchema !== null) {
        serverSchema.val(stgUrlSchema);
    }
    const stgUrlHost = localStorage.getItem(STG_URL_HOST_KEY);
    if (stgUrlHost !== null) {
        serverHost.val(stgUrlHost);
    }
    const stgUrlPort = localStorage.getItem(STG_URL_PORT_KEY);
    if (stgUrlPort !== null) {
        serverPort.val(stgUrlPort);
    }
    const stgUrlPath = localStorage.getItem(STG_URL_PATH_KEY);
    if (stgUrlPath !== null) {
        serverPath.val(stgUrlPath);
    }
    const stgUrlParams = localStorage.getItem(STG_URL_PARAMS_KEY);
    if (stgUrlParams !== null) {
        serverParams.val(stgUrlParams);
    }
    const stgBinType = localStorage.getItem(STG_BIN_TYPE_KEY);
    if (stgBinType !== null) {
        binaryType.val(stgBinType);
    }
    const stgRequest = localStorage.getItem(STG_REQUEST_KEY);
    if (stgRequest !== null) {
        sendMessage.val(stgRequest);
    }
    const stgMsgTsMs = localStorage.getItem(STG_MSG_TS_MS_KEY);
    if (stgMsgTsMs !== null && stgMsgTsMs === 'true') {
        showMsgTsMilliseconds.prop('checked', true);
    }
    const stgMsgsNum = localStorage.getItem(STG_MSGS_NUM_KEY);
    if (stgMsgsNum !== null) {
        lastMsgsNum.val(stgMsgsNum);
    }

    urlHistory.change(urlHistoryOnChange);
    favorites.change(applyCurrentFavorite);

    serverSchema.keydown(urlKeyDown);
    serverHost.keydown(urlKeyDown);
    serverPort.keydown(urlKeyDown);
    serverPath.keydown(urlKeyDown);
    serverParams.keydown(urlKeyDown);

    delButton.click(delButtonOnClick);

    favDelButton.click(favDelButtonOnClick);
    favApplyButton.click(applyCurrentFavorite);
    favAddButton.click(favAddButtonOnClick);

    parseURLButton.click(parseURLButtonOnClick);

    connectButton.click(connectButtonOnClick);
    disconnectButton.click(close);

    sendButton.click(sendButtonOnClick);
    sendMessage
        .keydown(sendMessageOnKeydown)
        .on('change', sendMessageOnChange);

    clearMsgButton.click(clearLog);
    filterMessage.on('input', onFilter);
    showMsgTsMilliseconds.change(showMsgTsMillisecondsOnChange);
    viewMessageChk.change(viewMessageToggle);
};

$(() => {
    init();
});
