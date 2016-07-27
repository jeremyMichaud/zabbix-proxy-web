var basicAuth = require('basic-auth');
var sqlite3 = require('sqlite3').verbose();
var sha1 = require('sha1');

//Login middleware
var auth = function (req, res, next) {
	function unauthorized(res) {
		res.set('WWW-Authenticate', 'Basic realm=Authorization Required');
		return res.sendStatus(401);
	};

	var user = basicAuth(req);

	if (!user || !user.name || !user.pass) {
		return unauthorized(res);
	};
	var db = new sqlite3.Database('db/users.db');
	db.serialize(function() {
		var stmt = db.prepare("SELECT * FROM USER WHERE name = (?)");
		stmt.get(user.name, function(err, row) {
			  if (row && sha1(user.pass) === row.PASSWORD) {
				return next();
			  } else {
				return unauthorized(res);
			  };
		});
		stmt.finalize();
		db.close();
	});
};

module.exports = {auth: auth};