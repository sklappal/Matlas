function App() {
  
  this.Start = function() {
    GetCanvas().onmousedown = OnMouseDown;
    
    this.imageObj = new Image();

    this.imageObj.onload = function() {
      Draw();
    };
    
    this.imageObj.src = 'world_map.jpg';
  }
  
  function Draw() {
    GetContext().drawImage(this.imageObj, 0, 0, GetCanvas().width, GetCanvas().height);
    drawHelperLines();
    for (var i = 0; i < routes.length; i++) {
      drawRoute(routes[i]);
    }
    drawInstructions();
    
    if (prev != undefined) {
      myRenderer.drawFilledCircle(prev, 5, "magenta");
    }
    
  }
    
  function GetContext() {
    return GetCanvas().getContext("2d");
  }
  
  function GetCanvas() {
    return document.getElementById("canvas");
  }
  
  var prev = undefined;
  
  var routes = [];
  var drawComplement = false;
  var myRenderer = Renderer(GetCanvas());


  function OnMouseDown(ev) {
    
    if (ev.which == 3) {
      routes = [];
      prev = undefined;
    } else if (ev.which == 2) {
      drawComplement = !drawComplement;
    } else {
    
      pos = ScreenToWorld(ev.clientX-2, ev.clientY-2);
      
      // Dodge singularities
      var threshold = 0.01;
      if (pos.y < threshold || pos.y > (1.0-threshold)) {
        return;
      }
      
      if (prev != undefined) {
        
        if (almostEqual(prev.x, pos.x) && almostEqual(prev.y, pos.y) && almostEqual(prev.z, pos.z)) {
          return;
        }
        
        routes.push(CreateRoute(WorldToCartesian(prev), WorldToCartesian(pos)));
        prev = undefined;
      } else {
        prev = pos;
      }
    }
    Draw();
  }

  // Line goes over the pole
  function overThePole(p1, p2) {
    return almostEqual(p1.x, p2.x - Math.PI) || almostEqual(p1.x, p2.x + Math.PI);
  }
     
  function handleOverThePole(prevPoint, curPoint) {
    var upperHalf = prevPoint.y < Math.PI * 0.5;
    var yCoord = upperHalf ? 0.0 : Math.PI - 1e-6;
    return [{x: prevPoint.x, y: yCoord}, {x: curPoint.x, y: yCoord}];
  }

  // Line segment from p1 to p2 is shorter when traveled around the world 
  function aroundTheWorld(p1, p2) {
    return Math.abs(p1.x-p2.x) > Math.PI;
  }

  // Interpolate linearly to the border, draw a line, then continue on the other side
  function handleAroundTheWorld(prevPoint, curPoint) {
    var left = prevPoint.x < 0.0;

    var distFromBorderPrev = Math.PI - Math.abs(prevPoint.x); 
    var distFromBorderCur = Math.PI - Math.abs(curPoint.x);
    assert(distFromBorderPrev >= 0, "Distance not positive!");
    assert(distFromBorderCur >= 0, "Distance not positive!");
    
    var dx = distFromBorderPrev + distFromBorderCur;
    
    var t = distFromBorderPrev / dx;
    var yCoord = t * prevPoint.y + (1.0-t) * curPoint.y;
    var ret = [];
    var eps = 1e-10;
    ret.push({x: left ? -Math.PI+eps : Math.PI-eps, y: yCoord});
    ret.push({x: left ? Math.PI-eps : -Math.PI+eps, y: yCoord});
    return ret;
  }

  // Takes into account that the route may go over the pole or around the world. Splits the path accordingly.
  function splitPath(points) {
    var prev = points[0];
    var curLine = [prev];
    allLines = [];
    for (i = 1; i < points.length; i++) {
      var ps = points[i];
      
      var cutPoint = undefined;
      if (overThePole(ps, prev)) {
        cutPoint = handleOverThePole(prev, ps);
      } else if (aroundTheWorld(ps, prev)) {
        cutPoint = handleAroundTheWorld(prev, ps);
      }
      
      if (cutPoint != undefined) {
        curLine.push(cutPoint[0]);
        allLines.push(curLine);
        curLine = [cutPoint[1]];
      }
      
      prev = ps;
      curLine.push(ps);
    }
    
    allLines.push(curLine);
    
    return allLines;
  }
  
  function drawSplittedPath(path) {
    for (var i = 0; i < path.length; i++) {
      myRenderer.drawPolyLine(path[i].map(SphericalToWorld));
    }
  }
  
  function drawRoute(route) {
    var ctx = GetContext();
    ctx.lineWidth = 5;
    ctx.strokeStyle = "black"
    var shortPath = splitPath(route.shortest);
    drawSplittedPath(shortPath);
    
    if (drawComplement) {
      ctx.lineWidth = 1.5;
      ctx.strokeStyle = "blue"
      drawSplittedPath(splitPath(route.complement));
    }
    
    var points = route.shortest;
    var first = SphericalToWorld(points[0]);
    var last = SphericalToWorld(points[points.length-1]);
    
    myRenderer.drawFilledCircle(first, 5, "magenta");
    myRenderer.drawFilledCircle(last, 5, "magenta");
    
    ctx.lineWidth = 3;
    ctx.strokeStyle = "magenta"
    drawSplittedPath(shortPath);
    
    midpoint = SphericalToCanvas(points[Math.floor(points.length / 2)]);

    var text = (route.angle * 6371).toFixed(0) + " km";
    
    var textX = Math.max(20, midpoint.x-50);
    var textY = Math.max(20, midpoint.y);
    myRenderer.drawKilometerText(text, textX, textY);
  }
  
  function drawInstructions() {
    var xPos = GetCanvas().width - 360;
    var yPos = GetCanvas().height - 80;
    myRenderer.drawInstructionText("Left click: Draw routes", xPos, yPos);
    yPos += 20;
    myRenderer.drawInstructionText("Middle click: Toggle complement route (" + (drawComplement ? "ON" : "OFF") + ")", xPos,  yPos);
    yPos += 20;
    myRenderer.drawInstructionText("Right click: Clear routes", xPos, yPos);
  }
  
  function drawHelperLines() {
    var lineWidth = 0.2;
    drawLatitudes(lineWidth);
    drawLongitudes(lineWidth);
  }
  
  function drawLatitudes(lineWidth) {
    var ctx = GetContext();
    ctx.strokeStyle = "black";
    var incr = Math.PI/8.0;
    var yCoord = incr;
    while (yCoord < Math.PI - 1e-1) {
      ctx.lineWidth = almostEqual(yCoord, Math.PI*0.5) ? 3*lineWidth : lineWidth;
      myRenderer.drawPolyLine([{x: -Math.PI, y: yCoord}, {x: 0.0, y: yCoord}, {x: Math.PI, y: yCoord}].map(SphericalToWorld));
      yCoord += incr;
    }
  }
  
  function drawLongitudes(lineWidth) {
    var ctx = GetContext();
    ctx.strokeStyle = "black";
    var incr = Math.PI/6.0;
    var xCoord = -Math.PI + incr;
    while (xCoord < Math.PI - 1e-1) {
      ctx.lineWidth = almostEqual(xCoord, 0.0) ? 3*lineWidth : lineWidth;
      myRenderer.drawPolyLine([{x: xCoord, y: 0.0}, {x: xCoord, y: Math.PI}].map(SphericalToWorld));
      xCoord += incr;
    }
  }
  
  function Log(coord, pre) {
    s = "";
    if (pre != undefined) {
      s += pre + " ";
    }
    s += "x: " + coord.x + " y: " + coord.y;
    if (coord.z != undefined) {
      s += " z: " + coord.z;
      
    }
    console.log(s);
  }
  
  // Screen/canvas: pixels [0, w] x [0, h]
  // World: [0,1] x [0,1]
  // Spher: [-pi, pi] x [0, pi]
  // Cartesian: [-1, 1] x [-1, 1] x [-1, 1]
  // LongLat: [-pi, pi] x [0, pi/2] (y mirrored)
  
  function ScreenToWorld(sx, sy) {
    rect = GetCanvas().getBoundingClientRect();
    return { x: (sx - rect.left) / GetCanvas().width, y: (sy - rect.top) / GetCanvas().height };
  }
  
  function WorldToCanvas(coord) {
    return {x: coord.x * GetCanvas().width, y: coord.y * GetCanvas().height };
  }

  function compose(f1, f2) {
    return function() {
      return f1(f2.apply(null, arguments));
    };
  }
  
  WorldToCartesian = compose(SphericalToCartesian, WorldToSpherical);
  
  CartesianToWorld = compose(SphericalToWorld, CartesianToSpherical);
  
  CartesianToCanvas = compose(WorldToCanvas, CartesianToWorld);

  SphericalToCanvas = compose(WorldToCanvas, SphericalToWorld);

 
  function WorldToLongLat(coord) {
    var y = Math.abs(coord.y - 0.5)* Math.PI;
    return {x: (coord.x - 0.5) * Math.PI * 2, y: y}; // Plate carrée
  }
  
  function WorldToSpherical(coord) {
    return {x: (coord.x - 0.5) * Math.PI * 2, y: (coord.y) * Math.PI};
  }
  
  function SphericalToWorld(coord) {
    var ret = {x: coord.x / (Math.PI * 2) + 0.5, y: (coord.y / Math.PI)};
    return ret;
  }
  
  function RadToDeg(coord) {
    return {x: (180.0/Math.PI) * coord.x, y: (180.0/Math.PI) * coord.y};
  }
  
  function SphericalToCartesian(coord) {
    sinTheta = Math.sin(coord.y);
    sinPhi = Math.sin(coord.x);
    cosTheta = Math.cos(coord.y);
    cosPhi = Math.cos(coord.x);
    return {x: sinTheta*cosPhi, y: sinTheta*sinPhi, z: cosTheta};
  }
  
  function CartesianToSpherical(coord) {
    return {x: Math.atan2(coord.y, coord.x), y: Math.acos(coord.z)};
  }
  
  function almostEqual(v1, v2) {
    return Math.abs(v1-v2) < 1e-6;
  }
  
  function almostZero(v1) {
    return almostEqual(v1, 0.0);
  }
  
  function assert(cond, msg) {
    if (!cond) {
      alert(msg);
    }
  }
  
  function dot3(p1, p2) {
    return p1.x*p2.x + p1.y*p2.y + p1.z*p2.z;
  }
  
  function slerp(pos1, pos2, t, omega, omegaCoeff) {
    coeff1 = Math.sin((1.0-t) * omega) * omegaCoeff;
    coeff2 = Math.sin(t * omega) * omegaCoeff;

    return {
      x: pos1.x * coeff1 + pos2.x * coeff2,
      y: pos1.y * coeff1 + pos2.y * coeff2,
      z: pos1.z * coeff1 + pos2.z * coeff2
    };
  }
  
  function CreateRoute(pos1, pos2) {
    
    omega = Math.acos(dot3(pos1, pos2));
    assert(!almostZero(omega), "Zero angle between vectors");
    points = 50 * omega;
    incr = 1.0 / points;
    
    sinOmega = Math.sin(omega);
    omegaCoeff = 1.0 / sinOmega;
    
    // First points are known
    mainPath = [CartesianToSpherical(pos1)];
    complementPath = [CartesianToSpherical(pos2)]; 
    var t = incr;
    var limit = 2*Math.PI / omega;
    while (t < limit) { // t: 0 -> 2 pi / omega. Omega is always <= Pi, so t goes to at least 2.
      
      // t < 1.0 means we are filling the shortest path, opposite means longest
      curList = (t < 1.0) ? mainPath : complementPath;
      
      curList.push(
        CartesianToSpherical(
          slerp(pos1, pos2, t, omega, omegaCoeff)
          )
        );
      t += incr;
    }
    // Last points are known
    mainPath.push(CartesianToSpherical(pos2));
    complementPath.push(CartesianToSpherical(pos1));
    return {shortest: mainPath, complement: complementPath, angle: omega};
  }
  
  return this;
}


