var DAT = DAT || {};

DAT.Globe = function(container, colorFn) {

  colorFn = colorFn || function(x) {
    var c = new THREE.Color();
    c.setHSV( ( 0.6 - ( x * 0.5 ) ), 1.0, 1.0 );
    return c;
  };

  var camera, scene, sceneAtmosphere, renderer, w, h;
  var vector, mesh, point;

  var pointGeo, gridGeo, gridModel;
  var gridDensity = 10; // 0-10
  var pointType = 'cube'; // cube || hex || sphere
  var pointScale = 0.4;
  var pointExtrudeRange = [0.1,10];

  gridModel = 'models/gridLand'+gridDensity+'.js';
  var imgDir = './';
  var rotation = { x: 0, y: 0 };
  var distance = 100000, distanceTarget = 100000;

  function modelLoader() {
    loader = new THREE.JSONLoader();
    loader.load({ model:"cube.js", callback: function(g) {
      pointGeo = g;
      gridLoader()
    }});
  }
  function gridLoader() {
    loader = new THREE.JSONLoader();
    loader.load({ model: gridModel, callback: function(g) {
      gridGeo = g;
      init();
      createPoints();
    }});
  }

  function init() {

    container.style.color = '#fff';
    container.style.font = '13px/20px Arial, sans-serif';

    var shader, uniforms, material;
    w = container.offsetWidth || window.innerWidth;
    h = container.offsetHeight || window.innerHeight;

    camera = new THREE.Camera(
        30, w / h, 1, 10000);
    camera.position.z = distance;

    vector = new THREE.Vector3();

    scene = new THREE.Scene();
    sceneAtmosphere = new THREE.Scene();

    var geometry = new THREE.Sphere(200, 40, 40);

    shader = Shaders['earth'];
    uniforms = THREE.UniformsUtils.clone(shader.uniforms);

    uniforms['texture'].texture = THREE.ImageUtils.loadTexture(imgDir+'world' + '.jpg');
    material = new THREE.MeshShaderMaterial({

          uniforms: uniforms,
          vertexShader: shader.vertexShader,
          fragmentShader: shader.fragmentShader

        });
    mesh = new THREE.Mesh(geometry, material);
    mesh.matrixAutoUpdate = false;
    scene.addObject(mesh);

    shader = Shaders['atmosphere'];
    uniforms = THREE.UniformsUtils.clone(shader.uniforms);

    material = new THREE.MeshShaderMaterial({

          uniforms: uniforms,
          vertexShader: shader.vertexShader,
          fragmentShader: shader.fragmentShader

        });

    mesh = new THREE.Mesh(geometry, material);
    mesh.scale.x = mesh.scale.y = mesh.scale.z = 0.1;
    mesh.flipSided = true;
    mesh.matrixAutoUpdate = false;
    mesh.updateMatrix();
    sceneAtmosphere.addObject(mesh);

    point = new THREE.Mesh(pointGeo);

    renderer = new THREE.WebGLRenderer({antialias: true});
    renderer.autoClear = false;
    renderer.setClearColorHex(0x00000, 0.0);
    renderer.setSize(w, h);

    renderer.domElement.style.position = 'absolute';

    container.appendChild(renderer.domElement);

    animate();
  }

  function createPoints() {

    var subgeo = new THREE.Geometry();
    console.log(gridGeo);

    for (i = 0; i < gridGeo.vertices.length; i ++) {
      var x = gridGeo.vertices[i].position.x;
      var y = gridGeo.vertices[i].position.y;
      var z = gridGeo.vertices[i].position.z;


     var r;
     var theta;
     var phi;
       theta = Math.acos(y/200)/Math.PI;
       phi = ((Math.atan2(z,-x))+Math.PI)/(Math.PI*2);
        addPoint(x,y,z,phi,theta, subgeo);
    }

    if (pointType == ('sphere')){
      subgeo.computeCentroids();
      subgeo.computeFaceNormals();
      subgeo.computeVertexNormals();
    }

    this._baseGeometry = subgeo;

    this.shader = Shaders['data'];
    this.uniforms = THREE.UniformsUtils.clone(this.shader.uniforms);

    this.uniforms['texture'].texture = THREE.ImageUtils.loadTexture(imgDir+'worldMask' + '.jpg');
    this.uniforms['textureData'].texture = THREE.ImageUtils.loadTexture(imgDir+'worldDataSample' + '.jpg');
    this.uniforms['extrudeMin'].value = pointExtrudeRange[0];
    this.uniforms['extrudeMax'].value = pointExtrudeRange[1];

    this.material = new THREE.MeshShaderMaterial({

          uniforms: this.uniforms,
          vertexShader: this.shader.vertexShader,
          fragmentShader: this.shader.fragmentShader,
          color: 0xffffff,
          vertexColors: THREE.FaceColors

        });

    this.points = new THREE.Mesh(this._baseGeometry, this.material);
    this.points.doubleSided = false;
    scene.addObject(this.points);
  }

  function addPoint(x,y,z,u,v, subgeo) {

    point.position.x = x;
    point.position.y = y;
    point.position.z = z;

    point.scale.set(pointScale, pointScale, 1);

    point.lookAt(mesh.position);

    point.updateMatrix();

    var i,j;
    for (i = 0; i < point.geometry.faces.length; i++) {

      for (j = 0; j < point.geometry.faces[i].vertexNormals.length; j++) {

        var len = point.geometry.faces[i].vertexNormals[j].length();
        point.geometry.faces[i].vertexNormals[j] = new THREE.Vector3(x/200*len,y/200*len,z/200*len);

      }

    }
    for (i = 0; i < point.geometry.faceVertexUvs[0].length; i++) {

      for (j = 0; j < point.geometry.faceVertexUvs[0][i].length; j++) {
         point.geometry.faceVertexUvs[0][i][j] = new THREE.UV( u,v );
      }

    }
    GeometryUtils.merge(subgeo, point);
  }

  function zoom(delta) {
    distanceTarget -= delta;
    distanceTarget = distanceTarget > 1000 ? 1000 : distanceTarget;
    distanceTarget = distanceTarget < 350 ? 350 : distanceTarget;
  }

  function animate () {
    requestAnimationFrame(animate);
    render();
  }

  function render() {
    zoom(10);

    rotation.x += 0.001;
    distance += (distanceTarget - distance) * 0.1;

    camera.lookAt(mesh);
    camera.position.x = 1000 * Math.sin(rotation.x) * Math.cos(rotation.y);
    camera.position.y = 1000 * Math.sin(rotation.y); 
    camera.position.z = 1000 * Math.cos(rotation.x) * Math.cos(rotation.y);

    vector.copy(camera.position);

    renderer.clear();
    renderer.render(scene, camera);
    renderer.render(sceneAtmosphere, camera);
  }

  this.createPoints = createPoints;
  this.renderer = renderer;
  this.scene = scene;
  this.animate = animate;
  this.modelLoader = modelLoader;

  return this;

};

