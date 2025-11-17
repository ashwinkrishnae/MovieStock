const additionalMovies = [
    { id: 101, title: "Drishyam", stock_price: 350 },
    { id: 102, title: "Thudarum", stock_price: 400 },
    { id: 103, title: "Baahubali", stock_price: 450 },
    { id: 104, title: "Master", stock_price: 300 },
    { id: 105, title: "Jawan", stock_price: 380 },
];

const OMDB_API_KEY = "thewdb"; // Demo key, replace with your own for production

let allMovies = []; // Global to store merged movie list

// List of frame classes for poster templates
const posterFrames = ["poster-frame", "poster-frame frame2", "poster-frame frame3", "poster-frame frame4", "poster-frame frame5"];

document.addEventListener("DOMContentLoaded", () => {
    fetchMovies();
});

async function predictMovieTitle(input) {
    if (!input.trim()) {
        showPrediction(""); // Clear suggestion
        return;
    }
    try {
        const res = await fetch(`/api/predict?title=${encodeURIComponent(input)}`);
        const data = await res.json();
        if (data.match && !data.exact) {
            showPrediction(`Did you mean: <b>${data.match}</b>?`);
        } else {
            showPrediction(""); // No suggestion needed
        }
    } catch (err) {
        showPrediction(""); // On error, clear suggestion
    }
}

function showPrediction(html) {
    let pred = document.getElementById("movie-prediction");
    if (!pred) {
        pred = document.createElement("div");
        pred.id = "movie-prediction";
        pred.style.color = "#e67e22";
        pred.style.margin = "5px 0 10px 0";
        const search = document.getElementById("movie-search");
        search.parentNode.insertBefore(pred, search.nextSibling);
    }
    pred.innerHTML = html;
}

// Enhance search bar to use prediction
function createSearchBar(container) {
    const searchBar = document.createElement("input");
    searchBar.type = "text";
    searchBar.id = "movie-search";
    searchBar.placeholder = "Search movies...";
    searchBar.addEventListener("input", (e) => {
        filterMovies(e.target.value);
        predictMovieTitle(e.target.value);
    });
    container.parentNode.insertBefore(searchBar, container);
}

// Fetch movie details (poster, director, cast, plot, year, etc.) from OMDb API
async function fetchMovieDetails(title) {
    try {
        const res = await fetch(`https://www.omdbapi.com/?apikey=${OMDB_API_KEY}&t=${encodeURIComponent(title)}`);
        const data = await res.json();
        return {
            poster: (data.Poster && data.Poster !== "N/A") ? data.Poster : "https://placehold.co/200x300?text=No+Image",
            director: data.Director || "N/A",
            cast: data.Actors || "N/A",
            plot: data.Plot || "N/A",
            year: data.Year || "N/A",
            genre: data.Genre || "N/A",
            runtime: data.Runtime || "N/A",
            imdbRating: data.imdbRating || "N/A"
        };
    } catch (e) {
        return {
            poster: "https://placehold.co/200x300?text=No+Image",
            director: "N/A",
            cast: "N/A",
            plot: "N/A",
            year: "N/A",
            genre: "N/A",
            runtime: "N/A",
            imdbRating: "N/A"
        };
    }
}

// Update add movie form to use fetchMovieDetails
function createAddMovieForm(container) {
    const form = document.createElement("form");
    form.id = "add-movie-form";
    form.innerHTML = `
        <input type="text" id="new-movie-title" placeholder="Movie Title" required>
        <input type="number" id="new-movie-price" placeholder="Stock Price" required min="1">
        <button type="submit">Add Movie</button>
    `;
    form.addEventListener("submit", async (e) => {
        e.preventDefault();
        const title = document.getElementById("new-movie-title").value.trim();
        const price = parseInt(document.getElementById("new-movie-price").value, 10);
        if (!title || !price) return;
        const newId = Math.max(0, ...allMovies.map(m => m.id)) + 1;
        const details = await fetchMovieDetails(title);
        const newMovie = { id: newId, title, stock_price: price, ...details };
        allMovies.unshift(newMovie); // Add at top
        renderMovies(allMovies);
        form.reset();
    });
    container.parentNode.insertBefore(form, container);
}

