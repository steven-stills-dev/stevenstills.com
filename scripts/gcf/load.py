"""Combine Elexon GSP Group Correction Factor files into one long half-hourly table."""
import sys
from pathlib import Path

import pandas as pd

SRC = Path(sys.argv[1] if len(sys.argv) > 1 else "/Users/steven.stills/dev/personal/gcf investigation/elexon downloads")
OUT = Path(__file__).parent / "gcf_hh.parquet"
RUN_ORDER = {"II": 0, "SF": 1, "R1": 2, "R2": 3, "R3": 4, "RF": 5, "DF": 6}


def read_xls(path):
    """Read one yearly GSPGCF workbook into long rows."""
    out = []
    for sheet in pd.ExcelFile(path, engine="xlrd").sheet_names[1:]:
        s = pd.read_excel(path, sheet_name=sheet, engine="xlrd")
        s = s.rename(columns={"Settlement Date": "settlement_date", "Run Type": "settlement_run_type"})
        s = s.melt(["settlement_date", "settlement_run_type"], var_name="settlement_period", value_name="gcf").dropna(subset=["gcf"])
        s["gsp_group_id"] = sheet.replace("GGCF ", "")
        out.append(s)
    d = pd.concat(out)
    d["settlement_period"] = d.settlement_period.astype(float).astype(int)
    d["gcf_type"] = "legacy_gcf"
    return d


def main():
    xls = pd.concat(read_xls(p) for p in sorted(SRC.glob("*_GSPGCF_*.xls")))
    csv = pd.read_csv(next(SRC.glob("*_GSPGCF.csv")))
    d = pd.concat([xls, csv], ignore_index=True)
    d["settlement_date"] = pd.to_datetime(d.settlement_date)
    d["gcf"] = pd.to_numeric(d.gcf, errors="coerce")
    # keep the most mature run per half hour; the CSV overlaps the 2024 workbook
    d["rank"] = d.settlement_run_type.map(RUN_ORDER)
    d = d.sort_values("rank").drop_duplicates(["settlement_date", "settlement_period", "gsp_group_id", "gcf_type"], keep="last")
    d.drop(columns="rank").sort_values(["gcf_type", "gsp_group_id", "settlement_date", "settlement_period"]).to_parquet(OUT, index=False)
    print(len(d), "rows ->", OUT)


if __name__ == "__main__":
    main()
