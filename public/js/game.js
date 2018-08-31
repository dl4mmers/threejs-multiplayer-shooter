//
//	game.js
//

//
//	TODO:
//	- Gutes MP Gefühl (Laufen, Springen => Delay checken)
//	- Idee: Mittelalter Setting mit Nahkampfwaffen und als Fernkampf Bogen/Armbrust
//	- Raycasting / Collider
//	- Mechanik zum Schießen / Springen / Nahkampf
//	- Camera an Spieler-Objekt heften, verschiedene Perspektiven

Game = {};

// Controls
Game.controlsEnabled = false;
Game.moveForward = false;
Game.moveBackward = false;
Game.moveLeft = false;
Game.moveRight = false;
Game.velocity = new THREE.Vector3();
Game.direction = new THREE.Vector3();

// Id
Game.self;

// Time
Game.prevTime = performance.now();

Game.init = function() {

	// Camera
	Game.camera = new THREE.PerspectiveCamera( 65, window.innerWidth/window.innerHeight, 0.01, 10000 );
	Game.camera.position.y = 60;
	Game.camera.position.z = 220;

	// Scene
	Game.scene = new THREE.Scene();
	Game.scene.background = new THREE.Color( 0xffffff );
	Game.scene.fog = new THREE.Fog( 0xffffff, 0, 750 );

	// Cam Controls
	Game.controls = new THREE.PointerLockControls( Game.camera );
	Game.scene.add( Game.controls.getObject() );

	// PlayerMap
	Game.playerMap = new Map();

	// Level
	Game.createFloor();
	Game.createLight();
	Game.createLevel();

	// Renderer
	Game.renderer = new THREE.WebGLRenderer( { antialias: true } );
	Game.renderer.setPixelRatio( window.devicePixelRatio );
	Game.renderer.setSize( window.innerWidth, window.innerHeight );
	document.body.appendChild( Game.renderer.domElement );

	// Resize
	window.addEventListener( 'resize', Game.onWindowResize, false );

	//Animation
	Game.mixers=[];
};

Game.createLevel = function(){
	var loader = new THREE.JDLoader();
	loader.load("../models/model.jd", 
            function (data)
            {                            
                for (var i = 0; i < data.objects.length; ++i)
                {
                    if (data.objects[i].type == "Mesh" || data.objects[i].type == "SkinnedMesh")
                    {
                    	var meshes=[];
                        var mesh = null;
                        var matArray = Game.createMaterials(data);
                        if (data.objects[i].type == "SkinnedMesh")
                        {
                            mesh = new THREE.SkinnedMesh(data.objects[i].geometry, matArray);
                            console.log(mesh);
                        }
                        else // Mesh
                        {
                            mesh = new THREE.Mesh(data.objects[i].geometry, matArray);
                        }
                        meshes.push(mesh);
                        Game.scene.add(mesh);
 
                        //Now we need THREE.AnimationMixer to play the animation.
                        if (mesh && mesh.geometry.animations)
                        {
                            var mixer = new THREE.AnimationMixer(mesh);
                            Game.mixers.push(mixer);
                            var action = mixer.clipAction( mesh.geometry.animations[0] );
                            action.play();
                        }
                    }
                    else if (data.objects[i].type == "Line")
                    {
                        var jd_color = data.objects[i].jd_object.color;
                        var color1 = new THREE.Color( jd_color[0] / 255, jd_color[1] / 255, jd_color[2] / 255 );
                        var material = new THREE.LineBasicMaterial({ color: color1}); 
                        var line = new THREE.Line(data.objects[i].geometry, material);
                        Game.scene.add(line);
 
                        if (line.geometry.animations)
                        {                                        
                            var mixer = new THREE.AnimationMixer(line);
                            Game.mixers.push(mixer);                                        
                            var action = mixer.clipAction(line.geometry.animations[0]);
                            action.play();
                        }
                    }
                }        
            });

/*
					//3ds files dont store normal maps
				var loader = new THREE.TextureLoader();
				//var normal = loader.load( 'models/3ds/portalgun/textures/normal.jpg' );

				var loader = new THREE.TDSLoader( );
				loader.setPath( '../models/' );
				loader.load( '../models/model.3ds', function ( object ) {

					object.traverse( function ( child ) {

						if ( child instanceof THREE.Mesh ) {

							//child.material.normalMap = normal;
						}

					} );

					Game.scene.add( object );
				});
			

*/

	/*

	// instantiate a loader
	var loader = new THREE.JSONLoader();

	// load a resource
	loader.load(
		// resource URL
			"../models/model.js",

		// onLoad callback
		function ( geometry, materials ) {
			var material = materials[ 0 ];
			var object = new THREE.Mesh( geometry, material );
				Game.scene.add( object );
		},

		// onProgress callback
		function ( xhr ) {
			console.log( (xhr.loaded / xhr.total * 100) + '% loaded' );
		},

		// onError callback
		function( err ) {
			console.log( 'An error happened' );
		}
	);
	*/

}

