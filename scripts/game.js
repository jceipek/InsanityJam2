/*jshint browser:true */
/*global define:true*/

define(['webglSupported', 'two', 'p2', 'ndollar', 'zepto'], function (webglSupported, Two, P2, N$, $) {
  var data = {
    entities: []
  , gesture: {
      inProgress: null
    , points: []
    , visualization: null
    }
  , gesturePoints: []
  , CONSTS: {
      worldDims: {
        width: 30
      , height: 50
      , zoom: 1
      }
    }
  };
  
  var G = {
    data: data
  , init: function (elem) {
      var _g = this;
    
      var renderer = _g.setupRenderer(elem);
    
      _g.resizeScene(renderer);
      $(window).resize(_g.resizeScene.bind(_g, renderer));
      
      _g.drawGameBorders(renderer);
    
      var world = _g.setupPhysics();
      _g.addNewCircleEntity(world, renderer, {x: 0, y: 10, radius: 1});
    
      var timeStep = 1 / 60;
      setInterval(_g.physicsLoop.bind(_g, world, timeStep), 1000 * timeStep);
      renderer.play();
    
      var recognizer = new N$.NDollarRecognizer(true);
      $(elem).mousedown(function (e) { _g.gestureDown(e, renderer); });
      $(document).mouseup(function (e) { _g.gestureUp(e, renderer, recognizer); });
      $(elem).mousemove(function (e) { _g.gestureMove(e, renderer); });
    }
  , gestureDown: function (e, renderer) {
      var x = e.offsetX
        , y = e.offsetY;
    
      x -= renderer.width/2;
      y -= renderer.height/2;
      x /= renderer.scene.scale;
      y /= renderer.scene.scale;
    
      data.gesture.inProgress = true;
      data.gesture.visualization = renderer.makeCurve(x,y,x+0.1,y+0.1, true);
      data.gesture.visualization.noFill();
      data.gesture.visualization.stroke = "#ccc";
      data.gesture.visualization.linewidth = 0.1;
    }
  , gestureUp: function (e, renderer, recognizer) {
      data.gesture.inProgress = false;
      var result = recognizer.Recognize([data.gesture.points], true, true, true);
      console.log(result);
      data.gesture.points.length = 0;
    
      renderer.remove(data.gesture.visualization);
    }
  , gestureMove: function (e, renderer) {
      if (!data.gesture.inProgress) {
        return;
      }

      var x = e.offsetX
        , y = e.offsetY;
          
      data.gesture.points.push(new N$.Point(x, y));
    
      x -= renderer.width/2;
      y -= renderer.height/2;
      x/=renderer.scene.scale;
      y/=renderer.scene.scale;
      x -= data.gesture.visualization.translation.x;
      y -= data.gesture.visualization.translation.y;
    
      data.gesture.visualization.vertices.push(new Two.Anchor(x,y));
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
      params.type = Two.Types.svg;
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
  , addEntity: function (entity) {
      data.entities.push(entity);
    }
  , makeCircleEntity: function (world, renderer, params) {
      params = (params === undefined)? {} : params;
      var circleVis, circleBody, circleShape
        , x = (params.x === undefined)? 0 : params.x
        , y = (params.y === undefined)? 0 : params.y
        , radius = (params.y === undefined)? 1 : params.radius;
    
      circleVis = renderer.makeCircle(x, y, radius);
      circleVis.fill = 'rgb(0, 0, 0)';
      circleVis.noStroke();
    
      // Create an empty dynamic body
      circleBody = new P2.Body({
        mass: 5
      , position: [x,y]
      });

      // Add a circle shape to the body.
      circleShape = new P2.Circle(radius);
      circleBody.addShape(circleShape);

      // ...and add the body to the world.
      // If we don't add it to the world, it won't be simulated.
      world.addBody(circleBody);
    
      return {
        graphic: circleVis
      , physicsBody: circleBody
      };
    }
  , addNewCircleEntity: function(world, renderer, params) {
      var _g = this;
      _g.addEntity(_g.makeCircleEntity(world, renderer, params));
    }
  };

  return G;
});