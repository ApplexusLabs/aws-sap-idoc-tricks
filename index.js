'use strict';

var AWS = require('aws-sdk');
var s3 = new AWS.S3();
var xml2js = require('xml2js');
var uuid = require('node-uuid');

var parseString = new xml2js.Parser({ explicitArray: false }).parseString;

exports.handler = function (event, context, callback) {

    var xmlString = new Buffer(event.body, 'base64').toString();
    parseString(xmlString, function (err, result) {
        var s3Params = {
            Bucket: event.bucket,
            Key: event.sid + '/' + uuid.v1() + '.json',
            Body: JSON.stringify(result)
        };
        s3.putObject(s3Params, function (err, result) {
            callback(err, result);
        });
    });
};
