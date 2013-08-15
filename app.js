function App() {
  
  this.Start = function() {
    GetCanvas().onmousedown = OnMouseDown;
  /*  GetCanvas().onmouseup = OnMouseUp;
    GetCanvas().onmousemove = OnMouseMove;
    
    document.onkeydown = OnKey;*/
    
    this.imageObj = new Image();

    this.imageObj.onload = function() {
      Draw();
    };
    
    this.imageObj.src = 'world_map.jpg';
    
  }
  
  function Draw() {
    GetContext().drawImage(this.imageObj, 0, 0, GetCanvas().width, GetCanvas().height);
  }
  
  
  function GetContext() {
    return GetCanvas().getContext("2d");
  }
  
  function GetCanvas() {
    return document.getElementById("canvas");
  }
  
  function OnMouseDown(ev) {
    x = ev.clientX;
    y = ev.clientY;
    canv = ScreenToWorld(ev.clientX, ev.clientY);
    Log(LongLatToDeg(CanvasToLongLat(canv)));
  }
  
  function Log(coord) {
    console.log("x: " + coord.x + " y: " + coord.y);
  }
  
  function ScreenToWorld(sx, sy) {
    rect = GetCanvas().getBoundingClientRect();
    return { x: (sx - rect.left + 0.5) / GetCanvas().width, y: (sy - rect.top) / GetCanvas().height }; // hhhhh
  }
  
  function CanvasToLongLat(coord) {
    var y = Math.abs(coord.y - 0.5)* Math.PI; // Experimental value
    //return {x: (coord.x - 0.5) * Math.PI * 2, y: 2 * Math.atan(Math.exp(y)) - Math.PI * 0.5}; // Mercator
    return {x: (coord.x - 0.5) * Math.PI * 2, y: y}; // Plate carrée
  }
  
  function LongLatToDeg(coord) {
    return {x : (180.0/Math.PI) * coord.x, y: (180.0/Math.PI) * coord.y};
  }
  
  return this;
}
