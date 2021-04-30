from datetime import timedelta
import json
from flask import Flask, render_template
from flask_socketio import SocketIO, emit, send

import gevent

from pyoxenmq import OxenMQ as MQ

import config

app = Flask(__name__)
app.config['SECRET_KEY'] = config.api_secret
socketio = SocketIO(app)

mq = MQ()
mq.max_message_size = 1024 * 1024 * 10

conn = None

def update_all():
    global conn
    if conn:
        try:
            req = mq.request_future(conn, "llarp.status")
            jdata = json.loads(req.get()[0])
            socketio.emit("update", jdata['result']['links'])
        except Exception as ex:
            print("error: {}".format(ex))

mq.add_timer(timedelta(seconds=1), lambda : update_all())

@app.route("/")
def index():
    return render_template("index.html")

mq.start()
conn = mq.connect_remote(config.lokinet_endpoint)
print('connected to lokinet')
socketio.run(app, port=config.port)