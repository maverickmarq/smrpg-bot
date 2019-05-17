const twitch = require('tmi.js');
const fs = require('fs');

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

var bosses = []
fs.readFile(process.env.bosses, 'utf-8', function(err, data){
	bosses = JSON.parse(data);
});

var bossesRemoved = [];
var guesses = new Map();
var gameStarted = false;
var processingGuess = false;

function onMessageHandler (target, context, msg, self){
	if(self) { return } // Ignore messages from the bot
	if(msg[0] != "!") { return } // Be a nice dude and don't parse messages not for the bot.

  msg = msg.toLowerCase();

	var words = msg.split(/[ ,]+/);

  if(msg === "!bossgame"){
		sendMessage(target, context, "SMRPG Boss game helps keep track of what bosses have been fought and who guessed them correctly! [Mod commands, !startbossgame !stopbossgame !reveal !fixboss] [user commands, !guess, !bosses, !bossgame]");
	}

	if(modOnlyCommand(context)){
		// Boss has been discovered. Announce a winner.
		if(words[0] === "!reveal" && gameStarted){
			if(bosses.bosses.contains(words[1]) && !bossesRemoved.contains(words[1])){
				bossesRemoved.push(words[1]);

        var match = guesses.get(words[1]);

				if(match != null)
					sendMessage(target, context, `@${match} guessed correctly! Good job you lucky bastard.`);
				else
					sendMessage(target, context, "Wow, no one guessed it, are you kidding me?");

        // Start next round.
        guesses = new Map();
        processingGuess = false;
				sendMessage(target, context, "Next round started, use !guess and a boss name from the !bosses list to see the bosses that haven't been revealed.");
			}
		}

    if(words[0] === "!fixboss" && gameStarted){
      if(bossesRemoved.contains(words[1]) && bosses.bosses.contains(words[2]) && !bossesRemoved.contains(words[2])){
        bossesRemoved.pop(words[1]);
        bossesRemoved.push(words[2]);

        sendMessage(target, context, `Fixup. Replaced [${words[1]}] with [${words[2]}]`);
        //TODO: This will need more work when leaderboard happens.
      }
      else{
        sendMessage(target, context, `usage: !fixboss [wrongboss] [correctboss]`);
      }
    }

		// Gets everything ligned up for a new game.
		if(msg === "!startbossgame"){
			bossesRemoved = [];
			guesses = new Map();
      processingGuess = false;
			gameStarted = true;

			sendMessage(target, context, "Guessing game started, use !guess and a boss name from the !bosses list to make your first guess.");
		}

    if(msg === "!stopbossgame"){
      gameStarted = false;
      processingGuess = false;
      sendMessage(target, context, "Guessing game ended, stop spamming commands.");
    }
	}

	if(gameStarted){
		// Info on current bosses remaining (does not reflect what people have picked for this round)
		if(msg === "!bosses"){
			var string = "The following bosses have not been revealed: ";

			for(boss of bosses.bosses){
				if(!bossesRemoved.contains(boss)){
					string += `${boss}` + ", ";
				}
			}

			sendMessage(target, context, string.substring(0, string.length - 2));
		}

		// Allow people to guess. One guess per person. First come, first served.
    else if(words[0] == "!guess"){
      if(bosses.bosses.contains(words[1])
      && !bossesRemoved.contains(words[1])
      && !guesses.has(words[1])){
          for(guess of guesses){
              if(guess[1] == context.username){
                  guesses.delete(guess[0]);
                  break;
              }
          }
          guesses.set(words[1], context.username);
          sendMessage(target, context, `${context.username} has guessed [${words[1]}]`);
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
