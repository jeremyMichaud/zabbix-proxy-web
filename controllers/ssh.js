var express = require('express');
var exec = require('child_process').exec;
var bodyParser = require('body-parser');
var auth = require('./auth');
var async = require("async");

var sub_app = express();
var urlencodeParser = bodyParser.urlencoded({ extended: false });

function render(req, res, message, error){
	async.parallel([
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
		function(callback) {
			exec("echo /etc/rc?.d/* | cut --delimiter=' ' -f1-50 --output-delimiter=$'\n' | grep ssh | cat", (error, stdout, stderr) => {
				if (error) {
					console.error(`exec error: ${error}`);
					return;
				}
				ssh_startup_enable = 0 != stdout.length;
				callback();
			});
		}
	],
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
sub_app.get('/', auth.auth, function (req, res) {
	render(req, res, "", false);
});


sub_app.get('/stop-ssh', auth.auth, function (req, res) {
	res.redirect(req.baseUrl);
});
sub_app.post('/stop-ssh', auth.auth, urlencodeParser, function (req, res) {
	exec('service ssh stop', (error, stdout, stderr) => {
			if (error) {
				console.error(`exec error: ${error}`);
				return;
			}
			render(req, res, "Service SSH stopped successfully", false);
		});
});

sub_app.get('/start-ssh', auth.auth, function (req, res) {
	res.redirect(req.baseUrl);
});
sub_app.post('/start-ssh', auth.auth, urlencodeParser, function (req, res) {
	exec('service ssh start', (error, stdout, stderr) => {
			if (error) {
				console.error(`exec error: ${error}`);
				return;
			}
			render(req, res, "Service SSH started successfully", false);
		});
});

sub_app.get('/enable-ssh', auth.auth, function (req, res) {
	res.redirect(req.baseUrl);
});
sub_app.post('/enable-ssh', auth.auth, urlencodeParser, function (req, res) {
	exec('update-rc.d ssh defaults', (error, stdout, stderr) => {
			if (error) {
				console.error(`exec error: ${error}`);
				return;
			}
			render(req, res, "Service SSH enable on startup successfully", false);
		});
});

sub_app.get('/disable-ssh', auth.auth, function (req, res) {
	res.redirect(req.baseUrl);
});
sub_app.post('/disable-ssh', auth.auth, urlencodeParser, function (req, res) {
	exec('update-rc.d -f ssh remove', (error, stdout, stderr) => {
			if (error) {
				console.error(`exec error: ${error}`);
				return;
			}
			render(req, res, "Service SSH  disable on startup successfully", false);
		});
});

module.exports = {site: sub_app};