/*jshint browser:true */
/*global define:true*/

define(['webglSupported', 'two'], function (webglSupported, Two) {
  var G = {
    init: function (elem) {
      // Make an instance of two and place it on the page.
      var params = { fullscreen: true };
      if (webglSupported) {
        params.type = Two.Types.webgl;
      } else {
        params.type = Two.Types.canvas;
      }
      var two = new Two(params).appendTo(elem);

      // two has convenience methods to create shapes.
      var circle = two.makeCircle(72, 100, 50);
      var rect = two.makeRectangle(213, 100, 100, 100);

      // The object returned has many stylable properties:
      circle.fill = '#FF8000';
      circle.stroke = 'orangered'; // Accepts all valid css color
      circle.linewidth = 5;

      rect.fill = 'rgb(0, 200, 255)';
      rect.opacity = 0.75;
      rect.noStroke();

      // Don't forget to tell two to render everything
      // to the screen
      two.update();
    }
  };

  return G;
});