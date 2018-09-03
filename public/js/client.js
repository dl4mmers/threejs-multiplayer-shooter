//
//	client.js
//

// Init
Client = {};
Client.socket = io();
$("#chat-form").hide();
$("#warning").hide();
$("#username").focus();
$("#statistik-form").hide();
var username;
var mySound;
var letsgo;
mySound = new Audio('audio/Battle.mp3');
//mySound.play();
// Forms
//---------------------------------------------------

// Username Form
$("#username-form").submit(function() {

  var input = $('#username').val();

  if(input == "") {
    $("#warning").text("Der Nickname darf nicht leer sein!");
    $("#warning").show();
    return false;

  } else if(input.length < 4 || input.length > 16) {
    $("#warning").text("Der Nickname muss zwischen 4 und 16 Zeichen haben!");
    $("#warning").show();
    return false;

  } else {


    stopsound();
    letsgo = new Audio('audio/lets_go.mp3'); 
    letsgo.play();
  	// ask for new Player
    username = input;
    Client.socket.emit('new user', input);

    // edit gui
    $('#username').val('');
    $(".username-layer").hide();
    $('#messages').append($('<li>').text("Willkommen auf dem ThreeJS Multiplayer Server " + username + "!"));
    $('canvas').css("filter", "blur(0px)");
    $('canvas').css("transform", "scale(1.0)");

    return false;
  }

});

function playsound(scr){
	mySound = new Audio(scr);
	mySound.play();
}

function stopsound(){
	mySound.pause();
	mySound.currentTime = 0;
}

// Chat Form
$("#chat-form").submit(function(){

	// build username message
	var message = username + ": " + $('#m').val();

  	// readd eventlisteners
  	Game.controls.readdListeners();

	// send to socket
	Client.socket.emit('chat message', message);
	$('#m').val('');
	$("#chat-form").toggle();
	return false;
});

// Chat Input
$(document).keydown(function(ep) {

	// Enter pressed => show chat window   
	if(ep.which == 9 && Game.self != undefined) 
	{
		ep.preventDefault();

		// remove key eventlisteners
		Game.controls.removeListeners();

		$("#statistik-form").toggle();
		$("#nameblue").fadeIn();
		$("#namered").fadeIn();

	}

});

// Statistik Input
$(document).keydown(function(e) {

	// Enter pressed => show chat window   
	if(e.which == 13 && !$("#m").val() && Game.self != undefined) 
	{
		e.preventDefault();

		// remove key eventlisteners
		Game.controls.removeListeners();

		$("#chat-form").toggle();
		$("#m").focus();
		$("#messages").fadeIn();

	}

});

// Chat Fadeout
setInterval( function() { 
	if( $("#messages").css('display') != 'none' ) {
		$("#messages").fadeOut( "slow" );
	}
}, 20000);


// Socket Listeners
//---------------------------------------------------

// Socket Event => Chat Message
Client.socket.on('chat message', function(msg){
  $('#messages').append($('<li>').text(msg));
  $("#messages").fadeIn();

  // auto scroll bot
  var elem = document.getElementById('messages');
  elem.scrollTop = elem.scrollHeight;
});


// Socket Event => New Player
Client.socket.on('new user', function(player) 
{
	Game.addPlayer(player);
});


// Socket Event => Move Player
Client.socket.on('move', function(moveData) {
	Game.movePlayer(moveData);
});

// Socket Event => Shoot
Client.socket.on('shoot', function(shootData) 
{
	Game.shootPlayer(shootData);
});

// Socket Event => Set score
Client.socket.on('score', function(score) 
{
	$("#score-red").text(score.red);
	$("#score-blue").text(score.blue);
});

// Socket Event => Player disconnected
Client.socket.on('remove', function(id)
{
	Game.removePlayer(id);
});


// Socket Event => Get All Players
Client.socket.on('allplayers',function(data) 
{
	//console.log(data);

	// spectate
	if( data.selfId === "spectate" )
	{
		Game.self = "spectate";

		if(data.allPlayers.length != 0)
		{
		    for(var i = 0; i < data.allPlayers.length; i++) 
		    {
		    	if(!Game.playerMap.has(i) && data.allPlayers[i].username !== "spectator")
		    	{
		        	Game.addPlayer(data.allPlayers[i]);
		    	}
		    }
		}

	} 
	else 
	{
		// set camera and id
		Game.camera.position.set(0, 0, 0);
	    Game.self = data.selfId;
	    Game.team = data.team;

	    // add PointerlockControls
		createPointerLockControls();

	    // add self
	    Game.addSelf();

		var playerString = "";

		// add all existing players
		if(data.allPlayers.length != 0)
		{
			playerString = "Aktive Spieler: ";
			console.log(Game.playerMap);

		    for(var i = 0; i < data.allPlayers.length; i++) 
		    {
		    	if(!Game.playerMap.has(data.allPlayers[i].id) && Game.self != data.allPlayers[i].id && data.allPlayers[i].username !== "spectator")
		    	{
		        	Game.addPlayer(data.allPlayers[i]);
		    	}

		        playerString += ("[" + data.allPlayers[i].username + "] ");
		    }

		    $('#messages').append($('<li>').text(playerString));
		}


	}


});


// Socket Event => Clean Players
Client.socket.on('deleteallplayers', function() {

	// clear scene
	Game.clearScene(Game.scene);

	// clear controls
	delete Game.controls;
	Game.controls = new PointerLockControls( Game.camera, Game.sphereBody );
	Game.scene.add( Game.controls.getObject() );
	Game.camera.position.set(0, 0, 0);
	//Game.controls.getObject().position.set(0, 0, 0);

	// recreate level
	Game.createFloor();
	Game.createLight();
	//Game.createBoxes();
	//Game.createLevel();
	Game.createCollisionLevel();
	console.log("did it");

	delete Game.cannonDebugRenderer;
	Game.cannonDebugRenderer = new THREE.CannonDebugRenderer( Game.scene, Game.world );

	Game.animate();
});

