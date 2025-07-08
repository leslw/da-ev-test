import pandas as pd
from ev_analysis import *

df = pd.read_csv("data/Electric_Vehicle_Population_Size_History_By_County.csv")
df = preprocess_ev_data(df)
grouped = df.groupby(["State", "County"])

print("Q1: Sharpest EV % Increase\n", sharpest_ev_percentage_increase(grouped))
print("\nQ2: BEV vs PHEV Trend\n", bev_vs_phev_trend(df))
print("\nQ3: Correlation Between Total Vehicles and EV %:\n", ev_total_correlation(df))
print("\nQ4: Truck EV Penetration\n", truck_ev_penetration(df))
print("\nQ5: EV Variance by State\n", ev_variance_by_state(df))
