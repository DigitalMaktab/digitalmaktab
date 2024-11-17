export interface GenderChartProps {
  totalMale: number;
  totalFemale: number;
  label: string;
  labels: string[];
}

export interface ChartProps {
  label: string; // Title of the chart
  labels: string[]; // Array of labels for each segment (e.g., ["Male", "Female"] or ["Option A", "Option B", "Option C"])
  dataValues: number[]; // Array of values corresponding to each label (e.g., [50, 50] or [30, 20, 50])
  backgroundColors?: string[]; // Optional array of background colors for each segment
  displayLegends?: boolean;
}

export interface BarChartProps extends ChartProps {
  xAxisLabel: string;
  yAxisLabel: string;
}