// Helper to get a random frame class
function getRandomFrame() {
    return posterFrames[Math.floor(Math.random() * posterFrames.length)];
}

// Add this function to create filter UI
function createFilterBar(container) {
    const filterDiv = document.createElement("div");
    filterDiv.id = "filter-bar";
    filterDiv.style.margin = "20px 0";
    filterDiv.innerHTML = `
        <select id="filter-year"><option value="">All Years</option></select>
        <select id="filter-genre"><option value="">All Genres</option></select>
        <select id="filter-language"><option value="">All Languages</option></select>
        <button id="apply-filter">Filter</button>
    `;
    container.parentNode.insertBefore(filterDiv, container);

    document.getElementById("apply-filter").onclick = () => {
        const year = document.getElementById("filter-year").value;
        const genre = document.getElementById("filter-genre").value;
        const language = document.getElementById("filter-language").value;
        filterMoviesAdvanced(year, genre, language);
    };
}

// Populate filter dropdowns based on movies
function populateFilterOptions(movies) {
    const years = new Set();
    const genres = new Set();
    const languages = new Set();
    movies.forEach(m => {
        if (m.year) years.add(m.year);
        if (m.genre) m.genre.split(",").forEach(g => genres.add(g.trim()));
        if (m.Language) m.Language.split(",").forEach(l => languages.add(l.trim()));
        else if (m.language) m.language.split(",").forEach(l => languages.add(l.trim()));
    });
    const yearSel = document.getElementById("filter-year");
    const genreSel = document.getElementById("filter-genre");
    const langSel = document.getElementById("filter-language");
    if (yearSel) {
        yearSel.innerHTML = `<option value="">All Years</option>` + Array.from(years).sort().map(y => `<option value="${y}">${y}</option>`).join("");
    }
    if (genreSel) {
        genreSel.innerHTML = `<option value="">All Genres</option>` + Array.from(genres).sort().map(g => `<option value="${g}">${g}</option>`).join("");
    }
    if (langSel) {
        langSel.innerHTML = `<option value="">All Languages</option>` + Array.from(languages).sort().map(l => `<option value="${l}">${l}</option>`).join("");
    }
}

// Advanced filter function
function filterMoviesAdvanced(year, genre, language) {
    let filtered = allMovies;
    if (year) filtered = filtered.filter(m => m.year === year);
    if (genre) filtered = filtered.filter(m => m.genre && m.genre.split(",").map(g => g.trim()).includes(genre));
    if (language) {
        filtered = filtered.filter(m => {
            const langs = (m.Language || m.language || "").split(",").map(l => l.trim());
            return langs.includes(language);
        });
    }
    renderMovies(filtered);
}

