/*jshint browser:true */
/*global define:true*/

define(['webglSupported', 'two', 'p2', 'ndollar'], function (webglSupported, Two, P2, N$) {
  var data = {
    world: null
  , entities: []
  , gesturePoints: []
  , CONSTS: {
      worldDims: {
        width: 30
      , height: 50
      , zoom: 1
      }
    }
  };
  
  // From http://stackoverflow.com/questions/641857/javascript-window-resize-event
  var addEvent = function(elem, type, eventHandle) {
    if (elem === null || typeof(elem) == 'undefined') { return; }
    if ( elem.addEventListener ) {
        elem.addEventListener( type, eventHandle, false );
    } else if ( elem.attachEvent ) {
        elem.attachEvent( "on" + type, eventHandle );
    } else {
        elem["on"+type]=eventHandle;
    }
  };
  
  var G = {
    data: data
  , init: function (elem) {
      var _g = this;
    
      var renderer = _g.setupRenderer(elem);
    
      _g.resizeScene(renderer);
      addEvent(window, 'resize', _g.resizeScene.bind(_g, renderer));
    
      var recognizer = new N$.NDollarRecognizer(true);
      addEvent(window, 'mousemove', function (e) {_g.addGesturePoints(e, recognizer);});
      
      _g.drawGameBorders(renderer);
    
      var world = _g.setupPhysics();
      data.entities.push(_g.makeCircleEntity(world, renderer));
    
      var timeStep = 1 / 60;
      setInterval(_g.physicsLoop.bind(_g, world, timeStep), 1000 * timeStep);
      renderer.play();
    }
  , addGesturePoints: function (e, recognizer) {
    // XXX: Only works in Chrome according to http://stackoverflow.com/questions/7938839/firefox-mousemove-event-which
    if (e.which === 0) {
      if (data.gesturePoints.length > 0) {
        // Recognize gesture
        var result = recognizer.Recognize([data.gesturePoints], true, true, true);
        console.log(result);
        data.gesturePoints.length = 0;
      }
    } else {
      // Add to gesture points
      data.gesturePoints.push(new N$.Point(e.pageX, e.pageY));
    }
  }
  , drawGameBorders: function (renderer) {
      var DIMS = data.CONSTS.worldDims;
      var rect = renderer.makeRectangle(0,0,DIMS.width,DIMS.height);
      rect.stroke = "#eee";
      rect.linewidth = 0.1;
    }
  , resizeScene: function (renderer) {
      var DIMS = data.CONSTS.worldDims
        , margin = 1
        , scaleFactor = DIMS.zoom
        , w = DIMS.width * scaleFactor + margin
        , h = DIMS.height * scaleFactor + margin
        , scale = Math.min(renderer.width / w, renderer.height / h) * scaleFactor;
      renderer.scene.scale = scale;
      renderer.scene.translation.x = renderer.width/2;
      renderer.scene.translation.y = renderer.height/2;
    }
  , setupRenderer: function (domElement) {
      var params = { fullscreen: true };
      if (webglSupported) {
        params.type = Two.Types.webgl;
      } else {
        params.type = Two.Types.canvas;
      }
      return new Two(params).appendTo(domElement);
    }
  , setupPhysics: function () {
      var WORLD_HEIGHT = data.CONSTS.worldDims.height;
    
      // Create a physics world, where bodies and constraints live
      var world = new P2.World({
          gravity: [0, -9.82]
      });

      // Create an infinite ground plane.
      var groundBody = new P2.Body({
          mass: 0 // Setting mass to 0 makes the body static
        , position: [0, -WORLD_HEIGHT/2]
      });
      var groundShape = new P2.Plane();
      groundBody.addShape(groundShape);
      world.addBody(groundBody);
    
      return world;
    }
  , physicsLoop: function (world, timeStep) {
      var i, entity
        , entities = data.entities;
      world.step(timeStep);
    
      for (i = 0; i < entities.length; i++) {
        entity = entities[i];
        entity.graphic.translation.x = entity.physicsBody.position[0];
        entity.graphic.translation.y = -entity.physicsBody.position[1];
      }
    }
  , makeCircleEntity: function (world, renderer) {
      var radius = 1;
      var position = [0, 10];
      var circleVis = renderer.makeCircle(position[0], position[1], radius);
      circleVis.fill = 'rgb(0, 0, 0)';
      circleVis.noStroke();
    
      // Create an empty dynamic body
      var circleBody = new P2.Body({
        mass: 5
      , position: position
      });

      // Add a circle shape to the body.
      var circleShape = new P2.Circle(radius);
      circleBody.addShape(circleShape);

      // ...and add the body to the world.
      // If we don't add it to the world, it won't be simulated.
      world.addBody(circleBody);
    
      return {
        graphic: circleVis
      , physicsBody: circleBody
      };
    }
  };

  return G;
});