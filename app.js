/**
 * @api {get} /api/convert Convert a file
 * @apiName Convert
 * @apiGroup Convert
 *
 * @apiParam {String} from Format to convert from.
 * @apiParam {String} to Format to convert to.
 * @apiParam {String} url URL for the file to convert.
 *
 * @apiSuccess {String} url URL for the file to convert.
 * @apiSuccess {String} from Format to convert from.
 * @apiSuccess {String} to Format to convert to.
 * @apiSuccess {String} output The output of the conversion.
 *
 * @apiSuccessExample Success-Response:
 *     HTTP/1.1 200 OK
 *     {
 *       "url": "http://example.com/my.pdf",
 *       "from": "pdf",
 *       "to": "html",
 *       "output": "<!DOCTYPE html><html><head></head><body><h1>Example PDF</h1></body></html>"
 *     }
 *
 * @apiError InvalidURL Please specify a valid URL
 * @apiError InvalidFromFormat Please specify a format to convert from
 * @apiError InvalidToFormat Please specify a format to convert to
 * @apiError InternalServerError Oops, we couldn't convert that PDF, please try again
 * @apiError UnsupportedFromFormat Sorry, we don't currently support `from`
 * @apiError UnsupportedToFormat Sorry, we don't currently support `to`
 *
 * @apiErrorExample Error-Response:
 *     HTTP/1.1 400 Bad Request
 *     {
 *       "code": 400,
 *       "error": "InvalidFromFormat",
 *       "message": "Please specify a format to convert from"
 *     }
 */

var express = require("express");
var pdf = require("pdftohtmljs");
var request = require("request");
var fs = require("fs");
var sha1 = require("sha1");

var app = express();

app.use('/', express.static(__dirname + '/static'));

app.use('/docs', express.static(__dirname + '/static/docs'));

app.get("/api/*", function(req, res) {
    console.log("Got request for /api to convert " + req.query.url + " from " + req.query.from + " to " + req.query.to);
    // req.query contains URL parameters
    if (!req.query.url) {
        res.status(400);
        res.json({
            code: 400,
            error: "InvalidURL",
            message: "Please specify a valid URL"
        });
    }
    if (!req.query.from) {
        res.status(400);
        res.json({
            code: 400,
            error: "InvalidFromFormat",
            message: "Please specify a format to convert from"
        });
    }
    if (!req.query.to) {
        res.status(400);
        res.json({
            code: 400,
            error: "InvalidToFormat",
            message: "Please specify a format to convert to"
        });
    } else {
        if (req.query.from.toLowerCase() == "pdf") {
            if (req.query.to.toLowerCase() == "html") {
                var id = sha1(req.query.url);
                try {
                    stats = fs.lstatSync('files/' + id + ".html");
                    res.status(200);
                    fs.readFile("files/" + id + ".html", "utf-8", function(err, data) {
                        res.json({
                            url: req.query.url,
                            html: data,
                            from: req.query.from.toLowerCase(),
                            to: req.query.to.toLowerCase()
                        });
                    });
                } catch (e) {
                    var getPDF = request(req.query.url).pipe(fs.createWriteStream("files/" + id + ".pdf"));
                    getPDF.on("finish", function() {
                        var converter = new pdf("files/" + id + ".pdf", "files/" + id + ".html");
                        converter.success(function() {
                            res.status(200);
                            fs.readFile("files/" + id + ".html", "utf-8", function(err, data) {
                                res.json({
                                    url: req.query.url,
                                    html: data,
                                    from: req.query.from.toLowerCase(),
                                    to: req.query.to.toLowerCase()
                                });
                            });
                        });
                        converter.error(function(err) {
                            res.status(500);
                            res.json({
                                code: 500,
                                error: "InternalServerError",
                                message: "Oops, we couldn't convert that PDF, please try again"
                            });
                            console.log("Error with PDF converter: " + err);
                        });
                        converter.convert();
                    });
                }
            } else {
                res.status(400);
                res.json({
                    code: 400,
                    error: "UnsupportedToFormat",
                    message: "Sorry, we don't currently support " + req.query.to
                });
            }
        } else {
            res.status(400);
            res.json({
                code: 400,
                error: "UnsupportedFromFormat",
                message: "Sorry, we don't currently support " + req.query.from
            });
        }
    }
});

var server = app.listen(3002, function() {
    var host = server.address().address;
    var port = server.address().port;

    console.log('Morpheus listening at http://%s:%s', host, port);
});