var head = document.getElementsByTagName("head")[0] || document.documentElement;

function loadScript(head, script) {
  // Handle Script loading
  var done = false;

  // Attach handlers for all browsers.
  //
  // References:
  // http://stackoverflow.com/questions/4845762/onload-handler-for-script-tag-in-internet-explorer
  // http://stevesouders.com/efws/script-onload.php
  // https://www.html5rocks.com/en/tutorials/speed/script-loading/
  //
  script.onload = script.onreadystatechange = function() {
    if (!done && (!script.readyState || script.readyState === "loaded" || script.readyState === "complete")) {
      done = true;

      // Handle memory leak in IE
      script.onload = script.onreadystatechange = null;
    }
  };

  head.appendChild(script);
}

function createScript(url) {
  var script = document.createElement("script");
  script.charset = "utf-8";
  script.type = "text/javascript";
  script.async = false;
  script.src = url;
  return script;
}

/* eslint-disable */
function load(urls) {
  urls.forEach(function(url) {
    loadScript(head, createScript(url));
  });
}
/* eslint-enable */
