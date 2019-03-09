'use strict';
const events = require('events');
const fs = require('fs');
const path = require('path');

class Watcher extends events.EventEmitter {
  constructor(watchDir, processedDir, timeSinceChange, uploadDest,) {
    super();
    this.watchDir = watchDir;
    this.processedDir = processedDir;
    this.timeSinceChange = timeSinceChange; // in seconds
    this.uploadDest = uploadDest;

    this.newFiles = {};
    // Make sure directories exist
    if (!(fs.existsSync(this.watchDir))) {
      fs.mkdirSync(this.watchDir);
    }
    if (!(fs.existsSync(this.processedDir))) {
      fs.mkdirSync(this.processedDir);
    }
  }

  start() {
    // The watch function triggers the defined callback every time that something in
    // the directory changes (new file, deleted file, file modified).
    fs.watch(this.watchDir, (eventType, filename) => {
      // eventType is either 'rename' or 'change'.
      // filename is the file (or directory) that triggered the event.
      console.log(`Event '${eventType}' triggered for ${filename}`);
      const watchFile = `${this.watchDir}/${filename}`;
      if (!(fs.existsSync(watchFile))) {
        // File was moved/deleted and a rename event was triggered. We can ignore this one.
        delete this.newFiles[filename]
      } else if (!(watchFile in this.newFiles)) {
        console.log("Updating hash.");
        // Date.now() - the number of milliseconds elapsed since January 1, 1970.
        this.newFiles[watchFile] = Date.now();
      }
    });

    setInterval( () =>  {
      // Runs every ${timeSinceChange} seconds to check for Files that haven't changed in
      // ${timeSinceChange} seconds, which signifies that they are ready to be transferred to destination.
      for (let fname in this.newFiles) {
        const seconds = Math.round((Date.now() - this.newFiles[fname])/1000);
        if (seconds >= this.timeSinceChange) {
          this.emit("file_ready", fname);
          // Move file to processed Directory
          const renameTo = `${this.processedDir}/${path.basename(fname)}`;
          console.log(`Moving ${fname} to ${renameTo}.`);
          fs.rename(fname, `${renameTo}`, err => {
            if (err) throw err;
          });
          delete this.newFiles[fname];
        }
      }
    }, this.timeSinceChange * 1000)


  }
}

module.exports = Watcher;
