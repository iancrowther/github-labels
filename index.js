'use strict';

var argh = require('argh');
var request = require('request');
var async = require('async');
var _ = require('underscore');
var labels = require('./lib/label-data');
var username = argh.argv.username;
var repo = argh.argv.repo;
var options = {
  host: 'https://api.github.com',
  headers: {
    'User-Agent': username + '/' + repo,
    'Content-type': 'application/json'
  },
  auth: { bearer: argh.argv.token }
};
var messages = [];

function getLabels(cb) {
  var data = { uri: options.host + '/repos/' + username + '/' + repo + '/labels' };
  request.get(_.extend(options, data), function gotRequest(err, res, body) {
    if (err) { return cb(err); }
    if (!res.statusCode === 200) {
      return cb(new Error('unexpected status code: ' + res.statusCode));
    }
    cb(null, JSON.parse(body));
  });
}

function createLabel(label, messages, cb) {
  var data = {
    uri: options.host + '/repos/' + username + '/' + repo + '/labels',
    json: label
  };
  request.post(_.extend(options, data), function gotRequest(err, res, body) {
    if (err) { return cb(err); }
    if (!res.statusCode === 201) {
      return cb(new Error('unexpected status code: ' + res.statusCode));
    }
    messages.push(body);
    cb(null);
  });
}

function deleteLabel(label, cb) {
  var data = { uri: options.host + '/repos/' + username + '/' + repo + '/labels/' + label.name };
  request.del(_.extend(options, data), function gotRequest (err, res) {
    if (err) { return cb(err); }
    if (!res.statusCode === 204) {
      return cb(new Error('unexpected status code: ' + res.statusCode));
    }
    cb(null);
  });
}

async.waterfall([
  function(cb){
    getLabels(function(err, items) {
      if (err) { return cb(err); }
      var tasks = items.map(function(label){
        return function(cb) {
          deleteLabel(label, cb);
        };
      });
      async.series(tasks, function(err){
        cb(err);
      });
    });
  },
  function(cb) {
    var tasks = labels.map(function(label){
      return function(cb) {
        createLabel(label, messages, cb);
      };
    });
    async.series(tasks, function(err){
      cb(err, messages);
    });
  }
], function (err, messages) {
   if (err) {
    console.error(err);
  }
   console.log(messages);
});
