
var idToJs = {
  "asteroids": "asteroids.js",
  "gravity": "gravityscript.js",
  "pool": "pool.js"
};

function click(e) {
  console.log('playing ' + e.target.id + ' !');
  chrome.tabs.executeScript(null,
      {file: idToJs[e.target.id] });
  window.close();
}

document.addEventListener('DOMContentLoaded', function () {
  var divs = document.querySelectorAll('div');
  for (var i = 0; i < divs.length; i++) {
    divs[i].addEventListener('click', click);
  }
});

