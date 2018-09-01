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
		// no need to delete scene anymore
		//socket.emit('deleteallplayers');

		socket.player.username = username;

		socket.emit('allplayers', { allPlayers: getAllPlayers(), selfId: socket.player.id } );
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

	// shoot
	//----------------------------------------------------------------------------------------
	socket.on('shoot', function(shootData) 
	{
		// add id  
		shootData.id = socket.player.id;

		// broadcast movement
		socket.broadcast.emit('shoot', shootData);
	});


	// chat
	//----------------------------------------------------------------------------------------
	socket.on('chat message', function(msg)
	{
		io.emit('chat message', msg);
	});


	// disconnect
	//----------------------------------------------------------------------------------------
	socket.on('disconnect',function() 
	{
        if(typeof(socket.player) != 'undefined') {
        	console.log("disconnect");
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

