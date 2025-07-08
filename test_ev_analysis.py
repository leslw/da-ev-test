import pytest
import pandas as pd
import os
from datetime import datetime
from ev_analysis import (
    preprocess_ev_data,
    sharpest_ev_percentage_increase,
    bev_vs_phev_trend,
    ev_total_correlation,
    truck_ev_penetration,
    ev_variance_by_state
)

# Fixtures & Sample Data

@pytest.fixture
def sample_data():
    return pd.DataFrame({
        "Date": pd.to_datetime([
            "2021-01-01", "2022-01-01", "2023-01-01",
            "2021-01-01", "2022-01-01", "2023-01-01"
        ]),
        "County": ["A", "A", "A", "B", "B", "B"],
        "State": ["X", "X", "X", "X", "X", "X"],
        "Vehicle Primary Use": ["Passenger", "Passenger", "Passenger", "Truck", "Truck", "Truck"],
        "Battery Electric Vehicles (BEVs)": [10, 20, 30, 5, 10, 15],
        "Plug-In Hybrid Electric Vehicles (PHEVs)": [5, 10, 15, 2, 5, 8],
        "Electric Vehicle (EV) Total": [15, 30, 45, 7, 15, 23],
        "Non-Electric Vehicle Total": [100, 105, 110, 80, 85, 90],
        "Total Vehicles": [115, 135, 155, 87, 100, 113],
        "Percent Electric Vehicles": [13.0, 22.22, 29.03, 8.05, 15.0, 20.35],
    })

# Function Tests

def test_preprocess_ev_data(sample_data):
    df = sample_data.copy()
    df["Date"] = df["Date"].astype("object")  # Ensure compatible dtype
    df.loc[0, "Date"] = "invalid"
    processed = preprocess_ev_data(df)
    assert processed["Date"].isnull().sum() == 0
    assert processed.shape[0] < df.shape[0]  # Should drop the bad row

def test_sharpest_ev_percentage_increase(sample_data):
    grouped = sample_data.groupby(["State", "County"])
    result = sharpest_ev_percentage_increase(grouped)
    assert isinstance(result, pd.DataFrame)
    assert "Change %" in result.columns
    assert not result.empty

def test_bev_vs_phev_trend(sample_data):
    result = bev_vs_phev_trend(sample_data)
    assert isinstance(result, pd.DataFrame)
    assert "BEV Share (%)" in result.columns
    assert result["BEV Share (%)"].between(0, 100).all()

def test_ev_total_correlation(sample_data):
    result = ev_total_correlation(sample_data)
    assert isinstance(result, float)
    assert -1.0 <= result <= 1.0

def test_truck_ev_penetration(sample_data):
    result = truck_ev_penetration(sample_data)
    assert isinstance(result, pd.DataFrame)
    assert "Percent Electric Vehicles" in result.columns

def test_ev_variance_by_state(sample_data):
    result = ev_variance_by_state(sample_data)
    assert isinstance(result, pd.DataFrame)
    assert "EV % StdDev" in result.columns

# HTML Report Generation Test

def test_html_report_generation(tmp_path):
    results = {
        'Q1': pd.DataFrame({"County": ["A"], "Change %": [10.0]}),
        'Q2': pd.DataFrame({"Date": [datetime.today()], "BEV Share (%)": [60.0]}),
        'Q3': 0.12,
        'Q4': pd.DataFrame({"County": ["B"], "Percent Electric Vehicles": [20.35]}),
        'Q5': pd.DataFrame({"State": ["X"], "EV % StdDev": [5.0]})
    }

    html = "<html><body><h1>Test Report</h1>"
    for q, res in results.items():
        html += f"<h2>{q}</h2>"
        if isinstance(res, pd.DataFrame):
            html += res.to_html()
        else:
            html += f"<p>{res}</p>"
    html += "</body></html>"

    report_path = tmp_path / "report.html"
    with open(report_path, "w") as f:
        f.write(html)

    assert report_path.exists()
    content = report_path.read_text()
    assert "<h1>Test Report</h1>" in content
    assert "<table" in content