Game.createMaterials=function(data)
        {
            var matArray = [];
            for (var j = 0; j < data.materials.length; ++j)
            {
                var mat = new THREE.MeshPhongMaterial({});
                mat.copy(data.materials[j]);
                mat.side = THREE.DoubleSide;

                //mat.transparent = true;
                matArray.push(mat);
            }
            return matArray;
        }

Game.createFloor = function() {

	// floor
	var floorGeometry = new THREE.PlaneBufferGeometry( 2000, 2000, 100, 100 );
	floorGeometry.rotateX( - Math.PI / 2 );

	// floor vertex displacement
	var vertex = new THREE.Vector3();
	var position = floorGeometry.attributes.position;
	for ( var i = 0, l = position.count; i < l; i ++ ) {
		vertex.fromBufferAttribute( position, i );
		vertex.x += Math.random() * 20 - 10;
		vertex.y += Math.random() * 2;
		vertex.z += Math.random() * 20 - 10;
		position.setXYZ( i, vertex.x, vertex.y, vertex.z );
	}

	// ensure each face has unique vertices
	floorGeometry = floorGeometry.toNonIndexed(); 
	position = floorGeometry.attributes.position;

	// floor colors
	var colors = [];
	var color = new THREE.Color();
	for ( var i = 0, l = position.count; i < l; i ++ ) {
		color.setHSL( Math.random() * 0.3 + 0.5, 0.75, Math.random() * 0.25 + 0.75 );
		colors.push( color.r, color.g, color.b );
	}
	floorGeometry.addAttribute( 'color', new THREE.Float32BufferAttribute( colors, 3 ) );

	// floor material
	var floorMaterial = new THREE.MeshBasicMaterial( { vertexColors: THREE.VertexColors } );

	// floor mesh
	var floor = new THREE.Mesh( floorGeometry, floorMaterial );

	// add floor
	Game.scene.add( floor );
}

Game.createLight = function() {

	// Light
	var light = new THREE.HemisphereLight( 0xeeeeff, 0x777788, 0.75 );
	light.position.set( 0.5, 1, 0.75 );
	Game.scene.add( light );

}

Game.addPlayer = function(player) {

	// Create Cube
	var playerObj = {};
	playerObj.cube = new THREE.Mesh( new THREE.BoxGeometry( 20, 20, 20 ), new THREE.MeshBasicMaterial( { color: 0xff0000 } ) );

	// Add Tag
	playerObj.cube.name = player.id;

	// Set position
	playerObj.cube.position = player.position;

	// Add cube to Scene and PlayerMap
	Game.scene.add( playerObj.cube );
	Game.playerMap.set(player.id, playerObj);

}

Game.removePlayer = function(id) {

	// Get Object
	var obj = Game.scene.getObjectByName(id);

	// Remove it
    Game.scene.remove( obj );
    obj.geometry.dispose();
    obj.material.dispose();
    obj = undefined;

   	// Clear PlayerMap
    Game.playerMap.delete(id);

    Game.animate();

}

Game.movePlayer = function(MoveData) {
	
	// Translate ControlObject @ Client
	if(MoveData.id == Game.self) {
		Game.controls.getObject().position.x = MoveData.x;
		Game.controls.getObject().position.z = MoveData.z;
	}

	// Translate PlayerObject @ all
	var player = Game.playerMap.get(MoveData.id);
	player.cube.position.x = MoveData.x;
	player.cube.position.z = MoveData.z;

}

Game.clearScene = function(obj) {

	// Remove every scene child 
	while( obj.children.length > 0 ) { obj.remove(obj.children[0]); }
	if(obj.geometry) obj.geometry.dispose();
	if(obj.material) obj.material.dispose();
	if(obj.texture)  obj.texture.dispose();
}   

Game.animate = function () {



		
		// delta time
		var time = performance.now();
		var delta = ( time - Game.prevTime ) / 1000;
		if ( Game.controlsEnabled === true ) {
			// calc movement and push on socket
			Client.calcMovement(delta);
		}

		// time
		Game.prevTime = time;
		for (var i = 0; i < Game.mixers.length; ++i){
	    	Game.mixers[i].update(delta); 
			// ... the rest of your code
		}



	Game.renderer.render( Game.scene, Game.camera );
	requestAnimationFrame( Game.animate );
};

Game.onWindowResize = function() {
	Game.camera.aspect = window.innerWidth / window.innerHeight;
	Game.camera.updateProjectionMatrix();
	Game.renderer.setSize( window.innerWidth, window.innerHeight );
}

// Start game
Game.init();
Game.animate();