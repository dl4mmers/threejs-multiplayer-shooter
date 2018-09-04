//
//	game.js
//

Game = {};

// Cannon
var physicsMaterial, balls=[], ballMeshes=[];
Game.sphereShape;
Game.sphereBody;

// For Shoot
var ballShape = new CANNON.Sphere(0.2);
var ballGeometry = new THREE.SphereGeometry(ballShape.radius, 32, 32);
var shootDirection = new THREE.Vector3();
var shootVelo = 80;

// Loading Progress
Game.loadingLevel = 0;
Game.loadingCollision = 0;
Game.finishedLoading = false;

// Id
Game.self = undefined;
Game.team = undefined;

// Time
Game.prevTime = performance.now();
var mySound;
var mySounds;
//
// Cannon Physics Initialization
//
Game.initCannon = function()
{
    // Setup our world
    Game.world = new CANNON.World();
    Game.world.quatNormalizeSkip = 0;
    Game.world.quatNormalizeFast = false;

    var solver = new CANNON.GSSolver();

    Game.world.defaultContactMaterial.contactEquationStiffness = 1e9;
    Game.world.defaultContactMaterial.contactEquationRelaxation = 4;

    solver.iterations = 1;
    solver.tolerance = 0.1;
    var split = true;
    if(split)
        Game.world.solver = new CANNON.SplitSolver(solver);
    else
        Game.world.solver = solver;

    Game.world.gravity.set(0,-20,0);
    Game.world.broadphase = new CANNON.NaiveBroadphase();//GridBroadphase(new CANNON.Vec3(0,0,0),new CANNON.Vec3(450,10,500),500,10,500);

    // Create a slippery material (friction coefficient = 0.0)
    physicsMaterial = new CANNON.Material("slipperyMaterial");
    var physicsContactMaterial = new CANNON.ContactMaterial(physicsMaterial,
                                                            physicsMaterial,
                                                            0.0, // friction coefficient
                                                            0.3  // restitution
                                                            );
    // We must add the contact materials to the world
    Game.world.addContactMaterial(physicsContactMaterial);

}


//
// Three Initialization
//
Game.initThree = function() 
{

	// Camera
	Game.camera = new THREE.PerspectiveCamera( 75, window.innerWidth/window.innerHeight, 0.1, 1000 );

	// Spectate position
	Game.camera.position.x = -21;
	Game.camera.position.y = 18;
	Game.camera.position.z = 142;

	// Scene
	Game.scene = new THREE.Scene();
	Game.scene.background = new THREE.Color( 0x000000 );
	Game.scene.fog = new THREE.Fog( 0xA1FF00, 0, 750 );

	// PlayerMap
	Game.playerMap = new Map();

	// Renderer
	Game.renderer = new THREE.WebGLRenderer( { antialias: true } );
	Game.renderer.setPixelRatio( window.devicePixelRatio );
	Game.renderer.setSize( window.innerWidth, window.innerHeight );
	document.body.appendChild( Game.renderer.domElement );

	// Resize
	window.addEventListener( 'resize', Game.onWindowResize, false );

	// DebugRenderer
	Game.cannonDebugRenderer = new THREE.CannonDebugRenderer( Game.scene, Game.world );

	// Init Level
	Game.createLight();
	Game.createLevel();
	Game.createCollisionLevel();
	Game.mixers=[];
};

//
// Animate Function
//

Game.animate = function () 
{
	requestAnimationFrame( Game.animate );

	// delta time
	var time = performance.now();
	var delta = ( time - Game.prevTime ) / 1000;

	// Cannon Simulation Loop
	Game.world.step(1.0 / 120.0);	// Step twice with smaller value to ensure correct collision detection
	Game.world.step(1.0 / 120.0);	// Its the same as calling step(1.0 / 60.0) one time

	// get loading progress
	if(!Game.finishedLoading)
		Client.setLoadingProgress(Game.loadingLevel + Game.loadingCollision);

	if( (Game.loadingLevel + Game.loadingCollision) == 100 && !Game.finishedLoading )
		Game.finishedLoading = true;

	// update scene
	Game.updateScene(delta);

	// update Debug Renderer
	//Game.cannonDebugRenderer.update();

	// render
	Game.renderer.render( Game.scene, Game.camera );

	// time
	Game.prevTime = time;
};



