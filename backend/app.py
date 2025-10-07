from flask import Flask, render_template
import os

# IMPORTANT:
# template_folder points to frontend/pages so render_template('index.html')
# will load frontend/pages/index.html
# static_folder points to frontend so static files like /css/output.css or /js/startScene.js
# will be served from the frontend directory.
BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
FRONTEND_DIR = os.path.join(BASE_DIR, 'frontend')

app = Flask(
    __name__,
    template_folder=os.path.join(FRONTEND_DIR, 'pages'),
    static_folder=FRONTEND_DIR
)

@app.route('/')
def start_page():
    # Renders frontend/pages/index.html
    return render_template('index.html')


if __name__ == '__main__':
    # Run in debug mode for local testing
    app.run(host='127.0.0.1', port=5000, debug=True)
