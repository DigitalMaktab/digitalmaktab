import React from "react";
import { Bar } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Tooltip,
  Legend,
  ChartOptions,
  TooltipItem,
} from "chart.js";
import { useAppLocalizer } from "../../hooks/useAppLocalizer";
import { BarChartProps } from "./properties/ChartProps";

// Register necessary Chart.js components
ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend);

const generateColorVariants = (baseColor: string, count: number): string[] => {
  const colors = [];
  for (let i = 0; i < count; i++) {
    const factor = 1 - i * 0.1; // Decrease brightness gradually
    const color = `rgba(67, 185, 178, ${factor})`; // Adjust opacity
    colors.push(color);
  }
  return colors;
};

const AppBarChart: React.FC<BarChartProps> = ({
  label,
  labels,
  dataValues,
  xAxisLabel,
  yAxisLabel,
  displayLegends = true,
}) => {
  const { formatNumber } = useAppLocalizer();
  const backgroundColors = generateColorVariants("#43B9B2", labels.length);

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

  const options: ChartOptions<"bar"> = {
    plugins: {
      legend: {
        display: displayLegends,
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
          label: (tooltipItem: TooltipItem<"bar">) => {
            const value = tooltipItem.raw as number;
            const localizedValue = formatNumber(value);
            return `${tooltipItem.label}: ${localizedValue}`;
          },
        },
      },
    },
    responsive: true,
    scales: {
      x: {
        title: {
          display: true,
          text: xAxisLabel,
          font: {
            size: 18,
            weight: "lighter",
          },
        },
      },
      y: {
        title: {
          display: true,
          text: yAxisLabel,
          font: {
            size: 18,
            weight: "lighter",
          },
        },
        beginAtZero: true,
      },
    },
  };

  return (
    <div style={{ maxWidth: "600px", margin: "0 auto" }}>
      <h3>{label}</h3>
      <Bar data={data} options={options} />
    </div>
  );
};

export default AppBarChart;