function Renderer(canvas) {
  
  var myCanvas = canvas;
  
  function GetContext() {
    return myCanvas.getContext("2d");
  }  
 
  function GetCanvas() {
    return myCanvas;
  }
 
  this.drawPolyLine = function(points) {
    var ctx = GetContext();
    ctx.beginPath();
    p1 = WorldToCanvas(points[0]);
    ctx.moveTo(p1.x, p1.y);
    for (i = 1; i < points.length; i++) {
      var p = WorldToCanvas(points[i]);
      ctx.lineTo(p.x, p.y);
    }
    ctx.stroke();
  }
  
  this.drawFilledCircle = function(coord, radius, color) {
    var p = WorldToCanvas(coord);
    var ctx = GetContext();
    ctx.beginPath();
    var counterClockwise = false;
    ctx.arc(p.x, p.y, radius, 0, 2 * Math.PI, counterClockwise);
    ctx.fillStyle = color;
    ctx.fill();
    ctx.lineWidth = 1;
    ctx.strokeStyle = "black";
    ctx.stroke();
  }
  
  this.drawInstructionText = function(text, xpos, ypos) {
    var ctx = GetContext();
    ctx.font = "12px Segoe UI";
    ctx.fillStyle = "black";
    ctx.fillText(text, xpos, ypos);
  }
  
  this.drawKilometerText = function(text, xpos, ypos) {
    var ctx = GetContext();
    ctx.fillStyle = "black";
    ctx.font = "bold 24px Segoe UI";
    ctx.fillText(text, xpos, ypos);
    ctx.strokeStyle = "white";
    ctx.lineWidth = 2;
    ctx.strokeText(text, xpos, ypos);
  }
  
  function WorldToCanvas(coord) {
    return {x: coord.x * GetCanvas().width, y: coord.y * GetCanvas().height };
  }
  
  
  return this;
}
