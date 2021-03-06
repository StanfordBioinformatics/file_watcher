/*
Nathaniel Watson
2019-03-08
nathankw@stanford.edu
*/

'use strict';
const events = require('events');
const fs = require('fs');
const path = require('path');

// Don't watch files with these suffixes. (.swp and .swx for Vim)
const ignoreFileExtensions = [".swp", ".swx"];

class Watcher extends events.EventEmitter {
  constructor(watchDir, timeSinceChange, recursive=false) {
    super();
    this.watchDir = watchDir;
    this.timeSinceChange = timeSinceChange; // in seconds
    this.recursive = recursive;

    this.newFiles = {};
    // Make sure directories exist
    if (!(fs.existsSync(this.watchDir))) {
      fs.mkdirSync(this.watchDir);
    }
    this.directoryWatchers = [];
  }

  checkFile(filepath) {
    if (!(fs.lstatSync(filepath).isDirectory())) {
      if (fs.existsSync(filepath)) {
        if (!(filepath in this.newFiles)) {
          const fileExt = path.extname(filepath);
          if (ignoreFileExtensions.indexOf(fileExt) === -1) { 
            this.newFiles[filepath] = Date.now();
          }
        }
      } else {
        // File was moved/deleted and a rename event was triggered. We can ignore this one.
        delete this.newFiles[filepath]
      }
    } else {
      if (this.recursive) { 
        console.log(`Setting up additional watch on directory ${filepath}.`);
        const anotherWatcher =  new Watcher(filepath, this.timeSinceChange, this.recursive);
        const outerThis = this;
        anotherWatcher.on("file_ready", (filename) => {
          outerThis.emit("file_ready", filename);
        });
        anotherWatcher.start();
        this.directoryWatchers.push(anotherWatcher);
      } 
    }
  }

  start() {
    // Initialize this.newFiles.
    const files_present = fs.readdirSync(this.watchDir);
    files_present.forEach(filename => {
        const filepath = `${this.watchDir}/${filename}`;
        this.checkFile(filepath);
    });
    // The watch function triggers the defined callback every time that something in
    // the directory changes (new file, deleted file, file modified).
    fs.watch(this.watchDir, (eventType, filename) => {
      // eventType is either 'rename' or 'change'.
      // filename is the file (or directory) that triggered the event.
      console.log(`Event '${eventType}' triggered for ${filename}`);
      const watchFile = `${this.watchDir}/${filename}`;
      this.checkFile(watchFile);
    });

    setInterval( () =>  {
      // Runs every ${timeSinceChange} seconds to check for Files that haven't changed in
      // ${timeSinceChange} seconds, which signifies that they are ready to be transferred to destination.
      for (let fname in this.newFiles) {
        const val = this.newFiles[fname];
        if (val === "") {
          continue;
        }
        const seconds = Math.round((Date.now() - this.newFiles[fname])/1000);
        if (seconds >= this.timeSinceChange) {
          // Ignore this file in the future. It is expected that the client will do what they
          // please with this file (i.e. move it to a processed folder or delete it after handling
          // the file_ready event that is emitted below.
          this.newFiles[fname] = "";
          this.emit("file_ready", fname);
          // Move file to processed Directory
          //const renameTo = `${this.processedDir}/${path.basename(fname)}`;
          //console.log(`Moving ${fname} to ${renameTo}.`);
          //fs.rename(fname, `${renameTo}`, err => {
          //  if (err) throw err;
          //});
          //delete this.newFiles[fname];
        }
      }
    }, this.timeSinceChange * 1000)


  }
}

module.exports = Watcher;
