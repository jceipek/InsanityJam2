/*jshint node: true*/
/*jshint browser:true */
"use strict";

require.config({
  paths: {
    domReady: '3rdparty/domReady'
  , two: '3rdparty/two.min'
  , p2: '3rdparty/p2.min'
  , ndollar: '3rdparty/ndollar'
  }
});

require(['domReady!', 'game'], function (_, G) {  
  //window.console = {log: function() {return true;}};
  G.init(document.getElementById('js-game-area'));
});