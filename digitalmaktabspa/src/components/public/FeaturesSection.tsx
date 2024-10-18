import React, { useMemo } from "react";
import { useTranslation } from "react-i18next";
import AppPublicFeatureCard from "./AppPublicFeatureCard";
import * as PIIcons from "react-icons/pi";
import * as LiaIcons from "react-icons/lia";
import * as SIIcons from "react-icons/si";
import * as LuIcons from "react-icons/lu";
import * as RiIcons from "react-icons/ri";
import * as BiIcons from "react-icons/bi";
import * as MdIcons from "react-icons/md";
import { FeatureCardProps } from "./properties/FeatureCardProps";

const FeaturesSection = () => {
  const { t } = useTranslation();
  const features: FeatureCardProps[] = useMemo(
    () => [
      {
        title: t("public.features.features.schoolRegistry.title"),
        description: t("public.features.features.schoolRegistry.description"),
        icon: {
          icon: <RiIcons.RiSchoolLine className="svg-w-25" />,
          bgClassName: "bg-1",
        },
      },
      {
        title: t("public.features.features.teacherRegistry.title"),
        description: t("public.features.features.teacherRegistry.description"),
        icon: {
          icon: <LiaIcons.LiaChalkboardTeacherSolid className="svg-w-25" />,
          bgClassName: "bg-2",
        },
      },
      {
        title: t("public.features.features.studentRegistry.title"),
        description: t("public.features.features.studentRegistry.description"),
        icon: {
          icon: <PIIcons.PiStudent className="svg-w-25" />,
          bgClassName: "bg-3",
        },
      },
      {
        title: t("public.features.features.classRegistry.title"),
        description: t("public.features.features.classRegistry.description"),
        icon: {
          icon: <SIIcons.SiGoogleclassroom className="svg-w-25" />,
          bgClassName: "bg-4",
        },
      },
      {
        title: t("public.features.features.subjects.title"),
        description: t("public.features.features.subjects.description"),
        icon: {
          icon: <BiIcons.BiMath className="svg-w-25" />,
          bgClassName: "bg-5",
        },
      },
      {
        title: t("public.features.features.grades.title"),
        description: t("public.features.features.grades.description"),
        icon: {
          icon: <PIIcons.PiRanking className="svg-w-25" />,
          bgClassName: "bg-6",
        },
      },
      {
        title: t("public.features.features.attendance.title"),
        description: t("public.features.features.attendance.description"),
        icon: {
          icon: <MdIcons.MdOutlineLibraryAddCheck className="svg-w-25" />,
          bgClassName: "bg-7",
        },
      },
      {
        title: t("public.features.features.library.title"),
        description: t("public.features.features.library.description"),
        icon: {
          icon: <LuIcons.LuLibrary className="svg-w-25" />,
          bgClassName: "bg-8",
        },
      },
    ],
    [t]
  );
  return (
    <section className="section-py-space features-section" id="feature">
      <div className="container-fluid fluid-space">
        <div className="row">
          <div className="col-sm-12 wow pulse">
            <div className="title-style-1 text-center">
              <h2 className="main-title">
                {t("public.header.features.label")}
              </h2>
              <img src="../assets/images/landing/shape-1.png" alt="" />
              <p className="description-title">
                {t("public.features.description")}
              </p>
            </div>
          </div>
        </div>
        <div className="row g-3 g-sm-5 feature-content">
          {features.map((feature: FeatureCardProps, index: number) => (
            <AppPublicFeatureCard
              key={index}
              title={feature.title}
              description={feature.description}
              icon={feature.icon}
            />
          ))}
        </div>
      </div>
    </section>
  );
};

export default FeaturesSection;
