from __future__ import unicode_literals

import os, json
import tornado.web

from mopidy import config, ext


__version__ = '1.0.7'


class Extension(ext.Extension):

    dist_name = 'Mopidy-jukePi'
    ext_name = 'jukepi'
    version = __version__

    def get_default_config(self):
        conf_file = os.path.join(os.path.dirname(__file__), 'ext.conf')
        return config.read(conf_file)

    def get_config_schema(self):
        schema = super(Extension, self).get_config_schema()
        schema['websocket_url'] = config.String(True)
        schema['lastfm_api_key'] = config.String(True)
        schema['lastfm_api_secret'] = config.String(True)
        schema['custom_scripts'] = config.List(True)
        schema['jukepi_callback'] = config.String(True)
        schema['search_uris'] = config.List(True)
        return schema

    def setup(self, registry):
        registry.add('http:app', {
          'name': self.ext_name,
          'factory': jukepi_app_factory
        })

def jukepi_app_factory(config, core):
    return [
        ('/', JukePiRequestHandler, {'core': core, 'config': config}),
        (r'/(.*)', tornado.web.StaticFileHandler, { 'path': os.path.join(os.path.dirname(__file__), 'static') })
    ]

def serialize_config(config):
    serialized = {}
    if config.get('websocket_url'):
        serialized['mopidyWebSocketUrl'] = config.get('websocket_url')
    if config.get('lastfm_api_key'):
        serialized['lastfm'] = {}
        serialized['lastfm']['key'] = config.get('lastfm_api_key')
        serialized['lastfm']['secret'] = config.get('lastfm_api_secret')
    serialized['searchUris'] = config.get('search_uris')
    return json.dumps(serialized)

class JukePiRequestHandler(tornado.web.RequestHandler):
    def initialize(self, core, config):
        self.core = core
        self.config = config
        self.js_settings = serialize_config(config.get('jukepi'))

    def get(self):
        self.render('templates/index.html', **{
            'js_settings': self.js_settings,
            'custom_scripts': self.config.get('jukepi').get('custom_scripts'),
            'jukepi_callback': self.config.get('jukepi').get('jukepi_callback')
        })

