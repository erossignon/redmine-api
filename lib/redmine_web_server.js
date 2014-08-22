/*global: require*/
// The MIT License (MIT)
//
// Copyright (c) 2014 Etienne Rossignon
//
// Permission is hereby granted, free of charge, to any person obtaining a copy
// of this software and associated documentation files (the "Software"), to deal
// in the Software without restriction, including without limitation the rights
// to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
// copies of the Software, and to permit persons to whom the Software is
// furnished to do so, subject to the following conditions:
//
// The above copyright notice and this permission notice shall be included in all
// copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
// IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
// FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
// AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
// LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
// OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
// SOFTWARE.
//

var assert = require("assert");
var https = require('https');
var http = require('http');
var url = require("url");
var _ = require("underscore");
require("colors");
var path = require('path');
var fs = require("fs");

var authenticity_token_regexp = /<input\s+name=\"authenticity_token\"\s+type=\"hidden\"\s+value=\"([^\"]+)\"/;

/**
 * Fix Unicode String that would cause JSON.parse to fail
 */
function fixUnicode(txt) {
    txt = txt.replace(/\003/g, ' ');
    txt = txt.replace(/\004/g, ' ');
    txt = txt.replace(/(\r|\n)/g, ' ');
    txt = txt.replace(/[\u007f-\uffff]/g, function (c) {
        return '\\u' + ('0000' + c.charCodeAt(0).toString(16)).slice(-4);
    });
    return txt;
}


function get_authenticity_token(urlStr, next) {

    "use strict";

    var p = url.parse(urlStr);

    var http_protocol;
    if (p.protocol === "https:") {
        http_protocol = https;
    } else {
        http_protocol = http;
    }

    var options = {
        host: p.hostname,
        path: path.join(p.pathname, "login")
    };

    http_protocol.get(options, function (res) {

        var data = "";
        res.on('data', function (chunk) {
            data += chunk;
        });

        res.on('end', function () {
            // we search for <input name="authenticity_token" type="hidden" value="XXXX=" />
                var match = authenticity_token_regexp.exec(data);
            if (match === null) {
                //s console.warn(" Cannot find authenticity_token", chunk.toString());
                next(new Error("Cannot find authenticity_token"));
            } else {
                var authenticity_token = match[1];
                next(null, authenticity_token);
            }
        });
        res.on('error',function(err)  {
            next(err);

        });

    }).on('error', function (err) {
        console.log(" get authenticity token Got error: " + err.message + " options =", options);
        next(err);
    });

}


/* callback receive cookie */
function post_login(urlStr, username, password, token, next) {

    "use strict";

    assert(_.isFunction(next));

    var p = url.parse(urlStr);


    var http_protocol;
    if (p.protocol === "https:") {
        http_protocol = https;
    } else {
        http_protocol = http;
    }

    var options = {
        host: p.hostname,
        path: path.join(p.pathname, "login"),
        method: "POST"
    };

    var req = http_protocol.request(options, function (res) {
        // console.log('STATUS: ' + res.statusCode);
        // console.log('HEADERS: ' + JSON.stringify(res.headers,null," "));

        res.setEncoding('utf8');

        res.on('data', function (chunk) {
            //xx data += chunk
        });
        res.on('end', function () {


            var selected_elements = res.headers["set-cookie"].filter(function (str) {
                //  1234567890123456
                return str.substr(0, 16) === "_redmine_session";
            });

            assert(selected_elements.length === 1);
            var _cookie_session = selected_elements[0] + "; domain=" + p.hostname;
            next(null, _cookie_session);
        });
    });

    req.on('error', function (err) {
        console.log('problem with request: '.red + err.message);
        next(err);
    });

    // write data to request body
    req.write("username=" + username + "&password=" + password + "&authenticity_token=" + token + "\n");
    req.end();

}


