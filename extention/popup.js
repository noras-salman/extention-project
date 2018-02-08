// Copyright (c) 2014 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
/**
 * Get the current URL.
 *
 * @param {function(string)} callback called when the URL of the current tab
 *   is found.
 */
function getCurrentTabUrl(callback) {
    // Query filter to be passed to chrome.tabs.query - see
    // https://developer.chrome.com/extensions/tabs#method-query
    var queryInfo = {
        active: true,
        currentWindow: true
    };

    chrome.tabs.query(queryInfo, (tabs) => {
        // chrome.tabs.query invokes the callback with a list of tabs that match the
        // query. When the popup is opened, there is certainly a window and at least
        // one tab, so we can safely assume that |tabs| is a non-empty array.
        // A window can only have one active tab at a time, so the array consists of
        // exactly one tab.
        var tab = tabs[0];

        // A tab is a plain object that provides information about the tab.
        // See https://developer.chrome.com/extensions/tabs#type-Tab
        var url = tab.url;

        // tab.url is only available if the "activeTab" permission is declared.
        // If you want to see the URL of other tabs (e.g. after removing active:true
        // from |queryInfo|), then the "tabs" permission is required to see their
        // "url" properties.
        console.assert(typeof url == 'string', 'tab.url should be a string');

        callback(url);
    });

    // Most methods of the Chrome extension APIs are asynchronous. This means that
    // you CANNOT do something like this:
    //
    // var url;
    // chrome.tabs.query(queryInfo, (tabs) => {
    //   url = tabs[0].url;
    // });
    // alert(url); // Shows "undefined", because chrome.tabs.query is async.
}

/**
 * Change the background color of the current page.
 *
 * @param {string} color The new background color.
 */
function changeBackgroundColor(color) {
    var script = 'document.body.style.backgroundColor="' + color + '";';
    // See https://developer.chrome.com/extensions/tabs#method-executeScript.
    // chrome.tabs.executeScript allows us to programmatically inject JavaScript
    // into a page. Since we omit the optional first argument "tabId", the script
    // is inserted into the active tab of the current window, which serves as the
    // default.
    chrome.tabs.executeScript({
        code: script
    });
}

/**
 * Gets the saved background color for url.
 *
 * @param {string} url URL whose background color is to be retrieved.
 * @param {function(string)} callback called with the saved background color for
 *     the given url on success, or a falsy value if no color is retrieved.
 */
function getSavedBackgroundColor(url, callback) {
    // See https://developer.chrome.com/apps/storage#type-StorageArea. We check
    // for chrome.runtime.lastError to ensure correctness even when the API call
    // fails.
    chrome.storage.sync.get(url, (items) => {
        callback(chrome.runtime.lastError ? null : items[url]);
    });
}

/**
 * Sets the given background color for url.
 *
 * @param {string} url URL for which background color is to be saved.
 * @param {string} color The background color to be saved.
 */
function saveBackgroundColor(url, color) {
    var items = {};
    items[url] = color;
    // See https://developer.chrome.com/apps/storage#type-StorageArea. We omit the
    // optional callback since we don't need to perform any action once the
    // background color is saved.
    chrome.storage.sync.set(items);
}

