import pytest
import pandas as pd
from datetime import datetime
from ev_analysis import (
    sharpest_ev_percentage_increase,
    bev_vs_phev_trend,
    ev_total_correlation,
    truck_ev_penetration,
    ev_variance_by_state
)

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

def test_sharpest_ev_percentage_increase(sample_data):
    grouped = sample_data.groupby(["State", "County"])
    result = sharpest_ev_percentage_increase(grouped)
    assert isinstance(result, pd.DataFrame)
    assert "County" in result.columns
    assert result.iloc[0]["Change %"] > 0

def test_bev_vs_phev_trend(sample_data):
    result = bev_vs_phev_trend(sample_data)
    assert isinstance(result, pd.DataFrame)
    assert "BEV Share (%)" in result.columns
    assert result["BEV Share (%)"].between(0, 100).all()

def test_ev_total_correlation(sample_data):
    result = ev_total_correlation(sample_data)
    assert isinstance(result, float)
    assert -1 <= result <= 1

def test_truck_ev_penetration(sample_data):
    result = truck_ev_penetration(sample_data)
    assert isinstance(result, pd.DataFrame)
    assert (result["Percent Electric Vehicles"] >= 0).all()

def test_ev_variance_by_state(sample_data):
    result = ev_variance_by_state(sample_data)
    assert isinstance(result, pd.DataFrame)
    assert "EV % StdDev" in result.columns
