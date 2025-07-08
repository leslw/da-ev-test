import pandas as pd
from ev_analysis import *


def generate_html_report(results: dict, output_path: str = "report.html"):
    """Generates a formatted HTML report from analysis results."""
    styles = """
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        h1 { color: #2c3e50; }
        h2 { background-color: #ecf0f1; padding: 10px; border-left: 5px solid #3498db; }
        table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
        th, td { border: 1px solid #bdc3c7; padding: 8px; text-align: left; }
        th { background-color: #3498db; color: white; }
    </style>
    """
    
    html = f"""
    <!DOCTYPE html>
    <html>
    <head>
    <meta charset='utf-8'>
    <title>EV Analysis Report</title>
    {styles}
    </head>
    <body>
    <h1>Electric Vehicle (EV) Analysis Report</h1>
    """

    titles = {
        "Q1": "Counties with Sharpest Increase in EV Adoption",
        "Q2": "Trend of BEV Share Over Time",
        "Q3": "Correlation Between Total Vehicles and EV Percentage",
        "Q4": "Top Counties for Truck EV Penetration",
        "Q5": "EV Adoption Variance Across States"
    }

    for key, result in results.items():
        html += f"<h2>{titles.get(key, key)}</h2>"
        if isinstance(result, pd.DataFrame):
            html += result.to_html(index=False)
        else:
            html += f"<p><strong>Value:</strong> {result:.4f}</p>"

    html += "</body></html>"

    with open(output_path, "w", encoding="utf-8") as f:
        f.write(html)

    print(f"HTML report generated: {output_path}")


if __name__ == "__main__":
    df = pd.read_csv("data/Electric_Vehicle_Population_Size_History_By_County.csv")
    df = preprocess_ev_data(df)
    grouped = df.groupby(["State", "County"])

    # Collect results
    results = {
        'Q1': sharpest_ev_percentage_increase(grouped),
        'Q2': bev_vs_phev_trend(df),
        'Q3': ev_total_correlation(df),
        'Q4': truck_ev_penetration(df),
        'Q5': ev_variance_by_state(df)
    }

    # Generate report
    generate_html_report(results)
