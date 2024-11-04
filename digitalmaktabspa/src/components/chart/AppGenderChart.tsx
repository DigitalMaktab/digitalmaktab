import React from "react";
import { Pie } from "react-chartjs-2";
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from "chart.js";
import { GenderChartProps } from "./properties/ChartProps";
import { useAppLocalizer } from "../../hooks/useAppLocalizer";

// Register necessary Chart.js components
ChartJS.register(ArcElement, Tooltip, Legend);

const AppGenderChart: React.FC<GenderChartProps> = ({
  totalMale,
  totalFemale,
}) => {
  const { t } = useAppLocalizer();

  const data = {
    labels: [t("gender.male.label"), t("gender.female.label")],
    datasets: [
      {
        label: t("genderChart.label"),
        data: [totalMale, totalFemale],
        backgroundColor: ["#36A2EB", "#FF6384"],
        hoverBackgroundColor: ["#36A2EB", "#FF6384"],
      },
    ],
  };

  return (
    <div style={{ maxWidth: "400px", margin: "0 auto" }}>
      <h3>{t("genderChart.label")}</h3>
      <Pie data={data} />
    </div>
  );
};

export default AppGenderChart;