// Socket Events
//---------------------------------------------------

// Push movement data on socket
Client.move = function(data) 
{
	Client.socket.emit('move', data);
}

// Push shoot data on socket
Client.shoot = function(data)
{
	Client.socket.emit('shoot', data);
}

// Set Healthbar
Client.setHealth = function(health)
{
	$("#healthbar").attr("style", "width: " + health + "%");
	$("#healthbar").attr("aria-valuenow", health);
	$("#healthbar").text(health);
}

// Set team score
Client.setScore = function(score)
{
	Client.socket.emit('score', score);
}

// Controls
//---------------------------------------------------

//
// creates pointerlock controls
// creates game overlay
//
function createPointerLockControls() {

	// create blocker and instruction divs
	jQuery('<div/>', {
	    id: 'blocker',
	}).insertBefore('canvas');

	jQuery('<div id="instructions"><span style="font-size:40px">Click to play</span><br />(W, A, S, D = Move, SPACE = Jump, MOUSE = Look around)</div>', {
	}).appendTo('#blocker');
	// ---------------------------------->

	// create crosshair overlay
	jQuery('<div/>', {
	    id: 'crosshair-overlay',
	    class: 'd-flex align-items-center flex-column justify-content-center h-100'
	}).insertBefore('canvas');

	jQuery('<img src="../img/crosshair.png" class="align-middle">', {
	}).appendTo('#crosshair-overlay');
	// ---------------------------------->

	// create healthbar overlay
	jQuery('<div/>', {
	    id: 'game-overlay',
	    class: 'd-flex flex-column h-100'
	}).insertBefore('canvas');

	jQuery('<div style="margin-top: auto; padding: 20px">&#x1F497;&#x1F497;&#x1F497;<div class="progress" style="width: 300px"><div id="healthbar" class="progress-bar bg-danger" role="progressbar" style="width: 100%" aria-valuenow="100" aria-valuemin="0" aria-valuemax="100">100</div></div></div>', {
	}).appendTo('#game-overlay');
	// ---------------------------------->

	// create team tag overlay
	jQuery('<div/>', {
	    id: 'team-tag-overlay',
	    class: 'd-flex align-items-center flex-column justify-content-flex-start h-100'
	}).insertBefore('canvas');
	
	if(Game.team == "red")
	{
		jQuery('<h1 style="color: #dc3545; margin: 10px 0px 0px 0px">Team Red</h1>', {
		}).appendTo('#team-tag-overlay');
		jQuery('<h1 style="display: flex"><div id="score-red" style="color: #dc3545">0</div>&nbsp;-&nbsp;<div id="score-blue" style="color: #0099cc">0</div></h1>', {
		}).appendTo('#team-tag-overlay');
	} 
	else if (Game.team == "blue")
	{
		jQuery('<h1 style="color: #0099cc; margin: 10px 0px 0px 0px">Team Blue</h1>', {
		}).appendTo('#team-tag-overlay');
		jQuery('<h1 style="display: flex"><div id="score-red" style="color: #dc3545">0</div>&nbsp;-&nbsp;<div id="score-blue" style="color: #0099cc">0</div></h1>', {
		}).appendTo('#team-tag-overlay');
	}

	// ---------------------------------->

	// get blocker and instruction divs
	var blocker = document.getElementById( 'blocker' );
	var instructions = document.getElementById( 'instructions' );
	$('#crosshair-overlay').addClass('hide');
	$('#game-overlay').addClass('hide');
	$('#team-tag-overlay').addClass('hide');

	// PointerLock Requirements
	var havePointerLock = 'pointerLockElement' in document || 'mozPointerLockElement' in document || 'webkitPointerLockElement' in document;

	if ( havePointerLock ) {
		var element = document.body;

		var pointerlockchange = function ( event ) {

			if ( document.pointerLockElement === element || document.mozPointerLockElement === element || document.webkitPointerLockElement === element ) {

				// PointerLock enabled => In Game
				//Game.controlsEnabled = true;
				Game.controls.enabled = true;
				blocker.style.display = 'none';
				$('#game-overlay').removeClass('hide');
				$('#crosshair-overlay').removeClass('hide');
				$('#team-tag-overlay').removeClass('hide');
				

			} else {

				// PointerLock disbaled => Block Screen
				//Game.controlsEnabled = false;
				Game.controls.enabled = false;
				blocker.style.display = 'block';
				instructions.style.display = '';
				$('#game-overlay').addClass('hide');
				$('#crosshair-overlay').addClass('hide');
				$('#team-tag-overlay').addClass('hide');

			}

		};

		var pointerlockerror = function ( event ) {
			instructions.style.display = '';
		};

		// Hook pointer lock state change events
		document.addEventListener( 'pointerlockchange', pointerlockchange, false );
		document.addEventListener( 'mozpointerlockchange', pointerlockchange, false );
		document.addEventListener( 'webkitpointerlockchange', pointerlockchange, false );

		document.addEventListener( 'pointerlockerror', pointerlockerror, false );
		document.addEventListener( 'mozpointerlockerror', pointerlockerror, false );
		document.addEventListener( 'webkitpointerlockerror', pointerlockerror, false );

		instructions.addEventListener( 'click', function ( event ) {

			instructions.style.display = 'none';
			element.requestPointerLock = element.requestPointerLock || element.mozRequestPointerLock || element.webkitRequestPointerLock;
			element.requestPointerLock();

		}, false );

	} else {

		instructions.innerHTML = 'Your browser doesn\'t seem to support Pointer Lock API';

	}
}