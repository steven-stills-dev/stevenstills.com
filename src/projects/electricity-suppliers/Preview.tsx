import ShapeExplorer from "./ShapeExplorer";
import "./electricity-suppliers.css";

/** Home preview: the summer demand shape for the default supplier, without the picker. */
export default function Preview() {
  return <ShapeExplorer only="Sum" />;
}
