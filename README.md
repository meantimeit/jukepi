![JukePi](https://raw.github.com/meantimeit/jukepi/dev/build/img/loading-logo.jpg)

# JukePi

JukePi is a web client for the [Mopidy](http://mopidy.com) music server. Mopidy empowers you to create a custom music server that can connect to Spotify, play local mp3s and more.

In our office, we are using it with a Raspberry Pi as our Jukebox. Once this web client was created, the JukePi was born.

The application is a bespoke application with data models built upon Backbone. Even so, most models contain customisations to retrieve data from a Mopidy connection over [Websockets](http://www.w3.org/TR/2012/CR-websockets-20120920/). The websockets requirement is a core part of the Mopidy HTTP API and means that this client will be unable to function with IE9 and below. Special effort will be made to ensure that it functions well in all websockets enabled browsers.

## Installation Instructions

At present, this web application requires a number of steps to get started, including git submodules, grunt and several npm installs. You will need node to get started with this project. In an up-coming release, I will move many of the git submodules over to npm modules, use browserify and create a single installation command to take care of all of the packages.

Until then:

Clone the project like so:

    git clone git://github.com/meantimeit/jukepi.git && cd jukepi && git submodule update --init --recursive

Once complete, you will need to install the npm modules:

    npm install

Then you'll need to build Zepto (I do apologise that you'll need ruby installed too):

    cd js/zepto
    gem install uglifier
    rake

Then you will need to run Grunt to ensure that all of the jukepi assets are built

    cd ../..
    grunt

At which point, you will have a build directory that contains everything that you need. Update your Mopidy configuration to point to the build directory or move the contents of the build directory to your web client location.

Once we pass the alpha stage of development, official releases will become available to download from the project website (not yet built!) so that you can skip all of the ceremony.

## Screenshots

Coming soon™

## Javascript Libraries

The JukePi application runs on Javascript and makes use of a number of libraries which I would like to acknowledge:

* [Backbone](http://backbonejs.org) [(Github)](https://github.com/documentcloud/backbone): a bare bones application scaffolding that provided the starting point for the rest of the project.
* [Zepto](http://zeptojs.com) [(Github)](https://github.com/madrobby/zepto): a jQuery compatible library that Backbone uses to perform DOM manipulation.
* [Grunt](http://gruntjs.com) [(Github)](https://github.com/gruntjs): a Javascript task runner that allows the JukePi source to be kept in a modular format and then automatically built and packaged for deployment. A number of plugins are used to compile the Handlebars templates and Less stylesheets
* [Handlebars](http://handlebarsjs.com) [(Github)](https://github.com/wycats/handlebars.js): a Javascript template library that the application uses to render reusable templates for the various types of information (albums, tracks, artists) and also to generally render the necessary pages of the application.
* [LESS](http://lesscss.org) [(Github)](https://github.com/cloudhead/less.js): A dynamic extension of CSS that allows for the use of special features to aid CSS organisation and enhancement.
