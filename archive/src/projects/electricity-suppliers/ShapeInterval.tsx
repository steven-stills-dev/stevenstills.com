import Box from "../../components/Box";
import DataTable from "../../components/charts/DataTable";
import data from "./interval.json";

const COLUMNS = [
  { key: "supplier", label: "Supplier" },
  { key: "sum", label: "Sum-25", digits: 2, tint: true },
  { key: "sum_lo", label: "Sum low", digits: 2 },
  { key: "sum_hi", label: "Sum high", digits: 2 },
  { key: "win", label: "Win-25", digits: 2, tint: true },
  { key: "win_lo", label: "Win low", digits: 2 },
  { key: "win_hi", label: "Win high", digits: 2 },
];

/** Each supplier's shape cost against the average shape with its 90% resampling range, sortable. */
export default function ShapeInterval() {
  return (
    <Box title="Shape Cost Range by Supplier" sub="£/MWh" className="es-box">
      <DataTable columns={COLUMNS} rows={data.rows} sortBy="win"
        caption="Shape cost against the average shape in summer 2025 and winter 2025, with the low and high ends of a 90% range from resampling weeks of price days" />
    </Box>
  );
}
