import React from "react";
import { Pie } from "react-chartjs-2";
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
  ChartOptions,
  TooltipItem,
} from "chart.js";
import { useAppLocalizer } from "../../hooks/useAppLocalizer";
import { PieChartProps } from "./properties/PieChartProps";

// Register necessary Chart.js components
ChartJS.register(ArcElement, Tooltip, Legend);

const AppPieChart: React.FC<PieChartProps> = ({
  label,
  labels,
  dataValues,
  backgroundColors = ["#36A2EB", "#FF6384", "#FFCE56", "#4BC0C0"],
}) => {
  const { formatNumber } = useAppLocalizer();

  const data = {
    labels,
    datasets: [
      {
        label,
        data: dataValues,
        backgroundColor: backgroundColors,
        hoverBackgroundColor: backgroundColors,
      },
    ],
  };

  const options: ChartOptions<"pie"> = {
    plugins: {
      legend: {
        labels: {
          usePointStyle: false,
          generateLabels: (chart) => {
            return chart.data.labels!.map((label, index) => {
              const value = chart.data.datasets[0].data[index] as number;
              const localizedValue = formatNumber(value);
              const bgColor = chart.data.datasets[0]
                .backgroundColor as string[];

              return {
                text: `${label}: ${localizedValue}`,
                fillStyle: bgColor[index],
                hidden: !chart.isDatasetVisible(0),
              };
            });
          },
        },
      },
      tooltip: {
        callbacks: {
          label: (tooltipItem: TooltipItem<"pie">) => {
            const value = tooltipItem.raw as number;
            const localizedValue = formatNumber(value);
            return `${tooltipItem.label}: ${localizedValue}`;
          },
        },
      },
    },
  };

  return (
    <div style={{ maxWidth: "400px", margin: "0 auto" }}>
      <h3>{label}</h3>
      <Pie data={data} options={options} />
    </div>
  );
};

export default AppPieChart;
