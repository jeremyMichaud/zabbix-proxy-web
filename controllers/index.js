var express = require('express');
var exec = require('child_process').exec;
var bodyParser = require('body-parser');
var https = require('https');
var fs = require('fs');

//Custom authentification script
var auth = require('./auth');


var app = express();


//Static files: images, css, js, ... (for bootstrap)
//This function mount the folder ./static to http://.../static/
app.use('/static', express.static('static'));

//Index page
app.get('/', auth.auth, function (req, res) {
	res.render('pages/index.ejs');
});

//Password sub-app
var password = require('./password');
app.use("/password", password.site);

//SSH sub-app
var ssh = require('./ssh');
app.use("/ssh", ssh.site);

//Network sub-app
var network = require('./network');
app.use("/network", network.site);

//Zabbix config sub-app
var config = require('./config');
app.use("/config", config.site);

app.get('/logout', function (req, res) {
	res.redirect(401, '/');
});

app.get('/ssh', auth.auth, function (req, res){
	res.render('pages/ssh.ejs');
});

app.get('/reboot', function (req, res) {
	exec("init 6");
	res.render('pages/reboot.ejs');
});

//Certificate and key for TLS (with passphrase)
const options = {
  key: fs.readFileSync('cert/key.pem'),
  cert: fs.readFileSync('cert/cert.pem'),
  passphrase: "Node passphrase"
};

//Create the https server
https.createServer(options, app).listen(443);

//We could also create an http server:
//http.createServer(app).listen(80);
// but it require http :
//var http = require('http');