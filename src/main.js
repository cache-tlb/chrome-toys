chrome.browserAction.onClicked.addListener(function(tab) {
  console.log('Destroying ' + tab.url + ' !');
  chrome.tabs.executeScript({file:'asteroids.js'});
});
