var express = require('express');
var bodyParser = require('body-parser');
var auth = require('./auth');
var network = require('network');
var exec = require('child_process').exec;
var setup = require('setup')();
var network = require('network');
var async = require("async");
var fs = require('fs');

var configFilename = "/usr/local/etc/zabbix_proxy.conf.example"

var sub_app = express();
var urlencodeParser = bodyParser.urlencoded({ extended: false });

function render(req, res, message, error){
	var lineReader = require('readline').createInterface({
	  input: fs.createReadStream(configFilename)
	});
	
	content = [];
	var comment = true;
	lineReader.on('line', function (line) {
		if(line.startsWith('#') && line.endsWith('##')){
			var title = line.replace(/#/gi, '').substring(1);
			content.push({title: title, content: []});
			comment = false;
		} else if (line.startsWith('### Option:')){
			if(!comment){
				content[content.length-1].content.push({
					title: line.substring(12),
					description: "",
					value: "",
					
				});
			}
		} else if (line.startsWith('#')){
			if(content.length >= 1){
				content[content.length-1].content[content[content.length-1].content.length-1].description += line.substring(2) + "<br />";
			}
		} else if (line){
			content[content.length-1].content[content[content.length-1].content.length-1].value = line.substring(line.indexOf('=') + 1);
		}
	});
	lineReader.on('close', function (line) {
		res.render('pages/config.ejs', {
			message: message,
			error: error,
			content: content,
		});
	});
}
sub_app.get('/', auth.auth, function (req, res) {
	render(req, res, "", false);
});

sub_app.post('/', auth.auth, urlencodeParser, function(req, res){
	fs.readFile(configFilename, function(err, data) {
		if(err) throw err;
		data = data.toString();
		var array = data.toString().split("\n");

		for(i = 0; i < array.length ; i++) {
			if(array[i].startsWith("### Option: ")){
				var line = "";
				for(option in req.body){
					if(array[i].startsWith("### Option: " + option)){
						if(req.body[option]){
							line = option + "=" + req.body[option] + "\n";
						}
					}
				}
				while(array[i].startsWith('#')){
					fs.appendFileSync(configFilename+"-tmp", array[i++]+'\n');
				}
				fs.appendFileSync(configFilename+"-tmp", '\n' + line + '\n');
			}
			else if(array[i].startsWith("#")){
				fs.appendFileSync(configFilename+"-tmp", array[i]+'\n');
			}
		};
		fs.rename(configFilename+"-tmp", configFilename, (err) => {
		if (err) throw err;
		render(req, res, "Zabbix proxy configuration updated successfully. Reboot to apply.", false);
		});
	});
});

module.exports = {site: sub_app};