Game.updateScene = function( delta )
{

    // Update ball positions
    for(var i=0; i < balls.length; i++)
    {
        
    	// check distance from ball to players
    	var minDist = 1000;
    	var b = ballMeshes[i].position;
		Game.playerMap.forEach( function(value, key) {
			var a = new THREE.Vector3(value.body.position.x, value.body.position.y, value.body.position.z);
			var d = a.distanceTo( b );
			if ( d < minDist )
				minDist = d;
		}, Game.playerMap);

		// check distance from ball to self
		var selfV = new THREE.Vector3(Game.sphereBody.position.x, Game.sphereBody.position.y, Game.sphereBody.position.z);
		var selfDist = selfV.distanceTo( b );
		if( selfDist < minDist)
			minDist = selfDist;

		// check distance to nearest player and remove if dist > 100
		if(minDist > 100)
		{

			// remove from scene / world
			Game.world.remove(balls[i]);
			Game.scene.remove(ballMeshes[i]);

			// remove from arrays
			var index1 = balls.indexOf(balls[i]);
			var index2 = ballMeshes.indexOf(ballMeshes[i]);
			if (index1 > -1) { balls.splice(index1, 1); }
			if (index2 > -1) { ballMeshes.splice(index2, 1 ); }

		} 
		else 
		{
			// set position
			ballMeshes[i].position.copy(balls[i].position);
        	ballMeshes[i].quaternion.copy(balls[i].quaternion);
		}

    }

    // Update Players
	Game.playerMap.forEach( function(value, key) 
	{
		value.mesh.position.set(value.body.position.x, value.body.position.y - 1.4, value.body.position.z);

	}, Game.playerMap);

	// update controls and self position ONLY if not in spectate mode
	if(Game.self !== "spectate" && Game.self !== undefined)
	{
		Game.updatePosAndRot();
		Game.updateMovingState();
		Game.controls.update( delta );
	}

	// Update Bone&Line Animations
	for (var i = 0; i < Game.mixers.length; ++i)
	{
	   	Game.mixers[i].update(delta); 
	}

}


Game.createLevel = function()
{
	var loader = new THREE.JDLoader();
	loader.load("../models/model.jd", 
    
		// onLoad Callback
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
	                    mesh.frustumCulled = false;
	                    //console.log(mesh);
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
	    },

	    // onProgress Callback
	    function( xhr ) 
	    {
	    	Game.loadingLevel = (xhr.loaded / xhr.total * 100) / 2;
	    }
    );
}


Game.createCollisionLevel = function()
{
	var loader = new THREE.ColladaLoader( );
	loader.load( '../models/collision.dae', 

		// onLoad Callback
		function ( collada ) 
		{
			createPhysX(collada, true, 1, Game.world);
		},

		function ( xhr )
		{
			Game.loadingCollision = (xhr.loaded / xhr.total * 100) / 2;
		} 

	);

}


Game.createMaterials = function(data)
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


