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

print("HTML report generated successfully! Check 'ev_analysis_report.html'

def generate_html_report(q1_result, q2_result, q3_result, q4_result, q5_result):
    """Generate a comprehensive HTML report of EV analysis results"""
    
    html_content = f"""
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Electric Vehicle Analysis Report</title>
        <style>
            body {{
                font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                line-height: 1.6;
                margin: 0;
                padding: 20px;
                background-color: #f5f5f5;
            }}
            .container {{
                max-width: 1200px;
                margin: 0 auto;
                background-color: white;
                padding: 30px;
                border-radius: 10px;
                box-shadow: 0 0 20px rgba(0,0,0,0.1);
            }}
            h1 {{
                color: #2c3e50;
                text-align: center;
                border-bottom: 3px solid #3498db;
                padding-bottom: 10px;
                margin-bottom: 30px;
            }}
            h2 {{
                color: #34495e;
                margin-top: 40px;
                margin-bottom: 20px;
                padding-left: 10px;
                border-left: 4px solid #3498db;
            }}
            table {{
                width: 100%;
                border-collapse: collapse;
                margin: 20px 0;
                font-size: 14px;
            }}
            th, td {{
                border: 1px solid #ddd;
                padding: 12px;
                text-align: left;
            }}
            th {{
                background-color: #3498db;
                color: white;
                font-weight: bold;
            }}
            tr:nth-child(even) {{
                background-color: #f9f9f9;
            }}
            tr:hover {{
                background-color: #f5f5f5;
            }}
            .correlation-box {{
                background-color: #ecf0f1;
                padding: 20px;
                border-radius: 8px;
                margin: 20px 0;
                text-align: center;
                font-size: 18px;
                font-weight: bold;
                color: #2c3e50;
            }}
            .summary {{
                background-color: #e8f6f3;
                padding: 15px;
                border-radius: 5px;
                margin-bottom: 20px;
                border-left: 4px solid #27ae60;
            }}
            @media print {{
                body {{
                    background-color: white;
                }}
                .container {{
                    box-shadow: none;
                    padding: 0;
                }}
                h1 {{
                    page-break-after: avoid;
                }}
                h2 {{
                    page-break-after: avoid;
                }}
                table {{
                    page-break-inside: avoid;
                }}
            }}
        </style>
    </head>
    <body>
        <div class="container">
            <h1>Electric Vehicle Analysis Report</h1>
            
            <div class="summary">
                <strong>Report Summary:</strong> This comprehensive analysis examines electric vehicle adoption patterns, 
                trends, and penetration across different regions and vehicle types based on historical data.
            </div>

            <h2>Q1: Counties with Sharpest EV Percentage Increase</h2>
            <p>The following table shows the top 10 counties with the highest increase in electric vehicle percentage:</p>
            {q1_result.to_html(index=False, classes='data-table', table_id='q1-table')}

            <h2>Q2: BEV vs PHEV Market Share Trend</h2>
            <p>Evolution of Battery Electric Vehicles (BEV) market share over time:</p>
            {q2_result.to_html(index=False, classes='data-table', table_id='q2-table')}

            <h2>Q3: Correlation Between Total Vehicles and EV Percentage</h2>
            <div class="correlation-box">
                Correlation Coefficient: {q3_result:.4f}
            </div>
            <p>
                <strong>Interpretation:</strong> 
                {'Strong positive correlation' if q3_result > 0.7 else 
                 'Moderate positive correlation' if q3_result > 0.3 else
                 'Weak positive correlation' if q3_result > 0 else
                 'Negative correlation'} between total vehicle count and EV adoption percentage.
            </p>

            <h2>Q4: Top Truck EV Penetration Areas</h2>
            <p>Counties with highest electric vehicle penetration in the truck category:</p>
            {q4_result.to_html(index=False, classes='data-table', table_id='q4-table')}

            <h2>Q5: EV Adoption Variance by State</h2>
            <p>States ranked by variance in EV adoption rates across counties:</p>
            {q5_result.to_html(index=False, classes='data-table', table_id='q5-table')}

            <div style="margin-top: 50px; text-align: center; color: #7f8c8d; font-size: 12px;">
                <p>Report generated on {pd.Timestamp.now().strftime('%Y-%m-%d %H:%M:%S')}</p>
            </div>
        </div>
    </body>
    </html>
    """
    
    # Write HTML to file
    with open('ev_analysis_report.html', 'w', encoding='utf-8') as f:
        f.write(html_content)
    
    print("HTML report saved as 'ev_analysis_report.html'")
    print("To convert to PDF:")
    print("1. Open the HTML file in your browser")
    print("2. Use Ctrl+P (Cmd+P on Mac) and select 'Save as PDF'")
    print("3. Or use tools like wkhtmltopdf: wkhtmltopdf ev_analysis_report.html report.pdf")
