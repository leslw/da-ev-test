import pandas as pd
from ev_analysis import *

df = pd.read_csv("data/Electric_Vehicle_Population_Size_History_By_County.csv")
df = preprocess_ev_data(df)
grouped = df.groupby(["State", "County"])

# Generate analysis results
q1_result = sharpest_ev_percentage_increase(grouped)
q2_result = bev_vs_phev_trend(df)
q3_result = ev_total_correlation(df)
q4_result = truck_ev_penetration(df)
q5_result = ev_variance_by_state(df)

# Generate HTML report
generate_html_report(q1_result, q2_result, q3_result, q4_result, q5_result)

print("HTML report generated successfully! Check 'ev_analysis_report.html'")