Game.createLight = function() 
{
	//Alien Light
	var plight = new THREE.PointLight( 0xA1FF00, 1, 100 );
	plight.position.set( 0, 10, 0 );
	Game.scene.add( plight );

	//Terminal Light
	var plight = new THREE.PointLight( 0x3D85C6, 1, 100 );
	plight.position.set( 0, 10, 1 );
	Game.scene.add( plight );

	//stage light
	var plight = new THREE.PointLight( 0x3D85C6, 3, 100 );
	plight.position.set( 40, 1, 140 );
	Game.scene.add( plight );

	var plight = new THREE.PointLight( 0xA1FF00, 1, 100 );
	plight.position.set( -20, 1, 80 );
	Game.scene.add( plight );

	//ENEMY BASE
	var plight = new THREE.PointLight( 0xff9d00, 1, 100 );
	plight.position.set( 187, 1.5, 185 );
	Game.scene.add( plight );

	//Enemy Hall
	var plight = new THREE.PointLight( 0x00ff26, 1, 100 );
	plight.position.set( 86, 1.5, 210 );
	Game.scene.add( plight );

	//STARS
	//home
	var plight = new THREE.PointLight( 0xffffff, 1, 100 );
	plight.position.set( -24, 14, 54 );
	Game.scene.add( plight );
	//enemy
	var plight = new THREE.PointLight( 0xffffff, 1, 100 );
	plight.position.set( 133, 14, 208 );
	Game.scene.add( plight );

}


// shoot direction
Game.getShootDir = function (targetVec)
{
    var vector = targetVec;
    targetVec.set(0,0,1);
    vector.unproject(Game.camera);
    var ray = new THREE.Ray(Game.sphereBody.position, vector.sub(Game.sphereBody.position).normalize() );
    targetVec.copy(ray.direction);
}

//
// gets called when a player logs in 
// creates the players body, mesh, controls and ability to shoot
//
Game.addSelf = function() 
{
	// Create a Cylinder
    Game.sphereShape = new CANNON.Sphere(1.3);
    Game.sphereBody = new CANNON.Body({ mass: 5 });
    Game.sphereBody.addShape(Game.sphereShape);
    Game.sphereBody.linearDamping = 0.9;
    Game.world.add(Game.sphereBody);

    // Create Health
    Game.health = 100;

    // load materials
    Game.redMaterial = new THREE.MeshPhongMaterial( { color:0xFFFFFF, map: THREE.ImageUtils.loadTexture( '../img/ballred.jpg') });
    Game.blueMaterial = new THREE.MeshPhongMaterial( { color:0xFFFFFF, map: THREE.ImageUtils.loadTexture( '../img/ballblue2.jpg') });

    // Create Bullet material based on team color
    if(Game.team == "red")
    {
    	Game.sphereBody.position.set(0,5,0);
    }
    else if(Game.team == "blue")
    {
    	Game.sphereBody.position.set(186,5,186);
    }



    // Create EventListener for Collision Detection
    // When a body collides with another body, they both dispatch the "collide" event.
	Game.sphereBody.addEventListener("collide",function(e)
	{
		if(e.body.name == "Bullet" && e.body.team != Game.team)
		{	
			Game.health -= 30;
			mySounds = new Audio('audio/Uhh.mp3')
			mySounds.play();
			// if player is dead respawn him 
			// idea: create random respawn points based on level layout and team gameplay
			if(Game.health < 0)
			{
				mySound = new Audio('audio/humiliation.mp3');
				mySound.play();
				// player gets killed => opponent team score += 1
				var data = { death: Game.team, kill: e.body.playerId };
				Client.setScore(data);

				// respawn
				Game.health = 100;

				if(Game.team == "red")
					Game.sphereBody.position.set(0, 5, 0);
				else if(Game.team == "blue")
					Game.sphereBody.position.set(186,5,186);

			}
			
			Client.setHealth(Game.health);

		}
		//console.log("Collided with body:",e.body);
		//console.log("Contact between bodies:",e.contact);
	});

    // Create a plane
    var groundShape = new CANNON.Plane();
    var groundBody = new CANNON.Body({ mass: 0 });
    groundBody.addShape(groundShape);
    groundBody.position.set(0,0.2,0);
    groundBody.quaternion.setFromAxisAngle(new CANNON.Vec3(1,0,0),-Math.PI/2);
    Game.world.add(groundBody);

    // Cam Controls
	Game.controls = new PointerLockControls( Game.camera, Game.sphereBody );
	Game.scene.add( Game.controls.getObject() );


	// 
	// Shoot Functionality
	//

	// click eventlistener
	window.addEventListener("mousedown",function(e) 
	{

	    if( Game.controls.enabled && e.which == 1)
	    {
	    	mySound = new Audio('audio/laser3.mp3');
	    	mySound.play();
	    	// get player pos
	        var x = Game.sphereBody.position.x;
	        var y = Game.sphereBody.position.y;
	        var z = Game.sphereBody.position.z;

	        // create bullet
	        var ballBody = new CANNON.Body( { mass: 1 } );
	        ballBody.addShape(ballShape);
	        var ballMesh;
	        if(Game.team == "red") 
	        	ballMesh = new THREE.Mesh( ballGeometry, Game.redMaterial );
	        else if(Game.team == "blue")
	        	ballMesh = new THREE.Mesh( ballGeometry, Game.blueMaterial );

	        // add to world 
	        Game.world.add(ballBody);
	        Game.scene.add(ballMesh);

	        // add to collection
	        balls.push(ballBody);
	        ballMeshes.push(ballMesh);

	        // get direction and set velocity
	        Game.getShootDir(shootDirection);

	        ballBody.velocity.set(  shootDirection.x * shootVelo, shootDirection.y * shootVelo, shootDirection.z * shootVelo);

	        // Move the ball outside the player sphere
	        x += shootDirection.x * (Game.sphereShape.radius*1.02 + ballShape.radius);
	        y += shootDirection.y * (Game.sphereShape.radius*1.02 + ballShape.radius);
	        z += shootDirection.z * (Game.sphereShape.radius*1.02 + ballShape.radius);
	        ballBody.position.set(x,y+2,z);
	        ballMesh.position.set(x,y+2,z);

	      	// push on socket and broadcast
	        var data = 
	        {
	        	velocity: new THREE.Vector3(shootDirection.x * shootVelo, shootDirection.y * shootVelo, shootDirection.z * shootVelo),
	        	position: new THREE.Vector3(x,y+2,z),
	        	team: Game.team
	        }
	        Client.shoot(data);

	    }
	});
}




