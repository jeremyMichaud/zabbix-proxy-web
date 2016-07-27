var express = require('express');
var bodyParser = require('body-parser');
var auth = require('./auth');
var network = require('network');
var exec = require('child_process').exec;
var setup = require('setup')();
var network = require('network');
var async = require("async");
var fs = require('fs');

//The file to edit
var configFilename = "/usr/local/etc/zabbix_proxy.conf"

//We create a sub-app, more about sub-app: http://expressjs.com/fr/api.html#app.mountpath
var sub_app = express();
var urlencodeParser = bodyParser.urlencoded({ extended: false });

//This function collects informations and render the web page
function render(req, res, message, error){
	//Read the file, line per line
	var lineReader = require('readline').createInterface({
	  input: fs.createReadStream(configFilename)
	});
	
	content = []; //The parsed array
	
	var comment = true; //internal var used to ignore first lines of the file, before the first section
	
	lineReader.on('line', function (line) {
		//Get a section (start with # and end with ## at least
		if(line.startsWith('#') && line.endsWith('##')){
			//Remove # chars
			var title = line.replace(/#/gi, '').substring(1);
			content.push({title: title, content: []});
			comment = false;
		//Get an option (start with ### Option:)
		} else if (line.startsWith('### Option:')){
			if(!comment){
				content[content.length-1].content.push({
					title: line.substring(12),
					description: "",
					value: "",
					
				});
			}
		//Get the description of an option (start with #)
		//We could separate default value and mandatory if necessary
		} else if (line.startsWith('#')){
			if(content.length >= 1){
				content[content.length-1].content[content[content.length-1].content.length-1].description += line.substring(2) + "<br />";
			}
		//We get the value of an option (start with OptionName=value)
		} else if (line){
			content[content.length-1].content[content[content.length-1].content.length-1].value = line.substring(line.indexOf('=') + 1);
		}
	});
	//After parsing the file, we render the page
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

//When POST informations are sent, we save the data in a temporary file.
//Once the temporary file is finished, we erase the original file with it
sub_app.post('/', auth.auth, urlencodeParser, function(req, res){
	fs.readFile(configFilename, function(err, data) {
		if(err) throw err;
		data = data.toString();
		var array = data.toString().split("\n"); //split the file per line

		for(i = 0; i < array.length ; i++) {
			//If it's an option, we treat it
			if(array[i].startsWith("### Option: ")){
				var line = "";
				
				//We search the option
				for(option in req.body){
					if(array[i] == "### Option: " + option){
						if(req.body[option]){
							line = option + "=" + req.body[option] + "\n";
						}
					}
				}
				//We save the option comments
				while(array[i].startsWith('#')){
					fs.appendFileSync(configFilename+"-tmp", array[i++]+'\n');
				}
				//We save the new value of the option
				fs.appendFileSync(configFilename+"-tmp", '\n' + line + '\n');
			}
			//If it's a comment, we save it
			else if(array[i].startsWith("#")){
				fs.appendFileSync(configFilename+"-tmp", array[i]+'\n');
			}
			//Else if it's an old option value, we drop it
		};
		fs.rename(configFilename+"-tmp", configFilename, (err) => {
		if (err) throw err;
		render(req, res, "Zabbix proxy configuration updated successfully. Reboot to apply.", false);
		});
	});
});

module.exports = {site: sub_app};