// Update renderMovies to use .movie-grid
async function renderMovies(movies) {
    const container = document.getElementById("movie-list");
    // Fetch details for movies that don't have them yet
    for (const movie of movies) {
        if (!movie.poster || !movie.director) {
            const details = await fetchMovieDetails(movie.title);
            Object.assign(movie, details);
        }
    }
    // Use a grid container
    container.innerHTML = "";
    let grid = document.getElementById("movie-grid");
    if (!grid) {
        grid = document.createElement("div");
        grid.id = "movie-grid";
        grid.className = "movie-grid";
        container.appendChild(grid);
    } else {
        grid.innerHTML = "";
    }
    movies.forEach((movie, idx) => {
        const card = document.createElement("div");
        card.className = "card";

        // Poster frame wrapper
        const frameDiv = document.createElement("div");
        let frameClass = getRandomFrame();
        frameDiv.className = frameClass;

        const img = document.createElement("img");
        img.src = movie.poster || "https://placehold.co/200x300?text=No+Image";
        img.alt = "Poster";
        img.className = "movie-poster";
        img.onerror = function() {
            this.onerror = null;
            this.src = "https://placehold.co/200x300?text=No+Image";
        };

        frameDiv.appendChild(img);

        // Dynamic frame changer
        setInterval(() => {
            let newFrame;
            do {
                newFrame = getRandomFrame();
            } while (newFrame === frameDiv.className);
            frameDiv.className = newFrame;
        }, 3000 + Math.random() * 2000 + idx * 100);

        const title = document.createElement("h2");
        title.textContent = movie.title;

        const price = document.createElement("p");
        price.textContent = `Price: ₹${movie.stock_price}`;

        // Movie details
        const detailsDiv = document.createElement("div");
        detailsDiv.style.textAlign = "left";
        detailsDiv.style.margin = "0 0 10px 0";
        detailsDiv.innerHTML = `
            <strong>Year:</strong> ${movie.year}<br>
            <strong>Genre:</strong> ${movie.genre}<br>
            <strong>Director:</strong> ${movie.director}<br>
            <strong>Cast:</strong> ${movie.cast}<br>
            <strong>Plot:</strong> ${movie.plot}<br>
            <strong>Runtime:</strong> ${movie.runtime}<br>
            <strong>IMDb:</strong> ${movie.imdbRating}
        `;

        const button = document.createElement("button");
        button.textContent = "Buy Share";
        button.onclick = () => buyStock(movie.id);

        const trailerBtn = document.createElement("button");
        trailerBtn.textContent = "Watch Trailer";
        trailerBtn.style.marginLeft = "10px";
        trailerBtn.onclick = () => {
            const query = encodeURIComponent(movie.title + " trailer");
            window.open(`https://www.youtube.com/results?search_query=${query}`, "_blank");
        };

        const deleteBtn = document.createElement("button");
        deleteBtn.textContent = "Delete";
        deleteBtn.style.marginLeft = "10px";
        deleteBtn.style.background = "#e53935";
        deleteBtn.style.color = "#fff";
        deleteBtn.onclick = () => {
            allMovies = allMovies.filter(m => m.id !== movie.id);
            renderMovies(allMovies);
        };

        const shares = document.createElement("p");
        shares.id = `share-count-${movie.id}`;
        shares.textContent = "Shares Owned: 0";

        card.appendChild(frameDiv);
        card.appendChild(title);
        card.appendChild(price);
        card.appendChild(detailsDiv);
        card.appendChild(button);
        card.appendChild(trailerBtn);
        card.appendChild(deleteBtn);
        card.appendChild(shares);

        grid.appendChild(card);
    });
    // Populate filter options after rendering
    populateFilterOptions(movies);
}

// In fetchMovies, add filter bar if not present
async function fetchMovies() {
    try {
        const res = await fetch("/api/movies");
        const fetchedMovies = await res.json();
        allMovies = [...fetchedMovies, ...additionalMovies];
        const container = document.getElementById("movie-list");

        if (!document.getElementById("movie-search")) {
            createSearchBar(container);
        }
        if (!document.getElementById("add-movie-form")) {
            createAddMovieForm(container);
        }
        if (!document.getElementById("filter-bar")) {
            createFilterBar(container);
        }

        await renderMovies(allMovies);
    } catch (err) {
        console.error("Failed to fetch movies:", err);
        allMovies = [...additionalMovies];
        const container = document.getElementById("movie-list");
        if (!document.getElementById("movie-search")) {
            createSearchBar(container);
        }
        if (!document.getElementById("add-movie-form")) {
            createAddMovieForm(container);
        }
        if (!document.getElementById("filter-bar")) {
            createFilterBar(container);
        }
        await renderMovies(allMovies);
    }
}

async function buyStock(movieId) {
    try {
        const res = await fetch(`/api/buy/${movieId}`, {
            method: "POST"
        });
        const data = await res.json();
        if (data.shares !== undefined) {
            document.getElementById(`share-count-${movieId}`).textContent = `Shares Owned: ${data.shares}`;
        } else {
            alert(data.error || "Something went wrong");
        }
    } catch (err) {
        alert("Failed to buy share: " + err.message);
    }
}