/**
 *
 * @param redmine_url  {String} the url of the redmine instance
 * @param username
 * @param password
 * @param callback {Function}
 * @param callback.err {Error|null}
 * @param callback.cookie {String}
 */
function get_cookie(redmine_url, username, password, callback) {

    assert(_.isFunction(callback));
    get_authenticity_token(redmine_url, function (err, token) {
        if (!err) {
            post_login(redmine_url, username, password, token, callback);
        } else {
            console.log("Cookie Error", err.message);
            callback(err);
        }
    });

}

exports.get_cookie = get_cookie;



function prepare_api_call(server, callback) {

    var fs = require('fs');

    if (!server.api_key){

        if (server.cookie === null) {
            get_cookie(server.url, server.username, server.password, function (err, cookie) {

                server.cookie = cookie;
                //xx  console.warn("\n\n\n ************************************ COOKIE ", cookie);
                callback(err);
            });
        } else {
            callback(null);
        }
    } else {
        callback(null);
    }
}

function build_request_options(server, path_string) {
    //xx assert(path.substr(0,1)==="/");

    var options =  {
        host: server.host,
        port: server.port,
        path: path.join(server.pathname, path_string),
        method: 'GET',
        headers: {
            'Content-Type': 'application/json',
        }
    };
    if (server.api_key) {
        options.headers["X-Redmine-API-Key"] =  server.api_key;
    } else {
        var cookie = server.cookie.split(" ")[0];
        options.headers["Cookie"] =  cookie;
    }
    return options;
}

function perform_http_get_transaction(server, command, callback) {

    assert(server instanceof RedmineWebServer);
    assert(server.api_key || server.cookie, "expecting a valid api_key or a valid cookie");
    assert(_.isFunction(callback));
    assert(server.http_protocol);


    console.log("command = ".yellow,command.cyan.bold);

    if (command.substr(0, 1) === "/") {
        command = command.substr(1);
    }

    var options = build_request_options(server, command);

    var txt = "";

    var req = server.http_protocol.request(options, function (res) {

        res.on('data', function (d) {
            txt += d;
        }).on('error', function (err) {
            // callback(err);
        }).on('end', function () {
            console.warn(" Status Code  = ", res.statusCode);
            if (res.statusCode != 200) {
                callback(new Error("Transaction returned status code "+  res.statusCode));
            } else {
                callback(null, txt);
            }
        });
    });
    req.on('error', function (err) {
        console.log('problem with request: '.red + err.message);
        callback(err);
    });
    req.end();
};


function _fetch(server,element,callback) {

    assert(typeof element === "string");
    assert(server instanceof RedmineWebServer)
    assert(_.isFunction(callback));

    perform_http_get_transaction(server, element + ".json", function (err, txt) {
        if(!err) {
            var result = JSON.parse(txt);
            callback(err, result[element]);
        } else {
            callback(err);
        }
    });
}


function _fetch_project(server, project, element,  callback) {

    assert(typeof project === "string");
    assert(typeof element === "string");
    assert(server instanceof RedmineWebServer);
    assert(_.isFunction(callback));
    perform_http_get_transaction(server, "/projects/" + project + "/" + element + ".json", function (err, txt) {

        var dataObject = null;
        if (!err) {
            txt = fixUnicode(txt);
            try {
                dataObject = JSON.parse(txt);
                if (server.cache_folder) {
                    var filename = path.join(server.cache_folder,project + "_" + element + ".json");
                    fs.writeFileSync(filename, JSON.stringify(dataObject, null, " "));
                }
            }
            catch (err) {
                console.log(" error getting ", options);
            }
        }
        if (callback) {
            callback(err,dataObject[element]);
        }

    });
}




/**
 * \brief extract the full raw information for a given ticket out of redmine
 *        and store it to a json file in the cache.
 *        any old version of the ticket json file will be overwritten
 *
 */
