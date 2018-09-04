//
// app.js
//

// Requirements
var express = require('express');
var path = require('path');
var app = express();
var server = require('http').Server(app);
var io = require('socket.io')(server);
var THREE = require('three');


// Static Resources Path
app.use(express.static(path.join(__dirname, 'public')));

// Routing
app.get('/', function(req, res){
  res.sendFile(__dirname + 'public/index.html');
});

// Global Player Id Counter
server.lastPlayerID = 0;

// player team counter
server.teamRed = 0;
server.teamBlue = 0;

// team score
server.scoreRed = 0;
server.scoreBlue = 0;
var kill = 0;
var death = 0;

// Open port
server.listen(3000, 'localhost' ,function(){
  console.log('listening on *:3000');
});

// Create Socket on Connection
io.on('connection', function(socket)
{
	// spectate
	//----------------------------------------------------------------------------------------
	socket.player = 
	{
		id: server.lastPlayerID++,
		username: "spectator"
	};
	socket.emit('allplayers', { allPlayers: getAllPlayers(), selfId: "spectate" } );

	// new player
	//----------------------------------------------------------------------------------------
	socket.on('new user', function(username)
	{
		// set username
		socket.player.username = username;

		// add player to team with less players
		if(server.teamRed == server.teamBlue)
		{
			socket.player.team = "red";
			server.teamRed++;
		}
		else if(server.teamRed > server.teamBlue)
		{
			socket.player.team = "blue";
			server.teamBlue++;
		}
		else 
		{
			socket.player.team = "red";
			server.teamRed++;
		}
		socket.player.kill = 0;
		socket.player.death = 0;

		socket.emit('getAllPlayer', { allPlayers: getAllPlayers(), kills: socket.player.kill, death: socket.player.death, selfId: socket.player.id, team: socket.player.team });
		socket.emit('allplayers', { allPlayers: getAllPlayers(), selfId: socket.player.id, team: socket.player.team } );
		socket.broadcast.emit('new user', socket.player);
		socket.broadcast.emit('chat message', "Server: Spieler " + socket.player.username + " hat sich eingeloggt.");
	});

	

	// movement
	//----------------------------------------------------------------------------------------
	socket.on('move', function(moveData) 
	{
		// add id  
		moveData.id = socket.player.id;

		// broadcast movement
		socket.broadcast.emit('move', moveData);
	});

	// moving state
	//----------------------------------------------------------------------------------------
	socket.on('movingstate', function(state) 
	{
		// add id
		data = { isMoving: state, id: socket.player.id};
		
		// broadcast movement
		socket.broadcast.emit('movingstate', data);
	});


	// shoot
	//----------------------------------------------------------------------------------------
	socket.on('shoot', function(shootData) 
	{
		// add id  
		shootData.id = socket.player.id;

		// broadcast movement
		socket.broadcast.emit('shoot', shootData);
	});


	// score
	//----------------------------------------------------------------------------------------
	socket.on('score', function(score) 
	{
		// add id
		if(score.death == "red")
		{
			socket.player.death++;
			server.scoreBlue++;
		}
		else if(score.death == "blue")
		{
			socket.player.death++;
			server.scoreRed++;
		}
		
		var data = { red: server.scoreRed, blue: server.scoreBlue };
		// broadcast movement
		io.emit('score', data);
	});

	socket.on('getAllPlayer', function()
	{
		socket.emit('getAllPlayer', { allPlayers: getAllPlayers(), kills: socket.player.kill, death: socket.player.death, selfId: socket.player.id, team: socket.player.team });
	});

	// chat
	//----------------------------------------------------------------------------------------
	socket.on('chat message', function(msg)
	{
		console.log("bin hier");
		io.emit('chat message', msg);
	});


	// disconnect
	//----------------------------------------------------------------------------------------
	socket.on('disconnect',function() 
	{
        if(typeof(socket.player) != 'undefined') {
        	console.log("disconnect");


        	if(socket.player.team == "red")
        		server.teamRed--;
        	else if(socket.player.team == "blue")
        		server.teamBlue--;

        	socket.broadcast.emit('remove',socket.player.id);
        	socket.broadcast.emit('chat message', "Server: Spieler " + socket.player.username + " hat das Spiel verlassen.");
        }
    });

});



function getAllPlayers(){
    var players = [];
    Object.keys(io.sockets.connected).forEach(function(socketID){
        var player = io.sockets.connected[socketID].player;
        if(player) players.push(player);
    });
    return players;
}

