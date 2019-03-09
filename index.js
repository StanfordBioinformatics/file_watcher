'use strict';
const fs = require("fs");
const path = require('path');

/*
Nathaniel Watson
2019-03-08
nathankw@stanford.edu

A directory watcher that uploads new files in ${watchDir} to the destination ${uploadDest}.
Files that are new and haven't changed for ${timeSinceChange} seconds are eligible for 
being transferred to ${uploadDest}. Once the upload is complete, the local file is moved
from ${watchDir} to ${processedDir}.

Note that uploading files recursively from the specified ${watchDir} is not supported due to the
caveats specified at https://nodejs.org/docs/latest/api/fs.html#fs_caveats.

What needs to be added still is support for logging to files and support for uploading to various
destinations.
*/
const Watcher = require("./watcher");

const watcher = new Watcher("./watch", "./processed", 2, "some bucket");
watcher.on("file_ready", (filename) => {
  console.log(`Processing ${filename}`);
});

watcher.start();
