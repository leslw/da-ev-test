---

# ⚡ Electric Vehicle Population Analysis

Analyze electric vehicle (EV) adoption trends across U.S. counties using a modular Python app with Docker and automated testing.

---

## 📁 Project Structure


ev\_analysis\_project/
├── data/
│   └── Electric\_Vehicle\_Population\_Size\_History\_By\_County.csv
├── ev\_analysis.py         # Core analysis logic
├── main.py                # Main CLI app
├── test\_ev\_analysis.py    # Unit tests using pytest
├── requirements.txt       # Python dependencies
├── Dockerfile             # Container setup
└── docker-compose.yml     # Dev & test runner (optional)


---

## 🚀 Quickstart

### 🔧 1. Clone and Setup

bash
git clone <your-repo-url>
cd ev_analysis_project


### 📂 2. Add the Dataset

Download and place this file inside the `data/` folder:

* **Filename:** `Electric_Vehicle_Population_Size_History_By_County.csv`
* **Source:** [data.gov link](https://catalog.data.gov/dataset/electric-vehicle-population-size-history-by-county)

---

## 🐳 Running in Docker

### 🔨 Build the container

bash
docker build -t ev_analysis .

### ▶️ Run the analysis

bash
docker run --rm -v $(pwd):/app ev_analysis


### 📦 OR: Use `docker-compose`

bash
docker-compose run --rm ev_app

---

## 🧪 Running Tests

### ✅ With Docker Compose

bash
docker-compose run --rm ev_tests


### 🔍 Without Compose

bash
docker run --rm -v $(pwd):/app ev_analysis python main.py test


---

## 📊 What the Analysis Covers

This app answers five key questions:

1. **Which counties had the sharpest increase in EV percentage over time?**
2. **Is the share of BEVs increasing compared to PHEVs?**
3. **Is there a correlation between total vehicle count and EV percentage?**
4. **Which counties have the highest EV adoption in trucks?**
5. **Which states have the most uneven EV adoption across counties?**

---

## 🔬 Testing Coverage

The included `pytest` suite ensures:

* All functions return correct types and structures
* Edge cases like missing or sparse data are handled gracefully
* Calculations and trends are accurate

---

## 📌 Requirements


pandas
pytest


These are included in `requirements.txt` and installed during Docker build.

---

## 🛠️ Customize

You can extend this app by:

* Adding graphs (e.g., matplotlib or seaborn)
* Exporting results to CSV/JSON
* Adding new analysis questions in `ev_analysis.py`

---

## 📜 License

MIT License – Free to use, modify, and share.

---

## 🙌 Acknowledgments

* Data from [data.wa.gov](https://catalog.data.gov/)
* Docker and Python made it smooth 🚀

