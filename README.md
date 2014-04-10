![JukePi](https://raw.github.com/meantimeit/jukepi/dev/build/img/landing_logo.png)

# JukePi

JukePi is a web client for the [Mopidy](http://mopidy.com) music server. Mopidy empowers you to create a custom music server that can connect to Spotify, play local mp3s and more.

In our office, we are using it with a Raspberry Pi as our Jukebox. Once this web client was created, the JukePi was born.

The application is a bespoke application with data models built upon Backbone. Even so, most models contain customisations to retrieve data from a Mopidy connection over [Websockets](http://www.w3.org/TR/2012/CR-websockets-20120920/). The websockets requirement is a core part of the Mopidy HTTP API and means that this client will be unable to function with IE9 and below. Special effort will be made to ensure that it functions well in all websockets enabled browsers.

## Installation Instructions

To install, you only need the build directory. The build directory contains the files needed by Mopidy. The index.html file will need to be modified with your custom configuration. If your Mopidy installation is fairly vanilla, you may remove the webSocketUrl option from the index.html file as it will not be necessary.

## Developer Instructions

To work on this project, you will need to have the node and npm binaries installed. Clone the project:

    git clone git://github.com/meantimeit/jukepi.git && cd jukepi && git submodule update --init --recursive

Once complete, you will need to install the necessary npm packages:

    npm install

During the course of development, you will need to re-create the build files. There are a number of scripts that will enable you to do this:

 * `npm run build-debug-js` - Create a debug build of the JS
 * `npm run build-debug-css` - Create a debug build of the CSS
 * `npm run build-debug` - Create a debug build of the JS and CSS
 * `npm run build-js` - Build the JS
 * `npm run build-css` - Build the CSS
 * `npm run build` - Build a release

## Screenshots

Coming soon™
