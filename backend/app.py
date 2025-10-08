from flask import Flask, render_template, send_from_directory

app = Flask(
    __name__,
    static_folder="../frontend",       # 👈 points to your frontend folder
    template_folder="../frontend/pages"
)

@app.route('/')
def start_page():
    return render_template('index.html')

@app.route('/upload')
def upload_page():
    return render_template('upload.html')

@app.route('/game')
def game_page():
    return render_template('game.html')


# Serve CSS, JS, and assets correctly
@app.route('/<path:filename>')
def serve_static_files(filename):
    return send_from_directory(app.static_folder, filename)

if __name__ == '__main__':
    app.run(debug=True)
