from fastapi import FastAPI, Request, Query
from fastapi.responses import HTMLResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from urllib.parse import quote_plus
import difflib
import httpx
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()
GOOGLE_API_KEY = os.getenv("GOOGLE_API_KEY")
GOOGLE_CX = os.getenv("GOOGLE_CX")

app = FastAPI()

# Static and templates
app.mount("/static", StaticFiles(directory="static"), name="static")
templates = Jinja2Templates(directory="templates")

# Movie Data
movies = [
    {"id": 1, "title": "Thangalaan", "stock_price": 150, "poster": "/static/posters/thangalaan.jpg"},
    {"id": 2, "title": "Lucky Baskhar", "stock_price": 220, "poster": ""},
    {"id": 3, "title": "Salaar", "stock_price": 180, "poster": "/static/posters/salaar.jpg"},
]

# Shares
user_shares = {str(movie["id"]): 0 for movie in movies}

# Fuzzy matcher
def get_closest_movie_title(query: str):
    titles = [movie["title"] for movie in movies]
    matches = difflib.get_close_matches(query, titles, n=1, cutoff=0.7)
    return matches[0] if matches else None

# Google Image Search
async def get_google_image(query: str) -> str:
    url = "https://www.googleapis.com/customsearch/v1"
    params = {
        "q": query,
        "searchType": "image",
        "num": 1,
        "key": GOOGLE_API_KEY,
        "cx": GOOGLE_CX,
    }
    async with httpx.AsyncClient() as client:
        response = await client.get(url, params=params)
        if response.status_code == 200:
            data = response.json()
            items = data.get("items")
            if items:
                return items[0]["link"]
    return "https://via.placeholder.com/200x250?text=No+Image"

@app.get("/", response_class=HTMLResponse)
async def homepage(request: Request):
    return templates.TemplateResponse("index.html", {"request": request})

@app.get("/api/movies")
async def get_movies():
    updated_movies = []
    for movie in movies:
        poster_url = movie["poster"]
        if not poster_url:
            query = f"{movie['title']} movie poster"
            poster_url = await get_google_image(query)

        updated_movies.append({
            "id": movie["id"],
            "title": movie["title"],
            "stock_price": movie["stock_price"],
            "poster": poster_url
        })
    return JSONResponse(content=updated_movies)

@app.post("/api/buy/{movie_id}")
async def buy_stock(movie_id: int):
    movie_id_str = str(movie_id)
    if movie_id_str in user_shares:
        user_shares[movie_id_str] += 1
        return {"message": "Stock purchased!", "shares": user_shares[movie_id_str]}
    return {"error": "Movie not found"}

@app.get("/api/predict")
async def predict_movie(title: str = Query(..., description="Movie title to match")):
    exact = next((movie for movie in movies if movie["title"].lower() == title.lower()), None)
    if exact:
        return {"match": exact["title"], "exact": True}
    closest = get_closest_movie_title(title)
    if closest:
        return {"match": closest, "exact": False}
    return {"error": "No similar movie found"}
