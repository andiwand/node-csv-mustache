var express = require('express');
var path = require('path');
var fs = require('fs');
var mustache = require('mustache');
var csv = require('csv-parse/lib/sync');

var args = process.argv.slice(2);
if (args.length != 1) {
  console.error('illegal argument count: ' + args.length);
  process.exit(1);
}
var config_file = args[0];
if (!fs.lstatSync(config_file).isFile()) {
  console.error('config file not found');
  process.exit(2);
}

console.log('config file: ' + config_file);
var config = JSON.parse(fs.readFileSync(config_file, 'utf8'));
console.log('port: ' + config.port);

var app = express();

var get_view = function() {
  var input = fs.readFileSync(config.data, 'utf8');
  var data = csv(input, {delimiter: ',', columns: true, skip_empty_lines: true});
  var entry = {};
  var now = new Date(Date.now());
  for (var d of data) {
    var begin = new Date(Date.parse(d['date']));
    if (begin < now) {
      entry = d;
    }
  }
  return entry;
};

var get_handler = function(page) {
  var input = fs.readFileSync(page, 'utf8');
  return function(req, res) {
    var view = get_view();
    var output = mustache.to_html(input, view);
    res.send(output);
  };
};

for (var path in config.pages) {
  var page = config.pages[path];
  console.log('register ' + path + ' as ' + page);
  app.get(path, get_handler(page));
}

app.listen(config.port, function() {
  console.log('listening ...');
});

