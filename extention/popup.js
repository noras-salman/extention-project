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

       document.getElementById("url_holder").innerHTML ="Looking at:<b>"+urlAdd(url,"")+"</b>";


        //document.getElementById("cookie_holder").innerHTML ="@getCookies. Cookies found " +  cookies.length;

    var flag_cout=0;
    var xhr = new XMLHttpRequest();
    xhr.open("GET", urlAdd(url,"robots.txt"), true);
    xhr.onreadystatechange = function() {
      if (xhr.readyState == 4) {
        // innerText does not let the attacker inject HTML elements.
        var content=xhr.responseText;
        if(content.match(new RegExp("\n", "g") || []).length >20)
        content="";
        else
        content="<br /><br />"+content.replaceAll("\n","<br />");
        document.getElementById("robot_holder").innerHTML = '<a href="'+urlAdd(url,"robots.txt")+'">Robots.txt Found</a>'+content;
        flag_cout+=1;
        chrome.browserAction.setBadgeText({text: flag_cout+""});
      }
    }
    xhr.send();

     var xhr2 = new XMLHttpRequest();
        xhr2.open("GET", url, true);
        xhr2.onreadystatechange = function() {
          if (xhr2.readyState == 4) {


            var regex = new RegExp("(href|src)=[\"|']((?!mailto|https).*?)[\"|']", "g");
            var res = getAllMatches(regex,xhr2.responseText);
            var resources="<br /> <h3>Resources</h3>";
            res.forEach(function (item) {
                resources+=item[0] +"<br />";
            });


              document.getElementById("headers_holder").innerHTML = xhr2.getAllResponseHeaders().replaceAll("\n","<br />")+resources;


          }
        }
        xhr2.send();


    var xhr3 = new XMLHttpRequest();
    xhr3.open("GET", urlAdd(url,".git/logs/HEAD"), true);
    xhr3.onreadystatechange = function() {
      if (xhr3.readyState == 4) {
       var content=xhr.responseText.toLowerCase();
        var n1=content.search("not found");
        var n2=content.search("404");
       // innerText does not let the attacker inject HTML elements.
        if(n1>0 || n2>0){
        document.getElementById("git_holder").innerHTML = '<a href="'+urlAdd(url,".git/logs/HEAD")+'">Git HEAD Found</a> user https://github.com/internetwache/GitTools ';
        flag_cout+=1;
         chrome.browserAction.setBadgeText({text: flag_cout+""});
        }
       else
        document.getElementById("git_holder").innerHTML = '<a href="'+urlAdd(url,".git/logs/HEAD")+'">Not found code thrown</a>  ';


      }
    }
    xhr3.send();

    var moreInfo="";
    if(url.search("page=")>0 || url.search("p=")>0){
    more+="try page=php://filter/convert.base64-encode/resource=index.php";
    }
    if(moreInfo!="")
    document.getElementById("headers_holder").innerHTML = more;
       getCookies(url);


  });

});
function getCookies(url){
var domain=url2Domain(url);
var cookiesStr='Domain:  <b><i>'+domain+'</b></i><br />';
    cookiesStr+="<table><tr><td>Name</td><td>Value</td><td>Session</td><td>Path</td><td>Domain</td></tr>";
            chrome.cookies.getAll({ 'domain':domain }, function(cookies) {
                for (var i = 0; i < cookies.length; i++) {
                    cookiesStr+="<tr><td><b>" + cookies[i].name + "</b></td><td>" + cookies[i].value + "</td><td> " +cookies[i].session.toString() +"</td><td>" + cookies[i].path + "</td><td>" + cookies[i].domain + "</td></tr>";
                 }
                cookiesStr+="</table>";
                  document.getElementById("cookie_holder").innerHTML = cookiesStr;
    });

}

function url2Domain(url){
var domain=urlAdd(url,'');
domain=domain.replaceAll('http://','').replaceAll('https://','');
domain=domain.substring(0,domain.indexOf("/"));
/*var domainSplit=domain.split('.');

if(domainSplit.length>2)
    domain='*.'+domainSplit[domainSplit.length-2]+'.'+domainSplit[domainSplit.length-1];
if(domainSplit.length==2)
    domain='*.'+domainSplit[0]+'.'+domainSplit[1];
alert(domain);
*/
  return domain;

}



function urlAdd(url,fileOrUrl){
    if(url.match(new RegExp("/", "g") || []).length >2)
    return url.substring(0, url.lastIndexOf("/")+1)+fileOrUrl;
    else
    return url+"/"+fileOrUrl;
}

String.prototype.replaceAll = function(search, replacement) {
    var target = this;
    return target.replace(new RegExp(search, 'g'), replacement);
};

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
    }
    else {
        if (match = regex.exec(text)) {
            res.push(match);
        }
    }

    return res;
}