function __fetchTicketInfo(server, ticketid, callback) {

    "use strict";

    assert(server.cache_folder);

    var filename = server._ticket_cache_file(ticketid);
    //xx console.log("filename " , filename.red);

    assert(_.isFunction(callback));

    var command = 'issues/' + ticketid.toString() + '.json?include=relations,journals';

    perform_http_get_transaction(server,command, function (err, txt) {

        txt = fixUnicode(txt);

        var ticket = null;
        try {
            var o = JSON.parse(txt);

            fs.writeFileSync(filename, JSON.stringify(o, null, " "));
            console.warn(" writing ", filename);
            ticket= o.issue;
        } catch (err) {
            console.log("error !".red, err.message);
            fs.writeFileSync("toto.txt", txt);
            callback(err);
            return;
            // the ticket may have been deleted
        }
        callback(null,ticket);

    });

}

function RedmineWebServer(options) {

    this.url = options.url;

    this.username = options.username;
    this.password = options.password;
    this.api_key = options.api_key;

    this.cache_folder = options.cache_folder;
    this.cookie = null;

    var p = url.parse(this.url);

    if (p.protocol === "https:") {
        this.http_protocol = https;
        this.port = p.port ? p.port : 443;
    } else {

        this.http_protocol = http;
        this.port = p.port ? p.port : 80;
    }
    this.port = parseInt(this.port);

    this.host = p.hostname;
    this.pathname = p.pathname;

    this.offline = options.offline ? true : false;

    if (options.cache_folder) {
        if (!fs.existsSync(options.cache_folder)) {
            fs.mkdirSync(options.cache_folder);
        }
    }

}

RedmineWebServer.prototype.getCookie = function (callback) {

    var self = this;
    self.cookie = null;
    get_cookie(self, callback);
};


/**
 *
 * @param callback {Function}
 * @param callback.err {Error|null}
 * @param callback.projects {Array<Project>}
 *
 */

RedmineWebServer.prototype.fetchProjectName = function (callback) {
    var self = this;
    prepare_api_call(self, function (err) {
        if (err) { return callback(err);}

        _fetch(self,"projects",function (err, projects) {
            if (!err) {
                self._projects = projects;
                callback(err, projects);
            } else {
                callback(err);
            }
        });
    });
};


/**
 * call the redmine restAPI to retrieve the various versions of a projet
 * project is the redmine id of the projet
 */
RedmineWebServer.prototype.fetchVersions = function (project, callback) {

    var self = this;
    prepare_api_call(self, function (err) {
        _fetch_project(self, project,"versions",callback);
    });
};
RedmineWebServer.prototype.fetchIssueStatuses = function (callback) {

    var self = this;
    prepare_api_call(self, function (err) {
        _fetch(self, "issue_statuses",callback);
    });
};
RedmineWebServer.prototype.fetchRoles = function (callback) {

    var self = this;
    prepare_api_call(self, function (err) {
        _fetch(self, "roles",callback);
    });
};
RedmineWebServer.prototype.fecthTrackers = function (callback) {

    var self = this;
    prepare_api_call(self, function (err) {
        _fetch(self, "trackers",callback);
    });
};


RedmineWebServer.prototype.findProject = function (project) {

    // project is either a name an identifier or an id
    var self = this;

    assert(self._projects," fetchProjectName not called !");

    var res = self._projects.filter(function (p) {
        return ( p.name === project ) || (p.id === project) || (p.identifier === project);
    });
    if (res.length === 1) {
        return res[0];
    }
    return null; // project not found ,
};


RedmineWebServer.prototype._project_page = function (project_id,page) {
    var self = this;
    return path.join(self.cache_folder, project_id + "_page" + page + ".json");
};

function _get_light_issue(issue){
  return {
      id:issue.id,
      updated_on: new Date(issue.updated_on),
      created_on: new Date(issue.created_on),
      tracker: issue.tracker.name
  };
}
/**
 * \brief get a full extract of all tickets for the  specified projects
 *        and store a set of json file in the local cache
 * @param : function callback()
 *          takes no arguments, called when process is completed
 * @param : function progress_callback(msg)
 */
