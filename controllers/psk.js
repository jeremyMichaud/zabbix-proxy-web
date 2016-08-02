var express = require('express');
var exec = require('child_process').exec;
var bodyParser = require('body-parser');
var auth = require('./auth');
fs = require('fs');

//We create a sub-app, more about sub-app: http://expressjs.com/fr/api.html#app.mountpath
var sub_app = express();
var urlencodeParser = bodyParser.urlencoded({ extended: false });

var pskFile = '/usr/local/etc/zabbix_proxy.key';

function getPSK(){
	var text = fs.readFileSync(pskFile, 'utf8');
	return text;
}

//The main page of this sub-app just render the form
sub_app.get('/', auth.auth, function (req, res) {
	res.render('pages/psk.ejs', {message: "", value: getPSK(), pskFile: pskFile, base_url: req.baseUrl});
});

//When POST informations are sent, this save them
sub_app.post('/', auth.auth, urlencodeParser, function (req, res) {
	fs.writeFileSync(pskFile, req.body.psk, 'utf8');
	res.render('pages/psk.ejs', {message: "PSK sucessfully updated, reboot to apply.", error: false, value: getPSK(), pskFile: pskFile, base_url: req.baseUrl});
});

//Redirect to main page if get request
sub_app.get('/generate', auth.auth, function (req, res) {
	res.redirect(req.baseUrl);
});

//When POST informations are sent, this save them, with autogenerating option
sub_app.post('/generate', auth.auth, urlencodeParser, function (req, res) {
	exec('openssl rand -hex 32 > /usr/local/etc/zabbix_proxy.key', (error, stdout, stderr) => {
		if (error) {
			console.error(`exec error: ${error}`);
			res.render('pages/password.ejs', {message: "Undefined error", error: true });
			return;
		}
		res.render('pages/psk.ejs', {message: "PSK sucessfully updated, reboot to apply.", error: false, value: getPSK(), pskFile: pskFile, base_url: req.baseUrl});
		return;
	});
})



module.exports = {site: sub_app};