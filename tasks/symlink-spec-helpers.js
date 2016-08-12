// This task creates a symlink to spec-helpers in the node_modules folder so
// that in our tests we can just require "spec-helpers".
const fs = require( "fs" );
const dstpath = "node_modules/spec-helpers"; // the symlink
const srcpath = "../spec-helpers"; // the src path relative to node_modules
fs.exists( dstpath, function( exists ) {
	// create the link only if it does not already exist
	if ( !exists ) {
		fs.symlinkSync( srcpath, dstpath, "dir" );
	}
} );