//
// Multiplayer Functions
//

Game.updateMovingState = function()
{
	var state = Game.controls.isMoving();

	Client.movingState(state);
}

Game.updatePosAndRot = function()
{
	// get position
	var data = {
		position: new THREE.Vector3(),
		rotation : new THREE.Euler()
	};
	data.position.copy(Game.sphereBody.position);
	var cObj = Game.controls.getObject();
	data.rotation.copy(cObj.rotation);

	//console.log(data.position);

	// push on socket
	Client.move(data);
}

Game.animatePlayer = function(data)
{

	//console.log(data);
	// Get Cannon Object
	var player = Game.playerMap.get(data.id);

	if(data.isMoving)
	{
		for(var i = 0; i < player.mixers.length; i++)
		{
			var action = player.mixers[i].clipAction( player.meshes[i].geometry.animations[0] );
			action.play();
		}
	} 
	else 
	{
		for(var i = 0; i < player.mixers.length; i++)
		{
			var action = player.mixers[i].clipAction( player.meshes[i].geometry.animations[0] );
			action.stop();
		}
	}

}

Game.addPlayer = function(player) 
{

	// load character
	var playerMixers = [];
	var playerMeshes = [];
	var playerObject = new THREE.Object3D();

	var charString;
	if(player.team == "red")
		charString = "../models/characterRed.jd";
	else if(player.team == "blue")
		charString = "../models/characterBlue.jd";

	// load character
	var loader = new THREE.JDLoader();
	loader.load(charString, 
    
		// onLoad Callback
	    function (data)
	    {        
	        for (var i = 0; i < data.objects.length; ++i)
	        {
	            if (data.objects[i].type == "Mesh" || data.objects[i].type == "SkinnedMesh")
	            {

	                var mesh = null;
	                var matArray = Game.createMaterials(data);
	                if (data.objects[i].type == "SkinnedMesh")
	                {
	                    mesh = new THREE.SkinnedMesh(data.objects[i].geometry, matArray);
	                    mesh.frustumCulled = false;
	                }
	                else // Mesh
	                {
	                    mesh = new THREE.Mesh(data.objects[i].geometry, matArray);
	                }

	                // add mesh to object3d
	                playerMeshes.push(mesh);
	                playerObject.add(mesh);

	                //Now we need THREE.AnimationMixer to play the animation.
	                if (mesh && mesh.geometry.animations)
	                {
	                    var mixer = new THREE.AnimationMixer(mesh);

	                    // add mixer
	                    playerMixers.push(mixer);
	                    Game.mixers.push(mixer);

	                    //var action = mixer.clipAction( mesh.geometry.animations[0] );
	                    //action.play();
	                }
	            }
	        }        
	    }
    );

    // create cannon sphere
    var charShape = new CANNON.Sphere(1.3);
    var charBody  = new CANNON.Body( { mass: 0 } );
    charBody.addShape(charShape);

    Game.b=charBody;

    // set position
    charBody.position.set(0, 0, 0);
    playerObject.position.set(0,0,0);

    // create player object
    var playerObj = 
    {
    	body: charBody,
    	mesh: playerObject,
    	meshes: playerMeshes,
    	mixers: playerMixers,
    	name: player.id
    };

    // add to world / scene / map
    Game.world.add(playerObj.body);
    Game.scene.add(playerObj.mesh);
	Game.playerMap.set(player.id, playerObj);

}


