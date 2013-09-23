function App() {
  
  this.Start = function() {
    GetOverlayCanvas().onmousedown = OnMouseDown;
    
    GetOverlayCanvas().onmousemove = OnMouseMove;
    
    this.imageObj = new Image();

    this.imageObj.onload = function() {
      Draw();
    };
    
    this.imageObj.src = 'world_map.jpg';
  }
  
  function Draw() {
    GetContext().drawImage(this.imageObj, 0, 0, GetCanvas().width, GetCanvas().height);
    DrawLongLats();
    for (var i = 0; i < routes.length; i++) {
      DrawTotalRoute(routes[i]);
    }
    DrawInstructions();
    
    if (prevClick != undefined) {
      myRenderer.drawFilledCircle(prevClick, 5, "magenta");
    }
    DrawOverlay();
  }
  
  function DrawOverlay() {
    ClearCanvas(GetOverlayCanvas());
    DrawAntipodalPos();
    DrawCrossHair();
    DrawCurrentRoute();
    DrawCoordinates();
  }
  
  function DrawAntipodalPos() {
    if (curAntipodalPos != undefined) {
      myOverlayRenderer.drawCircle(curAntipodalPos, 3, "red");
    }
  }
  
  function DrawCrossHair() {
    if (curPos != undefined) {
      myOverlayRenderer.drawPolyLine(CreateLongitudeLine(curPos.x), 0.4, "red");
      myOverlayRenderer.drawPolyLine(CreateLatitudeLine(curPos.y), 0.4, "red");
    }
  }
  
  function DrawCurrentRoute() {
    if (prevClick != undefined) {
      if (!vector2AlmostEqual(prevClick, curPos)) {
        var curRoute = CreateRoute(WorldToCartesian(prevClick), WorldToCartesian(curPos));
        DrawPath(curRoute.shortest, 1, "magenta", myOverlayRenderer);
      }
    }
  }
  
  function DrawCoordinates() {
    if (curPos != undefined) {
      var canvasCoords = myOverlayRenderer.WorldToCanvas(curPos);
      var longlat = WorldToLongLat(curPos);
      var lng = longlat.x;
      var lat = longlat.y;
      var xPos = Math.min(canvasCoords.x+2, GetCanvas().width - 45);
      var suf = curPos.x >= 0.5 ? "E" : "W"; 
      myOverlayRenderer.drawInstructionText(lng.toFixed(2) + suf, xPos, 15, "red");
      suf = curPos.y >= 0.5 ? "S" : "N";
      var yPos = Math.max(Math.max(15, canvasCoords.y-2), 30); // The other max is to avoid the x-label in the upper corner
      myOverlayRenderer.drawInstructionText(lat.toFixed(2) + suf, 5, yPos, "red");
    }
  }
  
  function GetContext() {
    return GetCanvas().getContext("2d");
  }
  
  function ClearCanvas(canvas) {
    var ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  }
  
  function GetOverlayContext() {
    return GetOverlayCanvas().getContext("2d");
  }
  
  function GetCanvas() {
    return document.getElementById("canvas");
  }
  
  function GetOverlayCanvas() {
    return document.getElementById("overlayCanvas");
  }
  
  var prevClick = undefined;
  var curAntipodalPos = undefined;
  var curPos = undefined;
  
  var routes = [];
  var drawComplement = false;
  var myRenderer = new Renderer(GetCanvas());
  var myOverlayRenderer = new Renderer(GetOverlayCanvas());

  function OnMouseMove(ev) {
    var pos = ScreenToWorld(ev.clientX, ev.clientY);
    var posCartesian = WorldToCartesian(pos);
    
    posCartesian.x *= -1.0;
    posCartesian.y *= -1.0;
    posCartesian.z *= -1.0;
    
    curPos = pos;
    
    curAntipodalPos = CartesianToWorld(posCartesian);
    
    DrawOverlay();
  }


  function OnMouseDown(ev) {
    if (ev.which == 3) {
      routes = [];
      prevClick = undefined;
    } else if (ev.which == 2) {
      drawComplement = !drawComplement;
    } else {
    
      pos = ScreenToWorld(ev.clientX, ev.clientY);
      
      // Dodge singularities
      var threshold = 0.01;
      if (pos.y < threshold || pos.y > (1.0-threshold)) {
        return;
      }
      
      if (prevClick != undefined) {
        
        if (vector2AlmostEqual(prevClick, pos)) {
          return;
        }
        
        routes.push(CreateRoute(WorldToCartesian(prevClick), WorldToCartesian(pos)));
        prevClick = undefined;
      } else {
        prevClick = pos;
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
  function SplitPath(points) {
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
  
  function DrawSplittedPath(path, width, color, renderer) {
    for (var i = 0; i < path.length; i++) {
      renderer.drawPolyLine(path[i].map(SphericalToWorld), width, color);
    }
  }
  
  function DrawPath(path, width, color, renderer) {
    DrawSplittedPath(SplitPath(path), width, color, renderer);
  }
  
  function DrawTotalRoute(route) {
    var ctx = GetContext();
    
    DrawPath(route.shortest, 5, "black", myRenderer);
    
    
    if (drawComplement) {
      DrawPath(route.complement, 1.5, "blue", myRenderer);
    }
    
    var points = route.shortest;
    var first = SphericalToWorld(points[0]);
    var last = SphericalToWorld(points[points.length-1]);
    
    myRenderer.drawFilledCircle(first, 5, "magenta");
    myRenderer.drawFilledCircle(last, 5, "magenta");
    
    DrawPath(route.shortest, 3, "magenta", myRenderer);
    
    var text = (route.angle * 6371).toFixed(0) + " km";
    midpoint = SphericalToWorld(points[Math.floor(points.length / 2)]);
    myRenderer.drawKilometerText(text, midpoint);
  }
  
  function DrawInstructions() {
    var xPos = GetCanvas().width - 360;
    var yPos = GetCanvas().height - 80;
    myRenderer.drawInstructionText("Left click: Draw routes", xPos, yPos, "black");
    yPos += 20;
    myRenderer.drawInstructionText("Middle click: Toggle complement route (" + (drawComplement ? "ON" : "OFF") + ")", xPos,  yPos, "black");
    yPos += 20;
    myRenderer.drawInstructionText("Right click: Clear routes", xPos, yPos, "black");
  }
  
  function DrawLongLats() {
    var lineWidth = 0.2;
    DrawLatitudes(lineWidth);
    DrawLongitudes(lineWidth);
  }
  
  function CreateLatitudeLine(yCoord) {
    return [{x: -1.0, y: yCoord}, {x: 0.0, y: yCoord}, {x: 1.0, y: yCoord}];
  }
  
  function DrawLatitudes(lineWidth) {
    var incr = Math.PI/8.0;
    var yCoord = incr;
    while (yCoord < Math.PI - 1e-1) {
      var yCoordWorld = SphericalToWorld({x: 0, y: yCoord}).y;
      var scaler = almostEqual(yCoord, Math.PI*0.5) ? 3 : 1;
      myRenderer.drawPolyLine(CreateLatitudeLine(yCoordWorld), lineWidth * scaler, "black");
      yCoord += incr;
    }
  }
  
  function CreateLongitudeLine(xCoord) {
    return [{x: xCoord, y: -1.0}, {x: xCoord, y: 1.0}];
  }
  
  function DrawLongitudes(lineWidth) {
    var incr = Math.PI/6.0;
    var xCoord = -Math.PI + incr;
    while (xCoord < Math.PI - 1e-1) {
      var xCoordWorld = SphericalToWorld({x: xCoord, y: 0}).x;
      var scaler = almostEqual(xCoord, 0.0) ? 3 : 1;
      myRenderer.drawPolyLine(CreateLongitudeLine(xCoordWorld), lineWidth * scaler, "black");
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
    var rect = GetCanvas().getBoundingClientRect();
    var ret = { x: (sx - rect.left) / (GetCanvas().width + 1.0), y: (sy - rect.top) / (GetCanvas().height + 1.0)}; // The +1.0 comes from the 1px border
    return ret;
  }
  
  function compose(f1, f2) {
    return function() {
      return f1(f2.apply(null, arguments));
    };
  }
  
  WorldToCartesian = compose(SphericalToCartesian, WorldToSpherical);
  
  CartesianToWorld = compose(SphericalToWorld, CartesianToSpherical);
   
  function WorldToLongLat(coord) {
    var x = Math.abs(coord.x - 0.5) * Math.PI * 2;
    var y = Math.abs(coord.y - 0.5)* Math.PI;
    return RadToDeg({x: x, y: y}); // Plate carrée
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
  
  function vector2AlmostEqual(v1, v2) {
    return almostEqual(v1.x, v2.x) && almostEqual(v1.y, v2.y);
    
  }
  
  function assert(cond, msg) {
    if (!cond) {
      alert(msg);
    }
  }
  
  function dot3(p1, p2) {
    return p1.x*p2.x + p1.y*p2.y + p1.z*p2.z;
  }
  
  function vec3sum(v1, v2) {
    return {x: v1.x + v2.x, y: v1.y + v2.y, z: v1.z + v2.z};
  }
  
  function vec3normalize(v) {
    var len = Math.sqrt(v.x*v.x + v.y*v.y + v.z*v.z);
    if (almostZero(len)) {
      return {x: 1.0, y: 0.0, z: 0.0};
    }
    var invlen = 1.0 / len;
    return {x: v.x * invlen, y: v.y * invlen, z: v.z * invlen};
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
    
    var omega = Math.acos(dot3(pos1, pos2));
    assert(!almostZero(omega), "Zero angle between vectors");
    
    if (almostEqual(omega, Math.PI)) { // Directly antipodal points
      pos2 = vec3normalize(vec3sum(pos2, {x: 1e-4, y: -1e-4, z: 1e-4})); // deterministic perturbation
      omega = Math.acos(dot3(pos1, pos2));
      assert(!almostEqual(omega, Math.PI), "Perturbation ineffective!");
    }
    
    var points = 50 * omega;
    var incr = 1.0 / points;
    
    var sinOmega = Math.sin(omega);
    
    var omegaCoeff = 1.0 / sinOmega;
    
    // First points are known
    var mainPath = [CartesianToSpherical(pos1)];
    var complementPath = [CartesianToSpherical(pos2)]; 
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
  
  function GetCanvas() {
    return myCanvas;
  }
 
  this.GetContext = function() {
    return myCanvas.getContext("2d");
  }  
 
  this.drawPolyLine = function(points, width, color) {
    var ctx = this.GetContext();
    ctx.lineWidth = width;
    ctx.strokeStyle = color;
    ctx.beginPath();
    var p1 = this.WorldToCanvas(points[0]);
    ctx.moveTo(p1.x, p1.y);
    for (i = 1; i < points.length; i++) {
      var p = this.WorldToCanvas(points[i]);
      ctx.lineTo(p.x, p.y);
    }
    ctx.stroke();
  }
  
  this.drawCircle = function(coord, radius, color) {
    var p = this.WorldToCanvas(coord);
    var ctx = this.GetContext();
    ctx.beginPath();
    var counterClockwise = false;
    ctx.arc(p.x, p.y, radius, 0, 2 * Math.PI, counterClockwise);
    ctx.lineWidth = 1;
    ctx.strokeStyle = color;
    ctx.stroke();
  }
      
  this.drawFilledCircle = function(coord, radius, color) {
    var p = this.WorldToCanvas(coord);
    var ctx = this.GetContext();
    ctx.beginPath();
    var counterClockwise = false;
    ctx.arc(p.x, p.y, radius, 0, 2 * Math.PI, counterClockwise);
    ctx.fillStyle = color;
    ctx.fill();
    ctx.lineWidth = 1;
    ctx.strokeStyle = "black";
    ctx.stroke();
  }
  
  this.drawInstructionText = function(text, xpos, ypos, color) {
    var ctx = this.GetContext();
    ctx.font = "12px Segoe UI";
    ctx.fillStyle = color;
    ctx.fillText(text, xpos, ypos);
  }
  
  this.drawKilometerText = function(text, coord) {
    var midpoint = this.WorldToCanvas(coord);
    var xpos = Math.max(20, midpoint.x-50);
    var ypos = Math.max(20, midpoint.y);
    var ctx = this.GetContext();
    ctx.fillStyle = "black";
    ctx.font = "bold 24px Segoe UI";
    ctx.fillText(text, xpos, ypos);
    ctx.strokeStyle = "white";
    ctx.lineWidth = 2;
    ctx.strokeText(text, xpos, ypos);
  }
  
  this.WorldToCanvas = function(coord) {
    return {x: coord.x * GetCanvas().width, y: coord.y * GetCanvas().height };
  }
  
  
  return this;
}