// This extension loads the saved background color for the current tab if one
// exists. The user can select a new background color from the dropdown for the
// current page, and it will be saved as part of the extension's isolated
// storage. The chrome.storage API is used for this purpose. This is different
// from the window.localStorage API, which is synchronous and stores data bound
// to a document's origin. Also, using chrome.storage.sync instead of
// chrome.storage.local allows the extension data to be synced across multiple
// user devices.
document.addEventListener('DOMContentLoaded', () => {
    getCurrentTabUrl((url) => {

        var dropdown = document.getElementById('dropdown');

        document.getElementById("url_holder").innerHTML = "Looking at:<b>" + urlAdd(url, "") + "</b>";


        var flag_cout = 0;
        var xhr = new XMLHttpRequest();
        xhr.open("GET", urlAdd(url, "robots.txt"), true);
        xhr.onreadystatechange = function() {
            if (xhr.readyState == 4) {
                // innerText does not let the attacker inject HTML elements.
                var content = xhr.responseText;

                var content2 = xhr.responseText.toLowerCase();
                var n1 = content2.search("not found");
                var n2 = content2.search("404");
                if (n1 > 0 || n2 > 0) {
                    document.getElementById("robot_holder").innerHTML = "Error thrown ";
                } else {
                    if (content.match(new RegExp("\n", "g") || []).length > 20)
                        content = "";
                    else
                        content = "<br /><br />" + content.replaceAll("\n", "<br />");
                    document.getElementById("robot_holder").innerHTML = '<a href="' + urlAdd(url, "robots.txt") + '">Robots.txt Found</a>' + content;
                    flag_cout += 1;
                    chrome.browserAction.setBadgeText({
                        text: flag_cout + ""
                    });

                }
            }
        }
        xhr.send();

        var xhr2 = new XMLHttpRequest();
        xhr2.open("GET", url, true);
        xhr2.onreadystatechange = function() {
            if (xhr2.readyState == 4) {


                var regex = new RegExp("(href|src)=[\"|']((?!mailto|https).*?)[\"|']", "g");
                var regex2 = new RegExp("<!--(.*)-->", "g");
                var res = getAllMatches(regex, xhr2.responseText);
                var res2 = getAllMatches(regex2, xhr2.responseText);
                var resources = "";
                res.forEach(function(item) {
                    resources += item[0] + "<br />";
                });

                var comments = ""
                res2.forEach(function(comment) {
                    comments += encodeHTML(comment[0].replaceAll("<!--", "").replaceAll("-->", "")) + "<br />";
                });

                var headersTable='<table class="table">';
                var str_array = xhr2.getAllResponseHeaders().split('\n');

                for(var i = 0; i < str_array.length; i++) {
                   // Trim the excess whitespace.
                  var key = str_array[i].substring(0,str_array[i].indexOf(':'));
                  var value = str_array[i].substring(str_array[i].indexOf(':')+1,str_array[i].length);
                   headersTable+="<tr><td>"+key+"</td><td>"+value+"</td></tr>";

                }
                 headersTable+="</table>";
                document.getElementById("headers_holder").innerHTML = headersTable;
                document.getElementById("resources_holder").innerHTML = resources;
                document.getElementById("comments_holder").innerHTML = comments;


            }
        }
        xhr2.send();



        var xhr3 = new XMLHttpRequest();
        xhr3.open("GET", urlAdd(url, ".git/logs/HEAD"), true);
        xhr3.onreadystatechange = function() {
            if (xhr3.readyState == 4) {
                var content = xhr.responseText.toLowerCase();
                var n1 = content.search("not found");
                var n2 = content.search("404");
                // innerText does not let the attacker inject HTML elements.
                if (n1 > 0 || n2 > 0) {
                    document.getElementById("git_holder").innerHTML = '<a href="' + urlAdd(url, ".git/logs/HEAD") + '">Git HEAD Found</a> user https://github.com/internetwache/GitTools ';
                    flag_cout += 1;
                    chrome.browserAction.setBadgeText({
                        text: flag_cout + ""
                    });
                } else
                    document.getElementById("git_holder").innerHTML = 'Not found code thrown  ';


            }
        }
        xhr3.send();

        var moreInfo = "";
        if (url.search("page=") > 0 || url.search("p=") > 0) {
            moreInfo += "try page=php://filter/convert.base64-encode/resource=index.php";
        }

        if (moreInfo != "")
            document.getElementById("more_holder").innerHTML = moreInfo;

        getCookies(url);
        getForms();


    });



    document.getElementById("encoder_button").onclick = function() {

        handleEncoderClick();


    };

});

