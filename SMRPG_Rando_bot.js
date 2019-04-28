const twitch = require('tmi.js')

let opts = {
  identity: {
	username: process.env.twitchUsername,
	password: process.env.oauth
  },
  channels: [
    process.env.channel
  ]
}

let client = new twitch.client(opts);

client.on('message', onMessageHandler);
client.on('connected', onConnectedHandler);
client.on('disconnected', onDisconnectedHandler);

// Connect to Twitch:
client.connect();

var bosses = [	"hammerbros", "croco1", "croco2",
				"mack", "belome1", "belome2", "bowyer",
				"punchinello", "booster", "knifegrateguy",
				"cake", "calamari", "johnny", "yaridovich",
				"jagger", "megasmilax", "birdo", "valentina",
				"czardragon", "axemrangers", "magikoopa", "boomer",
				"exor", "countdown", "cloakerdomino", "clerk", "manager",
				"director", "gunyolk", "jinx1", "jinx2", "jinx3", "boxboy",
				"pandorite", "hidon", "chester"];

var bossesRemoved = [];
var guesses = [];
var gameStarted = false;

function onMessageHandler (target, context, msg, self){
	if(self) { return } // Ignore messages from the bot
	if(msg[0] != "!") { return } // Be a nice dude and don't parse messages not for the bot.

	var words = msg.split(/[ ,]+/);

  if(msg === "!bossgame"){
		sendMessage(target, context, "SMRPG Boss game helps keep track of what bosses have been fought and who guessed them correctly! [Mod commands, !startbossgame !stopbossgame !reveal] [user commands, !guess, !bosses, !bossgame]");
	}

	if(modOnlyCommand(context)){
		// Boss has been discovered. Announce a winner.
		if(words[0] === "!reveal" && gameStarted){
			if(bosses.contains(words[1])){
				bossesRemoved.push(words[1]);

				var match = guesses.filter(x => x.key == words[1])[0];
				if(match != null)
					sendMessage(target, context, `@${match.value} guessed correctly! Good job you lucky bastard.`);
				else
					sendMessage(target, context, "Wow, no one guessed it, are you kidding me?");

        // Start next round.
        guesses = [];
				sendMessage(target, context, "Next round started, use !guess and a boss name from the !bosses list to see the bosses that haven't been revealed.");
			}
		}

		// Gets everything ligned up for a new game.
		if(msg === "!startbossgame"){
			bossesRemoved = [];
			guesses = [];
			gameStarted = true;

			sendMessage(target, context, "Guessing game started, use !guess and a boss name from the !bosses list to make your first guess.");
		}

    if(msg === "!stopbossgame"){
      gameStarted = false;
      sendMessage(target, context, "Guessing game ended, stop spamming commands.");
    }
	}

	if(gameStarted){
		// Info on current bosses remaining (does not reflect what people have picked for this round)
		if(msg === "!bosses"){
			var string = "The following bosses have not been revealed: ";

			for(boss of bosses){
				if(!bossesRemoved.contains(boss)){
					string += `${boss}` + ", ";
				}
			}

			sendMessage(target, context, string.substring(0, string.length - 2));
		}

		// Allow people to guess. One guess per person. First come, first served.
		else if(words[0] == "!guess"){
			var hasGuessed = false;

			for(guess of guesses){
				if(guess.value == context.username){
					hasGuessed = true;
					break;
				}
			}

			if(!hasGuessed){
				if(bosses.contains(words[1]) && !bossesRemoved.contains(words[1]) && guesses[words[1]] == null){
					guesses.push( { "key" : `${words[1]}` , "value" :  context.username });
					sendMessage(target, context, `${context.username} has guessed [${words[1]}]`);
				}
			}
		}
	}
}

Array.prototype.contains = function(obj) {
    var i = this.length;
    while (i--) {
        if (this[i] == obj) {
            return true;
        }
    }
    return false;
}

// Check privilages
function modOnlyCommand (context){
	return context.badges != null && ( context.mod || context.badges["broadcaster"] == 1);
}

// Helper function to send the correct type of message:
function sendMessage (target, context, message) {
	if(context['message-type'] === 'whisper') {
		client.whisper(target, message)
	} else {
		client.say(target, message)
	}
}

// Called every time the bot connects to Twitch chat:
function onConnectedHandler (addr, port) {
  console.log(`* Connected to ${addr}:${port}`)
}

// Called every time the bot disconnects from Twitch:
function onDisconnectedHandler (reason) {
  console.log(`Disconnected: ${reason}`)
  process.exit(1)
}
