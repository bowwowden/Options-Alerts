from flask import Flask, render_template

app = Flask(__name__)

@app.route("/")
def index():
    alerts = [
        {"title": "Server CPU High", "detail": "Server1 at 95% usage"},
        {"title": "New Login", "detail": "Admin logged in from IP 123.45.67.89"},
    ]
    return render_template("index.html", alerts=alerts)

@app.route("/about")
def about():
    return render_template("alerts.html")

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)
