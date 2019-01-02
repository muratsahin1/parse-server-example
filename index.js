// Example express application adding the parse-server module to expose Parse
// compatible API routes.

var express = require('parse-server/node_modules/express');
var ParseServer = require('parse-server').ParseServer;
var path = require('path');
const Twig = require("twig");

var databaseUri = process.env.DATABASE_URI || process.env.MONGODB_URI;

if (!databaseUri) {
  console.log('DATABASE_URI not specified, falling back to localhost.');
}

var api = new ParseServer({
  databaseURI: databaseUri || 'mongodb://localhost:27017/dev',
  cloud: process.env.CLOUD_CODE_MAIN || __dirname + '/cloud/main.js',
  appId: process.env.APP_ID || 'myAppId',
  masterKey: process.env.MASTER_KEY || '', //Add your master key here. Keep it secret!
  serverURL: process.env.SERVER_URL || 'http://localhost:1337/parse',  // Don't forget to change to https if needed
  liveQuery: {
    classNames: ["Posts", "Comments"] // List of classes to support for query subscriptions
  }
});
// Client-keys like the javascript key or the .NET key are not necessary with parse-server
// If you wish you require them, you can set them as options in the initialization above:
// javascriptKey, restAPIKey, dotNetKey, clientKey

var app = express();

app.set("twig options", {
    allow_async: true, // Allow asynchronous compiling
    strict_variables: false
});

var bodyParser = require('body-parser');
app.use(bodyParser.json()); // support json encoded bodies
app.use(bodyParser.urlencoded({ extended: true }));

// Serve static assets from the /public folder
app.use('/public', express.static(path.join(__dirname, '/public')));

// Serve the Parse API on the /parse URL prefix
var mountPath = process.env.PARSE_MOUNT || '/parse';
app.use(mountPath, api);

// Parse Server plays nicely with the rest of your web routes
app.get('/', function(req, res) {

  res.status(200).send('I dream of being a website.  Please star the parse-server repo on GitHub!');
});

app.get('/getScores/:id',function(req,res){
 var GameScore = Parse.Object.extend("GameScore");
var query = new Parse.Query(GameScore);
query.get(req.params.id)
.then((gameScore) => {
  // The object was retrieved successfully.
  res.render('index.twig',{
     score:gameScore.get("score"),
     playerName:gameScore.get("playerName"),
     cheatMode:gameScore.get("cheatMode")
  });
}, (error) => {
  // The object was not retrieved successfully.
  // error is a Parse.Error with an error code and message.
  console.log(error);
});
});

app.get("/save",(req,res) => {
  res.render("register.twig");
});

app.post("/save",(req,res) => {
 console.log("NAME_p",req.body.user.name);
 if (req.body.user.name) {
  const GameScore = Parse.Object.extend("GameScore");
  const gameScore = new GameScore();

  gameScore.set("score", parseInt(req.body.user.score));
  gameScore.set("playerName", req.body.user.name);
  gameScore.set("cheatMode", req.body.user.cheat);

  gameScore.save()
  .then((gameScore) => {
    // Execute any logic that should take place after the object is saved.

    var json = "{status:"+res.status+",score:"+req.body.score+",playerName:\""+req.body.playerName+"\",cheatMode:"+req.body.cheat+"}"
    res.send(json);
  }, (error) => {
    // Execute any logic that should take place if the save fails.
    // error is a Parse.Error with an error code and message.
    res.send('error: ' + error.message);
  });
 }else{
  res.render("register.twig");
 }

});


// There will be a test page available on the /test path of your server url
// Remove this before launching your app
app.get('/test', function(req, res) {
  res.sendFile(path.join(__dirname, '/public/test.html'));
});

var port = process.env.PORT || 1337;
var httpServer = require('http').createServer(app);
httpServer.listen(port, function() {
    console.log('parse-server-example running on port ' + port + '.');
});

// This will enable the Live Query real-time server
ParseServer.createLiveQueryServer(httpServer);
