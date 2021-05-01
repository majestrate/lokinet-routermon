from datetime import timedelta
import json
from flask import Flask, render_template
from flask_socketio import SocketIO

import gevent
import gevent.monkey

gevent.monkey.patch_all()

from pyoxenmq import OxenMQ as MQ

import config

app = Flask(__name__)
app.config['SECRET_KEY'] = config.api_secret
socketio = SocketIO(app, cors_allowed_origins=config.allowed_origins)

mq = MQ()
mq.max_message_size = 1024 * 1024 * 10

conn = None


def filter_link_data(link_data):
    """
    remove non public peers from link data
    """
    if len(link_data['inbound']) > 0:
        established_sessions = []
        for peer in link_data['inbound'][0]['sessions']['established']:
            if not peer['remoteRC']['publicRouter']:
                continue
            established_sessions.append(peer)
        link_data['inbound'][0]['sessions']['established'] = established_sessions
    return link_data

def update_all():
    global conn
    if conn:
        try:
            req = mq.request_future(conn, "llarp.status")
            jdata = json.loads(req.get()[0])
            socketio.emit("update", filter_link_data(jdata['result']['links']))
        except Exception as ex:
            print("error: {}".format(ex))


def loop():
    while True:
        gevent.sleep(1)
        update_all()

gevent.Greenlet.spawn(loop)

@app.route("/")
def index():
    return render_template("index.html")

mq.start()
print('connecting to lokinet via {}'.format(config.lokinet_endpoint))
conn = mq.connect_remote(config.lokinet_endpoint)
print("binding webserver to port {}".format(config.port))
socketio.run(app, port=config.port)
