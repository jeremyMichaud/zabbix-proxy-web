var express = require('express');
var bodyParser = require('body-parser');
var auth = require('./auth');
var network = require('network');
var exec = require('child_process').exec;
var setup = require('setup')();
var network = require('network');
var async = require("async");

var sub_app = express();
var urlencodeParser = bodyParser.urlencoded({ extended: false });

function render(req, res, message, error){
	var dhcp, hostname, interface, dns;
	async.parallel([
		function(callback) {
			exec('cat /etc/network/interfaces | grep "iface eth0 inet dhcp" | cat', (error, stdout, stderr) => {
				dhcp = 0 != stdout.length;
				callback();
			});
		},
		function(callback) {
			exec('hostname', (error, stdout, stderr) => {
				hostname = stdout;
				callback();
			});
		},
		function(callback) {
			network.get_active_interface(function(err, obj) {
				interface = obj;
				callback();
			});
		},
		function(callback){
			exec('cat /etc/resolv.conf  | grep nameserver | cut -d " " -f2', (error, stdout, stderr) => {
				dns = stdout;
				callback();
			});
		}
	],
	function(err, results) {
		res.render('pages/network.ejs', {
			message: message,
			error: error,
			dhcp: dhcp,
			hostname: hostname,
			address: interface.ip_address,
			netmask: interface.netmask.substring(5),
			gateway: interface.gateway_ip,
			dns: dns,
		});
	});
}
sub_app.get('/', auth.auth, function (req, res) {
	render(req, res, "", false);
});

sub_app.post('/', auth.auth, urlencodeParser, function(req, res){
	setup.hostname.save(req.body.hostname);
	var config;
	if(req.body.useDhcp){
		config = setup.network.config({
			eth0: {
				auto: true,
				dhcp: true
			}
		});
	} else {
		config = setup.network.config({
			eth0: {
				auto: true,
				ipv4: {
					address: req.body.address,
					netmask: req.body.netmask,
					gateway: req.body.gateway,
					dns: req.body.dns
				}
			}
		});
	}
	setup.network.save(config);
	render(req, res, "Network configuration updated successfully. Reboot to apply.", false);
});

module.exports = {site: sub_app};