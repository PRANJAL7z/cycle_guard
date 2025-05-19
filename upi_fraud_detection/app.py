from flask import Flask, request, jsonify, send_from_directory
import json
import os

app = Flask(__name__, static_folder='.', static_url_path='')

DATA_FILE = 'data.json'

def load_data():
    if os.path.exists(DATA_FILE):
        with open(DATA_FILE, 'r') as f:
            return json.load(f)
    return {"users": [], "transactions": []}

def save_data(data):
    with open(DATA_FILE, 'w') as f:
        json.dump(data, f, indent=2)

@app.route('/')
def index():
    return app.send_static_file('index.html')

@app.route('/users', methods=['GET', 'POST'])
def users():
    data = load_data()
    if request.method == 'POST':
        users = request.json.get('users', [])
        data['users'] = users
        save_data(data)
        return jsonify({"status": "ok"})
    return jsonify(data['users'])

@app.route('/transactions', methods=['GET', 'POST'])
def transactions():
    data = load_data()
    if request.method == 'POST':
        transactions = request.json.get('transactions', [])
        data['transactions'] = transactions
        save_data(data)
        return jsonify({"status": "ok"})
    return jsonify(data['transactions'])

@app.route('/data', methods=['GET', 'POST'])
def all_data():
    if request.method == 'POST':
        data = request.json
        save_data(data)
        return jsonify({"status": "ok"})
    return jsonify(load_data())

if __name__ == '__main__':
    app.run(debug=True)