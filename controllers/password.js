var express = require('express');
var sqlite3 = require('sqlite3').verbose();
var passwd = require('passwd-linux');
var sha1 = require('sha1');
var exec = require('child_process').exec;
var bodyParser = require('body-parser');
var auth = require('./auth');

//We create a sub-app, more about sub-app: http://expressjs.com/fr/api.html#app.mountpath
var sub_app = express();
var urlencodeParser = bodyParser.urlencoded({ extended: false });

//The main page of this sub-app just render the form
sub_app.get('/', auth.auth, function (req, res) {
	res.render('pages/password.ejs', {message: ""});
});

//When POST informations are sent, this save them
sub_app.post('/', auth.auth, urlencodeParser, function (req, res) {
	//User to change password
	var username = "pi";
	
	//Check password == confirm password
	if(req.body.password != req.body.passwordConfirm){
		res.render('pages/password.ejs', {message: "Password does not match the confirm password", error: true });
		return;
	}
	
	//Check if the old password is correct
	passwd.checkPass(username, req.body.passwordOld, function (error, response) {
		if (error) {
			console.log(error);
			res.render('pages/password.ejs', {message: "Undefined error", error: true });
			returnM
		}
		else if(response === "passwordCorrect"){
			//update linux password
			exec('echo ' + username + ':' + req.body.password + ' | chpasswd ', (error, stdout, stderr) => {
				if (error) {
				console.error(`exec error: ${error}`);
				res.render('pages/password.ejs', {message: "Undefined error", error: true });
				return;
				}
				//update sqlite password
				var db = new sqlite3.Database('db/users.db');
				db.exec('update user set password="' + sha1(req.body.password) + '" where name="' + username + '";');
				res.render('pages/password.ejs', {message: "Password updated sucessfully", error: false });
				return;
			});
		}
		else{
			res.render('pages/password.ejs', {message: "Incorrect password", error: true });
			return;
		}
	});
});

module.exports = {site: sub_app};