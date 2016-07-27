var express = require('express');
var exec = require('child_process').exec;
var bodyParser = require('body-parser');
var auth = require('./auth');
var async = require("async");

//We create a sub-app, more about sub-app: http://expressjs.com/fr/api.html#app.mountpath
var sub_app = express();
var urlencodeParser = bodyParser.urlencoded({ extended: false });

//This function collects informations and render the web page
function render(req, res, message, error){
	//These functions are executed in parallel
	async.parallel([
		//Get the status of the SSH service (running or stopped)
		function(callback) {
			exec('service --status-all 2> /dev/null | grep ssh', (error, stdout, stderr) => {
				if (error) {
					console.error(`exec error: ${error}`);
					return;
				}
				ssh_running = stdout.includes("[ + ]");
				callback();
			});
		},
		//Get if the ssh service will start on boot or not
		function(callback) {
			exec("echo /etc/rc?.d/* | cut --delimiter=' ' -f1-50 --output-delimiter=$'\n' | grep S.*ssh | cat", (error, stdout, stderr) => {
				if (error) {
					console.error(`exec error: ${error}`);
					return;
				}
				ssh_startup_enable = 0 != stdout.length;
				callback();
			});
		}
	],
	//After the collect of every informations, render the page
	function(err, results) {
		res.render('pages/ssh.ejs', {
			message: message,
			ssh_running: ssh_running,
			ssh_startup_enable: ssh_startup_enable,
			base_url: req.baseUrl,
			error: error,
		});
	});
}

//The main page of this sub-app just render the form
sub_app.get('/', auth.auth, function (req, res) {
	render(req, res, "", false);
});

//When POST informations are sent, it choose the right action

//If this page is accessed by a GET method, it just render the page
sub_app.get('/stop-ssh', auth.auth, function (req, res) {
	res.redirect(req.baseUrl);
});
//Stop ssh service
sub_app.post('/stop-ssh', auth.auth, urlencodeParser, function (req, res) {
	exec('service ssh stop', (error, stdout, stderr) => {
			if (error) {
				console.error(`exec error: ${error}`);
				return;
			}
			render(req, res, "Service SSH stopped successfully", false);
		});
});

//If this page is accessed by a GET method, it just render the page
sub_app.get('/start-ssh', auth.auth, function (req, res) {
	res.redirect(req.baseUrl);
});
//Start ssh service
sub_app.post('/start-ssh', auth.auth, urlencodeParser, function (req, res) {
	exec('service ssh start', (error, stdout, stderr) => {
			if (error) {
				console.error(`exec error: ${error}`);
				return;
			}
			render(req, res, "Service SSH started successfully", false);
		});
});

//If this page is accessed by a GET method, it just render the page
sub_app.get('/enable-ssh', auth.auth, function (req, res) {
	res.redirect(req.baseUrl);
});
//Enable ssh on startup
sub_app.post('/enable-ssh', auth.auth, urlencodeParser, function (req, res) {
	exec('update-rc.d ssh enable', (error, stdout, stderr) => {
			if (error) {
				console.error(`exec error: ${error}`);
				return;
			}
			render(req, res, "Service SSH enable on startup successfully", false);
		});
});

//If this page is accessed by a GET method, it just render the page
sub_app.get('/disable-ssh', auth.auth, function (req, res) {
	res.redirect(req.baseUrl);
});
//Disable ssh on startup
sub_app.post('/disable-ssh', auth.auth, urlencodeParser, function (req, res) {
	exec('update-rc.d ssh disable', (error, stdout, stderr) => {
			if (error) {
				console.error(`exec error: ${error}`);
				return;
			}
			render(req, res, "Service SSH  disable on startup successfully", false);
		});
});

module.exports = {site: sub_app};