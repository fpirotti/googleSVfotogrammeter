'use strict';

var viewer;

function onClick(e) {
  viewer.click(e);
}

function onLoad() {
  var element = document.getElementById("panorama");
  viewer = new PanoramaViewer(element);
  viewer.update();
}

function PanoramaViewer(element) {
  this.element = element;
  this.width = element.width;
  this.height = element.height;
  this.pitch = 0;
  this.heading = 0;

  element.addEventListener("click", onClick, false);
}

PanoramaViewer.FOV = 90;

PanoramaViewer.prototype.makeUrl = function() {
  var fov = PanoramaViewer.FOV;

  return "https://maps.googleapis.com/maps/api/streetview?location=40.457375,-80.009353&size=" + this.width + "x" + this.height + "&fov=" + fov + "&heading=" + this.heading + "&pitch=" + this.pitch;
}

PanoramaViewer.prototype.update = function() {
  var element = this.element;

  element.style.backgroundImage = "url(" + this.makeUrl() + ")";

  var width = this.width;
  var height = this.height;

  var context = element.getContext('2d');

  context.strokeStyle = '#FFFF00';

  context.beginPath();
  context.moveTo(0, height / 2);
  context.lineTo(width, height / 2);
  context.stroke();

  context.beginPath();
  context.moveTo(width / 2, 0);
  context.lineTo(width / 2, height);
  context.stroke();
}

function sgn(x) {
  return x >= 0 ? 1 : -1;
}

PanoramaViewer.prototype.unmap = function(heading, pitch) {
  var PI = Math.PI
  var cos = Math.cos;
  var sin = Math.sin;
  var tan = Math.tan;

  var fov = PanoramaViewer.FOV * PI / 180.0;
  var width = this.width;
  var height = this.height;

  var f = 0.5 * width / tan(0.5 * fov);

  var h = heading * PI / 180.0;
  var p = pitch * PI / 180.0;

  var x = f * cos(p) * sin(h);
  var y = f * cos(p) * cos(h);
  var z = f * sin(p);

  var h0 = this.heading * PI / 180.0;
  var p0 = this.pitch * PI / 180.0;

  var x0 = f * cos(p0) * sin(h0);
  var y0 = f * cos(p0) * cos(h0);
  var z0 = f * sin(p0);

  //
  // Intersect the ray O, v = (x, y, z)
  // with the plane at M0 of normal n = (x0, y0, z0)
  //
  //   n . (O + t v - M0) = 0
  //   t n . v = n . M0 = f^2
  //
  var t = f * f / (x0 * x + y0 * y + z0 * z);

  var ux = sgn(cos(p0)) * cos(h0);
  var uy = -sgn(cos(p0)) * sin(h0);
  var uz = 0;

  var vx = -sin(p0) * sin(h0);
  var vy = -sin(p0) * cos(h0);
  var vz = cos(p0);

  var x1 = t * x;
  var y1 = t * y;
  var z1 = t * z;

  var dx10 = x1 - x0;
  var dy10 = y1 - y0;
  var dz10 = z1 - z0;

  // Project on the local basis (u, v) at M0
  var du = ux * dx10 + uy * dy10 + uz * dz10;
  var dv = vx * dx10 + vy * dy10 + vz * dz10;

  return {
    u: du + width / 2,
    v: height / 2 - dv,
  };
}

PanoramaViewer.prototype.map = function(u, v) {
  var PI = Math.PI;
  var cos = Math.cos;
  var sin = Math.sin;
  var tan = Math.tan;
  var sqrt = Math.sqrt;
  var atan2 = Math.atan2;
  var asin = Math.asin;

  var fov = PanoramaViewer.FOV * PI / 180.0;
  var width = this.width;
  var height = this.height;

  var h0 = this.heading * PI / 180.0;
  var p0 = this.pitch * PI / 180.0;

  var f = 0.5 * width / tan(0.5 * fov);

  var x0 = f * cos(p0) * sin(h0);
  var y0 = f * cos(p0) * cos(h0);
  var z0 = f * sin(p0);

  var du = u - width / 2;
  var dv = height / 2 - v;

  var ux = sgn(cos(p0)) * cos(h0);
  var uy = -sgn(cos(p0)) * sin(h0);
  var uz = 0;

  var vx = -sin(p0) * sin(h0);
  var vy = -sin(p0) * cos(h0);
  var vz = cos(p0);

  var x = x0 + du * ux + dv * vx;
  var y = y0 + du * uy + dv * vy;
  var z = z0 + du * uz + dv * vz;

  var R = sqrt(x * x + y * y + z * z);
  var h = atan2(x, y);
  var p = asin(z / R);

  return {
    heading: h * 180.0 / PI,
    pitch: p * 180.0 / PI
  };
}

PanoramaViewer.prototype.click = function(e) {
  var rect = e.target.getBoundingClientRect();
  var u = e.clientX - rect.left;
  var v = e.clientY - rect.top;

  var uvCoords = this.unmap(this.heading, this.pitch);

  console.log("current viewport center");
  console.log("  heading: " + this.heading);
  console.log("  pitch: " + this.pitch);
  console.log("  u: " + uvCoords.u)
  console.log("  v: " + uvCoords.v);

  var hpCoords = this.map(u, v);
  uvCoords = this.unmap(hpCoords.heading, hpCoords.pitch);

  console.log("click at (" + u + "," + v + ")");
  console.log("  heading: " + hpCoords.heading);
  console.log("  pitch: " + hpCoords.pitch);
  console.log("  u: " + uvCoords.u);
  console.log("  v: " + uvCoords.v);

  this.heading = hpCoords.heading;
  this.pitch = hpCoords.pitch;
  this.update();
}