function _fetchProjectIssues(server, project, callback, progress_callback) {


    "use strict";
    assert(server.api_key || server.cookie, "expecting a valid api_key or a valid cookie");
    assert(_.isFunction(callback));

    var limit = 100;

    var list_of_items = [];

    function internal_fetch(page) {

        var filename = server._project_page(project,page);
        console.log("filename =>".yellow, filename);

        perform_http_get_transaction(server, "projects/" + project + "/issues.json?limit=" + limit + "&page=" + page + "&status_id=*", function (err, txt) {
            if (!err) {
                txt = fixUnicode(txt);
                //xx console.log(" file !!!!! ", txt);
                var o = JSON.parse(txt);
                fs.writeFileSync(filename, JSON.stringify(o, null, " "));

                o.issues.forEach(function (issue) {
                    list_of_items.push(_get_light_issue(issue));
                });

                console.warn(" writing ", filename);
                if (progress_callback) {
                    progress_callback("writing " + filename);
                }
                if (o.limit === o.issues.length) {
                    // we have more page to extract
                    internal_fetch(page + 1);
                } else {
                    // this is the end
                    callback(null, list_of_items);
                }
            } else {
                callback(err);
            }
        });
    }

    internal_fetch(1);
}

RedmineWebServer.prototype.fetchProjectIssues = function (project, callback) {

    var self = this;

    assert(_.isFunction(callback));
    if (!self._projects && !self.offline ) {
        self.fetchProjectName(function(err,projects){
            if (err) {
                callback(err,null);
            } else {
                self.fetchProjectIssues(project,callback);
            }
        });
        return;
    }

    var proj = self.findProject(project);

    var proj_identifier;
    if (!proj) {
        console.log(self._projects);
        if (self._project) {
            return callback(new Error(" Cannot find project " + project));
        }
        proj_identifier = project;
    } else {
        console.log(" fetching project ", proj.name + " id = ", proj.id + " identifier = ", proj.identifier);
        proj_identifier = proj.identifier;
    }
    prepare_api_call(self, function (err) {
        _fetchProjectIssues(self, proj_identifier,function(err,list_of_issues){

            if (!err) {
                self._issues_light = list_of_issues.map(_get_light_issue);
            }

            callback(err,list_of_issues);
        } );
    });
};


/**
 * reload
 */
RedmineWebServer.prototype.loadProjectIssuesFromCache = function (project, callback) {

    var self = this;

    if (!self._projects && !self.offline ) {
        self.fetchProjectName(function(err,projects){
            if (err) {
                callback(err,null);
            } else {
                self.loadProjectIssuesFromCache(project,callback);
            }
        });
        return;
    }
    var project_id = project;

    if (!self.offline) {
        var proj = self.findProject(project);
        if (proj) {
            project_id = proj.identifier;
        }
    }

    var list_of_issues = [];

    var page = 1;

    var internal_func = function (page) {

        var filename = self._project_page(project_id, page);

        fs.stat(filename, function (err, stat) {

            if (err) {
                // no more page
                self._issues_light = list_of_issues;
                return callback(null,list_of_issues);
            }

            console.log(" reading file ... ", filename);

            var txt = fs.readFile(filename, function (err, rawdata) {

                var txt = rawdata.toString();
                var data = JSON.parse(txt);

                var issues = data.issues.map(_get_light_issue);
                list_of_issues = list_of_issues.concat(issues);


                internal_func(page + 1);
            });
        });
    };
    internal_func(1);
};


RedmineWebServer.prototype.fetchTicketInfo = function (ticketid, callback) {
    var self = this;
    prepare_api_call(self, function (err) {
        __fetchTicketInfo(self, ticketid, callback);
    });
};