function getCookies(url) {
    var domain = url2Domain(url);
    var cookiesStr = 'Domain:  <b><i>' + domain + '</b></i><br />';
    //cookiesStr+="<table class='class'><tr><td>Name</td><td>Value</td><td>Session</td><td>Path</td><td>Domain</td></tr>";
    chrome.cookies.getAll({
        'domain': domain
    }, function(cookies) {
        for (var i = 0; i < cookies.length; i++) {
            var b64 = "";
            try {
                b64 = "<i>base64:</i><b>" + b64DecodeUnicode(cookies[i].value) + "</b> <br /> ";
            } catch (err) {}
            var jwts="";
            var regex2 = new RegExp("[A-Za-z0-9-_=]+[.][A-Za-z0-9-_=]+[.][A-Za-z0-9-_.+/=]*", "g");
            var res = getAllMatches(regex2, cookies[i].value);
            res.forEach(function(item) {
                               jwts += "<i>JWT:</i><b>" +  item[0] + "</b><br />";
                               //header
                                var firstDotIndex=item[0].indexOf(".");
                                var scondDotIndex=item[0].substring(firstDotIndex+1,item[0].length-1).indexOf(".")+item[0].indexOf(".");
                                var header=item[0].substring(0,firstDotIndex);
                                var payload=item[0].substring(firstDotIndex+1,scondDotIndex+1);
                                var signature=item[0].substring(scondDotIndex+2,item[0].length);
                                   var failed=0;
                                 jwts += "<b>header</b><br /><i>" +  header + "</i><br />";
                                 try {
                               jwts += "<b>header decoded</b><br /><i>" +  b64DecodeUnicode(header) + "</i><br />";
                               } catch (err) {
                               failed+=1;
                                jwts += "<b>header decoded</b><br /><i>FAILED TO BASE64DECODE</i><br />";
                               }
                                 jwts += "<b>payload</b><br /><i>" +  payload + "</i><br />";
                                   try {
                                 jwts += "<b>payload decoded</b><br /><i>" +  b64DecodeUnicode(payload) + "</i><br />";
                                 } catch (err) {
                                  failed+=1;
                                jwts += "<b>payload decoded</b><br /><i>FAILED TO BASE64DECODE</i><br />";
                               }
                                 jwts += "<b>signature</b><br /><i>" +  signature + "</i><br />";
                                 if( failed!=0){
                                    jwts="";
                                 }

             });

            cookiesStr += '<hr><div  syle="word-wrap:break-word; display:inline-block;"><b>' + cookies[i].name + "</b><br />";
            cookiesStr += cookies[i].value + "<br />" + b64 + jwts+"session: " + cookies[i].session.toString() + "<br />path: " + cookies[i].path + "<br /> domain:" + cookies[i].domain + "</div>";
        }
        cookiesStr += "</table>";
        document.getElementById("cookie_holder").innerHTML = cookiesStr + '<br> ';
    });

}


function b64DecodeUnicode(str) {
    // Going backwards: from bytestream, to percent-encoding, to original string.
    return decodeURIComponent(atob(str).split('').map(function(c) {
        return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
    }).join(''));
}

function b64EncodeUnicode(str) {
    // first we use encodeURIComponent to get percent-encoded UTF-8,
    // then we convert the percent encodings into raw bytes which
    // can be fed into btoa.
    return btoa(encodeURIComponent(str).replace(/%([0-9A-F]{2})/g,
        function toSolidBytes(match, p1) {
            return String.fromCharCode('0x' + p1);
        }));
}



function url2Domain(url) {
    var domain = urlAdd(url, '');
    domain = domain.replaceAll('http://', '').replaceAll('https://', '');
    domain = domain.substring(0, domain.indexOf("/"));
    /*var domainSplit=domain.split('.');

    if(domainSplit.length>2)
        domain='*.'+domainSplit[domainSplit.length-2]+'.'+domainSplit[domainSplit.length-1];
    if(domainSplit.length==2)
        domain='*.'+domainSplit[0]+'.'+domainSplit[1];
    alert(domain);
    */
    return domain;

}

function getForms() {
    var fromsStr = "Found " + document.forms.length + " forms";
    for (var i = 0; i < document.forms.length; i++) {
        fromsStr += document.forms[i] + "<br />";
    }

    document.getElementById("forms_holder").innerHTML = fromsStr;

}

//https://github.com/kripken/sql.js/