Game.removePlayer = function(id) 
{

	// Get Cannon Object
	var player = Game.playerMap.get(id);

	if( player != undefined )
	{
		// Remove it from scene
	    Game.scene.remove( player.mesh );

	    // Remove it from Cannon world
	    Game.world.remove( player.body );

	   	// Clear PlayerMap
	    Game.playerMap.delete(id);

	    Game.animate();
	}

}


Game.movePlayer = function(MoveData) 
{

	var player = Game.playerMap.get(MoveData.id);
	
	if(player !== undefined)
	{
		player.body.position.copy(MoveData.position);
		player.mesh.rotation.copy(MoveData.rotation);
		player.mesh.rotation.y -= 1.57079632679; // subs pi/2
	}
}


Game.shootPlayer = function(ShootData) 
{
	var player = Game.playerMap.get(ShootData.id);
	
	if(player !== undefined)
	{
		// create bullet
        var ballBody = new CANNON.Body( { mass: 1 } );
        ballBody.addShape(ballShape);
        ballBody.name = "Bullet";
	    ballBody.team = ShootData.team;
	    ballBody.playerId = ShootData.id;

	    // ball based on team color
	    var ballMesh;
	    if(ShootData.team == "red")
	    	ballMesh = new THREE.Mesh( ballGeometry, Game.redMaterial );
	    else if(ShootData.team == "blue")
	    	ballMesh = new THREE.Mesh( ballGeometry, Game.blueMaterial );

        // add to world 
        Game.world.add(ballBody);
        Game.scene.add(ballMesh);

        // add to collection
        balls.push(ballBody);
        ballMeshes.push(ballMesh);

        // set velocity from socket data
        ballBody.velocity.set(  ShootData.velocity.x, ShootData.velocity.y, ShootData.velocity.z );

        // Move the ball outside the player sphere
        ballBody.position.set(ShootData.position.x, ShootData.position.y, ShootData.position.z);
        ballMesh.position.set(ShootData.position.x, ShootData.position.y, ShootData.position.z);
	}
}


Game.clearScene = function(obj) 
{

	// Remove every scene child 
	while( obj.children.length > 0 ) { obj.remove(obj.children[0]); }
	if(obj.geometry) obj.geometry.dispose();
	if(obj.material) obj.material.dispose();
	if(obj.texture)  obj.texture.dispose();

	ballMeshes.length = 0;

	// Clear Cannon World
    for(var i=0; i<balls.length; i++){
        Game.world.remove(balls[i]);
    }

    for(var i=0; i<boxes.length; i++){
       Game.world.remove(boxes[i]);
    }

    balls.length = 0;
    boxes.length = 0;

	Game.playerMap.forEach(function(value, key) 
	{
		Game.world.remove(value.body);
	}, Game.playerMap);

	// Clear playermap
	Game.playerMap.clear();

}   