function __fetchIssueStatuses(server,callback) {

    assert(_.isFunction(callback));
    var command = 'issue_statuses.json';
    perform_http_get_transaction(server,command, function (err, txt) {
        var o = JSON.parse(txt);
        server.issue_statuses = o.issue_statuses;

        assert(_.isArray(server.issue_statuses));
        callback(err,server.issue_statuses);
    });
}

RedmineWebServer.prototype.fectchIssueStatuses = function(callback)  {
    var self = this;
    prepare_api_call(self, function (err) {
        __fetchIssueStatuses(self, callback);
    });
}

RedmineWebServer.prototype._ticket_cache_file = function (ticketid) {
   return  path.join(this.cache_folder, ticketid.toString() + '.json');
};

RedmineWebServer.prototype._read_ticket_from_cache = function (ticketid, callback) {

    assert(_.isFinite(ticketid));
    assert(_.isFunction(callback));

    var self = this;
    var filename = self._ticket_cache_file(ticketid);
    var txt = fs.readFileSync(filename).toString();
    var ticket = JSON.parse(txt).issue;
    callback(null,ticket);
};


function _find_issue_light(server,ticketid){
    assert(server instanceof RedmineWebServer);

    if (!server._issues_light) {
        return null;
    }
    var res = server._issues_light.filter(function(e){ return e.id === ticketid});
    return res.length === 1 ? res[0] : null;
}

Date.coerce = function(value) {
    return new Date(value);
}
Date.lowerThan = function( a,b) {

    a = Date.coerce(a);
    b = Date.coerce(b);
    return ( +a < +b );
};
Date.greaterThan = function( a,b) { return lowerThan(b,a);}

Date.equal = function( a,b) { return !lowerThan(a,b) && !greaterThan(a,b);}

/**
 * reload the ticket if the updated_date of the
 * issue_light is more recent that the update_date
 * of the ticket we have in cache
 *
 */
RedmineWebServer.prototype.refreshTicketInfo = function (ticketid, callback) {

    var self = this;

    var filename = self._ticket_cache_file(ticketid);

    fs.stat(filename, function (err, stat) {

        if (!err) {

            // the ticket already exists ...  load existing ticket
            self._read_ticket_from_cache(ticketid, function (err,ticket) {

                var issue_light =_find_issue_light(self,ticketid);

                // compare the date
                if (issue_light && Date.lowerThan(ticket.updated_on,issue_light.updated_on) ) {

                    console.warn(" reloading ticket because ", issue_light.updated_on, " >> ", ticket.updated_on);
                    // reload ticket
                    self.fetchTicketInfo(ticketid, callback);

                } else {
                   callback(null,ticket);
                }
            });

            return;
        } else {
            // rebuild cache and pass the ticket to callback
            self.fetchTicketInfo(ticketid, callback);
        }
    });

};


/**
 *
 * @param options
 * @param options.project {String}  => refresh project and old tickets
 * @param options.refresh {Boolean} => refresh project and old tickets
 *
 * @param callback
 * @param callback.err
 * @param callback.issues
 */
RedmineWebServer.prototype.load_all_tickets = function(options, callback) {

    assert(options.project,"missing project identifier , please specify options.project");

    var self = this;
    if (!self._issues_light) {
        self.loadProjectIssuesFromCache(options.project,function( err,issue_lights){
            if (!err) {
                self.load_all_tickets(options,callback);
            } else {
                callback(err);
            }
        });
    } else {
        var async = require("async");
        assert(_.isArray(self._issues_light));
        async.mapLimit(self._issues_light , 2, function(issue,inner_callback){

            self.refreshTicketInfo(issue.id,function(err,data) {
                //xx console.log(" reloading ticket done".yellow,issue.id);
                inner_callback(err,data);
            });

        },function(err,results){
            console.log((" found " +  results.length + " issues").yellow);
            callback(null,results);

        });
    }
};
exports.RedmineWebServer = RedmineWebServer;