function urlAdd(url, fileOrUrl) {
    if (url.match(new RegExp("/", "g") || []).length > 2)
        return url.substring(0, url.lastIndexOf("/") + 1) + fileOrUrl;
    else
        return url + "/" + fileOrUrl;
}

String.prototype.replaceAll = function(search, replacement) {
    var target = this;
    return target.replace(new RegExp(search, 'g'), replacement);
};

function encodeHTML(rawStr) {
    var encodedStr = rawStr.replace(/[\u00A0-\u9999<>\&]/gim, function(i) {
        return '&#' + i.charCodeAt(0) + ';';
    });
    return encodedStr;
}

// regex for all resources (href|src)=["|']((?!mailto|https).*?)["|']

function getAllMatches(regex, text) {
    if (regex.constructor !== RegExp) {
        throw new Error('not RegExp');
    }

    var res = [];
    var match = null;

    if (regex.global) {
        while (match = regex.exec(text)) {
            res.push(match);
        }
    } else {
        if (match = regex.exec(text)) {
            res.push(match);
        }
    }

    return res;
}



function handleEncoderClick() {

    var op_encode = document.getElementById("op_encode");
    var encoder_input = document.getElementById("encoder_input");
    var result = "Something went wrong!";
    if (op_encode.checked) {
        // ENCODE

        result = encode(encoder_input.value);
    } else {
        //DECODE
        result = decode(encoder_input.value);
    }

    document.getElementById("encoder_result").innerHTML = '<hr>' + result;
    document.getElementById("content_length").innerHTML = 'length: ' + encoder_input.value.length;

}

function putResults(result){
    document.getElementById("encoder_result").innerHTML =  '<hr>' + result;
}


function getEncodeType() {
    if (document.getElementById("b64").checked)
        return "b64";

    if (document.getElementById("hex").checked)
        return "hex";

    if (document.getElementById("binary8").checked)
        return "binary8";

    if (document.getElementById("binary7").checked)
        return "binary7";

    if (document.getElementById("b85").checked)
        return "b85";
    if (document.getElementById("bacon").checked)
        return "bacon";

    if (document.getElementById("caesar").checked)
        return "caesar";

     if (document.getElementById("factor").checked)
        return "factor";
}

function encode(raw) {
    if (getEncodeType() == "b64") {
        return b64EncodeUnicode(raw);
    } else if (getEncodeType() == "b85") {
        return encode_ascii85(raw);
    } else if (getEncodeType() == "hex") {
        return a2hex(raw);

    } else if (getEncodeType() == "binary8") {
        return text2Binary(raw);
    } else if (getEncodeType() == "binary7") {

    } else if (getEncodeType() == "md5") {
        return $.md5('value');
    } else if (getEncodeType() == "bacon") {
        return bacon_encrypt(raw);
    } else if (getEncodeType() == "caesar") {
              return brute_caesar(raw);
    }else if (getEncodeType() == "factor") {
                   return factorDB(raw);
      } else {
        return "getEncodeType failed";
    }
}

function decode(raw) {
    if (getEncodeType() == "b64") {
        return b64DecodeUnicode(raw);
    } else if (getEncodeType() == "b85") {
        return decode_ascii85(raw);
    } else if (getEncodeType() == "hex") {
        return hex2a(raw);
    } else if (getEncodeType() == "binary8") {
        return binarytoString(raw);
    } else if (getEncodeType() == "binary7") {

    } else if (getEncodeType() == "md5") {

    } else if (getEncodeType() == "bacon") {
        return bacon_decrypt(raw);
    } else if (getEncodeType() == "caesar") {
        return brute_caesar(raw);
    } else {
        return "getEncodeType failed";
    }
}


function a2hex(str) {
    var arr = [];
    for (var i = 0, l = str.length; i < l; i++) {
        var hex = Number(str.charCodeAt(i)).toString(16);
        arr.push(hex);
    }
    return arr.join('');
}


function hex2a(hexx) {
    var hex = hexx.toString(); //force conversion
    var str = '';
    for (var i = 0; i < hex.length; i += 2)
        str += String.fromCharCode(parseInt(hex.substr(i, 2), 16));
    return str;
}

