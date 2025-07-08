import pandas as pd

def preprocess_ev_data(df):
    df = df.copy()
    df["Date"] = pd.to_datetime(df["Date"], errors='coerce')
    df = df.dropna(subset=["County", "State", "Date"])
    df.sort_values(by=["County", "State", "Date"], inplace=True)
    return df

def sharpest_ev_percentage_increase(grouped):
    changes = []
    for (state, county), group in grouped:
        if len(group) < 2:
            continue
        start = group.iloc[0]["Percent Electric Vehicles"]
        end = group.iloc[-1]["Percent Electric Vehicles"]
        change = end - start
        changes.append((state, county, start, end, change))
    sorted_changes = sorted(changes, key=lambda x: x[4], reverse=True)
    return pd.DataFrame(sorted_changes[:10], columns=["State", "County", "Start %", "End %", "Change %"])

def bev_vs_phev_trend(df):
    trend = df.groupby("Date")[[
        "Battery Electric Vehicles (BEVs)", 
        "Plug-In Hybrid Electric Vehicles (PHEVs)"
    ]].sum()
    trend["BEV Share (%)"] = 100 * trend["Battery Electric Vehicles (BEVs)"] / (
        trend["Battery Electric Vehicles (BEVs)"] + trend["Plug-In Hybrid Electric Vehicles (PHEVs)"])
    return trend[["BEV Share (%)"]].reset_index()

def ev_total_correlation(df):
    return df[["Total Vehicles", "Percent Electric Vehicles"]].corr().iloc[0, 1]

def truck_ev_penetration(df):
    trucks = df[df["Vehicle Primary Use"].str.lower() == "truck"]
    top_trucks = trucks.sort_values(by="Percent Electric Vehicles", ascending=False).head(10)
    return top_trucks[[
        "Date", "State", "County", "Percent Electric Vehicles",
        "Electric Vehicle (EV) Total", "Total Vehicles"
    ]]

def ev_variance_by_state(df):
    latest_date = df["Date"].max()
    latest_df = df[df["Date"] == latest_date]
    var_by_state = latest_df.groupby("State")["Percent Electric Vehicles"].agg(['mean', 'std']).reset_index()
    var_by_state.rename(columns={'std': 'EV % StdDev', 'mean': 'EV % Mean'}, inplace=True)
    return var_by_state.sort_values(by="EV % StdDev", ascending=False)