Game.onWindowResize = function() 
{
	Game.camera.aspect = window.innerWidth / window.innerHeight;
	Game.camera.updateProjectionMatrix();
	Game.renderer.setSize( window.innerWidth, window.innerHeight );
}

// Start game
Game.initCannon();
Game.initThree();
Game.animate();




function createPhysX(dae, dsMax, PhysiScaleFactor, world) {

  console.log("Konvertiervorgang...");
  var i = 0;
  // console.log(dae);

  if( dsMax ) {

    var sceneModel = dae.scene;

    for ( i = 1; i < sceneModel.children.length; i++ ) 
    {

      if( sceneModel.children[i].children[0]&&(sceneModel.children[i].children[0].geometry.attributes.position.array.length==108) ) 
      {
      	//console.log(sceneModel.children[i].children[0].geometry.attributes.position.array.length);
        //var jsModel  = new THREE.Mesh( sceneModel.children[i].children[0].geometry, sceneModel.children[i].children[0].material );
        var vertices = sceneModel.children[i].children[0].geometry.attributes.position.array;//jsModel.geometry.position;
        var xmin, xmax, ymin, ymax, zmin, zmax;
       // console.log("length: "+vertices.length);
        for( var j = 0; j < vertices.length; j+=3 )
        {
          if ( j < 1 )
          {
				xmin = vertices[j];
				xmax = vertices[j];
				ymin = vertices[j+1];
				ymax = vertices[j+1];
				zmin = vertices[j+2];
				zmax = vertices[j+2];
          } 
          else 
          {
				if( vertices[j]<xmin ) xmin = vertices[j];
				if( vertices[j]>xmax ) xmax = vertices[j];
				if( vertices[j+1]<ymin ) ymin = vertices[j+1];
				if( vertices[j+1]>ymax ) ymax = vertices[j+1];
				if( vertices[j+2]<zmin ) zmin = vertices[j+2];
				if( vertices[j+2]>zmax ) zmax = vertices[j+2];
          }
        }

        var Coords = new THREE.Vector3(0,0,0);

        // get coordinates, multiplied by scale (to fix scale)
        Coords.x = (xmax - xmin) * PhysiScaleFactor * sceneModel.children[i].scale.x;
        Coords.y = (ymax - ymin) * PhysiScaleFactor * sceneModel.children[i].scale.y;
        Coords.z = (zmax - zmin) * PhysiScaleFactor * sceneModel.children[i].scale.z;
        

    
        // create collision mesh
        var box     = new CANNON.Box( new CANNON.Vec3(( Coords.x/2 ),( Coords.y/2 ),( Coords.z/2 )) );
        var boxBody = new CANNON.Body( {mass:0, shape: box} );

        // fix Position
        boxBody.position.set
        ( 
          PhysiScaleFactor*sceneModel.children[i].position.x, 
          PhysiScaleFactor*sceneModel.children[i].position.z, 
          PhysiScaleFactor*sceneModel.children[i].position.y*-1
        );

        // fix Rotation
        var quat = new THREE.Quaternion();
        var rot=sceneModel.children[i].rotation;
        rot.x-=1.57079632679;
        //quat=sceneModel.children[i].quaternion;
		quat.setFromEuler( (rot));
		//quat=quat*sceneModel.children[i].quaternion
        boxBody.quaternion.x = quat.x;
        boxBody.quaternion.y = quat.y;
        boxBody.quaternion.z = quat.z;
        boxBody.quaternion.w = quat.w;
        

        //boxBody.quaternion=quat;
       // boxBody.quaternion.setFromAxisAngle(new CANNON.Vec3(1,0,0),-Math.PI/2);

        // add
        
        world.add(boxBody);

   		}
	}
  }

  console.log("Es wurden " + i + " Elemente zu CannonJS konvertiert.");
}