function text2Binary(string) {
    return string.split('').map(function(char) {
        return char.charCodeAt(0).toString(2);
    }).join(' ');
}



function binarytoString(str) {
    return str.split(/\s/).map(function(val) {
        return String.fromCharCode(parseInt(val, 2));
    }).join("");
}

function encode_ascii85(a) {
    var b, c, d, e, f, g, h, i, j, k;
    for (!/[^\x00-\xFF]/.test(a), b = "\x00\x00\x00\x00".slice(a.length % 4 || 4), a += b,
        c = [], d = 0, e = a.length; e > d; d += 4) f = (a.charCodeAt(d) << 24) + (a.charCodeAt(d + 1) << 16) + (a.charCodeAt(d + 2) << 8) + a.charCodeAt(d + 3),
        0 !== f ? (k = f % 85, f = (f - k) / 85, j = f % 85, f = (f - j) / 85, i = f % 85,
            f = (f - i) / 85, h = f % 85, f = (f - h) / 85, g = f % 85, c.push(g + 33, h + 33, i + 33, j + 33, k + 33)) : c.push(122);
    return function(a, b) {
        for (var c = b; c > 0; c--) a.pop();
    }(c, b.length), "<~" + String.fromCharCode.apply(String, c) + "~>";
}

function decode_ascii85(a) {
    var c, d, e, f, g, h = String,
        l = "length",
        w = 255,
        x = "charCodeAt",
        y = "slice",
        z = "replace";
    for ("<~" === a[y](0, 2) && "~>" === a[y](-2), a = a[y](2, -2)[z](/\s/g, "")[z]("z", "!!!!!"),
        c = "uuuuu" [y](a[l] % 5 || 5), a += c, e = [], f = 0, g = a[l]; g > f; f += 5) d = 52200625 * (a[x](f) - 33) + 614125 * (a[x](f + 1) - 33) + 7225 * (a[x](f + 2) - 33) + 85 * (a[x](f + 3) - 33) + (a[x](f + 4) - 33),
        e.push(w & d >> 24, w & d >> 16, w & d >> 8, w & d);
    return function(a, b) {
        for (var c = b; c > 0; c--) a.pop();
    }(e, c[l]), h.fromCharCode.apply(h, e);
}

var base36 = {
    encode: function (str) {
        return Array.prototype.map.call(str, function (c) {
            return c.charCodeAt(0).toString(36);
        }).join("");
    },
    decode: function (str) {
        //assumes one character base36 strings have been zero padded by encodeAscii
        var chunked = [];
        for (var i = 0; i < str.length; i = i + 2) {
            chunked[i] = String.fromCharCode(parseInt(str[i] + str[i + 1], 36));
        }
        return chunked.join("");
    },
    encodeAscii: function (str) {
        return Array.prototype.map.call(str, function (c) {
            var b36 = base36.encode(c, "");
            if (b36.length === 1) {
                b36 = "0" + b36;
            }
            return b36;
        }).join("");
    },
    decodeAscii: function (str) {
        //ignores special characters/seperators if they're included
        return str.replace(/[a-z0-9]{2}/gi, function (s) {
            return base36.decode(s);
        })
    }
};

//BASe36
function base36_encode(raw){
return base36.encodeAscii(raw);
}

function base36_decode(raw){
return base36.decodeAscii(raw);
}

function base32_encode(raw){
return base32.encode(raw);
}

function base32_encode(raw){
return base32.decode(raw);
}


function rot47(x)
{var s=[];for(var i=0;i<x.length;i++)
{var j=x.charCodeAt(i);if((j>=33)&&(j<=126))
{s[i]=String.fromCharCode(33+((j+ 14)%94));}
else
{s[i]=String.fromCharCode(j);}}
  return s.join('');}



// BACON

function bacon_encrypt(A) {
    if (A = A.replace(" ", ""), !A.match(/^[a-zA-Z]+$/)) return "Bacon only encrypts [a-z] and [A-Z]";
    A = A.toLowerCase();
    var B = "";
    for (i = 0; i < A.length; i++) B += enc_table(A[i]);
    return B
}

