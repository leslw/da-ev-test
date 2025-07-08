# path/to/main.py
import pandas as pd
from ev_analysis import *

df = pd.read_csv("data/Electric_Vehicle_Population_Size_History_By_County.csv")
df = preprocess_ev_data(df)
grouped = df.groupby(["State", "County"])

# Collect results
results = {}
results['Q1'] = sharpest_ev_percentage_increase(grouped)
results['Q2'] = bev_vs_phev_trend(df)
results['Q3'] = ev_total_correlation(df)
results['Q4'] = truck_ev_penetration(df)
results['Q5'] = ev_variance_by_state(df)

# Generate HTML report
html = """
<!DOCTYPE html>
<html>
<head>
<title>EV Analysis Report</title>
<style>
table { border-collapse: collapse; }
th, td { border: 1px solid black; padding: 5px; }
</style>
</head>
<body>
<h1>EV Analysis Report</h1>
"""

for q, res in results.items():
    html += f"<h2>{q}</h2>"
    if isinstance(res, pd.DataFrame):
        html += res.to_html()
    else:
        html += f"<p>{res}</p>"

html += "</body></html>"

# Save to file
with open("report.html", "w") as f:
    f.write(html)

print("HTML report generated as 'report.html'")