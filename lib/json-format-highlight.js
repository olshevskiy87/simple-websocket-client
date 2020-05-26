// The MIT License (MIT)
// Copyright (c) luyilin <luyilin12@gmail.com> (https://github.com/luyilin)

(function (global, factory) {
	typeof exports === 'object' && typeof module !== 'undefined' ? module.exports = factory() :
	typeof define === 'function' && define.amd ? define(factory) :
	(global.jsonFormatHighlight = factory());
}(this, (function () { 'use strict';

var defaultColors = {
  keyColor: 'dimgray',
  numberColor: 'lightskyblue',
  stringColor: 'lightcoral',
  trueColor: 'lightseagreen',
  falseColor: '#f66578',
  nullColor: 'cornflowerblue'
};

var entityMap = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
  '`': '&#x60;',
  '=': '&#x3D;'
};

function escapeHtml(html) {
  return String(html).replace(/[&<>"'`=]/g, function (s) {
    return entityMap[s];
  });
}

function index (json, colorOptions) {
  if ( colorOptions === void 0 ) colorOptions = {};

  var valueType = typeof json;
  if (valueType !== 'string') {
    json = JSON.stringify(json, null, 2) || valueType;
  }
  var colors = Object.assign({}, defaultColors, colorOptions);
  json = json.replace(/&/g, '&').replace(/</g, '<').replace(/>/g, '>');
  return json.replace(/("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+]?\d+)?)/g, function (match) {
    var color = colors.numberColor;
    var style = '';
    if (/^"/.test(match)) {
      if (/:$/.test(match)) {
        color = colors.keyColor;
      } else {
        color = colors.stringColor;
        match = '"' + escapeHtml(match.substr(1, match.length - 2)) + '"';
        style = 'word-wrap:break-word;white-space:pre-wrap;';
      }
    } else {
      color = /true/.test(match) ? colors.trueColor : /false/.test(match) ? colors.falseColor : /null/.test(match) ? colors.nullColor : color;
    }
    return ("<span style=\"" + style + "color:" + color + "\">" + match + "</span>");
  });
}

return index;

})));