function bacon_decrypt(A) {
    if (A = A.replace(" ", ""), A = A.toUpperCase(), !A.match(/^[AB]+$/)) return "Bacon only has A and B in the chiper-text";
    if (A.length % 5 != 0) return "There are missing parts of the cipher text";
    var B = "",
        e = "";
    for (i = 0; i < A.length; i++) e += A[i], 5 == e.length && (B += dec_table(e), e = "");
    return B
}

function enc_table(A) {
    return "a" == A ? "AAAAA" : "b" == A ? "AAAAB" : "c" == A ? "AAABA" : "d" == A ? "AAABB" : "e" == A ? "AABAA" : "f" == A ? "AABAB" : "g" == A ? "AABBA" : "h" == A ? "AABBB" : "i" == A ? "ABAAA" : "j" == A ? "ABAAA" : "k" == A ? "ABAAB" : "l" == A ? "ABABA" : "m" == A ? "ABABB" : "n" == A ? "ABBAA" : "o" == A ? "ABBAB" : "p" == A ? "ABBBA" : "q" == A ? "ABBBB" : "r" == A ? "BAAAA" : "s" == A ? "BAAAB" : "t" == A ? "BAABA" : "u" == A ? "BAABB" : "v" == A ? "BAABB" : "w" == A ? "BABAA" : "x" == A ? "BABAB" : "y" == A ? "BABBA" : "z" == A ? "BABBB" : null
}

function dec_table(A) {
    return "AAAAA" == A ? "a" : "AAAAB" == A ? "b" : "AAABA" == A ? "c" : "AAABB" == A ? "d" : "AABAA" == A ? "e" : "AABAB" == A ? "f" : "AABBA" == A ? "g" : "AABBB" == A ? "h" : "ABAAA" == A ? "i" : "ABAAA" == A ? "j" : "ABAAB" == A ? "k" : "ABABA" == A ? "l" : "ABABB" == A ? "m" : "ABBAA" == A ? "n" : "ABBAB" == A ? "o" : "ABBBA" == A ? "p" : "ABBBB" == A ? "q" : "BAAAA" == A ? "r" : "BAAAB" == A ? "s" : "BAABA" == A ? "t" : "BAABB" == A ? "u" : "BAABB" == A ? "v" : "BABAA" == A ? "w" : "BABAB" == A ? "x" : "BABBA" == A ? "y" : "BABBB" == A ? "z" : null
}

//caesar shift
function rot(str, amount) {
    // Wrap the amount
    if (amount < 0)
        return rot(str, amount + 26);

    // Make an output variable
    var output = '';
    // Go through each character
    for (var i = 0; i < str.length; i++) {
        // Get the character we'll be appending
        var c = str[i];
        // If it's a letter...
        if (c.match(/[a-z]/i)) {
            // Get its code
            var code = str.charCodeAt(i);
            // Uppercase letters
            if ((code >= 65) && (code <= 90))
                c = String.fromCharCode(((code - 65 + amount) % 26) + 65);
            // Lowercase letters
            else if ((code >= 97) && (code <= 122))
                c = String.fromCharCode(((code - 97 + amount) % 26) + 97);
        }
        // Append
        output += c;
    }
    // All done!
    return output;
}

function brute_caesar(str) {
    var output = '';
    for (var i = -26; i < 26; i++) {
        if (i == 0)
            continue;
        output += rot(str, i) + '<br />';
    }
    return output;
}

