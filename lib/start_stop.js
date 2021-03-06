// Generated by CoffeeScript 1.4.0
var crypto, exec, exists, fs, md5, path, spawn, start_stop, _ref;

crypto = require('crypto');

_ref = require('child_process'), exec = _ref.exec, spawn = _ref.spawn;

fs = require('fs');

path = require('path');

exists = fs.exists || path.exists;

md5 = function(cmd) {
  return crypto.createHash('md5').update(cmd).digest('hex');
};

/*
`start_stop`: Unix process management
-------------------------------------

The library start and stop unix child process. Process are by default 
daemonized and will keep running even if your current process exit. For 
conveniency, they may also be attached to the current process by 
providing the `attach` option.
*/


module.exports = start_stop = {
  /*
  
    `start(options, callback)`
    --------------------------
    Start a prcess as a daemon (default) or as a child of the current process. Options includes
    all the options of the "child_process.exec" function plus a few specific ones.
  
    `options`         , Object with the following properties:
    *   `cmd`         , Command to run
    *   `cwd`         , Current working directory of the child process
    *   `detached`    , Detached the child process from the current process
    *   `pidfile`     , Path to the file storing the child pid
    *   `stdout`      , Path to the file where standard output is redirected
    *   `stderr`      , Path to the file where standard error is redirected
    *   `strict`      , Send an error when a pid file exists and reference
                  an unrunning pid.
    *   `watch`       , Watch for file changes
    *   `watchIgnore` , List of ignore files
    
    `callback`        , Received arguments are:
    *   `err`         , Error if any
    *   `pid`         , Process id of the new child
  */

  start: function(options, callback) {
    var c, check_pid, child, cmdStderr, cmdStdout, start, stderr, stdout, watch;
    if (options.attach != null) {
      console.log('Option attach was renamed to attached to be consistent with the new spawn option');
      options.detached = !options.attach;
    }
    if (options.detached) {
      child = null;
      cmdStdout = typeof options.stdout === 'string' ? options.stdout : '/dev/null';
      cmdStderr = typeof options.stderr === 'string' ? options.stderr : '/dev/null';
      check_pid = function() {
        return start_stop.pid(options, function(err, pid) {
          if (!pid) {
            return watch();
          }
          return start_stop.running(pid, function(err, pid) {
            if (pid) {
              return callback(new Error("Pid " + pid + " already running"));
            }
            if (options.strict) {
              return callback(new Error("Pid file reference a dead process"));
            } else {
              return watch();
            }
          });
        });
      };
      watch = function() {
        var ignore, ioptions;
        if (!options.watch) {
          return start();
        }
        if (typeof options.watch !== 'string') {
          options.watch = options.cwd || process.cwd;
        }
        ioptions = {
          path: options.watch,
          ignoreFiles: [".startstopignore"] || options.watchIgnoreFiles
        };
        console.log('ioptions', ioptions);
        ignore = require('fstream-ignore');
        ignore(ioptions).on('child', function(c) {
          console.log(c.path);
          return fs.watchFile(c.path, function(curr, prev) {
            console.log(c.path);
            return start_stop.stop(options, function(e) {
              return start_stop.start(options, function(e) {
                return console.log('restarted', e);
              });
            });
          });
        });
        return start();
      };
      start = function() {
        var cmd, info, pipe;
        pipe = "</dev/null >" + cmdStdout + " 2>" + cmdStdout;
        info = 'echo $? $!';
        cmd = "" + options.cmd + " " + pipe + " & " + info;
        return child = exec(cmd, options, function(err, stdout, stderr) {
          var code, msg, pid, _ref1;
          _ref1 = stdout.split(' '), code = _ref1[0], pid = _ref1[1];
          code = parseInt(code, 10);
          pid = parseInt(pid, 10);
          if (code !== 0) {
            msg = "Process exit with code " + code;
            return callback(new Error(msg));
          }
          return exists(path.dirname(options.pidfile), function(exists) {
            if (!exists) {
              return callback(new Error("Pid directory does not exist"));
            }
            return fs.writeFile(options.pidfile, '' + pid, function(err) {
              return callback(null, pid);
            });
          });
        });
      };
      return check_pid();
    } else {
      c = exec(options.cmd);
      if (typeof options.stdout === 'string') {
        stdout = fs.createWriteStream(options.stdout);
      } else if (options.stdout !== null && typeof options.stdout === 'object') {
        stdout = options.stdout;
      } else {
        stdout = null;
      }
      if (typeof options.stderr === 'string') {
        stdout = fs.createWriteStream(options.stderr);
      } else if (options.stderr !== null && typeof options.stderr === 'object') {
        stderr = options.stderr;
      } else {
        stderr = null;
      }
      return process.nextTick(function() {
        options.pid = c.pid;
        return callback(null, c.pid);
      });
    }
  },
  /*
  
    `stop(options, callback)`
    -------------------------
    Stop a process. In daemon mode, the pid is obtained from the `pidfile` option which, if 
    not provided, can be guessed from the `cmd` option used to start the process.
  
    `options`         , Object with the following properties:
    *   `detached`    , Detach the child process to the current process
    *   `cmd`         , Command used to run the process, in case no pidfile is provided
    *   `pid`         , Pid to kill in attach mode
    *   `pidfile`     , Path to the file storing the child pid
    *   `strict`      , Send an error when a pid file exists and reference
                  an unrunning pid.
    
    `callback`        , Received arguments are:
    *   `err`         , Error if any
    *   `stoped`      , True if the process was stoped
  */

  stop: function(options, callback) {
    var kill;
    if (options.attach != null) {
      console.log('Option attach was renamed to attached to be consistent with the new spawn option');
      options.detached = !options.attach;
    }
    if (typeof options === 'string' || typeof options === 'number') {
      options = {
        pid: parseInt(options, 10),
        detached: false
      };
    }
    kill = function(pid) {
      var cmds;
      cmds = "for i in `ps -ef | awk '$3 == '" + pid + "' { print $2 }'`\ndo\n  kill $i\ndone\nkill " + pid;
      return exec(cmds, function(err, stdout, stderr) {
        if (err) {
          return callback(new Error("Unexpected exit code " + err.code));
        }
        options.pid = null;
        return callback(null, true);
      });
    };
    if (options.detached) {
      return start_stop.pid(options, function(err, pid) {
        if (err) {
          return callback(err);
        }
        if (!pid) {
          return callback(null, false);
        }
        return fs.unlink(options.pidfile, function(err) {
          if (err) {
            return callback(err);
          }
          return start_stop.running(pid, function(err, running) {
            if (!running) {
              if (options.strict) {
                return callback(new Error("Pid file reference a dead process"));
              } else {
                return callback(null, false);
              }
            }
            return kill(pid);
          });
        });
      });
    } else {
      return kill(options.pid);
    }
  },
  /*
  
    `pid(options, callback)`
    ------------------------
    Retrieve a process pid. The pid value is return only if the command is running 
    otherwise it is set to false.
  
    `options`       , Object with the following properties:
    *   `detached`  , True if the child process is not attached to the current process
    *   `cmd`       , Command used to run the process, in case no pidfile is provided
    *   `pid`       , Pid to kill if not running in detached mode
    *   `pidfile`   , Path to the file storing the child pid
  
  
    `callback`      , Received arguments are:
    *   `err`       , Error if any
    *   `pid`       , Process pid. Pid is null if there are no pid file or 
                      if the process isn't running.
  */

  pid: function(options, callback) {
    if (options.attach != null) {
      console.log('Option attach was renamed to attached to be consistent with the new spawn option');
      options.detached = !options.attach;
    }
    if (!options.detached) {
      if (options.pid == null) {
        return new Error('Expect a pid property in attached mode');
      }
      return callback(null, options.pid);
    }
    return start_stop.file(options, function(err, file, exists) {
      if (!exists) {
        return callback(null, false);
      }
      return fs.readFile(options.pidfile, 'ascii', function(err, pid) {
        if (err) {
          return callback(err);
        }
        pid = pid.trim();
        return callback(null, pid);
      });
    });
  },
  /*
  
    `file(options, callback)`
    -------------------------
    Retrieve information relative to the file storing the pid. Retrieve 
    the path to the file storing the pid number and whether 
    it exists or not. Note, it will additionnaly enrich the `options`
    argument with a pidfile property unless already present.
  
    `options`       , Object with the following properties:
    *   `detached`  , True if the child process is not attached to the current process
    *   `cmd`       , Command used to run the process, in case no pidfile is provided
    *   `pid`       , Pid to kill in attach mode
    *   `pidfile`   , Path to the file storing the child pid
  
    `callback`      , Received arguments are:
    *   `err`       , Error if any
    *   `path`      , Path to the file storing the pid, null in attach mode
    *   `exists`    , True if the file is created
  */

  file: function(options, callback) {
    var createDir, pidFileExists, start;
    if (options.attach != null) {
      console.log('Option attach was renamed to detached to be consistent with the spawn API');
      options.detached = !options.attach;
    }
    if (!options.detached) {
      return callback(null, null, false);
    }
    start = function() {
      var dir, file;
      if (options.pidfile) {
        return pidFileExists();
      }
      dir = path.resolve(process.env['HOME'], '.node_shell');
      file = md5(options.cmd);
      options.pidfile = "" + dir + "/" + file + ".pid";
      return exists(dir, function(dirExists) {
        if (!dirExists) {
          return createDir();
        }
        return pidFileExists();
      });
    };
    createDir = function() {
      return fs.mkdir(dir, 0x1c0, function(err) {
        if (err) {
          return callback(err);
        }
        return pidFileExists();
      });
    };
    pidFileExists = function() {
      return exists(options.pidfile, function(pidFileExists) {
        return callback(null, options.pidfile, pidFileExists);
      });
    };
    return start();
  },
  /*
  
    `running(pid, callback)`
    ------------------------
  
    Test if a pid match a running process.
  
    `pid`           , Process id to test
  
    `callback`      , Received arguments are:
    *   `err`       , Error if any
    *   `running`   , True if pid match a running process
  */

  running: function(pid, callback) {
    return exec("ps -ef " + pid + " | grep -v PID", function(err, stdout, stderr) {
      if (err && err.code !== 1) {
        return callback(err);
      }
      return callback(null, !err);
    });
  }
};
