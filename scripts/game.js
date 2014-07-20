/*jshint browser:true */
/*global define:true*/

define(['webglSupported', 'two', 'p2'], function (webglSupported, Two, P2) {
  var data = {
    world: null
  , entities: []
  , two: null
  , CONSTS: {
      worldDims: {
        width: 5
      , height: 8
      , zoom: 100
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
    
      // Make an instance of two and place it on the page.
      var params = { fullscreen: true };
      if (webglSupported) {
        params.type = Two.Types.webgl;
      } else {
        params.type = Two.Types.canvas;
      }
      var two = new Two(params).appendTo(elem);
      _g.resizeScene(two);
      addEvent(window, 'resize', _g.resizeScene.bind(_g, two));
    
      var rect = two.makeRectangle(0,0,5,8);
      rect.linewidth = 0.1;
    
      this.setupPhysics();
      data.entities.push(_g.makeCircleEntity(data.world, two));
    
      var timeStep = 1 / 60;
      setInterval(_g.physicsLoop.bind(_g, data.world, timeStep), 1000 * timeStep);
      two.play();
    }
  , resizeScene: function (two) {
      var DIMS = data.CONSTS.worldDims
        , margin = 10
        , scaleFactor = DIMS.zoom
        , w = DIMS.width * scaleFactor + margin
        , h = DIMS.height * scaleFactor + margin
        , scale = Math.min(two.width / w, two.height / h) * scaleFactor;
      two.scene.scale = scale;
      two.scene.translation.x = two.width/2;
      two.scene.translation.y = two.height/2;
    }
  , setupPhysics: function () {
      var WORLD_HEIGHT = data.CONSTS.worldDims.height;
    
      // Create a physics world, where bodies and constraints live
      var world = new P2.World({
          gravity: [0, -9.82]
      });
      data.world = world;

      // Create an infinite ground plane.
      var groundBody = new P2.Body({
          mass: 0 // Setting mass to 0 makes the body static
        , position: [0, -WORLD_HEIGHT/2]
      });
      var groundShape = new P2.Plane();
      groundBody.addShape(groundShape);
      world.addBody(groundBody);
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
  , makeCircleEntity: function (world, two) {
      var radius = 1;
      var position = [0, 10];
      var circleVis = two.makeCircle(position[0], position[1], radius);
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