function factorDB(raw_decimal){
raw_decimal=raw_decimal.replaceAll("\n","");

 var xhrfactor = new XMLHttpRequest();
        xhrfactor.open("GET", "http://www.factordb.com/index.php?query="+raw_decimal, true);
        xhrfactor.onreadystatechange = function() {
            if (xhrfactor.readyState == 4) {
                var content = xhrfactor.responseText;

                var C = content.search("<td>C</td>");
                var CF = content.search("<td>CF</td>");
                var FF = content.search("<td>FF</td>");
                var P = content.search("<td>P</td>");
                var Prp = content.search("<td>Prp</td>");
                var N = content.search("<td>N</td>");
                var U = content.search("<td>U</td>");
                var UNIT = content.search("<td>Unit</td>");
                var star = content.search("<td>*</td>");

              if(C>0)
                putResults("Composite, no factors known");
              if(CF>0)
                putResults("Composite, factors known");
              if(FF>0)
                putResults("Composite, fully factored");
              if(P>0)
                putResults("Definitely prime");
              if(Prp>0)
                putResults("Probably prime");
             if(UNIT>0)
                 putResults("Just for 1");
                if(U>0)
                  putResults("Unknown");
              if(N>0)
                    putResults("This number is not in database (and was not added due to your settings)");
              if(star>0)
                putResults("Added to database during this request");

            }
        }
        xhrfactor.send();
return "called";
}


   var base32 = {
                    a: "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567",
                    pad: "=",
                    encode: function (s) {
                        var a = this.a;
                        var pad = this.pad;
                        var len = s.length;
                        var o = "";
                        var w, c, r=0, sh=0;
                        for(i=0; i<len; i+=5) {
                            // mask top 5 bits
                            c = s.charCodeAt(i);
                            w = 0xf8 & c;
                            o += a.charAt(w>>3);
                            r = 0x07 & c;
                            sh = 2;

                            if ((i+1)<len) {
                                c = s.charCodeAt(i+1);
                                // mask top 2 bits
                                w = 0xc0 & c;
                                o += a.charAt((r<<2) + (w>>6));
                                o += a.charAt( (0x3e & c) >> 1 );
                                r = c & 0x01;
                                sh = 4;
                            }

                            if ((i+2)<len) {
                                c = s.charCodeAt(i+2);
                                // mask top 4 bits
                                w = 0xf0 & c;
                                o += a.charAt((r<<4) + (w>>4));
                                r = 0x0f & c;
                                sh = 1;
                            }

                            if ((i+3)<len) {
                                c = s.charCodeAt(i+3);
                                // mask top 1 bit
                                w = 0x80 & c;
                                o += a.charAt((r<<1) + (w>>7));
                                o += a.charAt((0x7c & c) >> 2);
                                r = 0x03 & c;
                                sh = 3;
                            }

                            if ((i+4)<len) {
                                c = s.charCodeAt(i+4);
                                // mask top 3 bits
                                w = 0xe0 & c;
                                o += a.charAt((r<<3) + (w>>5));
                                o += a.charAt(0x1f & c);
                                r = 0;
                                sh = 0;
                            }
                        }
                        // Calculate length of pad by getting the
                        // number of words to reach an 8th octet.
                        if (r!=0) { o += a.charAt(r<<sh); }
                        var padlen = 8 - (o.length % 8);
                        // modulus
                        if (padlen==8) { return o; }
                        if (padlen==1) { return o + pad; }
                        if (padlen==3) { return o + pad + pad + pad; }
                        if (padlen==4) { return o + pad + pad + pad + pad; }
                        if (padlen==6) { return o + pad + pad + pad + pad + pad + pad; }
                        console.log('there was some kind of error');
                        console.log('padlen:'+padlen+' ,r:'+r+' ,sh:'+sh+', w:'+w);
                    },
                    decode: function(s) {
                        var len = s.length;
                        var apad = this.a + this.pad;
                        var v,x,r=0,bits=0,c,o='';

                        s = s.toUpperCase();

                        for(i=0;i<len;i+=1) {
                            v = apad.indexOf(s.charAt(i));
                            if (v>=0 && v<32) {
                                x = (x << 5) | v;
                                bits += 5;
                                if (bits >= 8) {
                                    c = (x >> (bits - 8)) & 0xff;
                                    o = o + String.fromCharCode(c);
                                    bits -= 8;
                                }
                            }
                        }
                        // remaining bits are < 8
                        if (bits>0) {
                            c = ((x << (8 - bits)) & 0xff) >> (8 - bits);
                            // Don't append a null terminator.
                            // See the comment at the top about why this sucks.
                            if (c!==0) {
                                o = o + String.fromCharCode(c);
                            }
                        }
                        return o;
                    }
                }